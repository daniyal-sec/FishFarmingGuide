const express = require('express');
const router = express.Router();
const sql = require('mssql');
const auth = require('../middleware/auth');

// @route   POST api/mortality/add
// @desc    Record dead fish and physically decrease quantity from Stocking table
router.post('/add', auth, async (req, res) => {
    const { pondId, speciesId, quantity } = req.body;
    const transaction = new sql.Transaction(req.pool);

    try {
        await transaction.begin();

        // 1. FLEXIBLE CHECK: Find stock by SpeciesId OR StockId
        const stockCheck = await transaction.request()
            .input('pid', sql.Int, parseInt(pondId, 10))
            .input('sid', sql.Int, parseInt(speciesId, 10))
            .input('uid', sql.Int, req.user.id)
            .query(`
                SELECT S.Quantity, S.SpeciesId, S.StockId
                FROM Stocking S
                JOIN Ponds P ON S.CurrentPondId = P.PondId
                WHERE S.CurrentPondId = @pid
                  AND (S.SpeciesId = @sid OR S.StockId = @sid)
                  AND P.UserId = @uid
                  AND S.Quantity > 0
                  AND S.Status != 'Harvested'
            `);

        if (stockCheck.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: `Error: No stock matching ID ${speciesId} found in Pond ${pondId}.`
            });
        }

        // Use the first matching batch (or the specific one if sid was StockId)
        const targetStock = stockCheck.recordset[0];
        const currentStock = targetStock.Quantity;
        const actualSpeciesId = targetStock.SpeciesId;
        const actualStockId = targetStock.StockId;

        // 2. QUANTITY CHECK
        if (currentStock < quantity) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: `Insufficient stock. You have ${currentStock} fish in this batch, but tried to log ${quantity} dead.`
            });
        }

        // 3. LOG THE MORTALITY (Using the verified SpeciesId)
        await transaction.request()
            .input('pid', sql.Int, pondId)
            .input('sid', sql.Int, actualSpeciesId)
            .input('qty', sql.Int, quantity)
            .input('uid', sql.Int, req.user.id)
            .query(`
                INSERT INTO Mortality_Logs (PondId, SpeciesId, Quantity_dead, UserId)
                VALUES (@pid, @sid, @qty, @uid)
            `);

        // 4. DECREASE THE STOCK (Targeting the specific StockId for precision)
        await transaction.request()
            .input('stockId', sql.Int, actualStockId)
            .input('qty', sql.Int, quantity)
            .query(`
                UPDATE Stocking
                SET Quantity = Quantity - @qty
                WHERE StockId = @stockId
            `);

        // 4b. AUTO-DELETE: Remove the batch if it reached 0 quantity
        await transaction.request()
            .input('stockId', sql.Int, actualStockId)
            .query(`
                DELETE FROM Stocking
                WHERE StockId = @stockId AND Quantity <= 0
            `);

        const remainingBalance = currentStock - quantity;
        await transaction.commit();

        res.status(201).json({
            success: true,
            message: "Mortality logged successfully.",
            pondId: pondId,
            speciesId: actualSpeciesId,
            removed: quantity,
            remainingStock: remainingBalance
        });

    } catch (err) {
        if (transaction) {
            try { await transaction.rollback(); } catch (e) { /* ignore */ }
        }
        console.error("Mortality Route Error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route   GET api/mortality/summary/:pondId
// @desc    Get total deaths per species for a specific pond
router.get('/summary/:pondId', auth, async (req, res) => {
    try {
        const pool = req.pool;
        const result = await pool.request()
            .input('pid', sql.Int, req.params.pondId)
            .query(`
                SELECT S.Name as SpeciesName, SUM(M.Quantity_dead) as TotalLoss
                FROM Mortality_Logs M
                JOIN Species S ON M.SpeciesId = S.SpeciesID
                WHERE M.PondId = @pid
                GROUP BY S.Name
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch summary", details: err.message });
    }
});

module.exports = router;