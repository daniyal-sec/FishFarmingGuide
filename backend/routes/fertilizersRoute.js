const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');
const auth = require('../middleware/auth');
// GET: Get recommendation based on Pond Structure and Intensity
router.get('/recommendation/:pondId/:intensity', auth, async (req, res) => {
    try {
        const { pondId, intensity } = req.params;
        const pool = req.pool;

        // 1. Fetch Pond details (Still need Size and PondType for calculation/matching)
        const pondResult = await pool.request()
            .input('pid', sql.Int, pondId)
            .query(`
                SELECT PondName, PondType, Size
                FROM Ponds
                WHERE PondId = @pid
            `);

        if (pondResult.recordset.length === 0) {
            return res.status(404).json({ error: "Pond not found" });
        }

        const { PondName, PondType, Size } = pondResult.recordset[0];

        // 2. Match with rules ignoring the Stage
        // Matches PondType (Earthen/Concrete) and Intensity (Intensive/Extensive)
        const ruleResult = await pool.request()
            .input('type', sql.NVarChar, `%${PondType}%`)
            .input('style', sql.NVarChar, intensity)
            .query(`
                SELECT * FROM fertilizer_recommendations
                WHERE PondType LIKE @type
                AND CultivationType = @style
            `);

        if (ruleResult.recordset.length === 0) {
            return res.status(404).json({
                error: "No recommendation rule matches this pond type and intensity.",
                debug: { type: PondType, style: intensity }
            });
        }

        const rule = ruleResult.recordset[0];
        const pondSize = parseFloat(Size) || 0;

        // 3. Dynamic Calculation
        const response = {
            pondInfo: { name: PondName, size: pondSize, structure: PondType },
            recommendation: {
                organic: {
                    product: rule.Org_Product,
                    quantity_kg: (rule.Org_Dosage_kg_Acre * pondSize).toFixed(2),
                    cost_pkr: (rule.Org_Dosage_kg_Acre * pondSize * rule.Org_Rate_PKR).toFixed(2),
                    instruction: rule.Org_Frequency
                },
                inorganic: {
                    product: rule.Inorg_Product,
                    quantity_kg: (rule.Inorg_Dosage_kg_Acre * pondSize).toFixed(2),
                    cost_pkr: (rule.Inorg_Dosage_kg_Acre * pondSize * rule.Inorg_Rate_PKR).toFixed(2),
                    instruction: rule.Inorg_Frequency
                }
            }
        };

        res.json(response);

    } catch (err) {
        res.status(500).json({ error: "Database Error", message: err.message });
    }
});

// GET: Fetch distinct Pond Types and Cultivation Types for the dropdowns
router.get('/options', auth, async (req, res) => {
    try {
        const pool = req.pool;

        const typesResult = await pool.request().query('SELECT DISTINCT PondType FROM fertilizer_recommendations WHERE PondType IS NOT NULL');
        const intensityResult = await pool.request().query('SELECT DISTINCT CultivationType FROM fertilizer_recommendations WHERE CultivationType IS NOT NULL');

        const pondTypes = typesResult.recordset.map(r => r.PondType);
        const cultivationTypes = intensityResult.recordset.map(r => r.CultivationType);

        res.json({
            pondTypes,
            cultivationTypes
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch options", message: err.message });
    }
});

// GET: Calculate recommendation based on explicit size, type, and intensity (No existing pond required)
router.get('/calculate', auth, async (req, res) => {
    try {
        let { size, type, intensity } = req.query;
        if (!size || !type || !intensity) {
            return res.status(400).json({ error: "Missing required parameters: size, type, intensity" });
        }

        let dbType = type;
        if (type.toLowerCase().includes('tarpaulin') || type.toLowerCase().includes('frp')) {
            dbType = 'Lined';
        }

        const pool = req.pool;
        const pondSize = parseFloat(size) || 1;

        // Match with database rules
        const ruleResult = await pool.request()
            .input('type', sql.NVarChar, `%${dbType}%`)
            .input('style', sql.NVarChar, intensity)
            .query(`
                SELECT TOP 1 * FROM fertilizer_recommendations
                WHERE PondType LIKE @type
                AND CultivationType = @style
            `);

        let rule = ruleResult.recordset[0];

        if (!rule) {
            // Fallback to searching without style if necessary
            const fbResult = await pool.request()
                .input('type', sql.NVarChar, `%${dbType}%`)
                .query(`SELECT TOP 1 * FROM fertilizer_recommendations WHERE PondType LIKE @type`);
            rule = fbResult.recordset[0];
        }

        if (!rule) {
            return res.status(404).json({ error: "No recommendation found for this pond type in the database." });
        }

        // Generate response object strictly from DB
        const response = {
            organic: {
                product: rule.Org_Product,
                quantity_kg: (rule.Org_Dosage_kg_Acre * pondSize).toFixed(2),
                cost_pkr: (rule.Org_Dosage_kg_Acre * pondSize * rule.Org_Rate_PKR).toFixed(2),
                instruction: rule.Org_Frequency,
                rate: rule.Org_Rate_PKR,
                benefits: rule.Org_Benefits
            },
            inorganic: {
                product: rule.Inorg_Product,
                quantity_kg: (rule.Inorg_Dosage_kg_Acre * pondSize).toFixed(2),
                cost_pkr: (rule.Inorg_Dosage_kg_Acre * pondSize * rule.Inorg_Rate_PKR).toFixed(2),
                instruction: rule.Inorg_Frequency,
                rate: rule.Inorg_Rate_PKR,
                benefits: rule.Inorg_Benefits
            },
            lime: {
                product: rule.Lime_Product,
                quantity_kg: (rule.Lime_Dosage_kg_Acre * pondSize).toFixed(2),
                cost_pkr: (rule.Lime_Dosage_kg_Acre * pondSize * rule.Lime_Rate_PKR).toFixed(2),
                instruction: rule.Lime_Frequency,
                rate: rule.Lime_Rate_PKR,
                benefits: rule.Lime_Benefits
            }
        };

        response.total_cost = parseFloat(response.organic.cost_pkr) + parseFloat(response.inorganic.cost_pkr) + parseFloat(response.lime.cost_pkr);

        res.json(response);

    } catch (err) {
        res.status(500).json({ error: "Calculation Error", message: err.message });
    }
});

// GET: Fertilizers Dashboard Stats
router.get('/dashboard', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = req.pool;

        // Fetch logs for current month for user's ponds
        const result = await pool.request()
            .input('uId', sql.Int, userId)
            .query(`
                SELECT L.TotalCost
                FROM Fertilizers_Logs L
                JOIN Ponds P ON L.PondId = P.PondId
                WHERE P.UserId = @uId
                AND MONTH(L.ApplicationDate) = MONTH(GETDATE())
                AND YEAR(L.ApplicationDate) = YEAR(GETDATE())
            `);

        let totalCostThisMonth = 0;
        const applicationsCount = result.recordset.length;

        result.recordset.forEach(log => {
            totalCostThisMonth += (log.TotalCost || 0);
        });

        // Compute a mock efficiency (e.g. 94%, normally based on biological outcome, mocking it for UI)
        const efficiency = applicationsCount > 0 ? 94 : 0;

        res.json({
            monthCost: totalCostThisMonth,
            applications: applicationsCount,
            efficiency: efficiency
        });

    } catch (err) {
        res.status(500).json({ error: "Dashboard Data Error", message: err.message });
    }
});

// GET: All Recent History for the user
router.get('/history/all', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = req.pool;

        const result = await pool.request()
            .input('uId', sql.Int, userId)
            .query(`
                SELECT TOP 10 L.*, P.PondName
                FROM Fertilizers_Logs L
                JOIN Ponds P ON L.PondId = P.PondId
                WHERE P.UserId = @uId
                ORDER BY L.ApplicationDate DESC
            `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/apply', auth, async (req, res) => {
    try {
        const { pondId, type, product, qty, cost, remarks, logDate } = req.body;
        const pool = req.pool;
        const uId = req.user.id;

        // Check available stock first
        const stockCheckResult = await pool.request()
            .input('uid', sql.Int, uId)
            .input('prod', sql.NVarChar, product)
            .query(`
                SELECT ISNULL(SUM(CurrentQuantity_kg), 0) as TotalAvailable
                FROM Fertilizer_Stock
                WHERE UserId = @uid AND ProductName = @prod
            `);

        const totalAvailable = stockCheckResult.recordset[0].TotalAvailable;

        if (totalAvailable < parseFloat(qty)) {
            return res.status(400).json({
                error: "Insufficient Fertilizer Stock",
                message: `You only have ${totalAvailable.toFixed(2)} kg of '${product}' in stock, but tried to log ${parseFloat(qty).toFixed(2)} kg.`
            });
        }

        await pool.request()
            .input('pid', sql.Int, parseInt(pondId, 10))
            .input('type', sql.NVarChar, type)
            .input('prod', sql.NVarChar, product)
            .input('qty', sql.Float, parseFloat(qty))
            .input('cost', sql.Decimal(10, 2), parseFloat(cost))
            .input('rem', sql.NVarChar, remarks)
            .input('logDate', sql.DateTime, logDate ? new Date(logDate) : null)
            .query(`
                INSERT INTO Fertilizers_Logs (PondId, FertilizerType, ProductName, QuantityApplied, TotalCost, Remarks, ApplicationDate)
                VALUES (@pid, @type, @prod, @qty, @cost, @rem, ISNULL(@logDate, GETDATE()))
            `);

        // Deduct from Fertilizer_Stock
        let remainingQtyToDeduct = parseFloat(qty);
        while (remainingQtyToDeduct > 0) {
            // Find the oldest stock entry that has available quantity
            const stockResult = await pool.request()
                .input('uid', sql.Int, uId)
                .input('prod', sql.NVarChar, product)
                .query(`
                    SELECT TOP 1 StockId, CurrentQuantity_kg
                    FROM Fertilizer_Stock
                    WHERE UserId = @uid AND ProductName = @prod AND CurrentQuantity_kg > 0
                    ORDER BY PurchaseDate ASC
                `);

            if (stockResult.recordset.length === 0) {
                break;
            }

            const stockEntry = stockResult.recordset[0];
            const deductAmount = Math.min(remainingQtyToDeduct, stockEntry.CurrentQuantity_kg);

            await pool.request()
                .input('sid', sql.Int, stockEntry.StockId)
                .input('deduct', sql.Float, deductAmount)
                .query(`
                    UPDATE Fertilizer_Stock
                    SET CurrentQuantity_kg = CurrentQuantity_kg - @deduct
                    WHERE StockId = @sid
                `);

            remainingQtyToDeduct -= deductAmount;
        }

        res.status(201).json({ message: "Fertilizer application logged and stock updated successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/history/:pondId', auth, async (req, res) => {
    try {
        const { pondId } = req.params;
        const pool = req.pool;

        const result = await pool.request()
            .input('pid', sql.Int, pondId)
            .query(`
                SELECT * FROM Fertilizers_Logs
                WHERE PondId = @pid
                ORDER BY ApplicationDate DESC
            `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put('/log/:logId', auth, async (req, res) => {
    try {
        const { logId } = req.params;
        const { qty, cost, remarks } = req.body;
        const pool = req.pool;

        const result = await pool.request()
            .input('lid', sql.Int, logId)
            .input('uid', sql.Int, req.user.id)
            .input('qty', sql.Float, parseFloat(qty))
            .input('cost', sql.Decimal(10, 2), parseFloat(cost))
            .input('rem', sql.NVarChar, remarks)
            .query(`
                UPDATE L
                SET L.QuantityApplied = @qty, L.TotalCost = @cost, L.Remarks = @rem
                FROM Fertilizers_Logs L
                JOIN Ponds P ON L.PondId = P.PondId
                WHERE L.LogId = @lid AND P.UserId = @uid
            `);

        if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Log entry not found" });

        res.json({ message: "Log entry updated successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 5. DELETE: Remove a Log Entry
// ==========================================
router.delete('/log/:logId', auth, async (req, res) => {
    try {
        const { logId } = req.params;
        const pool = req.pool;

        const result = await pool.request()
            .input('lid', sql.Int, logId)
            .input('uid', sql.Int, req.user.id)
            .query(`
                DELETE L
                FROM Fertilizers_Logs L
                JOIN Ponds P ON L.PondId = P.PondId
                WHERE L.LogId = @lid AND P.UserId = @uid
            `);

        if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Log entry not found" });

        res.json({ message: "Log entry deleted successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;