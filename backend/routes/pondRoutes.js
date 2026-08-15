const express = require('express');
const router = express.Router();
const sql = require('mssql');
const auth = require('../middleware/auth');

// --- HELPER FUNCTION: Calculate Recommended Dimensions ---
const calculatePondSpecs = (acres, pondType) => {
    const totalSqFt = acres * 43560;
    let ratio = 2.5; // Default (Earthen)
    let depth = 6.5;

    // Normalize input for comparison (e.g. "Concrete Pond" -> "concrete")
    const type = (pondType || "").toLowerCase();

    if (type.includes('concrete')) {
        ratio = 2.0;
        depth = 5.0;
    } else if (type.includes('lined')) {
        ratio = 2.2;
        depth = 6.0;
    }

    const width = Math.sqrt(totalSqFt / ratio);
    const length = width * ratio;
    const volumeLiters = totalSqFt * depth * 28.317;

    return {
        length: Math.round(length),
        width: Math.round(width),
        depth: depth,
        volume: Math.round(volumeLiters)
    };
};
// --- GET TYPES: Fetch unique pond types from DB with Fallbacks ---
// Access: Protected (auth middleware)
router.get('/types', auth, async (req, res) => {
    try {
        const pool = req.pool;

        // Fetching existing types to maintain consistency across the farm
        const result = await pool.request().query(`
            SELECT DISTINCT PondType
            FROM [FishFarmDB].[dbo].[Ponds]
            WHERE PondType IS NOT NULL
        `);

        // If it's a new system or no ponds exist yet, provide the standard options
        if (result.recordset.length === 0) {
            return res.json([
                { PondType: 'Earthen Pond' },
                { PondType: 'Concrete Tank' },
                { PondType: 'Lined Pond' }
            ]);
        }

        res.json(result.recordset);
    } catch (err) {
        console.error("DEBUG POND TYPES ERROR:", err.message);
        res.status(500).json({ error: "Failed to fetch pond types", details: err.message });
    }
});

// --- GET OPTIONS: Centralized Config for Dropdowns ---
router.get('/options', auth, async (req, res) => {
    try {
        const pool = req.pool;

        // Parallel fetching for existing distinct values if any
        // If DB is empty, use standard industry defaults

        const [types, cultures, cultivations, stages] = await Promise.all([
            pool.request().query("SELECT DISTINCT PondType FROM Ponds WHERE PondType IS NOT NULL"),
            pool.request().query("SELECT DISTINCT CultureType FROM Ponds WHERE CultureType IS NOT NULL"),
            pool.request().query("SELECT DISTINCT CultivationType FROM Ponds WHERE CultivationType IS NOT NULL"),
            pool.request().query("SELECT DISTINCT Stage FROM Ponds WHERE Stage IS NOT NULL")
        ]);

        const defaultTypes = ["Earthen Pond", "Concrete Pond", "Lined Pond"];
        const defaultCultures = ["Monoculture", "Polyculture"];
        const defaultCultivations = ["Extensive", "Semi-Intensive", "Intensive"];
        const defaultStages = ["Grown-out", "Nursery"];

        const mergeOptions = (dbResult, defaults) => {
            const dbValues = dbResult.recordset.map(r => Object.values(r)[0]);
            return [...new Set([...defaults, ...dbValues])];
        };

        res.json({
            pondTypes: mergeOptions(types, defaultTypes),
            cultureTypes: mergeOptions(cultures, defaultCultures),
            cultivationTypes: mergeOptions(cultivations, defaultCultivations),
            stages: mergeOptions(stages, defaultStages)
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch options", details: err.message });
    }
});

// --- 1. READ: Get Ponds for Logged-in User ---
router.get('/', auth, async (req, res) => {
    try {
        const { farmId } = req.query;
        const pool = req.pool;

        let query = `
            SELECT
                p.*,
                st.StockId, st.SpeciesId, st.Quantity, st.PricePerPiece, st.CurrentSizeInches, st.TargetSizeInches, st.StockingDate, st.Status as StockStatus, st.LastSizeUpdateDate,
                s.Name as SpeciesName
            FROM Ponds p
            LEFT JOIN Stocking st ON p.PondId = st.CurrentPondId AND st.Quantity > 0 AND st.Status != 'Harvested'
            LEFT JOIN Species s ON st.SpeciesId = s.SpeciesId
            WHERE p.UserId = @uId
        `;
        const request = pool.request().input('uId', sql.Int, req.user.id);

        if (farmId) {
            query += ` AND p.FarmId = @farmId`;
            request.input('farmId', sql.Int, farmId);
        }

        const result = await request.query(query);

        console.log(`DEBUG: Fetched ${result.recordset.length} rows for user ${req.user.id}`);

        // Group by PondId
        const pondsMap = {};
        result.recordset.forEach(row => {
            if (!pondsMap[row.PondId]) {
                pondsMap[row.PondId] = {
                    ...row,
                    species: []
                };
                // Clean up flat row properties to avoid clutter in the main pond object
                delete pondsMap[row.PondId].StockId;
                delete pondsMap[row.PondId].Quantity;
                delete pondsMap[row.PondId].PricePerPiece;
                delete pondsMap[row.PondId].CurrentSizeInches;
                delete pondsMap[row.PondId].TargetSizeInches;
                delete pondsMap[row.PondId].StockingDate;
                delete pondsMap[row.PondId].StockStatus;
                delete pondsMap[row.PondId].SpeciesName;
                delete pondsMap[row.PondId].LastSizeUpdateDate;
            }

            if (row.StockId) {
                pondsMap[row.PondId].species.push({
                    id: row.StockId,
                    SpeciesId: row.SpeciesId,
                    batchSpeciesId: row.SpeciesId, // Helper for frontend
                    SpeciesName: row.SpeciesName,
                    Quantity: row.Quantity,
                    CurrentSizeInch: row.CurrentSizeInches,
                    TargetSizeInch: row.TargetSizeInches,
                    PricePerPiece: row.PricePerPiece,
                    StockingDate: row.StockingDate,
                    Status: row.StockStatus,
                    LastSizeUpdateDate: row.LastSizeUpdateDate
                });
            }
        });

        res.json(Object.values(pondsMap));
    } catch (err) {
        res.status(500).json({ error: "Fetch failed", details: err.message });
    }
});

// --- 2. ADVISOR: Get dynamic recommendations ---
router.get('/recommend', auth, (req, res) => {
    const acres = parseFloat(req.query.acres);
    const pondType = req.query.type || 'Earthen';

    if (!acres || acres <= 0) return res.status(400).json({ error: "Invalid acreage" });

    const specs = calculatePondSpecs(acres, pondType);
    res.json(specs);
});

// --- 3. CREATE: Add a New Pond with Space Validation ---
// --- 3. CREATE: Add a New Pond (Supports Manual or Auto Dimensions) ---
router.post('/', auth, async (req, res) => {
    try {
        const {
            FarmId, PondName, Stage, Size,
            CultureType, PondType, CultivationType,
            LengthFeet, WidthFeet, DepthFeet, VolumeLiters,
            WaterSource
        } = req.body;

        if (!FarmId || !Size) {
            return res.status(400).json({ error: "Missing FarmId or Size" });
        }

        const pool = req.pool;

        // 1. Fetch Farm details using only the ID-based link
        const farmCheck = await pool.request()
            .input('fId', sql.Int, FarmId)
            .input('uId', sql.Int, req.user.id)
            .query("SELECT RemainingArea, RegionId FROM Farm WHERE FarmId = @fId AND UserId = @uId");

        if (farmCheck.recordset.length === 0) {
            return res.status(404).json({ error: "Farm not found." });
        }

        const { RemainingArea, RegionId } = farmCheck.recordset[0];

        // 2. Logic & Calculations
        const suggested = calculatePondSpecs(Size, PondType);
        const finalLen = LengthFeet || suggested.length;
        const finalWid = WidthFeet || suggested.width;
        const finalDep = DepthFeet || suggested.depth;
        const finalVol = VolumeLiters || (finalLen * finalWid * finalDep * 28.317);

        // 3. Database Insertion into Ponds
        await pool.request()
            .input('UserId', sql.Int, req.user.id)
            .input('RegionId', sql.Int, RegionId)
            .input('FarmId', sql.Int, FarmId)
            .input('PondName', sql.NVarChar(100), PondName)
            .input('Stage', sql.NVarChar(50), Stage)
            .input('CultureType', sql.NVarChar(50), CultureType)
            .input('PondType', sql.NVarChar(50), PondType)
            .input('Size', sql.Decimal(10, 2), Size)
            .input('CultivationType', sql.NVarChar(50), CultivationType)
            .input('Len', sql.Int, Math.round(parseFloat(finalLen)))
            .input('Wid', sql.Int, Math.round(parseFloat(finalWid)))
            .input('Dep', sql.Decimal(4, 2), parseFloat(finalDep))
            .input('Vol', sql.BigInt, Math.round(parseFloat(finalVol)))
            .input('WaterSource', sql.NVarChar(50), WaterSource || 'Well')
            .query(`
                INSERT INTO Ponds (
                    UserId, RegionId, FarmId, PondName, Stage, CultureType, PondType, Size,
                    CultivationType, LengthFeet, WidthFeet, DepthFeet, VolumeLiters, WaterSource, CreatedAt
                )
                VALUES (
                    @UserId, @RegionId, @FarmId, @PondName, @Stage, @CultureType, @PondType, @Size,
                    @CultivationType, @Len, @Wid, @Dep, @Vol, @WaterSource, GETDATE()
                )
            `);

        res.status(201).json({
            success: true,
            message: "Pond created and linked to Farm's region.",
            regionId: RegionId
        });

    } catch (err) {
        res.status(500).json({ error: "Server Error", details: err.message });
    }
});
// --- 4. UPDATE: Modify Pond ---
router.put('/:id', auth, async (req, res) => {
    try {
        const { PondName, Stage, Size, CultureType, PondType, CultivationType, LengthFeet, WidthFeet, DepthFeet, VolumeLiters } = req.body;
        const pool = req.pool;

        const specs = calculatePondSpecs(Size, PondType);

        const result = await pool.request()
            .input('Id', sql.Int, req.params.id)
            .input('uId', sql.Int, req.user.id)
            .input('Name', sql.NVarChar(100), PondName)
            .input('Stage', sql.NVarChar(50), Stage)
            .input('Size', sql.Decimal(10, 2), Size)
            .input('Culture', sql.NVarChar(50), CultureType)
            .input('PType', sql.NVarChar(50), PondType)
            .input('CType', sql.NVarChar(50), CultivationType)
            .input('Len', sql.Int, LengthFeet ? Math.round(parseFloat(LengthFeet)) : Math.round(specs.length))
            .input('Wid', sql.Int, WidthFeet ? Math.round(parseFloat(WidthFeet)) : Math.round(specs.width))
            .input('Dep', sql.Decimal(4, 2), DepthFeet ? parseFloat(DepthFeet) : specs.depth)
            .input('Vol', sql.BigInt, VolumeLiters ? Math.round(parseFloat(VolumeLiters)) : Math.round(specs.volume))
            .query(`
                UPDATE Ponds
                SET PondName = @Name, Stage = @Stage, Size = @Size,
                    CultureType = @Culture, PondType = @PType, CultivationType = @CType,
                    LengthFeet = @Len, WidthFeet = @Wid, DepthFeet = @Dep, VolumeLiters = @Vol
                WHERE PondId = @Id AND UserId = @uId
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "Pond not found or unauthorized" });
        }

        res.json({ success: true, message: "Pond updated successfully" });
    } catch (err) {
        res.status(500).json({ error: "Update failed", details: err.message });
    }
});
// Get Dashboard Stats for Ponds
// GET /api/ponds/stats/summary
router.get('/stats/summary', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = req.pool;

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT
                    -- 1. Total Ponds
                    (SELECT COUNT(*)
                     FROM Ponds
                     WHERE UserId = @userId) as totalPonds,

                    -- 2. Total Acres
                    (SELECT ISNULL(SUM(TRY_CAST(Size AS FLOAT)), 0)
                     FROM Ponds
                     WHERE UserId = @userId) as totalAcres,

                    -- 3. Total Fingerlings (Using CurrentPondId from your Stocking table)
                    (SELECT ISNULL(SUM(S.Quantity), 0)
                     FROM Stocking S
                     INNER JOIN Ponds P ON S.CurrentPondId = P.PondId
                     WHERE P.UserId = @userId) as totalFingerlings
            `);

        res.json({
            success: true,
            data: result.recordset[0]
        });
    } catch (err) {
        console.error("STATS ROUTE ERROR:", err.message);
        res.status(500).json({
            error: "Failed to fetch dashboard statistics",
            details: err.message
        });
    }
});

// --- 6. GET CAPACITY: Simplified Pond Capacity based on size ---
// Uses explicit SmallMaxPerAcre, MediumMaxPerAcre, LargeMaxPerAcre from StockingRules DB.
// NULLIF(col, 0) converts 0 → NULL so ISNULL can apply sensible fallbacks.
router.get('/:id/capacity', auth, async (req, res) => {
    try {
        const pool = req.pool;
        const pondId = req.params.id;

        // 1. Get pond details and stocking rules
        const pondResult = await pool.request()
            .input('pId', sql.Int, pondId)
            .input('uId', sql.Int, req.user.id)
            .query(`
                SELECT p.Size, p.Stage, p.CultivationType, p.CultureType
                FROM Ponds p
                WHERE p.PondId = @pId AND p.UserId = @uId
            `);

        if (pondResult.recordset.length === 0) {
            return res.status(404).json({ error: "Pond not found" });
        }

        const pond = pondResult.recordset[0];
        const size = Number(pond.Size) || 1;

        // 2. Get current stock
        const stockResult = await pool.request()
            .input('pId', sql.Int, pondId)
            .query(`
                SELECT st.StockId, st.SpeciesId, st.Quantity, st.CurrentSizeInches,
                       s.Name as SpeciesName, s.SmallMaxPerAcre, s.MediumMaxPerAcre, s.LargeMaxPerAcre
                FROM Stocking st
                INNER JOIN Species s ON st.SpeciesId = s.SpeciesId
                WHERE st.CurrentPondId = @pId AND st.Quantity > 0 AND st.Status != 'Harvested'
            `);

        const currentStock = stockResult.recordset || [];

        let currentTotal = 0;
        let fractionalUsage = 0;

        let countSmall = 0;
        let countMedium = 0;
        let countLarge = 0;

        const speciesMap = {};
        const speciesCapacityMap = {};

        let repSmallMax = 150000; // sensible defaults
        let repMediumMax = 40000;
        let repLargeMax = 4000;

        if (currentStock.length > 0) {
            repSmallMax = Number(currentStock[0].SmallMaxPerAcre) || repSmallMax;
            repMediumMax = Number(currentStock[0].MediumMaxPerAcre) || repMediumMax;
            repLargeMax = Number(currentStock[0].LargeMaxPerAcre) || repLargeMax;
        }

        currentStock.forEach(s => {
            const qty = Number(s.Quantity) || 0;
            const sName = s.SpeciesName || 'Unknown Species';
            const curSize = Number(s.CurrentSizeInches) || 0;
            const isNursery = String(pond.Stage || '').toLowerCase().includes('nursery');

            // Use dynamic size-based limits
            let density;
            if (curSize < 4) {
                density = Number(s.SmallMaxPerAcre) || 150000;
            } else if (curSize < 8) {
                density = Number(s.MediumMaxPerAcre) || 40000;
            } else {
                density = Number(s.LargeMaxPerAcre) || 4000;
            }

            if (curSize < 4) {
                countSmall += qty;
            }
            else if (curSize < 8) {
                countMedium += qty;
            } else {
                countLarge += qty;
            }

            const maxForThisSpecies = Math.floor(size * density);
            currentTotal += qty;

            if (maxForThisSpecies > 0) fractionalUsage += (qty / maxForThisSpecies);

            if (!speciesMap[sName]) {
                speciesMap[sName] = 0;
                speciesCapacityMap[sName] = maxForThisSpecies;
            }
            speciesMap[sName] += qty;
        });

        const uniqueSpeciesCount = Object.keys(speciesMap).length;
        const isPolyculture = pond.CultureType === 'Polyculture' || uniqueSpeciesCount > 1;

        const polycultureFactor = isPolyculture ? 0.90 : 1.00;
        const fractionalUsagePercentage = Math.round((fractionalUsage / polycultureFactor) * 100);

        const limitSmall = Math.floor(size * repSmallMax * polycultureFactor);
        const limitMedium = Math.floor(size * repMediumMax * polycultureFactor);
        const limitLarge = Math.floor(size * repLargeMax * polycultureFactor);

        res.json({
            success: true,
            data: {
                pondId: Number(pondId),
                size: size,
                stage: pond.Stage,
                cultivationType: pond.CultivationType,
                cultureType: pond.CultureType,

                currentTotal,
                countSmall,
                countMedium,
                countLarge,
                limitSmall,
                limitMedium,
                limitLarge,

                // Polyculture specifics
                isPolyculture,
                currentSpeciesCount: uniqueSpeciesCount,
                speciesMap,
                speciesCapacityMap, // Send native capacities back to UI for context

                fractionalUsagePercentage
            }
        });

    } catch (err) {
        console.error("Capacity Error:", err);
        res.status(500).json({ error: "Failed to fetch capacity", details: err.message });
    }
});

// --- 5. DELETE: Remove Pond ---
router.delete('/:id', auth, async (req, res) => {
    try {
        const pool = req.pool;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const pondId = req.params.id;
            const uId = req.user.id;

            // 1. Verify Ownership before deleting anything
            const check = await transaction.request()
                .input('Id', sql.Int, pondId)
                .input('uId', sql.Int, uId)
                .query('SELECT PondId FROM Ponds WHERE PondId = @Id AND UserId = @uId');

            if (check.recordset.length === 0) {
                await transaction.rollback();
                return res.status(404).json({ error: "Pond not found or unauthorized" });
            }

            // 2. Cascade Delete Child Records safely within the transaction
            // This prevents foreign key constraint failures
            const request = transaction.request().input('Id', sql.Int, pondId);

            await request.query(`
                IF OBJECT_ID('Treatment_Logs', 'U') IS NOT NULL
                    DELETE FROM Treatment_Logs WHERE OutbreakId IN (SELECT OutbreakId FROM Disease_Outbreaks WHERE PondId = @Id);

                IF OBJECT_ID('Disease_Outbreaks', 'U') IS NOT NULL
                    DELETE FROM Disease_Outbreaks WHERE PondId = @Id;

                IF OBJECT_ID('Sales_Logs', 'U') IS NOT NULL
                    DELETE FROM Sales_Logs WHERE PondId = @Id;

                IF OBJECT_ID('Medication_Logs', 'U') IS NOT NULL
                    DELETE FROM Medication_Logs WHERE PondId = @Id;

                IF OBJECT_ID('Pond_Inventory', 'U') IS NOT NULL
                    DELETE FROM Pond_Inventory WHERE PondId = @Id;
                IF OBJECT_ID('Mortality_Logs', 'U') IS NOT NULL
                    DELETE FROM Mortality_Logs WHERE PondId = @Id;
                IF OBJECT_ID('Feed_Logs', 'U') IS NOT NULL
                    DELETE FROM Feed_Logs WHERE PondId = @Id;
                IF OBJECT_ID('Stocking', 'U') IS NOT NULL
                    DELETE FROM Stocking WHERE CurrentPondId = @Id;
                IF OBJECT_ID('Harvest_Logs', 'U') IS NOT NULL
                    DELETE FROM Harvest_Logs WHERE PondId = @Id;
                IF OBJECT_ID('Expense_log', 'U') IS NOT NULL
                    DELETE FROM Expense_log WHERE PondId = @Id;
                IF OBJECT_ID('Fertilizers_Logs', 'U') IS NOT NULL
                    DELETE FROM Fertilizers_Logs WHERE PondId = @Id;

                IF OBJECT_ID('water_quality_logs', 'U') IS NOT NULL
                    DELETE FROM water_quality_logs WHERE PondId = @Id;

                -- 3. Finally Delete the Pond
                DELETE FROM Ponds WHERE PondId = @Id;
            `);

            await transaction.commit();
            res.json({ success: true, message: "Pond and all associated records deleted successfully" });
        } catch (txnErr) {
            try {
                await transaction.rollback();
            } catch (rbErr) {
                console.error("Rollback skipped (already aborted):", rbErr.message);
            }
            throw txnErr;
        }
    } catch (err) {
        console.error("Pond Deletion Error:", err);
        res.status(500).json({ error: "Deletion failed", details: err.message });
    }
});

module.exports = router;