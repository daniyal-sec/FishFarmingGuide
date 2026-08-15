const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { poolPromise } = require('../config/db'); // Using poolPromise for consistency
const auth = require('../middleware/auth');

// 1. GET: Fetch all regions (Master Data for dropdowns)
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT RegionId, RegionName as Name, Province, ClimateConditions as climate, WaterAvailability as water, PeakFarmingSeason as season, RecommendedPondSize as pondSize, CommonChallenges as challenges, ExpertTips as tips FROM Regions ORDER BY RegionName');

        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ error: "Failed to fetch regions", message: err.message });
    }
});

// 2. GET: Fetch a SINGLE region by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('RegionId', sql.Int, id)
            .query('SELECT * FROM Regions WHERE RegionId = @RegionId');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Region not found" });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

module.exports = router;