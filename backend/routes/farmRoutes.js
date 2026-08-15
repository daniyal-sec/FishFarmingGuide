const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');
const auth = require('../middleware/auth');

// --- HELPER: Logic to calculate specs for the auto-nursery ---
const calculatePondSpecs = (acres, pondType) => {
    const totalSqFt = acres * 43560;
    let ratio = 2.5; // Default (Earthen)
    let depth = 6.5;
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


// POST /api/farm/calculate-pond-specs - Intelligent Species-Based Calculator
router.post('/calculate-pond-specs', auth, async (req, res) => {
    try {
        const { speciesList, totalFarmArea, stage, cultivationType } = req.body;

        if (!speciesList || speciesList.length === 0) {
            return res.status(400).json({ error: "No species provided" });
        }

        const pondStage = stage || 'Nursery';
        const pool = req.pool;

        // Strict Requirement: Nursery pond is strictly 10% of Total Farm Area
        const nurseryArea = pondStage === 'Nursery' ? (totalFarmArea || 5.0) * 0.1 : 0;

        let totalFishQuantity = 0;
        let maxRequiredDepth = 0;

        // Fetch requirements for each selected species to get depth
        for (const item of speciesList) {
            totalFishQuantity += Number(item.quantity);

            const result = await pool.request()
                .input('sId', sql.Int, item.speciesId)
                .query(`SELECT IdealDepth FROM Species WHERE SpeciesId = @sId`);

            if (result.recordset.length > 0) {
                const sp = result.recordset[0];
                const depth = sp.IdealDepth || 5.0;

                if (depth > maxRequiredDepth) {
                    maxRequiredDepth = depth;
                }
            }
        }

        if (maxRequiredDepth === 0) maxRequiredDepth = 5.0;

        // Fetch Stocking Capacity from DB based on Stage and CultivationType
        // Note: The DB holds 80000 for Extensive Nursery Polyculture, and ~2000 for Extensive Grow-out Default
        const cType = cultivationType || 'Extensive';

        // Normalize stage string to match database ('Grow-out' -> 'Grown-out')
        const dbStage = pondStage === 'Grow-out' ? 'Grown-out' : pondStage;

        const ruleResult = await pool.request()
            .input('pStage', sql.VarChar, dbStage)
            .input('cType', sql.VarChar, cType)
            .query(`
            SELECT MaxFishPerAcre FROM StockingRules
            WHERE Stage = @pStage AND CultureType = 'Polyculture' AND CultivationType = @cType
        `);
        // If not found, fallback to basic Extensive
        const capacityPerAcre = ruleResult.recordset.length > 0 ? ruleResult.recordset[0].MaxFishPerAcre : (pondStage === 'Nursery' ? 80000 : 2000);

        // Area required for this specific batch
        const requiredAcres = totalFishQuantity / capacityPerAcre;

        if (maxRequiredDepth === 0) maxRequiredDepth = 5.0;

        // Physical Dimensions
        // If Nursery, it's locked to EXACT 10% Nursery Area allowance.
        // If Grow-out, it's based precisely on the calculated requiredAcres.
        const targetArea = pondStage === 'Nursery' ? nurseryArea : requiredAcres;
        const totalSqFt = targetArea * 43560;
        const ratio = 2.5;
        const width = Math.sqrt(totalSqFt / ratio);
        const length = width * ratio;
        const volumeLiters = totalSqFt * maxRequiredDepth * 28.317;

        res.json({
            success: true,
            data: {
                stage: pondStage,
                cultivationType: cType,
                targetArea: Number(targetArea.toFixed(3)),
                fixedNurseryArea: pondStage === 'Nursery' ? Number(nurseryArea.toFixed(3)) : null,
                requiredAcres: Number(requiredAcres.toFixed(4)),
                recommendedDepthFeet: Number(maxRequiredDepth.toFixed(1)),
                recommendedLengthFeet: Math.round(length) || 0,
                recommendedWidthFeet: Math.round(width) || 0,
                estimatedVolumeLiters: Math.round(volumeLiters) || 0
            }
        });

    } catch (err) {
        console.error("Specs Calculation Error:", err);
        res.status(500).json({ error: "Failed to calculate dimensions" });
    }
});

// POST /api/farm/provision-pond - Adds a new Pond and its Stocking records
router.post('/provision-pond', auth, async (req, res) => {
    let transaction;
    try {
        const { pondPlan, pondSpecs } = req.body;

        if (!pondPlan || !pondSpecs) {
            return res.status(400).json({ error: "Missing provisioning parameters" });
        }

        const pool = req.pool;

        // 1. Get the user's Farm and Region
        const farmResult = await pool.request()
            .input("uId", sql.Int, req.user.id)
            .query(`SELECT FarmId, RegionId, TotalAreaAcres FROM Farm WHERE UserId = @uId`);

        if (farmResult.recordset.length === 0) {
            return res.status(404).json({ error: "Farm not found for this user." });
        }

        const farm = farmResult.recordset[0];
        const farmId = farm.FarmId;
        const regionId = farm.RegionId;
        const totalAreaAcres = farm.TotalAreaAcres;

        // 1.5. Enforce Area Limits
        const areaCheck = await pool.request()
            .input("uId", sql.Int, req.user.id)
            .query(`SELECT ISNULL(SUM(CAST(Size AS FLOAT)), 0) as UsedArea FROM Ponds WHERE UserId = @uId`);
        const currentUsed = areaCheck.recordset[0].UsedArea;

        // Use a small epsilon for floating point comparison
        if (currentUsed + parseFloat(pondSpecs.targetArea) > totalAreaAcres + 0.001) {
            return res.status(400).json({ error: `Not enough land. Available: ${(totalAreaAcres - currentUsed).toFixed(2)} acres, Requested: ${pondSpecs.targetArea} acres` });
        }

        // 2. Start Transaction
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // 3. Create Pond
        const pondResult = await transaction.request()
            .input("uId", sql.Int, req.user.id)
            .input("fId", sql.Int, farmId)
            .input("rId", sql.Int, regionId)
            .input("pSize", sql.Decimal(10, 2), pondSpecs.targetArea)
            .input("len", sql.Int, pondSpecs.recommendedLengthFeet)
            .input("wid", sql.Int, pondSpecs.recommendedWidthFeet)
            .input("dep", sql.Decimal(4, 2), pondSpecs.recommendedDepthFeet)
            .input("vol", sql.VarChar, String(pondSpecs.estimatedVolumeLiters))
            .input("pStage", sql.VarChar, pondSpecs.stage)
            .input("cType", sql.VarChar, pondSpecs.cultivationType || 'Extensive')
            .input("culType", sql.VarChar, pondSpecs.cultureType || 'Polyculture')
            .input("pName", sql.VarChar, pondSpecs.pondName || 'New Polyculture Pond')
            .input("pType", sql.VarChar, pondSpecs.pondType || 'Earthen')
            .query(`
                INSERT INTO Ponds (
                    UserId, FarmId, RegionId, PondName, Stage,
                    CultureType, PondType, Size, CultivationType, LengthFeet, WidthFeet, DepthFeet, VolumeLiters, CreatedAt
                )
                OUTPUT INSERTED.PondId
                VALUES (
                    @uId, @fId, @rId, @pName, @pStage,
                    @culType, @pType, @pSize, @cType, @len, @wid, @dep, @vol, GETDATE()
                )
            `);

        const newPondId = pondResult.recordset[0].PondId;

        // 4. Create Stocking Records
        for (const batch of pondPlan) {
            // Get species price
            const speciesResult = await transaction.request()
                .input("sId", sql.Int, batch.speciesId)
                .query(`SELECT ISNULL(MinMarketPrice, 0.0) as Price FROM Species WHERE SpeciesId = @sId`);
            const fingerlingPrice = speciesResult.recordset.length > 0 ? (speciesResult.recordset[0].Price * 0.1) : 15.0;

            await transaction.request()
                .input("sId", sql.Int, batch.speciesId)
                .input("pondId", sql.BigInt, newPondId)
                .input("uId", sql.Int, req.user.id)
                .input("qty", sql.Int, batch.quantity)
                .input("pp", sql.Decimal(10, 2), fingerlingPrice)
                .input("pStage", sql.VarChar, pondSpecs.stage)
                .query(`
                    INSERT INTO Stocking (
                        SpeciesId, Quantity, PricePerPiece, CurrentSizeInches, TargetSizeInches,
                        Status, OriginalPondId, CurrentPondId, UserId, StockingDate
                    )
                    VALUES (
                        @sId, @qty, @pp, 2.0, 20.0,
                        @pStage, @pondId, @pondId, @uId, GETDATE()
                    )
                `);
        }

        // 5. Computed columns automatically handle RemainingArea. No need to manually deduct.

        await transaction.commit();
        res.status(201).json({ success: true, pondId: newPondId });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error("PROVISION TRANSACTION ERROR:", err);
        res.status(500).json({ error: "Pond provisioning failed", details: err.message });
    }
});

// POST /api/farm/preview - Calculate Farm Split Dynamically
router.post('/preview', auth, async (req, res) => {
    const { totalArea } = req.body;

    if (!totalArea || totalArea <= 0) {
        return res.status(400).json({ error: "Invalid area" });
    }

    const nurserySize = parseFloat(totalArea) * 0.1;
    const growOutSize = parseFloat(totalArea) - nurserySize;

    res.json({
        success: true,
        data: {
            nurseryArea: nurserySize,
            growOutArea: growOutSize,
            nurseryPercentage: 10,
            growOutPercentage: 90
        }
    });
});

// POST /api/farm/update-preview - Calculate preview for area change
router.post('/update-preview', auth, async (req, res) => {
    const { newTotalArea } = req.body;
    const uId = req.user.id;

    try {
        const pool = req.pool;
        const result = await pool.request()
            .input('uId', sql.Int, uId)
            .query(`
                SELECT
                    TotalAreaAcres as currentTotal,
                    (SELECT ISNULL(SUM(CAST(Size AS FLOAT)), 0) FROM Ponds WHERE UserId = @uId) as usedArea
                FROM Farm WHERE UserId = @uId
            `);

        if (result.recordset.length === 0) return res.status(404).json({ error: "Farm not found" });

        const { currentTotal, usedArea } = result.recordset[0];
        const additionalSpace = Math.max(newTotalArea - currentTotal, 0);
        const newAvailable = Math.max(newTotalArea - usedArea, 0);

        res.json({
            success: true,
            data: {
                currentTotal,
                usedArea,
                newTotal: newTotalArea,
                newAvailable,
                additionalSpace,
                isValid: newTotalArea >= usedArea
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Preview failed", details: err.message });
    }
});


// GET /api/farm/area-usage
router.get('/area-usage', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = req.pool;

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT
                    -- Get the farm's total size from Farm table (TOP 1 to prevent multiple row error)
                    (SELECT TOP 1 ISNULL(TotalAreaAcres, 5.0) FROM Farm WHERE UserId = @userId ORDER BY SetupDate DESC) as totalFarmArea,

                    -- Sum up the size of all ponds owned by this user
                    (SELECT ISNULL(SUM(CAST(Size AS FLOAT)), 0)
                     FROM Ponds
                     WHERE UserId = @userId) as usedArea
            `);

        if (!result.recordset || result.recordset.length === 0) {
            return res.json({
                success: true,
                data: { totalArea: 5.0, usedArea: 0, remainingArea: 5.0, usagePercentage: "0.00", unit: "acres" }
            });
        }

        const { totalFarmArea, usedArea } = result.recordset[0];
        const finalTotalArea = Number(totalFarmArea || 5.0);
        const finalUsedArea = Number(usedArea || 0);
        const remainingArea = Math.max(0, finalTotalArea - finalUsedArea);

        // Calculate percentage for the frontend progress bar
        const usagePercentage = finalTotalArea > 0 ? (finalUsedArea / finalTotalArea) * 100 : 0;

        res.json({
            success: true,
            data: {
                totalArea: finalTotalArea,
                usedArea: finalUsedArea,
                remainingArea: remainingArea,
                usagePercentage: (usagePercentage || 0).toFixed(2),
                unit: "acres"
            }
        });
    } catch (err) {
        console.error("FARM AREA ERROR DETAILS:", err);
        res.status(500).json({
            success: false,
            error: "Could not retrieve farm area stats",
            details: err.message
        });
    }
});

// GET /api/farm/stocking-rules - Fetch stocking rules with explicit size limits from DB
router.get('/stocking-rules', auth, async (req, res) => {
    try {
        const pool = req.pool;
        const result = await pool.request().query(`
            SELECT RuleId, Stage, CultivationType, CultureType,
                   MinFishPerAcre, MaxFishPerAcre, MaxSpeciesAllowed,
                   ISNULL(SmallMinPerAcre, 0) as SmallMinPerAcre, ISNULL(SmallMaxPerAcre, 0) as SmallMaxPerAcre,
                   ISNULL(MediumMinPerAcre, 0) as MediumMinPerAcre, ISNULL(MediumMaxPerAcre, 0) as MediumMaxPerAcre,
                   ISNULL(LargeMinPerAcre, 0) as LargeMinPerAcre, ISNULL(LargeMaxPerAcre, 0) as LargeMaxPerAcre
            FROM StockingRules
        `);

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (err) {
        console.error("Failed to fetch stocking rules:", err);
        res.status(500).json({ error: "Failed to fetch stocking rules" });
    }
});



// --- 1. READ: Get Farm Details (Protected) ---
router.get("/my-farm", auth, async (req, res) => {
    try {
        const pool = req.pool;
        const result = await pool.request()
            .input("uId", sql.Int, req.user.id)
            .query(`
                SELECT
                    U.UserId,
                    U.FullName,
                    U.Email,
                    U.FarmName,
                    F.FarmId,
                    F.TotalAreaAcres,
                    F.RegionId,
                    R.RegionName,
                    F.RemainingArea,
                    F.SetupDate
                FROM Users U
                LEFT JOIN Farm F ON U.UserId = F.UserId
                LEFT JOIN Regions R ON F.RegionId = R.RegionId
                WHERE U.UserId = @uId
            `);
        if (result.recordset.length === 0) return res.status(404).json({ error: "Farm not found" });
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: "Fetch failed", details: err.message });
    }
});

// --- 2. POST: Setup Farm Profile (Now Polyculture Dynamic) ---
router.post('/setup', auth, async (req, res) => {
    const { totalArea, regionId, latitude, longitude, pondPlan, pondSpecs } = req.body;
    let transaction;

    try {
        const pool = req.pool;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Step A: Check if Farm already exists for this user
        const existingFarm = await transaction.request()
            .input("uId", sql.Int, req.user.id)
            .query("SELECT FarmId, RegionId FROM Farm WHERE UserId = @uId");

        let newFarmId;

        if (existingFarm.recordset.length > 0) {
            newFarmId = existingFarm.recordset[0].FarmId;
        } else {
            // Step B: Insert the Farm using ONLY RegionId (and now coordinates)
            const farmResult = await transaction.request()
                .input("uId", sql.Int, req.user.id)
                .input("area", sql.Decimal(10, 2), totalArea || 5.0)
                .input("rId", sql.Int, regionId)
                .input("lat", sql.Decimal(10, 8), latitude || null)
                .input("lng", sql.Decimal(11, 8), longitude || null)
                .query(`
                    INSERT INTO Farm (UserId, TotalAreaAcres, RegionId, Latitude, Longitude, SetupDate)
                    OUTPUT INSERTED.FarmId
                    VALUES (@uId, @area, @rId, @lat, @lng, GETDATE())
                `);
            newFarmId = farmResult.recordset[0].FarmId;
        }

        // Step C: Provision the calculated Pond if pondSpecs was provided
        if (pondSpecs && pondPlan && pondPlan.length > 0) {
            const pondResult = await transaction.request()
                .input("uId", sql.Int, req.user.id)
                .input("fId", sql.Int, newFarmId)
                .input("rId", sql.Int, regionId)
                .input("nSize", sql.Decimal(10, 2), pondSpecs.fixedNurseryArea) // Strictly 10%
                .input("len", sql.Int, pondSpecs.recommendedLengthFeet)
                .input("wid", sql.Int, pondSpecs.recommendedWidthFeet)
                .input("dep", sql.Decimal(4, 2), pondSpecs.recommendedDepthFeet)
                .input("vol", sql.BigInt, pondSpecs.estimatedVolumeLiters)
                .input("cType", sql.VarChar, pondSpecs.cultivationType || 'Extensive')
                .query(`
                    INSERT INTO Ponds (
                        UserId, FarmId, RegionId, PondName, Stage, CultureType,
                        PondType, Size, CultivationType, LengthFeet, WidthFeet, DepthFeet, VolumeLiters, CreatedAt
                    )
                    OUTPUT INSERTED.PondId
                    VALUES (
                        @uId, @fId, @rId, 'Polyculture Pond 1', 'Nursery',
                        'Polyculture', 'Earthen', @nSize, @cType, @len, @wid, @dep, @vol, GETDATE()
                    )
                `);

            const newPondId = pondResult.recordset[0].PondId;

            // Step D: Insert the specific fish batches into the Stocking table
            for (const batch of pondPlan) {
                // Fetch basic pricing details to generate an initial estimated investment
                const priceRes = await transaction.request()
                    .input("sId", sql.Int, batch.speciesId)
                    .query("SELECT MinMarketPrice, FingerlingSizeG FROM Species WHERE SpeciesId = @sId");

                let fingerlingPrice = 5; // default fallback
                if (priceRes.recordset.length > 0) {
                    // Fingerlings cost a fraction of the adult market price, we'll estimate 5%
                    fingerlingPrice = Math.max(1, (priceRes.recordset[0].MinMarketPrice * 0.05).toFixed(0));
                }

                const totalInvestment = batch.quantity * fingerlingPrice;

                await transaction.request()
                    .input("sId", sql.Int, batch.speciesId)
                    .input("pondId", sql.Int, newPondId)
                    .input("uId", sql.Int, req.user.id)
                    .input("qty", sql.Int, batch.quantity)
                    .input("pp", sql.Decimal(10, 2), fingerlingPrice)
                    .query(`
                        INSERT INTO Stocking (
                            SpeciesId, Quantity, PricePerPiece, CurrentSizeInches, TargetSizeInches,
                            Status, OriginalPondId, CurrentPondId, UserId, StockingDate
                        )
                        VALUES (
                            @sId, @qty, @pp, 2.0, 20.0,
                            'Nursery', CAST(@pondId AS BIGINT), CAST(@pondId AS BIGINT), @uId, GETDATE()
                        )
                    `);
            }
        }

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: "Farm, Pond, and Polyculture stock created successfully.",
            farmId: newFarmId,
            regionId: regionId
        });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error("SETUP TRANSACTION ERROR:", err.message);
        res.status(500).json({ error: "Setup failed", details: err.message });
    }
});

// --- 3. UPDATE: Change Total Area or RegionId (Protected) ---
// --- 3. UPDATE: Change Total Area or RegionId (Improved) ---
router.put("/update", auth, async (req, res) => {
    const { totalArea, regionId, latitude, longitude } = req.body;
    try {
        const pool = req.pool;
        const uId = req.user.id;

        // NEW: Safety Check
        if (totalArea) {
            const usedAreaResult = await pool.request()
                .input("uId", sql.Int, uId)
                .query("SELECT ISNULL(SUM(CAST(Size AS FLOAT)), 0) as used FROM Ponds WHERE UserId = @uId");

            const currentlyUsed = usedAreaResult.recordset[0].used;

            if (totalArea < currentlyUsed) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid Area: You are already using ${currentlyUsed} acres for ponds. You cannot set farm size smaller than that.`
                });
            }
        }

        // Existing Update Logic
        await pool.request()
            .input("uId", sql.Int, uId)
            .input("area", sql.Decimal(10, 2), totalArea || null)
            .input("rId", sql.Int, regionId || null)
            .input("lat", sql.Decimal(10, 8), latitude || null)
            .input("lng", sql.Decimal(11, 8), longitude || null)
            .query(`
                UPDATE Farm
                SET TotalAreaAcres = ISNULL(@area, TotalAreaAcres),
                    RegionId = ISNULL(@rId, RegionId),
                    Latitude = ISNULL(@lat, Latitude),
                    Longitude = ISNULL(@lng, Longitude)
                WHERE UserId = @uId
            `);

        res.json({
            success: true,
            message: "Farm updated successfully."
        });
    } catch (err) {
        res.status(500).json({ error: "Update failed", details: err.message });
    }
});

// --- 4. DELETE: Remove Farm (Protected) ---
router.delete("/:farmId", auth, async (req, res) => {
    try {
        const { farmId } = req.params;
        const pool = req.pool;

        const result = await pool.request()
            .input("fId", sql.Int, farmId)
            .input("uId", sql.Int, req.user.id)
            .query("DELETE FROM Farm WHERE FarmId = @fId AND UserId = @uId");

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: "Farm not found or you do not have permission to delete it."
            });
        }

        res.json({ success: true, message: "Farm deleted successfully." });
    } catch (err) {
        res.status(500).json({ error: "Deletion failed", details: err.message });
    }
});

// --- 5. READ: View Farm by Specific ID (Protected) ---
router.get("/view/:id", auth, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = req.pool;

        const result = await pool.request()
            .input("fId", sql.Int, id)
            .query(`
                SELECT
                    U.UserId,
                    U.FullName as OwnerName,
                    U.Email,
                    U.FarmName,
                    F.FarmId,
                    F.TotalAreaAcres,
                    F.RegionId, -- Updated to ID
                    F.RemainingArea,
                    F.SetupDate
                FROM Farm F
                INNER JOIN Users U ON F.UserId = U.UserId
                WHERE F.FarmId = @fId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "No farm found with that ID." });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: "Fetch failed", details: err.message });
    }
});

// ═══ DAILY ACTION PLAN ═══

let dailyTasksChecked = false;
async function ensureDailyTasksTable(pool) {
    if (dailyTasksChecked) return;
    try {
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DailyTasks')
            BEGIN
                CREATE TABLE DailyTasks (
                    TaskId INT IDENTITY(1,1) PRIMARY KEY,
                    UserId INT NOT NULL,
                    PondId BIGINT NULL,
                    TaskText NVARCHAR(500) NOT NULL,
                    Category NVARCHAR(50) DEFAULT 'CUSTOM',
                    IsCompleted BIT DEFAULT 0,
                    TaskDate DATE DEFAULT CAST(GETDATE() AS DATE),
                    CreatedAt DATETIME DEFAULT GETDATE()
                )
            END

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DailyTasks' AND COLUMN_NAME = 'PondId')
            BEGIN
                ALTER TABLE DailyTasks ADD PondId BIGINT NULL;
            END
        `);
        dailyTasksChecked = true;
    } catch (err) { console.error("DailyTasks table error:", err.message); }
}

// GET /api/farm/daily-tasks — auto-generate + return today's tasks
router.get('/daily-tasks', auth, async (req, res) => {
    try {
        const pool = req.pool;
        const uid = req.user.id;
        await ensureDailyTasksTable(pool);

        // Check if auto tasks already generated for today
        const existing = await pool.request()
            .input('uid', sql.Int, uid)
            .query(`SELECT COUNT(*) as cnt FROM DailyTasks WHERE UserId = @uid AND TaskDate = CAST(GETDATE() AS DATE) AND Category != 'CUSTOM'`);

        if (existing.recordset[0].cnt === 0) {
            // Auto-generate tasks from ponds
            const ponds = await pool.request()
                .input('uid', sql.Int, uid)
                .query(`
                    SELECT P.PondId, P.PondName,
                           (SELECT COUNT(*) FROM Stocking S WHERE S.CurrentPondId = P.PondId AND S.Quantity > 0) as HasFish,
                           (SELECT TOP 1 S.SpeciesId FROM Stocking S WHERE S.CurrentPondId = P.PondId AND S.Quantity > 0) as SpeciesId
                    FROM Ponds P WHERE P.UserId = @uid
                `);

            const tasks = [];
            for (const pond of ponds.recordset) {
                if (pond.HasFish > 0) {
                    tasks.push({ text: `Feed fish in ${pond.PondName}`, cat: 'FEED REMINDER', pondId: pond.PondId });
                    tasks.push({ text: `Measure fish size in ${pond.PondName}`, cat: 'GROWTH REMINDER', pondId: pond.PondId });
                }
                tasks.push({ text: `Check water parameters for ${pond.PondName}`, cat: 'WATER REMINDER', pondId: pond.PondId });
                tasks.push({ text: `Apply fertilizer to ${pond.PondName}`, cat: 'FERTILIZER REMINDER', pondId: pond.PondId });
            }

            // Bulk insert auto tasks
            for (const task of tasks) {
                await pool.request()
                    .input('uid', sql.Int, uid)
                    .input('text', sql.NVarChar, task.text)
                    .input('cat', sql.NVarChar, task.cat)
                    .input('pondId', sql.BigInt, task.pondId || null)
                    .query(`INSERT INTO DailyTasks (UserId, PondId, TaskText, Category, TaskDate) VALUES (@uid, @pondId, @text, @cat, CAST(GETDATE() AS DATE))`);
            }
        }

        // Fetch today's tasks
        const result = await pool.request()
            .input('uid', sql.Int, uid)
            .query(`SELECT * FROM DailyTasks WHERE UserId = @uid AND TaskDate = CAST(GETDATE() AS DATE) ORDER BY IsCompleted ASC, TaskId ASC`);

        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Daily tasks error:", err);
        res.status(500).json({ error: "Failed to fetch daily tasks", details: err.message });
    }
});

// POST /api/farm/daily-tasks — add custom task
router.post('/daily-tasks', auth, async (req, res) => {
    const { taskText } = req.body;
    if (!taskText || !taskText.trim()) return res.status(400).json({ error: "Task text required" });
    try {
        const pool = req.pool;
        await ensureDailyTasksTable(pool);
        await pool.request()
            .input('uid', sql.Int, req.user.id)
            .input('text', sql.NVarChar, taskText.trim())
            .query(`INSERT INTO DailyTasks (UserId, TaskText, Category, TaskDate) VALUES (@uid, @text, 'CUSTOM', CAST(GETDATE() AS DATE))`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to add task" });
    }
});

// PUT /api/farm/daily-tasks/:id/toggle — toggle completion
router.put('/daily-tasks/:id/toggle', auth, async (req, res) => {
    try {
        const pool = req.pool;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('uid', sql.Int, req.user.id)
            .query(`UPDATE DailyTasks SET IsCompleted = CASE WHEN IsCompleted = 1 THEN 0 ELSE 1 END WHERE TaskId = @id AND UserId = @uid`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to toggle task" });
    }
});

// DELETE /api/farm/daily-tasks/:id
router.delete('/daily-tasks/:id', auth, async (req, res) => {
    try {
        const pool = req.pool;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('uid', sql.Int, req.user.id)
            .query(`DELETE FROM DailyTasks WHERE TaskId = @id AND UserId = @uid`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete task" });
    }
});

// --- RESET FARM: Delete all ponds, data, and farm — fresh start ---
router.post('/reset', auth, async (req, res) => {
    const transaction = new sql.Transaction(req.pool);
    try {
        const pool = req.pool;
        const uid = req.user.id;
        await transaction.begin();

        // 1. Delete pond-level child records
        const r1 = new sql.Request(transaction);
        r1.input('uid', sql.Int, uid);
        await r1.query(`
            IF OBJECT_ID('Expense_log') IS NOT NULL
                DELETE FROM Expense_log WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
            IF OBJECT_ID('Feed_Logs') IS NOT NULL
                DELETE FROM Feed_Logs WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
            IF OBJECT_ID('Mortality_Logs') IS NOT NULL
                DELETE FROM Mortality_Logs WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
            IF OBJECT_ID('Harvest_Logs') IS NOT NULL
                DELETE FROM Harvest_Logs WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
            IF OBJECT_ID('water_quality_logs') IS NOT NULL
                DELETE FROM water_quality_logs WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
            IF OBJECT_ID('Fertilizers_Logs') IS NOT NULL
                DELETE FROM Fertilizers_Logs WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
            IF OBJECT_ID('Pond_Inventory') IS NOT NULL
                DELETE FROM Pond_Inventory WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
            IF OBJECT_ID('Pond_Inventory_Old_Backup') IS NOT NULL
                DELETE FROM Pond_Inventory_Old_Backup WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
            IF OBJECT_ID('Medication_Logs') IS NOT NULL
                DELETE FROM Medication_Logs WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
            IF OBJECT_ID('Disease_Outbreaks') IS NOT NULL
                DELETE FROM Disease_Outbreaks WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
        `);

        // 2. Delete stocking + sales
        const r2 = new sql.Request(transaction);
        r2.input('uid', sql.Int, uid);
        await r2.query(`
            IF OBJECT_ID('Sales_Logs') IS NOT NULL
            BEGIN
                DELETE FROM Sales_Logs WHERE StockId IN (SELECT StockId FROM Stocking WHERE UserId = @uid);
                DELETE FROM Sales_Logs WHERE UserId = @uid;
            END
            DELETE FROM Stocking WHERE UserId = @uid;
        `);

        // 3. Delete user-level stock/inventory
        const r3 = new sql.Request(transaction);
        r3.input('uid', sql.Int, uid);
        await r3.query(`
            IF OBJECT_ID('Feed_Stock') IS NOT NULL DELETE FROM Feed_Stock WHERE UserId = @uid;
            IF OBJECT_ID('Fertilizer_Stock') IS NOT NULL DELETE FROM Fertilizer_Stock WHERE UserId = @uid;
            IF OBJECT_ID('Medication_Stock') IS NOT NULL DELETE FROM Medication_Stock WHERE UserId = @uid;
            IF OBJECT_ID('MarketplaceFavorites') IS NOT NULL DELETE FROM MarketplaceFavorites WHERE FarmId IN (SELECT FarmId FROM Farm WHERE UserId = @uid);
            IF OBJECT_ID('Marketplace_Listings') IS NOT NULL DELETE FROM Marketplace_Listings WHERE FarmId IN (SELECT FarmId FROM Farm WHERE UserId = @uid);
            IF OBJECT_ID('FarmReviews') IS NOT NULL DELETE FROM FarmReviews WHERE FarmId IN (SELECT FarmId FROM Farm WHERE UserId = @uid);
            IF OBJECT_ID('PurchaseRequests') IS NOT NULL DELETE FROM PurchaseRequests WHERE FarmId IN (SELECT FarmId FROM Farm WHERE UserId = @uid);
            IF OBJECT_ID('FavoriteStockNotifications') IS NOT NULL DELETE FROM FavoriteStockNotifications WHERE FarmId IN (SELECT FarmId FROM Farm WHERE UserId = @uid);
            IF OBJECT_ID('FarmFavoriteAlerts') IS NOT NULL DELETE FROM FarmFavoriteAlerts WHERE FarmerUserId = @uid;
            IF OBJECT_ID('DailyTasks') IS NOT NULL DELETE FROM DailyTasks WHERE UserId = @uid;
        `);

        // 4. Delete ponds
        const r4 = new sql.Request(transaction);
        r4.input('uid', sql.Int, uid);
        await r4.query("DELETE FROM Ponds WHERE UserId = @uid");

        // 5. Delete farm
        const r5 = new sql.Request(transaction);
        r5.input('uid', sql.Int, uid);
        await r5.query("DELETE FROM Farm WHERE UserId = @uid");

        await transaction.commit();
        console.log(`[Farm] User ${uid} farm reset complete.`);
        res.json({ success: true, message: "Farm has been reset. You can start fresh!" });
    } catch (err) {
        try { await transaction.rollback(); } catch(e) {}
        console.error("Reset farm error:", err);
        res.status(500).json({ error: "Failed to reset farm", details: err.message });
    }
});

module.exports = router;