// ═══════════════════════════════════════════════════════════════════════════
// rulesRoutes.js — Admin Rules Management
// Handles: Feed Rules, Fertilizer Rules (expandable to Stocking & Compat.)
// Tables: Admin_Feed_Rules, Admin_Fertilizer_Rules (auto-created)
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const auth = require('../middleware/auth');


// ─── MIDDLEWARE: Admin check ─────────────────────────────────────────────
function adminOnly(req, res, next) {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
    next();
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: FEED RULES CRUD
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/rules/feed — List all feed rules
router.get('/feed', auth, async (req, res) => {
    try {
        const pool = req.pool;
        const result = await pool.request().query(`
            SELECT R.*, S.Name AS ResolvedSpeciesName
            FROM Feed_Rules R
            LEFT JOIN Species S ON R.SpeciesID = S.SpeciesId
            ORDER BY S.Name ASC, R.Stage ASC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch feed rules" });
    }
});

// POST /api/rules/feed — Add a new feed rule
router.post('/feed', auth, adminOnly, async (req, res) => {
    try {
        const pool = req.pool;
        const { speciesId, stage, minSize, maxSize, dailyRate, conditionFactor, feedType, frequency } = req.body;

        await pool.request()
            .input('speciesId', sql.Int, speciesId || null)
            .input('stage', sql.NVarChar, stage || '')
            .input('minSize', sql.Float, minSize || 0)
            .input('maxSize', sql.Float, maxSize || 0)
            .input('dailyRate', sql.Float, dailyRate || 0)
            .input('conditionFactor', sql.Float, conditionFactor || 0)
            .input('feedType', sql.NVarChar, feedType || '')
            .input('frequency', sql.NVarChar, frequency || '')
            .query(`
                INSERT INTO Feed_Rules (SpeciesID, Stage, MinSize_inch, MaxSize_inch, DailyRate_Percent, ConditionFactor_K, FeedType, Frequency)
                VALUES (@speciesId, @stage, @minSize, @maxSize, @dailyRate, @conditionFactor, @feedType, @frequency)
            `);
        res.status(201).json({ success: true, message: "Feed rule added" });
    } catch (err) {
        res.status(500).json({ error: "Failed to add feed rule" });
    }
});

// PUT /api/rules/feed/:id — Update a feed rule
router.put('/feed/:id', auth, adminOnly, async (req, res) => {
    try {
        const pool = req.pool;
        const { speciesId, stage, minSize, maxSize, dailyRate, conditionFactor, feedType, frequency } = req.body;

        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('speciesId', sql.Int, speciesId || null)
            .input('stage', sql.NVarChar, stage || '')
            .input('minSize', sql.Float, minSize || 0)
            .input('maxSize', sql.Float, maxSize || 0)
            .input('dailyRate', sql.Float, dailyRate || 0)
            .input('conditionFactor', sql.Float, conditionFactor || 0)
            .input('feedType', sql.NVarChar, feedType || '')
            .input('frequency', sql.NVarChar, frequency || '')
            .query(`
                UPDATE Feed_Rules
                SET SpeciesID = @speciesId, Stage = @stage,
                    MinSize_inch = @minSize, MaxSize_inch = @maxSize, DailyRate_Percent = @dailyRate,
                    ConditionFactor_K = @conditionFactor, FeedType = @feedType, Frequency = @frequency
                WHERE RuleId = @id
            `);
        res.json({ success: true, message: "Feed rule updated" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update feed rule" });
    }
});

// DELETE /api/rules/feed/:id — Delete a feed rule
router.delete('/feed/:id', auth, adminOnly, async (req, res) => {
    try {
        await req.pool.request()
            .input('id', sql.Int, req.params.id)
            .query("DELETE FROM Feed_Rules WHERE RuleId = @id");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete feed rule" });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: FERTILIZER RULES CRUD
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/rules/fertilizer — List all fertilizer rules
router.get('/fertilizer', auth, async (req, res) => {
    try {
        const pool = req.pool;
        const result = await pool.request().query("SELECT * FROM fertilizer_recommendations ORDER BY CultivationType ASC, PondType ASC");
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch fertilizer rules" });
    }
});

// POST /api/rules/fertilizer — Add a new fertilizer rule
router.post('/fertilizer', auth, adminOnly, async (req, res) => {
    try {
        const pool = req.pool;
        const d = req.body;

        await pool.request()
            .input('CultivationType', sql.NVarChar, d.CultivationType || '')
            .input('PondType', sql.NVarChar, d.PondType || '')
            .input('Org_Product', sql.NVarChar, d.Org_Product || '')
            .input('Org_Dosage_kg_Acre', sql.Float, d.Org_Dosage_kg_Acre || 0)
            .input('Org_Rate_PKR', sql.Float, d.Org_Rate_PKR || 0)
            .input('Org_Frequency', sql.NVarChar, d.Org_Frequency || '')
            .input('Org_Benefits', sql.NVarChar, d.Org_Benefits || '')
            .input('Inorg_Product', sql.NVarChar, d.Inorg_Product || '')
            .input('Inorg_Dosage_kg_Acre', sql.Float, d.Inorg_Dosage_kg_Acre || 0)
            .input('Inorg_Rate_PKR', sql.Float, d.Inorg_Rate_PKR || 0)
            .input('Inorg_Frequency', sql.NVarChar, d.Inorg_Frequency || '')
            .input('Inorg_Benefits', sql.NVarChar, d.Inorg_Benefits || '')
            .input('Lime_Product', sql.NVarChar, d.Lime_Product || '')
            .input('Lime_Dosage_kg_Acre', sql.Float, d.Lime_Dosage_kg_Acre || 0)
            .input('Lime_Rate_PKR', sql.Float, d.Lime_Rate_PKR || 0)
            .input('Lime_Frequency', sql.NVarChar, d.Lime_Frequency || '')
            .input('Lime_Benefits', sql.NVarChar, d.Lime_Benefits || '')
            .query(`
                INSERT INTO fertilizer_recommendations (
                    CultivationType, PondType,
                    Org_Product, Org_Dosage_kg_Acre, Org_Rate_PKR, Org_Frequency, Org_Benefits,
                    Inorg_Product, Inorg_Dosage_kg_Acre, Inorg_Rate_PKR, Inorg_Frequency, Inorg_Benefits,
                    Lime_Product, Lime_Dosage_kg_Acre, Lime_Rate_PKR, Lime_Frequency, Lime_Benefits
                )
                VALUES (
                    @CultivationType, @PondType,
                    @Org_Product, @Org_Dosage_kg_Acre, @Org_Rate_PKR, @Org_Frequency, @Org_Benefits,
                    @Inorg_Product, @Inorg_Dosage_kg_Acre, @Inorg_Rate_PKR, @Inorg_Frequency, @Inorg_Benefits,
                    @Lime_Product, @Lime_Dosage_kg_Acre, @Lime_Rate_PKR, @Lime_Frequency, @Lime_Benefits
                )
            `);
        res.status(201).json({ success: true, message: "Fertilizer rule added" });
    } catch (err) {
        res.status(500).json({ error: "Failed to add fertilizer rule" });
    }
});

// PUT /api/rules/fertilizer/:id — Update a fertilizer rule
router.put('/fertilizer/:id', auth, adminOnly, async (req, res) => {
    try {
        const pool = req.pool;
        const d = req.body;

        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('CultivationType', sql.NVarChar, d.CultivationType || '')
            .input('PondType', sql.NVarChar, d.PondType || '')
            .input('Org_Product', sql.NVarChar, d.Org_Product || '')
            .input('Org_Dosage_kg_Acre', sql.Float, d.Org_Dosage_kg_Acre || 0)
            .input('Org_Rate_PKR', sql.Float, d.Org_Rate_PKR || 0)
            .input('Org_Frequency', sql.NVarChar, d.Org_Frequency || '')
            .input('Org_Benefits', sql.NVarChar, d.Org_Benefits || '')
            .input('Inorg_Product', sql.NVarChar, d.Inorg_Product || '')
            .input('Inorg_Dosage_kg_Acre', sql.Float, d.Inorg_Dosage_kg_Acre || 0)
            .input('Inorg_Rate_PKR', sql.Float, d.Inorg_Rate_PKR || 0)
            .input('Inorg_Frequency', sql.NVarChar, d.Inorg_Frequency || '')
            .input('Inorg_Benefits', sql.NVarChar, d.Inorg_Benefits || '')
            .input('Lime_Product', sql.NVarChar, d.Lime_Product || '')
            .input('Lime_Dosage_kg_Acre', sql.Float, d.Lime_Dosage_kg_Acre || 0)
            .input('Lime_Rate_PKR', sql.Float, d.Lime_Rate_PKR || 0)
            .input('Lime_Frequency', sql.NVarChar, d.Lime_Frequency || '')
            .input('Lime_Benefits', sql.NVarChar, d.Lime_Benefits || '')
            .query(`
                UPDATE fertilizer_recommendations
                SET CultivationType = @CultivationType, PondType = @PondType,
                    Org_Product = @Org_Product, Org_Dosage_kg_Acre = @Org_Dosage_kg_Acre,
                    Org_Rate_PKR = @Org_Rate_PKR, Org_Frequency = @Org_Frequency, Org_Benefits = @Org_Benefits,
                    Inorg_Product = @Inorg_Product, Inorg_Dosage_kg_Acre = @Inorg_Dosage_kg_Acre,
                    Inorg_Rate_PKR = @Inorg_Rate_PKR, Inorg_Frequency = @Inorg_Frequency, Inorg_Benefits = @Inorg_Benefits,
                    Lime_Product = @Lime_Product, Lime_Dosage_kg_Acre = @Lime_Dosage_kg_Acre,
                    Lime_Rate_PKR = @Lime_Rate_PKR, Lime_Frequency = @Lime_Frequency, Lime_Benefits = @Lime_Benefits
                WHERE RecId = @id
            `);
        res.json({ success: true, message: "Fertilizer rule updated" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update fertilizer rule" });
    }
});

// DELETE /api/rules/fertilizer/:id — Delete a fertilizer rule
router.delete('/fertilizer/:id', auth, adminOnly, async (req, res) => {
    try {
        await req.pool.request()
            .input('id', sql.Int, req.params.id)
            .query("DELETE FROM fertilizer_recommendations WHERE RecId = @id");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete fertilizer rule" });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: STOCKING RULES CRUD
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/rules/stocking — List all stocking rules
router.get('/stocking', auth, async (req, res) => {
    try {
        const pool = req.pool;
        const result = await pool.request().query("SELECT * FROM StockingRules ORDER BY Stage ASC, CultivationType ASC");
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch stocking rules" });
    }
});

// POST /api/rules/stocking — Add a new stocking rule
router.post('/stocking', auth, adminOnly, async (req, res) => {
    try {
        const pool = req.pool;
        const { stage, cultivationType, cultureType, minFishPerAcre, maxFishPerAcre, maxSpeciesAllowed } = req.body;

        await pool.request()
            .input('stage', sql.NVarChar, stage || '')
            .input('cultivationType', sql.NVarChar, cultivationType || '')
            .input('cultureType', sql.NVarChar, cultureType || '')
            .input('minFishPerAcre', sql.Int, minFishPerAcre || 0)
            .input('maxFishPerAcre', sql.Int, maxFishPerAcre || 0)
            .input('maxSpeciesAllowed', sql.Int, maxSpeciesAllowed || 0)
            .query(`
                INSERT INTO StockingRules (
                    Stage, CultivationType, CultureType, MinFishPerAcre, MaxFishPerAcre, MaxSpeciesAllowed,
                    SmallMinPerAcre, SmallMaxPerAcre, MediumMinPerAcre, MediumMaxPerAcre, LargeMinPerAcre, LargeMaxPerAcre
                )
                VALUES (
                    @stage, @cultivationType, @cultureType, @minFishPerAcre, @maxFishPerAcre, @maxSpeciesAllowed,
                    CAST(@minFishPerAcre * 1.5 AS INT), CAST(@maxFishPerAcre * 1.5 AS INT),
                    CAST(@minFishPerAcre * 1.0 AS INT), CAST(@maxFishPerAcre * 1.0 AS INT),
                    CAST(@minFishPerAcre * 0.6 AS INT), CAST(@maxFishPerAcre * 0.6 AS INT)
                )
            `);
        res.status(201).json({ success: true, message: "Stocking rule added" });
    } catch (err) {
        res.status(500).json({ error: "Failed to add stocking rule" });
    }
});

// PUT /api/rules/stocking/:id — Update a stocking rule
router.put('/stocking/:id', auth, adminOnly, async (req, res) => {
    try {
        const pool = req.pool;
        const { stage, cultivationType, cultureType, minFishPerAcre, maxFishPerAcre, maxSpeciesAllowed } = req.body;

        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('stage', sql.NVarChar, stage || '')
            .input('cultivationType', sql.NVarChar, cultivationType || '')
            .input('cultureType', sql.NVarChar, cultureType || '')
            .input('minFishPerAcre', sql.Int, minFishPerAcre || 0)
            .input('maxFishPerAcre', sql.Int, maxFishPerAcre || 0)
            .input('maxSpeciesAllowed', sql.Int, maxSpeciesAllowed || 0)
            .query(`
                UPDATE StockingRules
                SET Stage = @stage, CultivationType = @cultivationType,
                    CultureType = @cultureType, MinFishPerAcre = @minFishPerAcre,
                    MaxFishPerAcre = @maxFishPerAcre, MaxSpeciesAllowed = @maxSpeciesAllowed,
                    SmallMinPerAcre = CAST(@minFishPerAcre * 1.5 AS INT),
                    SmallMaxPerAcre = CAST(@maxFishPerAcre * 1.5 AS INT),
                    MediumMinPerAcre = CAST(@minFishPerAcre * 1.0 AS INT),
                    MediumMaxPerAcre = CAST(@maxFishPerAcre * 1.0 AS INT),
                    LargeMinPerAcre = CAST(@minFishPerAcre * 0.6 AS INT),
                    LargeMaxPerAcre = CAST(@maxFishPerAcre * 0.6 AS INT)
                WHERE RuleId = @id
            `);
        res.json({ success: true, message: "Stocking rule updated" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update stocking rule" });
    }
});

// DELETE /api/rules/stocking/:id — Delete a stocking rule
router.delete('/stocking/:id', auth, adminOnly, async (req, res) => {
    try {
        await req.pool.request()
            .input('id', sql.Int, req.params.id)
            .query("DELETE FROM StockingRules WHERE RuleId = @id");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete stocking rule" });
    }
});

// ==========================================
// SPECIES COMPATIBILITY RULES
// ==========================================

// GET all compatibility rules
router.get('/compatibility', auth, adminOnly, async (req, res) => {
    try {
        const result = await req.pool.request().query(`
            SELECT
                c.CompatibilityId,
                c.SpeciesId,
                c.CompatibleWithId,
                s1.Name AS SpeciesName,
                s2.Name AS CompatibleSpeciesName,
                c.CompatibilityReason
            FROM SpeciesCompatibility c
            INNER JOIN Species s1 ON c.SpeciesId = s1.SpeciesId
            INNER JOIN Species s2 ON c.CompatibleWithId = s2.SpeciesId
            ORDER BY s1.Name, s2.Name
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Error fetching compatibility rules:", err);
        res.status(500).json({ error: "Failed to fetch compatibility rules" });
    }
});

// POST new compatibility rule
router.post('/compatibility', auth, adminOnly, async (req, res) => {
    try {
        const { SpeciesId, CompatibleWithId, CompatibilityReason } = req.body;
        await req.pool.request()
            .input('SpeciesId', sql.Int, SpeciesId)
            .input('CompatibleWithId', sql.Int, CompatibleWithId)
            .input('CompatibilityReason', sql.NVarChar, CompatibilityReason)
            .query(`
                INSERT INTO SpeciesCompatibility (SpeciesId, CompatibleWithId, CompatibilityReason)
                VALUES (@SpeciesId, @CompatibleWithId, @CompatibilityReason)
            `);
        res.json({ success: true });
    } catch (err) {
        console.error("Error adding compatibility rule:", err);
        res.status(500).json({ error: "Failed to add compatibility rule" });
    }
});

// PUT update compatibility rule
router.put('/compatibility/:id', auth, adminOnly, async (req, res) => {
    try {
        const { SpeciesId, CompatibleWithId, CompatibilityReason } = req.body;
        await req.pool.request()
            .input('id', sql.Int, req.params.id)
            .input('SpeciesId', sql.Int, SpeciesId)
            .input('CompatibleWithId', sql.Int, CompatibleWithId)
            .input('CompatibilityReason', sql.NVarChar, CompatibilityReason)
            .query(`
                UPDATE SpeciesCompatibility
                SET SpeciesId = @SpeciesId,
                    CompatibleWithId = @CompatibleWithId,
                    CompatibilityReason = @CompatibilityReason
                WHERE CompatibilityId = @id
            `);
        res.json({ success: true });
    } catch (err) {
        console.error("Error updating compatibility rule:", err);
        res.status(500).json({ error: "Failed to update compatibility rule" });
    }
});

// DELETE compatibility rule
router.delete('/compatibility/:id', auth, adminOnly, async (req, res) => {
    try {
        await req.pool.request()
            .input('id', sql.Int, req.params.id)
            .query("DELETE FROM SpeciesCompatibility WHERE CompatibilityId = @id");
        res.json({ success: true });
    } catch (err) {
        console.error("Error deleting compatibility rule:", err);
        res.status(500).json({ error: "Failed to delete compatibility rule" });
    }
});

module.exports = router;
