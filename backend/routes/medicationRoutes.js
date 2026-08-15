const express = require('express');
const router = express.Router();
const sql = require('mssql');
const auth = require('../middleware/auth');

// GET: All Medication Stock for User
router.get('/stock/all', auth, async (req, res) => {
    try {
        const uId = req.user.id;
        const result = await req.pool.request()
            .input('uid', sql.Int, uId)
            .query(`
                SELECT * FROM Medication_Stock
                WHERE UserId = @uid
                ORDER BY PurchaseDate DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Fetch failed", details: err.message });
    }
});

// POST: Add Medication Stock
router.post('/stock/add', auth, async (req, res) => {
    try {
        const { medicationType, productName, initialQuantity, unit, costPerUnit, supplier, purchaseDate } = req.body;
        const uId = req.user.id;
        const total = (parseFloat(initialQuantity) || 0) * (parseFloat(costPerUnit) || 0);

        await req.pool.request()
            .input('uid', sql.Int, uId)
            .input('type', sql.NVarChar, medicationType)
            .input('prod', sql.NVarChar, productName)
            .input('qty', sql.Float, initialQuantity)
            .input('unit', sql.NVarChar, unit)
            .input('cost', sql.Decimal(10, 2), costPerUnit)
            .input('total', sql.Decimal(18, 2), total)
            .input('supplier', sql.NVarChar, supplier)
            .input('date', sql.DateTime, purchaseDate || new Date())
            .query(`
                INSERT INTO Medication_Stock (UserId, MedicationType, ProductName, InitialQuantity, CurrentQuantity, Unit, CostPerUnit, TotalCost, Supplier, PurchaseDate)
                VALUES (@uid, @type, @prod, @qty, @qty, @unit, @cost, @total, @supplier, @date)
            `);
        res.status(201).json({ success: true, message: "Medication stock added successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Insert failed", details: err.message });
    }
});

// POST: Apply Medication to Pond
router.post('/apply', auth, async (req, res) => {
    try {
        const { pondId, productName, quantity, unit, cost, remarks, logDate } = req.body;
        const pool = req.pool;
        const uId = req.user.id;

        // Check available stock first
        const stockCheckResult = await pool.request()
            .input('uid', sql.Int, uId)
            .input('prod', sql.NVarChar, productName)
            .query(`
                SELECT ISNULL(SUM(CurrentQuantity), 0) as TotalAvailable
                FROM Medication_Stock
                WHERE UserId = @uid AND ProductName = @prod
            `);

        const totalAvailable = stockCheckResult.recordset[0].TotalAvailable;

        if (totalAvailable < parseFloat(quantity)) {
            return res.status(400).json({
                error: "Insufficient Medication Stock",
                message: `You only have ${totalAvailable.toFixed(2)} ${unit} of '${productName}' in stock.`
            });
        }

        // Insert into Medication_Logs
        await pool.request()
            .input('pid', sql.Int, parseInt(pondId, 10))
            .input('prod', sql.NVarChar, productName)
            .input('qty', sql.Float, parseFloat(quantity))
            .input('unit', sql.NVarChar, unit)
            .input('cost', sql.Decimal(10, 2), parseFloat(cost))
            .input('rem', sql.NVarChar, remarks)
            .input('logDate', sql.DateTime, logDate ? new Date(logDate) : null)
            .query(`
                INSERT INTO Medication_Logs (PondId, ProductName, QuantityApplied, Unit, TotalCost, Remarks, ApplicationDate)
                VALUES (@pid, @prod, @qty, @unit, @cost, @rem, ISNULL(@logDate, GETDATE()))
            `);

        // Deduct from Medication_Stock (FIFO)
        let remainingToDeduct = parseFloat(quantity);
        while (remainingToDeduct > 0) {
            const stockResult = await pool.request()
                .input('uid', sql.Int, uId)
                .input('prod', sql.NVarChar, productName)
                .query(`
                    SELECT TOP 1 StockId, CurrentQuantity
                    FROM Medication_Stock
                    WHERE UserId = @uid AND ProductName = @prod AND CurrentQuantity > 0
                    ORDER BY PurchaseDate ASC
                `);

            if (stockResult.recordset.length === 0) break;

            const stockEntry = stockResult.recordset[0];
            const deduct = Math.min(remainingToDeduct, stockEntry.CurrentQuantity);

            await pool.request()
                .input('sid', sql.Int, stockEntry.StockId)
                .input('deduct', sql.Float, deduct)
                .query(`UPDATE Medication_Stock SET CurrentQuantity = CurrentQuantity - @deduct WHERE StockId = @sid`);

            remainingToDeduct -= deduct;
        }

        res.status(201).json({ success: true, message: "Medication applied successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Application failed", message: err.message });
    }
});

// GET: History for a pond
router.get('/history/:pondId', auth, async (req, res) => {
    try {
        const { pondId } = req.params;
        const result = await req.pool.request()
            .input('pid', sql.Int, pondId)
            .query(`SELECT * FROM Medication_Logs WHERE PondId = @pid ORDER BY ApplicationDate DESC`);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
