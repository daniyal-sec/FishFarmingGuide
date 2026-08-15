const express = require('express');
const router = express.Router();
const sql = require('mssql');
const auth = require('../middleware/auth');

// Ensure schema function for Harvest Logs ROI
async function ensureHarvestSchema(pool) {
    try {
        await pool.request().query(`
            IF COL_LENGTH('Harvest_Logs', 'Revenue') IS NULL ALTER TABLE Harvest_Logs ADD Revenue DECIMAL(12,2) DEFAULT 0;
            IF COL_LENGTH('Harvest_Logs', 'FingerlingCost') IS NULL ALTER TABLE Harvest_Logs ADD FingerlingCost DECIMAL(12,2) DEFAULT 0;
            IF COL_LENGTH('Harvest_Logs', 'FeedCost') IS NULL ALTER TABLE Harvest_Logs ADD FeedCost DECIMAL(12,2) DEFAULT 0;
            IF COL_LENGTH('Harvest_Logs', 'FertilizerCost') IS NULL ALTER TABLE Harvest_Logs ADD FertilizerCost DECIMAL(12,2) DEFAULT 0;
            IF COL_LENGTH('Harvest_Logs', 'OtherCost') IS NULL ALTER TABLE Harvest_Logs ADD OtherCost DECIMAL(12,2) DEFAULT 0;
        `);
    } catch (e) {
        console.error("ensureHarvestSchema error:", e.message);
    }
}

// 1. CREATE: Record Harvest & Physically Decrease Stock
router.post('/add', auth, async (req, res) => {
    const transaction = new sql.Transaction(req.pool);
    await ensureHarvestSchema(req.pool);
    try {
        const pondId = parseInt(req.body.pondId);
        const speciesId = parseInt(req.body.speciesId);
        const quantity = parseInt(req.body.quantity) || 0;
        const weight = parseFloat(req.body.weight) || 0;
        const note = req.body.note || "";

        await transaction.begin();

        // 1. THE GATEKEEPER: Check current stock (which already accounts for previous mortality)
        const stockRequest = new sql.Request(transaction);
        const stockCheck = await stockRequest
            .input('pid', sql.Int, pondId)
            .input('sid', sql.Int, speciesId)
            .query(`
                SELECT SUM(Quantity) as TotalQuantity
                FROM Stocking
                WHERE CurrentPondId = @pid AND SpeciesId = @sid AND Status != 'Harvested'
            `);

        if (!stockCheck.recordset || stockCheck.recordset.length === 0 || stockCheck.recordset[0].TotalQuantity === null) {
            await transaction.rollback();
            return res.status(404).json({ error: "Species not found in this pond." });
        }

        const currentStock = stockCheck.recordset[0].TotalQuantity;

        if (currentStock < quantity) {
            await transaction.rollback();
            return res.status(400).json({ error: `Not enough fish. Current stock: ${currentStock}` });
        }

        const remainingAfter = currentStock - quantity;

        // 2. PHYSICAL DECREASE: Update Stocking Table (FIFO across batches)
        const batchRequest = new sql.Request(transaction);
        const batches = await batchRequest
            .input('pid', sql.Int, pondId)
            .input('sid', sql.Int, speciesId)
            .query(`
                SELECT StockId, Quantity, PricePerPiece, CurrentSizeInches, TargetSizeInches, StockingDate
                FROM Stocking
                WHERE CurrentPondId = @pid AND SpeciesId = @sid AND Quantity > 0 AND Status != 'Harvested'
                ORDER BY StockingDate ASC
            `);

        let remainingToHarvest = quantity;
        for (const batch of batches.recordset) {
            if (remainingToHarvest <= 0) break;

            const deduct = Math.min(batch.Quantity, remainingToHarvest);
            remainingToHarvest -= deduct;

            const updateRequest = new sql.Request(transaction);
            await updateRequest
                .input('stockId', sql.Int, batch.StockId)
                .input('deduct', sql.Int, deduct)
                .query(`
                    UPDATE Stocking
                    SET Quantity = Quantity - @deduct
                    WHERE StockId = @stockId
                `);

            // Instead of auto-deleting, we create a new 'Harvested' batch for the deducted amount.
            // This ensures it goes to "Stock Management" with the pond details.
            const splitRequest = new sql.Request(transaction);
            await splitRequest
                .input('uid', sql.Int, req.user.id)
                .input('pid', sql.Int, pondId)
                .input('sid', sql.Int, speciesId)
                .input('qty', sql.Int, deduct)
                .input('price', sql.Decimal(10, 2), batch.PricePerPiece)
                .input('size', sql.Decimal(5, 2), batch.CurrentSizeInches)
                .input('targetSize', sql.Decimal(5, 2), batch.TargetSizeInches)
                .input('sdate', sql.DateTime, batch.StockingDate)
                .query(`
                    INSERT INTO Stocking (UserId, OriginalPondId, CurrentPondId, SpeciesId, Quantity, PricePerPiece, CurrentSizeInches, TargetSizeInches, StockingDate, Status, IsForSale, ForSaleQuantity)
                    VALUES (@uid, @pid, @pid, @sid, @qty, @price, @size, @targetSize, @sdate, 'Harvested', 1, @qty)
                `);
        }

        // 2b. AUTO-DELETE: Remove any original batches that reached 0 quantity to keep DB clean
        const cleanupRequest = new sql.Request(transaction);
        await cleanupRequest
            .input('pid', sql.Int, pondId)
            .input('sid', sql.Int, speciesId)
            .query(`
                DELETE FROM Stocking
                WHERE CurrentPondId = @pid AND SpeciesId = @sid AND Quantity <= 0 AND Status != 'Harvested'
            `);

        // 3. INSERT HARVEST LOG
        const logRequest = new sql.Request(transaction);
        await logRequest
            .input('pid', sql.Int, pondId)
            .input('sid', sql.Int, speciesId)
            .input('qty', sql.Int, quantity)
            .input('w', sql.Float, weight)
            .input('rem', sql.Int, remainingAfter)
            .input('n', sql.NVarChar, note)
            .query(`
                INSERT INTO Harvest_Logs (PondId, SpeciesId, Quantity_pieces, TotalWeight_kg, Remaining_Pieces, Note)
                VALUES (@pid, @sid, @qty, @w, @rem, @n)
            `);

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: "Harvest recorded and stock updated!",
            remainingStock: remainingAfter
        });

    } catch (err) {
        if (transaction) await transaction.rollback();
        res.status(500).json({ error: "Server Error", details: err.message });
    }
});

// 2. READ: Get Available Stock (Simpler now because math is done in the table)
router.get('/available/:pondId', auth, async (req, res) => {
    try {
        const { pondId } = req.params;
        const pool = req.pool;

        const result = await pool.request()
            .input('pid', sql.Int, pondId)
            .query(`
                SELECT
                    S.SpeciesID,
                    S.Name,
                    ST.Quantity as CurrentStock
                FROM Stocking ST
                JOIN Species S ON ST.SpeciesId = S.SpeciesID
                WHERE ST.CurrentPondId = @pid AND ST.Status != 'Harvested'
            `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// History and Delete routes
router.get('/history/:pondId', auth, async (req, res) => {
    try {
        const { pondId } = req.params;
        const pool = req.pool;
        const result = await pool.request()
            .input('pid', sql.Int, pondId)
            .query(`
                SELECT H.*, S.Name as SpeciesName
                FROM Harvest_Logs H
                JOIN Species S ON H.SpeciesId = S.SpeciesID
                WHERE H.PondId = @pid
                ORDER BY H.HarvestDate DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. ROI: Get total investment breakdown for a pond + species
router.get('/roi/:pondId/:speciesId', auth, async (req, res) => {
    try {
        const pondId = parseInt(req.params.pondId);
        const speciesId = parseInt(req.params.speciesId);
        const pool = req.pool;

        // 1. Fingerling cost: SUM(Quantity * PricePerPiece) from ALL stocking batches for this pond+species
        //    This includes both current and already-harvested batches (original cost of fish put in this pond)
        const fingerlingResult = await pool.request()
            .input('pid', sql.Int, pondId)
            .input('sid', sql.Int, speciesId)
            .query(`
                SELECT ISNULL(SUM(Quantity * PricePerPiece), 0) as TotalFingerlingCost,
                       ISNULL(SUM(Quantity), 0) as TotalFingerlings
                FROM Stocking
                WHERE (CurrentPondId = @pid OR OriginalPondId = @pid) AND SpeciesId = @sid
            `);

        const fingerlingCost = Number(fingerlingResult.recordset[0].TotalFingerlingCost) || 0;

        // 2. Feed cost: Species-specific (Feed_Logs has SpeciesID column)
        const feedResult = await pool.request()
            .input('pid', sql.Int, pondId)
            .input('sid', sql.Int, speciesId)
            .query(`
                SELECT ISNULL(SUM(TotalCost), 0) as TotalFeedCost
                FROM Feed_Logs
                WHERE PondId = @pid AND SpeciesID = @sid
            `);

        const feedCost = Number(feedResult.recordset[0].TotalFeedCost) || 0;

        // 3. Species ratio for splitting pond-wide costs proportionally
        //    Ratio = (this species quantity) / (all species quantity) in this pond
        const ratioResult = await pool.request()
            .input('pid', sql.Int, pondId)
            .input('sid', sql.Int, speciesId)
            .query(`
                SELECT
                    ISNULL((SELECT SUM(Quantity) FROM Stocking WHERE (CurrentPondId = @pid OR OriginalPondId = @pid) AND SpeciesId = @sid), 0) as SpeciesQty,
                    ISNULL((SELECT SUM(Quantity) FROM Stocking WHERE (CurrentPondId = @pid OR OriginalPondId = @pid)), 0) as TotalQty
            `);

        const speciesQty = ratioResult.recordset[0].SpeciesQty || 1;
        const totalQty = ratioResult.recordset[0].TotalQty || 1;
        const speciesRatio = totalQty > 0 ? (speciesQty / totalQty) : 1;

        // 4. Fertilizer cost: Pond-wide, split by species ratio
        const fertResult = await pool.request()
            .input('pid', sql.Int, pondId)
            .query(`
                SELECT ISNULL(SUM(TotalCost), 0) as TotalFertCost
                FROM Fertilizers_Logs
                WHERE PondId = @pid
            `);

        const totalFertCost = Number(fertResult.recordset[0].TotalFertCost) || 0;
        const fertilizerCost = Math.round(totalFertCost * speciesRatio * 100) / 100;

        // 5. General expenses: Pond-wide, split by species ratio
        const expResult = await pool.request()
            .input('pid', sql.Int, pondId)
            .query(`
                SELECT ISNULL(SUM(Amount), 0) as TotalExpenses
                FROM Expense_log
                WHERE PondId = @pid
            `);

        const totalExpenses = Number(expResult.recordset[0].TotalExpenses) || 0;
        const generalExpenses = Math.round(totalExpenses * speciesRatio * 100) / 100;

        // 6. Calculate totals
        const totalInvestment = fingerlingCost + feedCost + fertilizerCost + generalExpenses;

        // 7. Get species name for display
        const speciesNameResult = await pool.request()
            .input('sid', sql.Int, speciesId)
            .query(`SELECT Name FROM Species WHERE SpeciesID = @sid`);

        const speciesName = speciesNameResult.recordset[0]?.Name || 'Unknown';

        // Build breakdown with percentages
        const breakdown = [
            { category: "Fingerlings", amount: fingerlingCost, percentage: totalInvestment > 0 ? ((fingerlingCost / totalInvestment) * 100).toFixed(1) : 0 },
            { category: "Feed", amount: feedCost, percentage: totalInvestment > 0 ? ((feedCost / totalInvestment) * 100).toFixed(1) : 0 },
            { category: "Fertilizer", amount: fertilizerCost, percentage: totalInvestment > 0 ? ((fertilizerCost / totalInvestment) * 100).toFixed(1) : 0 },
            { category: "Other Expenses", amount: generalExpenses, percentage: totalInvestment > 0 ? ((generalExpenses / totalInvestment) * 100).toFixed(1) : 0 }
        ];

        res.json({
            speciesName,
            speciesRatio: (speciesRatio * 100).toFixed(1) + '%',
            fingerlingCost,
            feedCost,
            fertilizerCost,
            generalExpenses,
            totalInvestment,
            breakdown
        });

    } catch (err) {
        res.status(500).json({ error: "ROI Calculation Error", details: err.message });
    }
});

router.delete('/:harvestId', auth, async (req, res) => {
    try {
        const pool = req.pool;
        await pool.request()
            .input('hid', sql.Int, req.params.harvestId)
            .input('uid', sql.Int, req.user.id)
            .query(`
                DELETE H
                FROM Harvest_Logs H
                JOIN Ponds P ON H.PondId = P.PondId
                WHERE H.HarvestId = @hid AND P.UserId = @uid
            `);
        res.json({ success: true, message: "Record deleted." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SAVE ROI DATA ---
router.post('/roi/save', auth, async (req, res) => {
    try {
        await ensureHarvestSchema(req.pool);
        const { pondId, farmId, speciesName, harvestQuantity, revenue, fingerlingCost, feedCost, fertilizerCost, otherCost } = req.body;

        let pId = pondId;
        if (!pId && farmId) {
            const pf = await req.pool.request().input('fid', sql.Int, farmId).query("SELECT TOP 1 PondId FROM Ponds WHERE FarmId = @fid");
            if (pf.recordset.length > 0) pId = pf.recordset[0].PondId;
        }

        if (!pId) return res.status(400).json({ error: "No pond found to attach ROI to." });

        const sp = await req.pool.request().input('sname', sql.NVarChar, speciesName).query("SELECT TOP 1 SpeciesID FROM Species WHERE Name = @sname");
        const sId = sp.recordset[0]?.SpeciesID || 0;

        await req.pool.request()
            .input('pid', sql.Int, pId)
            .input('sid', sql.Int, sId)
            .input('qty', sql.Int, harvestQuantity || 0)
            .input('rev', sql.Decimal(12,2), revenue || 0)
            .input('fing', sql.Decimal(12,2), fingerlingCost || 0)
            .input('feed', sql.Decimal(12,2), feedCost || 0)
            .input('fert', sql.Decimal(12,2), fertilizerCost || 0)
            .input('oth', sql.Decimal(12,2), otherCost || 0)
            .query(`
                INSERT INTO Harvest_Logs (PondId, SpeciesId, Quantity_pieces, TotalWeight_kg, Remaining_Pieces, Note, Revenue, FingerlingCost, FeedCost, FertilizerCost, OtherCost)
                VALUES (@pid, @sid, @qty, 0, 0, 'Marketplace Sale', @rev, @fing, @feed, @fert, @oth)
            `);

        res.json({ success: true, message: "ROI saved to reports." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- GET ALL FARM REPORTS / ROI (DYNAMIC COST CALCULATION) ---
router.get('/reports', auth, async (req, res) => {
    try {
        await ensureHarvestSchema(req.pool);
        const uid = req.user.id;

        // 1. Get all harvest records
        const harvestResult = await req.pool.request()
            .input('uid', sql.Int, uid)
            .query(`
                SELECT
                    H.HarvestId, H.HarvestDate as Date, H.PondId, P.PondName,
                    H.SpeciesId, S.Name as SpeciesName,
                    H.Quantity_pieces as Quantity, H.TotalWeight_kg as Weight,
                    ISNULL(H.Revenue, 0) as SavedRevenue,
                    ISNULL(S.MinMarketPrice, 200) as MinMarketPrice,
                    ISNULL(S.MaxMarketPrice, 400) as MaxMarketPrice
                FROM Harvest_Logs H
                JOIN Ponds P ON H.PondId = P.PondId
                JOIN Species S ON H.SpeciesId = S.SpeciesID
                WHERE P.UserId = @uid
                ORDER BY H.HarvestDate DESC
            `);

        const harvests = harvestResult.recordset;
        const enriched = [];

        for (const h of harvests) {
            // --- Fingerling Cost: actual stocking cost for this pond+species ---
            const fingRes = await req.pool.request()
                .input('pid', sql.Int, h.PondId)
                .input('sid', sql.Int, h.SpeciesId)
                .query(`
                    SELECT ISNULL(SUM(Quantity * PricePerPiece), 0) as Cost
                    FROM Stocking
                    WHERE (CurrentPondId = @pid OR OriginalPondId = @pid) AND SpeciesId = @sid
                `);
            const fingerlingCost = Number(fingRes.recordset[0].Cost) || 0;

            // --- Feed Cost: species-specific from Feed_Logs ---
            const feedRes = await req.pool.request()
                .input('pid', sql.Int, h.PondId)
                .input('sid', sql.Int, h.SpeciesId)
                .query(`
                    SELECT ISNULL(SUM(TotalCost), 0) as Cost
                    FROM Feed_Logs
                    WHERE PondId = @pid AND SpeciesID = @sid
                `);
            const feedCost = Number(feedRes.recordset[0].Cost) || 0;

            // --- Species ratio for pond-wide cost splitting ---
            const ratioRes = await req.pool.request()
                .input('pid', sql.Int, h.PondId)
                .input('sid', sql.Int, h.SpeciesId)
                .query(`
                    SELECT
                        ISNULL((SELECT SUM(Quantity) FROM Stocking WHERE (CurrentPondId = @pid OR OriginalPondId = @pid) AND SpeciesId = @sid), 0) as SpeciesQty,
                        ISNULL((SELECT SUM(Quantity) FROM Stocking WHERE (CurrentPondId = @pid OR OriginalPondId = @pid)), 0) as TotalQty
                `);
            const speciesQty = ratioRes.recordset[0].SpeciesQty || 1;
            const totalQty = ratioRes.recordset[0].TotalQty || 1;
            const ratio = totalQty > 0 ? (speciesQty / totalQty) : 1;

            // --- Fertilizer Cost: pond-wide, split by species ratio ---
            const fertRes = await req.pool.request()
                .input('pid', sql.Int, h.PondId)
                .query(`SELECT ISNULL(SUM(TotalCost), 0) as Cost FROM Fertilizers_Logs WHERE PondId = @pid`);
            const fertilizerCost = Math.round(Number(fertRes.recordset[0].Cost) * ratio * 100) / 100;

            // --- Other Expenses: pond-wide from Expense_log, split by ratio ---
            const expRes = await req.pool.request()
                .input('pid', sql.Int, h.PondId)
                .query(`SELECT ISNULL(SUM(Amount), 0) as Cost FROM Expense_log WHERE PondId = @pid`);
            const otherCost = Math.round(Number(expRes.recordset[0].Cost) * ratio * 100) / 100;

            // --- Revenue: use saved value if > 0, else estimate from weight × avg market price ---
            let revenue = Number(h.SavedRevenue) || 0;
            if (revenue === 0 && h.Weight > 0) {
                const avgPrice = (h.MinMarketPrice + h.MaxMarketPrice) / 2;
                revenue = Math.round(h.Weight * avgPrice);
            }

            enriched.push({
                HarvestId: h.HarvestId,
                Date: h.Date,
                PondName: h.PondName,
                SpeciesName: h.SpeciesName,
                Quantity: h.Quantity,
                Weight: h.Weight,
                Revenue: revenue,
                FingerlingCost: fingerlingCost,
                FeedCost: feedCost,
                FertilizerCost: fertilizerCost,
                OtherCost: otherCost
            });
        }

        res.json(enriched);
    } catch (err) {
        console.error("Reports error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- OPERATIONS SUMMARY: Aggregate mortality, water quality, and feed stats ---
router.get('/operations-summary', auth, async (req, res) => {
    try {
        const uid = req.user.id;
        const pool = req.pool;

        // 1. Mortality Data
        const mortResult = await pool.request()
            .input('uid', sql.Int, uid)
            .query(`
                SELECT
                    P.PondName, S.Name as SpeciesName,
                    ISNULL(SUM(M.Quantity_dead), 0) as TotalLoss
                FROM Mortality_Logs M
                JOIN Ponds P ON M.PondId = P.PondId
                JOIN Species S ON M.SpeciesId = S.SpeciesID
                WHERE P.UserId = @uid
                GROUP BY P.PondName, S.Name
                ORDER BY TotalLoss DESC
            `);

        const totalMortality = mortResult.recordset.reduce((sum, row) => sum + row.TotalLoss, 0);

        // 2. Feed Efficiency (Total Feed Cost / Quantity)
        const feedResult = await pool.request()
            .input('uid', sql.Int, uid)
            .query(`
                SELECT
                    P.PondName,
                    ISNULL(SUM(F.TotalCost), 0) as TotalFeedCost,
                    ISNULL(SUM(F.Quantity_kg), 0) as TotalFeedKg
                FROM Feed_Logs F
                JOIN Ponds P ON F.PondId = P.PondId
                WHERE P.UserId = @uid
                GROUP BY P.PondName
            `);

        // 3. Water Quality Alerts
        const wqResult = await pool.request()
            .input('uid', sql.Int, uid)
            .query(`
                SELECT TOP 10
                    p.PondName,
                    l.recorded_at as time,
                    l.current_temp, l.current_ph, l.current_do,
                    l.current_ammonia, l.current_nitrite, l.current_nitrate,
                    param.min_temp_celsius, param.max_temp_celsius,
                    param.min_ph, param.max_ph,
                    param.min_dissolved_oxygen_ppm,
                    param.max_ammonia_ppm
                FROM Water_Quality_Logs l
                INNER JOIN Ponds p ON l.PondId = p.PondId
                INNER JOIN Stocking st ON p.PondId = st.CurrentPondId
                INNER JOIN Species s ON st.SpeciesId = s.SpeciesId
                INNER JOIN water_quality_parameters param ON s.SpeciesId = param.SpeciesId
                WHERE p.UserId = @uid AND (
                    l.current_temp < param.min_temp_celsius OR l.current_temp > param.max_temp_celsius OR
                    l.current_ph < param.min_ph OR l.current_ph > param.max_ph OR
                    l.current_do < param.min_dissolved_oxygen_ppm OR
                    l.current_ammonia > param.max_ammonia_ppm
                )
                ORDER BY l.recorded_at DESC
            `);

        const alerts = wqResult.recordset.map(row => {
            let issues = [];
            if (row.current_do < row.min_dissolved_oxygen_ppm) issues.push("Low Oxygen");
            if (row.current_ammonia > row.max_ammonia_ppm) issues.push("Toxic Ammonia");
            if (row.current_temp < row.min_temp_celsius || row.current_temp > row.max_temp_celsius) issues.push("Temp Stress");
            if (row.current_ph < row.min_ph || row.current_ph > row.max_ph) issues.push("pH Imbalance");
            return {
                pond: row.PondName,
                time: row.time,
                issues
            };
        });

        res.json({
            success: true,
            totalMortality,
            mortalityBreakdown: mortResult.recordset.filter(r => r.TotalLoss > 0),
            feedStats: feedResult.recordset.filter(r => r.TotalFeedKg > 0),
            alerts
        });

    } catch (err) {
        console.error("Operations summary error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- FARM SUMMARY: Aggregate overview for Farm Overview tab ---
router.get('/farm-summary', auth, async (req, res) => {
    try {
        const uid = req.user.id;

        // 1. Total Revenue from all harvests
        const revResult = await req.pool.request()
            .input('uid', sql.Int, uid)
            .query(`
                SELECT
                    ISNULL(SUM(CASE WHEN H.Revenue > 0 THEN H.Revenue ELSE H.TotalWeight_kg * ((ISNULL(S.MinMarketPrice,200) + ISNULL(S.MaxMarketPrice,400)) / 2.0) END), 0) as TotalRevenue,
                    COUNT(H.HarvestId) as TotalHarvests,
                    ISNULL(SUM(H.Quantity_pieces), 0) as TotalFishHarvested,
                    ISNULL(SUM(H.TotalWeight_kg), 0) as TotalWeightKg
                FROM Harvest_Logs H
                JOIN Ponds P ON H.PondId = P.PondId
                JOIN Species S ON H.SpeciesId = S.SpeciesID
                WHERE P.UserId = @uid
            `);

        // 2. Total Stocking (Fingerling) Cost
        const stockResult = await req.pool.request()
            .input('uid', sql.Int, uid)
            .query(`
                SELECT ISNULL(SUM(ST.Quantity * ST.PricePerPiece), 0) as TotalStockingCost
                FROM Stocking ST
                JOIN Ponds P ON ST.CurrentPondId = P.PondId OR ST.OriginalPondId = P.PondId
                WHERE P.UserId = @uid
            `);

        // 3. Total Feed Cost
        const feedResult = await req.pool.request()
            .input('uid', sql.Int, uid)
            .query(`
                SELECT ISNULL(SUM(FL.TotalCost), 0) as TotalFeedCost
                FROM Feed_Logs FL
                JOIN Ponds P ON FL.PondId = P.PondId
                WHERE P.UserId = @uid
            `);

        // 4. Total Fertilizer Cost
        const fertResult = await req.pool.request()
            .input('uid', sql.Int, uid)
            .query(`
                SELECT ISNULL(SUM(FTL.TotalCost), 0) as TotalFertCost
                FROM Fertilizers_Logs FTL
                JOIN Ponds P ON FTL.PondId = P.PondId
                WHERE P.UserId = @uid
            `);

        // 5. Total Other Expenses
        const expResult = await req.pool.request()
            .input('uid', sql.Int, uid)
            .query(`
                SELECT ISNULL(SUM(E.Amount), 0) as TotalOtherExp
                FROM Expense_log E
                JOIN Ponds P ON E.PondId = P.PondId
                WHERE P.UserId = @uid
            `);

        // 6. Per-Pond Breakdown (revenue + expenses)
        const pondBreakdown = await req.pool.request()
            .input('uid', sql.Int, uid)
            .query(`
                SELECT
                    P.PondId, P.PondName,
                    ISNULL((SELECT SUM(CASE WHEN H2.Revenue > 0 THEN H2.Revenue ELSE H2.TotalWeight_kg * ((ISNULL(S2.MinMarketPrice,200) + ISNULL(S2.MaxMarketPrice,400)) / 2.0) END)
                            FROM Harvest_Logs H2 JOIN Species S2 ON H2.SpeciesId = S2.SpeciesID WHERE H2.PondId = P.PondId), 0) as Revenue,
                    ISNULL((SELECT SUM(Quantity * PricePerPiece) FROM Stocking WHERE CurrentPondId = P.PondId OR OriginalPondId = P.PondId), 0) as StockingCost,
                    ISNULL((SELECT SUM(TotalCost) FROM Feed_Logs WHERE PondId = P.PondId), 0) as FeedCost,
                    ISNULL((SELECT SUM(TotalCost) FROM Fertilizers_Logs WHERE PondId = P.PondId), 0) as FertCost,
                    ISNULL((SELECT SUM(Amount) FROM Expense_log WHERE PondId = P.PondId), 0) as OtherCost,
                    (SELECT COUNT(*) FROM Harvest_Logs WHERE PondId = P.PondId) as Harvests
                FROM Ponds P
                WHERE P.UserId = @uid
                ORDER BY P.PondName
            `);

        const totalRevenue = Number(revResult.recordset[0].TotalRevenue) || 0;
        const totalStockingCost = Number(stockResult.recordset[0].TotalStockingCost) || 0;
        const totalFeedCost = Number(feedResult.recordset[0].TotalFeedCost) || 0;
        const totalFertCost = Number(fertResult.recordset[0].TotalFertCost) || 0;
        const totalOtherExp = Number(expResult.recordset[0].TotalOtherExp) || 0;
        const totalExpenses = totalStockingCost + totalFeedCost + totalFertCost + totalOtherExp;

        res.json({
            success: true,
            totalRevenue: Math.round(totalRevenue),
            totalExpenses: Math.round(totalExpenses),
            netProfit: Math.round(totalRevenue - totalExpenses),
            totalHarvests: revResult.recordset[0].TotalHarvests || 0,
            totalFishHarvested: revResult.recordset[0].TotalFishHarvested || 0,
            totalWeightKg: revResult.recordset[0].TotalWeightKg || 0,
            expenseCategories: [
                { category: "Fingerlings/Stocking", amount: Math.round(totalStockingCost) },
                { category: "Feed", amount: Math.round(totalFeedCost) },
                { category: "Fertilizer", amount: Math.round(totalFertCost) },
                { category: "Other Expenses", amount: Math.round(totalOtherExp) }
            ].filter(c => c.amount > 0),
            pondBreakdown: pondBreakdown.recordset.map(p => ({
                pondName: p.PondName,
                revenue: Math.round(Number(p.Revenue)),
                expenses: Math.round(Number(p.StockingCost) + Number(p.FeedCost) + Number(p.FertCost) + Number(p.OtherCost)),
                profit: Math.round(Number(p.Revenue) - Number(p.StockingCost) - Number(p.FeedCost) - Number(p.FertCost) - Number(p.OtherCost)),
                harvests: p.Harvests || 0
            }))
        });
    } catch (err) {
        console.error("Farm summary error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// PROJECTION: Estimate future pond performance
// ═══════════════════════════════════════════════════════════════════════════
router.get('/projection', auth, async (req, res) => {
    try {
        const uid = req.user.id;
        const { pondId, period, customDays } = req.query;

        // Determine projection days
        let projDays = 30;
        if (period === 'weekly') projDays = 7;
        else if (period === 'monthly') projDays = 30;
        else if (period === 'yearly') projDays = 365;
        else if (period === 'custom' && customDays) projDays = parseInt(customDays) || 30;

        // Fetch all active batches with species growth data
        const r = req.pool.request().input('uid', sql.Int, uid);
        let pondClause = '';
        if (pondId && pondId !== 'all') {
            r.input('pid', sql.Int, parseInt(pondId));
            pondClause = 'AND p.PondId = @pid';
        }

        const result = await r.query(`
            SELECT
                st.StockId,
                st.Quantity,
                st.CurrentSizeInches,
                st.StockingDate,
                st.PricePerPiece,
                p.PondId,
                p.PondName,
                p.LengthFeet,
                p.WidthFeet,
                p.DepthFeet,
                p.VolumeLiters,
                p.CreatedAt AS PondCreatedAt,
                sp.SpeciesId,
                sp.Name AS SpeciesName,
                ISNULL(sp.FingerlingSizeG, 5) AS FingerlingSizeG,
                ISNULL(sp.MarketSizeKG, 1.0) AS MarketSizeKG,
                ISNULL(sp.HarvestTimeMonths, 6) AS HarvestTimeMonths,
                ISNULL(sp.SurvivalRateLower, 75) AS SurvivalRateLower,
                ISNULL(sp.SurvivalRateUpper, 90) AS SurvivalRateUpper,
                ISNULL(sp.MinMarketPrice, 200) AS MinMarketPrice,
                ISNULL(sp.MaxMarketPrice, 400) AS MaxMarketPrice
            FROM Stocking st
            JOIN Ponds p ON st.CurrentPondId = p.PondId
            JOIN Species sp ON st.SpeciesId = sp.SpeciesId
            WHERE p.UserId = @uid AND st.Quantity > 0 ${pondClause}
            ORDER BY p.PondName, sp.Name
        `);

        const batches = result.recordset;
        const projections = [];

        for (const b of batches) {
            const now = new Date();
            const stockDate = new Date(b.StockingDate);
            const ageNowDays = Math.max(1, Math.floor((now - stockDate) / (1000 * 60 * 60 * 24)));
            const ageFutureDays = ageNowDays + projDays;
            const harvestDays = b.HarvestTimeMonths * 30;

            // Growth model: linear from fingerling to market size over harvest period
            const fingerlingWeightKg = b.FingerlingSizeG / 1000;
            const marketWeightKg = b.MarketSizeKG;
            const dailyGrowthKg = (marketWeightKg - fingerlingWeightKg) / harvestDays;

            const currentWeightKg = Math.min(marketWeightKg, fingerlingWeightKg + (dailyGrowthKg * ageNowDays));
            const projectedWeightKg = Math.min(marketWeightKg, fingerlingWeightKg + (dailyGrowthKg * ageFutureDays));

            // Survival rate: degrades linearly over time (starts at upper, approaches lower by harvest time)
            const survivalRange = b.SurvivalRateUpper - b.SurvivalRateLower;
            const currentSurvivalPct = Math.max(b.SurvivalRateLower, b.SurvivalRateUpper - (survivalRange * (ageNowDays / harvestDays)));
            const projectedSurvivalPct = Math.max(b.SurvivalRateLower, b.SurvivalRateUpper - (survivalRange * (ageFutureDays / harvestDays)));

            const currentAlive = Math.round(b.Quantity * (currentSurvivalPct / 100));
            const projectedAlive = Math.round(b.Quantity * (projectedSurvivalPct / 100));

            // Biomass
            const currentBiomassKg = currentAlive * currentWeightKg;
            const projectedBiomassKg = projectedAlive * projectedWeightKg;

            // Feed requirement: ~3% of body weight per day for the projection period
            const avgBiomassKg = (currentBiomassKg + projectedBiomassKg) / 2;
            const feedRequiredKg = avgBiomassKg * 0.03 * projDays;

            // Market value
            const avgPrice = (b.MinMarketPrice + b.MaxMarketPrice) / 2;
            const currentMarketValue = currentBiomassKg * avgPrice;
            const projectedMarketValue = projectedBiomassKg * avgPrice;

            // Growth progress percentage
            const growthProgress = Math.min(100, ((ageFutureDays / harvestDays) * 100));

            // Feed cost estimate (~Rs 80/kg average feed cost)
            const estimatedFeedCost = feedRequiredKg * 80;

            // Investment so far
            const stockingInvestment = b.Quantity * b.PricePerPiece;

            // Warnings for data sanity
            const warnings = [];
            if (b.Quantity > 100000) warnings.push('Very high quantity — may be test data');
            if (growthProgress > 100) warnings.push('Past expected harvest time');
            if (Math.round(projectedMarketValue) > 10000000) warnings.push('Projected value exceeds Rs 1 Crore — verify data');

            projections.push({
                stockId: b.StockId,
                pondId: b.PondId,
                pondName: b.PondName,
                speciesId: b.SpeciesId,
                speciesName: b.SpeciesName,
                pondDimensions: { length: b.LengthFeet, width: b.WidthFeet, depth: b.DepthFeet, volumeLiters: b.VolumeLiters },
                stockingDate: b.StockingDate,
                pondCreatedAt: b.PondCreatedAt,
                initialQuantity: b.Quantity,
                projectionDays: projDays,
                ageNowDays,
                ageFutureDays,
                harvestDays,
                // Current state
                current: {
                    weightPerFishKg: parseFloat(currentWeightKg.toFixed(3)),
                    survivalPct: parseFloat(currentSurvivalPct.toFixed(1)),
                    aliveCount: currentAlive,
                    biomassKg: parseFloat(currentBiomassKg.toFixed(1)),
                    marketValue: Math.round(currentMarketValue)
                },
                // Projected state
                projected: {
                    weightPerFishKg: parseFloat(projectedWeightKg.toFixed(3)),
                    survivalPct: parseFloat(projectedSurvivalPct.toFixed(1)),
                    aliveCount: projectedAlive,
                    biomassKg: parseFloat(projectedBiomassKg.toFixed(1)),
                    marketValue: Math.round(projectedMarketValue)
                },
                feedRequiredKg: parseFloat(feedRequiredKg.toFixed(1)),
                estimatedFeedCost: Math.round(estimatedFeedCost),
                growthProgress: parseFloat(growthProgress.toFixed(1)),
                stockingInvestment: Math.round(stockingInvestment),
                projectedProfit: Math.round(projectedMarketValue - stockingInvestment - estimatedFeedCost),
                warnings
            });
        }

        // Aggregate summary
        const summary = {
            totalPonds: new Set(projections.map(p => p.pondId)).size,
            totalBatches: projections.length,
            totalCurrentBiomass: parseFloat(projections.reduce((s, p) => s + p.current.biomassKg, 0).toFixed(1)),
            totalProjectedBiomass: parseFloat(projections.reduce((s, p) => s + p.projected.biomassKg, 0).toFixed(1)),
            totalCurrentValue: projections.reduce((s, p) => s + p.current.marketValue, 0),
            totalProjectedValue: projections.reduce((s, p) => s + p.projected.marketValue, 0),
            totalFeedRequired: parseFloat(projections.reduce((s, p) => s + p.feedRequiredKg, 0).toFixed(1)),
            totalFeedCost: projections.reduce((s, p) => s + p.estimatedFeedCost, 0),
            totalInvestment: projections.reduce((s, p) => s + p.stockingInvestment, 0),
            totalProjectedProfit: projections.reduce((s, p) => s + p.projectedProfit, 0)
        };

        res.json({ success: true, period, projectionDays: projDays, summary, projections });
    } catch (err) {
        console.error("Projection error:", err);
        res.status(500).json({ error: "Failed to generate projection", details: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// POND LIFECYCLE: Complete pond history from creation to harvest
// ═══════════════════════════════════════════════════════════════════════════

// --- LIST: All ponds with quick stats for selector UI ---
router.get('/pond-lifecycle-list', auth, async (req, res) => {
    try {
        const uid = req.user.id;
        const result = await req.pool.request()
            .input('uid', sql.Int, uid)
            .query(`
                SELECT
                    P.PondId, P.PondName, P.PondType, P.Size as SizeAcres, P.Stage, P.CultureType,
                    P.CreatedAt,
                    ISNULL((SELECT SUM(Quantity) FROM Stocking WHERE CurrentPondId = P.PondId AND Status != 'Harvested'), 0) as ActiveFish,
                    (SELECT COUNT(DISTINCT SpeciesId) FROM Stocking WHERE CurrentPondId = P.PondId AND Status != 'Harvested') as SpeciesCount,
                    ISNULL((SELECT COUNT(*) FROM Harvest_Logs WHERE PondId = P.PondId), 0) as HarvestCount,
                    ISNULL((SELECT SUM(Quantity_dead) FROM Mortality_Logs WHERE PondId = P.PondId), 0) as TotalMortality,
                    ISNULL((SELECT COUNT(*) FROM Feed_Logs WHERE PondId = P.PondId), 0) as FeedEntries,
                    ISNULL((SELECT COUNT(*) FROM Water_Quality_Logs WHERE PondId = P.PondId), 0) as WaterEntries
                FROM Ponds P
                WHERE P.UserId = @uid
                ORDER BY P.PondName
            `);
        res.json({ success: true, ponds: result.recordset });
    } catch (err) {
        console.error("Pond lifecycle list error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- DETAIL: Full lifecycle report for a single pond ---
router.get('/pond-lifecycle/:pondId', auth, async (req, res) => {
    try {
        const uid = req.user.id;
        const pondId = parseInt(req.params.pondId);
        const pool = req.pool;

        // 1. POND INFO
        const pondResult = await pool.request()
            .input('uid', sql.Int, uid)
            .input('pid', sql.Int, pondId)
            .query(`
                SELECT P.PondId, P.PondName, P.PondType, P.Size as SizeAcres, P.Stage, P.CultureType,
                       P.CultivationType, P.LengthFeet, P.WidthFeet, P.DepthFeet, P.VolumeLiters,
                       P.CreatedAt
                FROM Ponds P
                WHERE P.PondId = @pid AND P.UserId = @uid
            `);
        if (pondResult.recordset.length === 0) {
            return res.status(404).json({ error: "Pond not found or access denied." });
        }
        const pondInfo = pondResult.recordset[0];

        // 2. STOCKING HISTORY (all batches ever in this pond)
        const stockingResult = await pool.request()
            .input('pid', sql.Int, pondId)
            .query(`
                SELECT ST.StockId, ST.Quantity, ST.PricePerPiece, ST.CurrentSizeInches,
                       ST.TargetSizeInches, ST.StockingDate, ST.Status,
                       S.Name as SpeciesName, S.SpeciesID,
                       ISNULL(S.MinMarketPrice, 0) as MinMarketPrice,
                       ISNULL(S.MaxMarketPrice, 0) as MaxMarketPrice
                FROM Stocking ST
                JOIN Species S ON ST.SpeciesId = S.SpeciesID
                WHERE ST.CurrentPondId = @pid OR ST.OriginalPondId = @pid
                ORDER BY ST.StockingDate ASC
            `);

        // 3. FEED LOGS
        const feedResult = await pool.request()
            .input('pid', sql.Int, pondId)
            .query(`
                SELECT FL.LogId, FL.FeedDate, FL.Quantity_kg, FL.TotalCost, FL.FeedType,
                       S.Name as SpeciesName
                FROM Feed_Logs FL
                LEFT JOIN Species S ON FL.SpeciesID = S.SpeciesID
                WHERE FL.PondId = @pid
                ORDER BY FL.FeedDate DESC
            `);

        // 4. FERTILIZER LOGS
        const fertResult = await pool.request()
            .input('pid', sql.Int, pondId)
            .query(`
                SELECT FTL.LogId, FTL.ApplicationDate, FTL.FertilizerType,
                       FTL.Quantity_kg, FTL.TotalCost
                FROM Fertilizers_Logs FTL
                WHERE FTL.PondId = @pid
                ORDER BY FTL.ApplicationDate DESC
            `);

        // 5. WATER QUALITY LOGS
        const wqResult = await pool.request()
            .input('pid', sql.Int, pondId)
            .query(`
                SELECT TOP 50 WQ.LogId, WQ.recorded_at,
                       WQ.current_temp, WQ.current_ph, WQ.current_do,
                       WQ.current_ammonia, WQ.current_nitrite, WQ.current_nitrate
                FROM Water_Quality_Logs WQ
                WHERE WQ.PondId = @pid
                ORDER BY WQ.recorded_at DESC
            `);

        // 6. MORTALITY LOGS
        const mortResult = await pool.request()
            .input('pid', sql.Int, pondId)
            .query(`
                SELECT M.MortalityId, M.Date_of_death, M.Quantity_dead, M.Cause,
                       S.Name as SpeciesName
                FROM Mortality_Logs M
                JOIN Species S ON M.SpeciesId = S.SpeciesID
                WHERE M.PondId = @pid
                ORDER BY M.Date_of_death DESC
            `);

        // 7. DISEASE OUTBREAKS
        let diseaseResult = { recordset: [] };
        try {
            diseaseResult = await pool.request()
                .input('pid', sql.Int, pondId)
                .query(`
                    SELECT DO.OutbreakId, DO.DetectedDate, DO.ResolvedDate, DO.Status, DO.Notes,
                           DC.DiseaseName, DC.Severity
                    FROM Disease_Outbreaks DO
                    JOIN Disease_Catalog DC ON DO.DiseaseId = DC.DiseaseId
                    WHERE DO.PondId = @pid
                    ORDER BY DO.DetectedDate DESC
                `);
        } catch (e) {
            // Disease tables may not exist in all setups
            console.log("Disease data not available:", e.message);
        }

        // 8. EXPENSE LOGS
        const expResult = await pool.request()
            .input('pid', sql.Int, pondId)
            .query(`
                SELECT E.ExpenseId, E.Date, E.Category, E.Amount, E.Description
                FROM Expense_log E
                WHERE E.PondId = @pid
                ORDER BY E.Date DESC
            `);

        // 9. HARVEST LOGS
        await ensureHarvestSchema(pool);
        const harvestResult = await pool.request()
            .input('pid', sql.Int, pondId)
            .query(`
                SELECT H.HarvestId, H.HarvestDate, H.Quantity_pieces, H.TotalWeight_kg,
                       H.Remaining_Pieces, H.Note,
                       ISNULL(H.Revenue, 0) as Revenue,
                       ISNULL(H.FingerlingCost, 0) as FingerlingCost,
                       ISNULL(H.FeedCost, 0) as FeedCost,
                       ISNULL(H.FertilizerCost, 0) as FertilizerCost,
                       ISNULL(H.OtherCost, 0) as OtherCost,
                       S.Name as SpeciesName
                FROM Harvest_Logs H
                JOIN Species S ON H.SpeciesId = S.SpeciesID
                WHERE H.PondId = @pid
                ORDER BY H.HarvestDate DESC
            `);

        // ═══ FINANCIAL SUMMARY (Calculated) ═══
        const totalStockingCost = stockingResult.recordset.reduce((sum, s) => sum + (s.Quantity * s.PricePerPiece), 0);
        const totalFeedCost = feedResult.recordset.reduce((sum, f) => sum + (Number(f.TotalCost) || 0), 0);
        const totalFertCost = fertResult.recordset.reduce((sum, f) => sum + (Number(f.TotalCost) || 0), 0);
        const totalOtherExp = expResult.recordset.reduce((sum, e) => sum + (Number(e.Amount) || 0), 0);
        const totalInvestment = totalStockingCost + totalFeedCost + totalFertCost + totalOtherExp;

        const totalHarvestRevenue = harvestResult.recordset.reduce((sum, h) => {
            let rev = Number(h.Revenue) || 0;
            if (rev === 0 && h.TotalWeight_kg > 0) {
                // Estimate from weight if no saved revenue
                const stock = stockingResult.recordset.find(s => s.SpeciesName === h.SpeciesName);
                if (stock) {
                    rev = h.TotalWeight_kg * ((stock.MinMarketPrice + stock.MaxMarketPrice) / 2);
                }
            }
            return sum + rev;
        }, 0);

        const totalHarvestWeight = harvestResult.recordset.reduce((sum, h) => sum + (Number(h.TotalWeight_kg) || 0), 0);
        const totalHarvestQty = harvestResult.recordset.reduce((sum, h) => sum + (Number(h.Quantity_pieces) || 0), 0);
        const totalMortality = mortResult.recordset.reduce((sum, m) => sum + (Number(m.Quantity_dead) || 0), 0);
        const netProfit = totalHarvestRevenue - totalInvestment;
        const roiPercent = totalInvestment > 0 ? ((netProfit / totalInvestment) * 100) : 0;
        const costPerKg = totalHarvestWeight > 0 ? (totalInvestment / totalHarvestWeight) : 0;

        // Age of pond in days
        const pondAgeDays = Math.ceil(Math.abs(new Date() - new Date(pondInfo.CreatedAt)) / (1000 * 60 * 60 * 24));

        res.json({
            success: true,
            pondInfo: { ...pondInfo, pondAgeDays },
            stocking: stockingResult.recordset,
            feedLogs: feedResult.recordset,
            fertilizerLogs: fertResult.recordset,
            waterQualityLogs: wqResult.recordset,
            mortalityLogs: mortResult.recordset,
            diseaseOutbreaks: diseaseResult.recordset,
            expenses: expResult.recordset,
            harvests: harvestResult.recordset,
            financialSummary: {
                totalStockingCost: Math.round(totalStockingCost),
                totalFeedCost: Math.round(totalFeedCost),
                totalFertilizerCost: Math.round(totalFertCost),
                totalOtherExpenses: Math.round(totalOtherExp),
                totalInvestment: Math.round(totalInvestment),
                totalHarvestRevenue: Math.round(totalHarvestRevenue),
                totalHarvestWeight: parseFloat(totalHarvestWeight.toFixed(1)),
                totalHarvestQuantity: totalHarvestQty,
                totalMortality,
                netProfit: Math.round(netProfit),
                roiPercent: parseFloat(roiPercent.toFixed(1)),
                costPerKg: Math.round(costPerKg),
                expenseBreakdown: [
                    { category: "Fingerlings/Stocking", amount: Math.round(totalStockingCost) },
                    { category: "Feed", amount: Math.round(totalFeedCost) },
                    { category: "Fertilizer", amount: Math.round(totalFertCost) },
                    { category: "Other Expenses", amount: Math.round(totalOtherExp) }
                ].filter(c => c.amount > 0)
            }
        });

    } catch (err) {
        console.error("Pond lifecycle error:", err);
        res.status(500).json({ error: "Failed to generate pond lifecycle report", details: err.message });
    }
});

module.exports = router;