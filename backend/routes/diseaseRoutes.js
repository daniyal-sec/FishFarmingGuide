// ═══════════════════════════════════════════════════════════════════════════
// diseaseRoutes.js — Disease Library + Outbreak Tracking + Admin Catalog
// Tables: Disease_Library (extended), Disease_Outbreaks
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const auth = require('../middleware/auth');

// ─── HELPER: Ensure Disease_Library has all needed columns ──────────────
let catalogChecked = false;
async function ensureCatalogColumns(pool) {
    if (catalogChecked) return;
    try {
        await pool.request().query(`
            IF COL_LENGTH('Disease_Library', 'Category') IS NULL
                ALTER TABLE Disease_Library ADD Category NVARCHAR(100) DEFAULT 'General';
            IF COL_LENGTH('Disease_Library', 'Severity') IS NULL
                ALTER TABLE Disease_Library ADD Severity NVARCHAR(50) DEFAULT 'Moderate';
            IF COL_LENGTH('Disease_Library', 'AffectedSpecies') IS NULL
                ALTER TABLE Disease_Library ADD AffectedSpecies NVARCHAR(500) DEFAULT 'All freshwater species';
            IF COL_LENGTH('Disease_Library', 'IsActive') IS NULL
                ALTER TABLE Disease_Library ADD IsActive BIT DEFAULT 1;
        `);
        catalogChecked = true;
    } catch (err) {
        console.error("Disease catalog column check:", err.message);
        catalogChecked = true; // Don't retry on error
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: DISEASE LIBRARY (read by farmers, managed by admin)
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/diseases/library — All diseases (for farmers and admin)
router.get('/library', auth, async (req, res) => {
    try {
        await ensureCatalogColumns(req.pool);
        const result = await req.pool.request().query(`
            SELECT *, ISNULL(IsActive, 1) AS IsActive
            FROM Disease_Library
            ORDER BY Name ASC
        `);

        // Enrich with live outbreak data — species actually affected across all farms
        const outbreakStats = await req.pool.request().query(`
            SELECT
                o2.DiseaseName,
                STUFF((
                    SELECT DISTINCT ', ' + ISNULL(sp2.Name, 'Unknown')
                    FROM Disease_Outbreaks o3
                    LEFT JOIN Stocking s2 ON o3.BatchId = s2.StockId
                    LEFT JOIN Species sp2 ON s2.SpeciesId = sp2.SpeciesId
                    WHERE o3.DiseaseName = o2.DiseaseName
                    FOR XML PATH(''), TYPE
                ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS LiveAffectedSpecies,
                COUNT(DISTINCT o2.OutbreakId) AS TotalOutbreaks,
                SUM(CASE WHEN o2.Status = 'Active' THEN 1 ELSE 0 END) AS ActiveOutbreaks
            FROM Disease_Outbreaks o2
            GROUP BY o2.DiseaseName
        `);

        const statsMap = {};
        (outbreakStats.recordset || []).forEach(s => { statsMap[s.DiseaseName] = s; });

        const enriched = result.recordset.map(d => ({
            ...d,
            LiveAffectedSpecies: statsMap[d.Name]?.LiveAffectedSpecies || null,
            TotalOutbreaks: statsMap[d.Name]?.TotalOutbreaks || 0,
            ActiveOutbreaks: statsMap[d.Name]?.ActiveOutbreaks || 0
        }));

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/diseases/library — Admin adds a new disease to the catalog
router.post('/library', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
    try {
        await ensureCatalogColumns(req.pool);
        const { name, category, severity, affectedSpecies, symptoms, treatment, prevention } = req.body;

        if (!name) return res.status(400).json({ error: "Disease name is required" });

        await req.pool.request()
            .input('name', sql.NVarChar, name)
            .input('category', sql.NVarChar, category || 'General')
            .input('severity', sql.NVarChar, severity || 'Moderate')
            .input('affected', sql.NVarChar, affectedSpecies || 'All freshwater species')
            .input('symptoms', sql.NVarChar, symptoms || '')
            .input('treatment', sql.NVarChar, treatment || '')
            .input('prevention', sql.NVarChar, prevention || '')
            .query(`
                INSERT INTO Disease_Library (Name, Category, Severity, AffectedSpecies, Symptoms, Treatment, Prevention, IsActive)
                VALUES (@name, @category, @severity, @affected, @symptoms, @treatment, @prevention, 1)
            `);
        res.status(201).json({ success: true, message: "Disease added to catalog" });
    } catch (err) {
        console.error("Add disease error:", err);
        res.status(500).json({ error: "Failed to add disease", details: err.message });
    }
});

// PUT /api/diseases/library/:id — Admin edits a disease entry
router.put('/library/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
    try {
        await ensureCatalogColumns(req.pool);
        const { name, category, severity, affectedSpecies, symptoms, treatment, prevention } = req.body;

        await req.pool.request()
            .input('id', sql.Int, req.params.id)
            .input('name', sql.NVarChar, name)
            .input('category', sql.NVarChar, category || 'General')
            .input('severity', sql.NVarChar, severity || 'Moderate')
            .input('affected', sql.NVarChar, affectedSpecies || '')
            .input('symptoms', sql.NVarChar, symptoms || '')
            .input('treatment', sql.NVarChar, treatment || '')
            .input('prevention', sql.NVarChar, prevention || '')
            .query(`
                UPDATE Disease_Library
                SET Name = @name, Category = @category, Severity = @severity,
                    AffectedSpecies = @affected, Symptoms = @symptoms,
                    Treatment = @treatment, Prevention = @prevention
                WHERE DiseaseId = @id
            `);
        res.json({ success: true, message: "Disease updated" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update disease" });
    }
});

// PUT /api/diseases/library/:id/status — Toggle active/inactive
router.put('/library/:id/status', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
    try {
        await ensureCatalogColumns(req.pool);
        await req.pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                UPDATE Disease_Library
                SET IsActive = CASE WHEN ISNULL(IsActive, 1) = 1 THEN 0 ELSE 1 END
                WHERE DiseaseId = @id
            `);
        res.json({ success: true, message: "Status toggled" });
    } catch (err) {
        res.status(500).json({ error: "Failed to toggle status" });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: DISEASE OUTBREAKS (farmer-side tracking)
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/diseases/outbreaks/all — Admin: all outbreaks across all farms
router.get('/outbreaks/all', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
    try {
        const result = await req.pool.request().query(`
            SELECT
                o.OutbreakId,
                o.PondId,
                o.BatchId,
                o.DiseaseName,
                o.Severity,
                o.EstimatedAffected,
                o.Status,
                o.LoggedDate,
                o.ResolvedDate,
                p.PondName,
                u.FullName AS FarmerName,
                u.FarmName,
                u.Email AS FarmerEmail,
                ISNULL(sp.Name, 'All species') AS SpeciesName
            FROM Disease_Outbreaks o
            JOIN Ponds p ON o.PondId = p.PondId
            JOIN Users u ON p.UserId = u.UserId
            LEFT JOIN Stocking s ON o.BatchId = s.StockId
            LEFT JOIN Species sp ON s.SpeciesId = sp.SpeciesId
            ORDER BY o.LoggedDate DESC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Admin outbreaks fetch error:", err);
        res.status(500).json({ error: "Failed to fetch outbreaks", details: err.message });
    }
});

// GET /api/diseases/outbreaks/active — Active outbreaks for current user
router.get('/outbreaks/active', auth, async (req, res) => {
    try {
        const uId = req.user.id;
        const result = await req.pool.request()
            .input('uid', sql.Int, uId)
            .query(`
                SELECT o.*, p.PondName
                FROM Disease_Outbreaks o
                JOIN Ponds p ON o.PondId = p.PondId
                WHERE p.UserId = @uid AND o.Status = 'Active'
                ORDER BY o.LoggedDate DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/diseases/outbreaks/log — Log a new disease outbreak
router.post('/outbreaks/log', auth, async (req, res) => {
    try {
        const { pondId, batchId, diseaseName, severity, estimatedAffected } = req.body;

        await req.pool.request()
            .input('pid', sql.BigInt, pondId)
            .input('bid', sql.BigInt, batchId || null)
            .input('name', sql.NVarChar, diseaseName)
            .input('sev', sql.NVarChar, severity)
            .input('affected', sql.Int, estimatedAffected || 0)
            .query(`
                INSERT INTO Disease_Outbreaks (PondId, BatchId, DiseaseName, Severity, EstimatedAffected, Status)
                VALUES (@pid, @bid, @name, @sev, @affected, 'Active')
            `);

        res.status(201).json({ success: true, message: "Disease outbreak logged successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/diseases/outbreaks/:id/resolve — Resolve an outbreak
router.put('/outbreaks/:id/resolve', auth, async (req, res) => {
    try {
        const { id } = req.params;
        await req.pool.request()
            .input('oid', sql.Int, id)
            .query("UPDATE Disease_Outbreaks SET Status = 'Resolved', ResolvedDate = GETDATE() WHERE OutbreakId = @oid");

        res.json({ success: true, message: "Outbreak marked as resolved" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
