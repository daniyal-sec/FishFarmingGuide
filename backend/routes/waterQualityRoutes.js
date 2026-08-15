const express = require('express');
const router = express.Router();
const sql = require('mssql');
const auth = require('../middleware/auth');

// --- 1. PARAMETERS: Update Rulebook ---
router.put('/parameters/:regionId/:speciesId', auth, async (req, res) => {
    try {
        const {
            min_temp_celsius, max_temp_celsius,
            min_ph, max_ph,
            min_dissolved_oxygen_ppm, max_ammonia_ppm
        } = req.body;

        const { regionId, speciesId } = req.params;
        const pool = req.pool;

        const result = await pool.request()
            .input('RegionId', sql.Int, regionId)
            .input('SpeciesId', sql.Int, speciesId)
            .input('minTemp', sql.Float, min_temp_celsius)
            .input('maxTemp', sql.Float, max_temp_celsius)
            .input('minPh', sql.Float, min_ph)
            .input('maxPh', sql.Float, max_ph)
            .input('minDo', sql.Float, min_dissolved_oxygen_ppm)
            .input('maxAm', sql.Float, max_ammonia_ppm)
            .query(`
                UPDATE water_quality_parameters
                SET min_temp_celsius = @minTemp,
                    max_temp_celsius = @maxTemp,
                    min_ph = @minPh,
                    max_ph = @maxPh,
                    min_dissolved_oxygen_ppm = @minDo,
                    max_ammonia_ppm = @maxAm
                WHERE RegionId = @RegionId AND SpeciesId = @SpeciesId
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: "No parameters found for this Region and Species." });
        }

        res.json({ message: "Parameters updated successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 2. LOGS: Record New Readings ---
router.post('/logs', auth, async (req, res) => {
    try {
        const {
            PondId,
            current_temp, current_ph, current_do,
            current_ammonia, current_nitrate, current_nitrite,
            logDate
        } = req.body;

        if (!PondId || current_temp === undefined || current_ph === undefined) {
            return res.status(400).json({
                error: "Missing Data",
                message: "PondId, Temperature, and pH are required."
            });
        }

        const pool = req.pool;
        await pool.request()
            .input('PondId', sql.Int, parseInt(PondId, 10))
            .input('temp', sql.Float, parseFloat(current_temp))
            .input('ph', sql.Float, parseFloat(current_ph))
            .input('do', sql.Float, current_do ? parseFloat(current_do) : null)
            .input('ammonia', sql.Float, current_ammonia ? parseFloat(current_ammonia) : null)
            .input('nitrate', sql.Float, current_nitrate ? parseFloat(current_nitrate) : null)
            .input('nitrite', sql.Float, current_nitrite ? parseFloat(current_nitrite) : null)
            .input('logDate', sql.DateTime, logDate ? new Date(logDate) : null)
            .query(`
                INSERT INTO water_quality_logs
                (PondId, recorded_at, current_temp, current_ph, current_do, current_ammonia, current_nitrate, current_nitrite)
                VALUES
                (@PondId, ISNULL(@logDate, GETDATE()), @temp, @ph, @do, @ammonia, @nitrate, @nitrite)
            `);

        res.status(201).json({ success: true, message: "Water quality recorded." });
    } catch (err) {
        res.status(500).json({ error: "Failed to save log", message: err.message });
    }
});

// --- 3. ALERTS: The "Critical" Fix ---
router.get('/alerts/critical', auth, async (req, res) => {
    try {
        const pool = req.pool;
        const uId = req.user.id;
        const result = await pool.request()
            .input('uid', sql.Int, uId)
            .query(`
            WITH LatestLogs AS (
                SELECT *, ROW_NUMBER() OVER(PARTITION BY PondId ORDER BY recorded_at DESC) as rn
                FROM water_quality_logs
                WHERE recorded_at > DATEADD(hour, -24, GETDATE())
            )
            SELECT DISTINCT
                p.PondName,
                s.Name as Species,
                l.recorded_at,
                l.current_temp, l.current_ph, l.current_do,
                l.current_ammonia, l.current_nitrite, l.current_nitrate,
                param.min_temp_celsius, param.max_temp_celsius,
                param.min_ph, param.max_ph,
                param.min_dissolved_oxygen_ppm,
                param.max_ammonia_ppm, param.max_nitrite_ppm, param.max_nitrate_ppm
            FROM LatestLogs l
            INNER JOIN Ponds p ON l.PondId = p.PondId
            INNER JOIN Stocking st ON p.PondId = st.CurrentPondId
            INNER JOIN Species s ON st.SpeciesId = s.SpeciesId
            INNER JOIN water_quality_parameters param ON s.SpeciesId = param.SpeciesId
            WHERE l.rn = 1 AND (
                l.current_temp < param.min_temp_celsius OR l.current_temp > param.max_temp_celsius OR
                l.current_ph < param.min_ph OR l.current_ph > param.max_ph OR
                l.current_do < param.min_dissolved_oxygen_ppm OR
                l.current_ammonia > param.max_ammonia_ppm OR
                l.current_nitrite > param.max_nitrite_ppm OR
                l.current_nitrate > param.max_nitrate_ppm
            )
            AND p.UserId = @uid
            ORDER BY l.recorded_at DESC
        `);

        const alertsWithDetails = result.recordset.map(row => {
            let issues = [];
            if (row.current_do < row.min_dissolved_oxygen_ppm) issues.push("Low Oxygen");
            if (row.current_ammonia > row.max_ammonia_ppm) issues.push("Toxic Ammonia");
            if (row.current_temp < row.min_temp_celsius || row.current_temp > row.max_temp_celsius) issues.push("Temp Stress");
            if (row.current_ph < row.min_ph || row.current_ph > row.max_ph) issues.push("pH Imbalance");

            return {
                pond: row.PondName,
                species: row.Species,
                time: row.recorded_at,
                failing_factors: issues,
                raw_data: row
            };
        });

        res.json(alertsWithDetails);
    } catch (err) {
        res.status(500).json({ error: "Alert system failed", message: err.message });
    }
});

// --- 4. UTILITY: Summary & History ---
router.get('/latest-summary', auth, async (req, res) => {
    try {
        const pool = req.pool;
        const result = await pool.request().query(`
            SELECT p.PondId, p.PondName, l.current_temp, l.current_ph, l.current_do, l.recorded_at
            FROM Ponds p
            OUTER APPLY (
                SELECT TOP 1 * FROM water_quality_logs
                WHERE PondId = p.PondId
                ORDER BY recorded_at DESC
            ) l
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- 5. HISTORY: Get all water quality logs for user ---
router.get('/history/all', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = req.pool;

        const result = await pool.request()
            .input('uId', sql.Int, userId)
            .query(`
                SELECT TOP 50 l.PondId, p.PondName,
                       l.current_temp as Temperature, l.current_ph as PH,
                       l.current_do as DissolvedOxygen, l.recorded_at as LogDate,
                       l.current_ammonia, l.current_nitrate, l.current_nitrite
                FROM water_quality_logs l
                JOIN Ponds p ON l.PondId = p.PondId
                WHERE p.UserId = @uId
                ORDER BY l.recorded_at DESC
            `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Database Error", message: err.message, stack: err.stack });
    }
});

// --- DEBUG: Test Route to verify SQL execution ---
router.get('/test-query', async (req, res) => {
    try {
        const pool = req.pool;

        // Find ANY user ID to test
        const userRes = await pool.request().query("SELECT TOP 1 UserId FROM Ponds");
        const userId = userRes.recordset[0]?.UserId || 1;

        const result = await pool.request()
            .input('uId', sql.Int, userId)
            .query(`
                SELECT TOP 50 l.PondId, p.PondName,
                       l.current_temp as Temperature, l.current_ph as PH,
                       l.current_do as DissolvedOxygen, l.recorded_at as LogDate,
                       l.current_ammonia, l.current_nitrate, l.current_nitrite
                FROM water_quality_logs l
                JOIN Ponds p ON l.PondId = p.PondId
                WHERE p.UserId = @uId
                ORDER BY l.recorded_at DESC
            `);
        res.json({ success: true, count: result.recordset.length, data: result.recordset });
    } catch (err) {
        res.json({ success: false, errorName: err.name, errorMessage: err.message });
    }
});

// --- 7. DYNAMIC RECOMMENDATION: Get optimal ranges for pond's species ---
router.get('/optimal-ranges/:pondId', auth, async (req, res) => {
    try {
        const { pondId } = req.params;
        const pool = req.pool;
        const result = await pool.request()
            .input('pid', sql.Int, pondId)
            .query(`
                SELECT TOP 1
                    s.Name as Species,
                    param.min_temp_celsius, param.max_temp_celsius,
                    param.min_ph, param.max_ph,
                    param.min_dissolved_oxygen_ppm
                FROM Stocking st
                JOIN Species s ON st.SpeciesId = s.SpeciesId
                JOIN water_quality_parameters param ON s.SpeciesId = param.SpeciesId
                WHERE st.CurrentPondId = @pid
            `);

        if (result.recordset.length === 0) return res.json(null);
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 6. DELETE: Remove a water quality log ---
router.delete('/logs/:logId', auth, async (req, res) => {
    try {
        const { logId } = req.params;
        const pool = req.pool;

        const result = await pool.request()
            .input('lid', sql.Int, logId)
            .input('uid', sql.Int, req.user.id)
            .query(`
                DELETE W
                FROM water_quality_logs W
                JOIN Ponds P ON W.PondId = P.PondId
                WHERE W.Id = @lid AND P.UserId = @uid
            `);

        if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Log entry not found." });

        res.json({ success: true, message: "Water quality log deleted." });
    } catch (err) {
        res.status(500).json({ error: "Database Error", message: err.message });
    }
});

module.exports = router;