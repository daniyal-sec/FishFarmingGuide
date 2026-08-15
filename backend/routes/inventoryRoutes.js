const express = require('express');
const router = express.Router();
const sql = require('mssql');
const auth = require('../middleware/auth');

// --- Helper: Ensure IsForSale column exists (safe, non-blocking) ---
let schemaChecked = false;
async function ensureSchema(pool) {
    if (schemaChecked) return;
    try {
        await pool.request().query(`
            IF COL_LENGTH('Stocking', 'IsForSale') IS NULL
            BEGIN
                ALTER TABLE Stocking ADD IsForSale BIT NOT NULL DEFAULT 0;
            END
            IF COL_LENGTH('Stocking', 'ForSaleQuantity') IS NULL
            BEGIN
                ALTER TABLE Stocking ADD ForSaleQuantity INT DEFAULT 0;
            END
            IF COL_LENGTH('Stocking', 'ForSalePricePerFish') IS NULL
            BEGIN
                ALTER TABLE Stocking ADD ForSalePricePerFish DECIMAL(18,2) DEFAULT 0;
            END
        `);
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Sales_Logs')
            BEGIN
                CREATE TABLE Sales_Logs (
                    SaleId INT IDENTITY(1,1) PRIMARY KEY,
                    StockId INT NOT NULL,
                    UserId INT NOT NULL,
                    SpeciesId INT NOT NULL,
                    PondId INT NOT NULL,
                    QuantitySold INT NOT NULL,
                    PricePerPiece DECIMAL(18,2),
                    TotalRevenue AS (QuantitySold * PricePerPiece),
                    SaleDate DATETIME DEFAULT GETDATE()
                );
            END
        `);
        schemaChecked = true;
    } catch (e) {
        // Never crash — just log and continue
        console.error("ensureSchema warning (non-fatal):", e.message);
        schemaChecked = true;
    }
}

// --- 1. CREATE: Add Stock Entry (Kept for compatibility, though Dashboard uses stockingRoutes) ---
router.post('/add', auth, async (req, res) => {
    try {
        const {
            pondId,
            speciesId,
            batchNo,
            quantity,
            weight,
            cost,         // Treat this as PRICE PER FISH (e.g., 50.0)
            supplier,
            stockingDate
        } = req.body;
        const uId = req.user.id;
        const pool = req.pool;

        // Verify pond ownership
        const ownershipCheck = await pool.request()
            .input('pid', sql.Int, pondId)
            .input('uid', sql.Int, uId)
            .query('SELECT PondId FROM Ponds WHERE PondId = @pid AND UserId = @uid');

        if (ownershipCheck.recordset.length === 0) {
            return res.status(403).json({ error: "Access denied. This pond does not belong to you." });
        }

        const qty = parseInt(quantity) || 0;
        const unitPrice = parseFloat(cost) || 0;
        const totalInvestment = qty * unitPrice;

        // Fetch Pond Stage to determine Status
        const pondCheck = await pool.request()
            .input('pid', sql.Int, pondId)
            .query('SELECT Stage FROM Ponds WHERE PondId = @pid');

        const pondStage = pondCheck.recordset.length > 0 ? pondCheck.recordset[0].Stage : 'Grown-out';

        await pool.request()
            .input('pid', sql.Int, pondId)
            .input('sid', sql.Int, speciesId)
            .input('qty', sql.Int, qty)
            .input('unitPrice', sql.Decimal(18, 2), unitPrice)
            .input('date', sql.DateTime, stockingDate || new Date())
            .input('uid', sql.Int, uId)
            .input('status', sql.NVarChar, pondStage)
            .query(`
                INSERT INTO Stocking (
                    UserId, OriginalPondId, CurrentPondId, SpeciesId, Quantity, PricePerPiece,
                    CurrentSizeInches, TargetSizeInches, StockingDate, Status
                )
                VALUES (
                    @uid, @pid, @pid, @sid, @qty, @unitPrice,
                    2.0, 12.0, @date, @status
                )
            `);

        res.status(201).json({
            success: true,
            message: "Inventory added successfully!",
            dataStored: {
                pricePerFish: unitPrice.toFixed(2),
                totalBatchCost: totalInvestment.toFixed(2)
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Insert failed", details: err.message });
    }
});

// --- 2. SUMMARY: Get Totals for Dashboard Cards ---
router.get('/dashboard-summary', auth, async (req, res) => {
    try {
        const uId = req.user.id;
        const result = await req.pool.request()
            .input('uid', sql.Int, uId)
            .query(`
                SELECT
                    ISNULL(SUM(st.Quantity), 0) as TotalStock,
                    ISNULL(SUM(st.Quantity * st.PricePerPiece), 0) as TotalValue,
                    COUNT(DISTINCT st.SpeciesId) as SpeciesVariety
                FROM Stocking st
                WHERE st.UserId = @uid
            `);
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: "Summary fetch failed", details: err.message });
    }
});

// FEATURE 3: Stock Prediction Logic endpoint START
router.get('/prediction/summary', auth, async (req, res) => {
    try {
        const uId = req.user.id;
        const result = await req.pool.request()
            .input('uid', sql.Int, uId)
            .query(`
                SELECT
                    ISNULL(SUM(st.Quantity), 0) as TotalStock,
                    -- Prediction Logic: Target 1000g (1kg) per fish, with estimated 85% survival rate
                    ISNULL(SUM(st.Quantity * 0.85 * 1.0), 0) as ProjectedBiomass_kg,
                    -- Prediction Logic: ROI estimate multiplier (2.5x base cost logic)
                    ISNULL(SUM(st.Quantity * 0.85 * st.PricePerPiece * 2.5), 0) as ProjectedValue_PKR
                FROM Stocking st
                WHERE st.UserId = @uid
            `);

        // Return structured prediction
        res.json({
            survivalRatePercent: 85,
            targetWeight_kg: 1.0,
            projectedBiomass_kg: result.recordset[0].ProjectedBiomass_kg,
            projectedValue_PKR: result.recordset[0].ProjectedValue_PKR
        });
    } catch (err) {
        res.status(500).json({ error: "Prediction fetch failed", details: err.message });
    }
});
// FEATURE 3: Stock Prediction Logic endpoint END

// --- 3. READ: Get All (Filtered by User) ---
router.get('/', auth, async (req, res) => {
    try {
        await ensureSchema(req.pool);
        const uId = req.user.id;
        const result = await req.pool.request()
            .input('uid', sql.Int, uId)
            .query(`
                SELECT
                    st.StockId AS InventoryId,
                    st.StockingDate,
                    st.Quantity,
                    st.PricePerPiece AS CostPerUnit_PKR,
                    st.CurrentSizeInches,
                    st.Status,
                    ISNULL(st.IsForSale, 0) AS IsForSale,
                    ISNULL(st.ForSaleQuantity, 0) AS ForSaleQuantity,
                    ISNULL(st.ForSalePricePerFish, 0) AS ForSalePricePerFish,
                    s.Name AS SpeciesName,
                    p.PondName,
                    (SELECT ISNULL(SUM(QuantitySold), 0) FROM Sales_Logs WHERE FarmId = p.FarmId AND SpeciesId = st.SpeciesId AND SaleDate >= st.StockingDate) AS TotalSoldQuantity
                FROM Stocking st
                JOIN Species s ON st.SpeciesId = s.SpeciesId
                JOIN Ponds p ON st.CurrentPondId = p.PondId
                WHERE p.UserId = @uid AND (st.Quantity > 0 OR st.Status = 'Sold')
                ORDER BY st.StockingDate DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Fetch failed", details: err.message });
    }
});

// --- 4. READ: Get Single Item (Ownership secured) ---
router.get('/:id', auth, async (req, res) => {
    try {
        const uId = req.user.id;
        const result = await req.pool.request()
            .input('id', sql.Int, req.params.id)
            .input('uid', sql.Int, uId)
            .query(`
                SELECT st.StockId AS InventoryId, st.*
                FROM Stocking st
                WHERE st.StockId = @id AND st.UserId = @uid
            `);

        if (result.recordset.length === 0) return res.status(404).json({ error: "Not found or access denied" });
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: "Fetch failed", details: err.message });
    }
});

// --- 5. SET FOR SALE (with quantity and price) ---
router.put('/:id/sale', auth, async (req, res) => {
    try {
        await ensureSchema(req.pool);
        const { isForSale, forSaleQuantity, forSalePricePerFish } = req.body;
        const uId = req.user.id;
        const pool = req.pool;

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('uid', sql.Int, uId)
            .input('isForSale', sql.Bit, isForSale ? 1 : 0)
            .input('fsQty', sql.Int, forSaleQuantity || 0)
            .input('fsPrice', sql.Decimal(18, 2), forSalePricePerFish || 0)
            .query(`
                UPDATE Stocking
                SET IsForSale = @isForSale,
                    ForSaleQuantity = @fsQty,
                    ForSalePricePerFish = @fsPrice
                WHERE StockId = @id AND UserId = @uid
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "Not found or access denied" });
        }

        // Notify consumers who favorited this farm when listing for sale
        if (isForSale) {
            try {
                // Ensure notification table exists
                await pool.request().query(`
                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'FavoriteStockNotifications')
                    CREATE TABLE FavoriteStockNotifications (
                        NotificationId INT IDENTITY(1,1) PRIMARY KEY,
                        ConsumerUserId INT NOT NULL,
                        FarmId INT NOT NULL,
                        FarmName NVARCHAR(255),
                        SpeciesName NVARCHAR(100),
                        Quantity INT DEFAULT 0,
                        PricePerFish DECIMAL(18,2) DEFAULT 0,
                        IsRead BIT DEFAULT 0,
                        CreatedAt DATETIME DEFAULT GETDATE()
                    )
                `);

                // Get stock details (species name, farm info)
                const stockInfo = await pool.request()
                    .input('stockId', sql.Int, req.params.id)
                    .query(`
                        SELECT S.Name as SpeciesName, P.FarmId, U.FarmName
                        FROM Stocking ST
                        JOIN Species S ON ST.SpeciesId = S.SpeciesId
                        JOIN Ponds P ON ST.CurrentPondId = P.PondId
                        JOIN Farm F ON P.FarmId = F.FarmId
                        JOIN Users U ON F.UserId = U.UserId
                        WHERE ST.StockId = @stockId
                    `);

                if (stockInfo.recordset.length > 0) {
                    const info = stockInfo.recordset[0];
                    // Find all consumers who favorited this farm
                    const favConsumers = await pool.request()
                        .input('farmId', sql.Int, info.FarmId)
                        .query(`
                            SELECT DISTINCT MF.UserId as ConsumerUserId
                            FROM MarketplaceFavorites MF
                            WHERE MF.FarmId = @farmId
                        `);

                    for (const consumer of favConsumers.recordset) {
                        await pool.request()
                            .input('cuid', sql.Int, consumer.ConsumerUserId)
                            .input('farmId', sql.Int, info.FarmId)
                            .input('farmName', sql.NVarChar, info.FarmName)
                            .input('speciesName', sql.NVarChar, info.SpeciesName)
                            .input('qty', sql.Int, forSaleQuantity || 0)
                            .input('price', sql.Decimal(18, 2), forSalePricePerFish || 0)
                            .query(`
                                INSERT INTO FavoriteStockNotifications (ConsumerUserId, FarmId, FarmName, SpeciesName, Quantity, PricePerFish)
                                VALUES (@cuid, @farmId, @farmName, @speciesName, @qty, @price)
                            `);
                    }
                }
            } catch (notifErr) {
                console.error("Sale notification error:", notifErr.message);
            }
        }

        res.json({ success: true, message: isForSale ? "Listed for sale!" : "Removed from sale." });
    } catch (err) {
        res.status(500).json({ error: "Update failed", details: err.message });
    }
});

// --- 5b. RECORD SALE & DEDUCT STOCK ---
router.post('/:id/sell', auth, async (req, res) => {
    const transaction = new sql.Transaction(req.pool);
    try {
        await ensureSchema(req.pool);
        const stockId = parseInt(req.params.id);
        const { quantitySold } = req.body;
        const uId = req.user.id;

        await transaction.begin();
        const request = new sql.Request(transaction);

        // 1. Verify ownership and check current quantity
        const stockCheck = await request
            .input('id', sql.Int, stockId)
            .input('uid', sql.Int, uId)
            .query(`
                SELECT Quantity, SpeciesId, CurrentPondId, PricePerPiece
                FROM Stocking
                WHERE StockId = @id AND UserId = @uid
            `);

        if (stockCheck.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: "Stock record not found." });
        }

        const { Quantity, SpeciesId, CurrentPondId, PricePerPiece } = stockCheck.recordset[0];

        if (Quantity < quantitySold) {
            await transaction.rollback();
            return res.status(400).json({ error: `Not enough stock. Available: ${Quantity}` });
        }

        // 2. Deduct from Stocking
        await request.query(`
            UPDATE Stocking
            SET Quantity = Quantity - @qtySold
            WHERE StockId = @id
        `);

        // 3. Log the sale
        await request
            .input('qtySold', sql.Int, quantitySold)
            .input('sid', sql.Int, SpeciesId)
            .input('pid', sql.Int, CurrentPondId)
            .input('price', sql.Decimal(18, 2), PricePerPiece)
            .query(`
                INSERT INTO Sales_Logs (StockId, UserId, SpeciesId, PondId, QuantitySold, PricePerPiece)
                VALUES (@id, @uid, @sid, @pid, @qtySold, @price)
            `);

        // 4. Auto-cleanup if 0
        if (Quantity === quantitySold) {
            await request.query(`DELETE FROM Stocking WHERE StockId = @id`);
        }

        await transaction.commit();
        res.json({ success: true, message: "Sale recorded and stock deducted!" });

    } catch (err) {
        if (transaction) await transaction.rollback();
        res.status(500).json({ error: "Sale failed", details: err.message });
    }
});

// --- 6. UPDATE (Legacy fallback) ---
router.put('/:id', auth, async (req, res) => {
    try {
        const { quantity, cost } = req.body;
        const uId = req.user.id;
        const pool = req.pool;

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('uid', sql.Int, uId)
            .input('qty', sql.Int, quantity)
            .input('c', sql.Decimal(10, 2), cost)
            .query(`
                UPDATE Stocking
                SET Quantity = ISNULL(@qty, Quantity),
                    PricePerPiece = ISNULL(@c, PricePerPiece)
                WHERE StockId = @id AND UserId = @uid
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "Not found or access denied" });
        }
        res.json({ success: true, message: "Inventory updated." });
    } catch (err) {
        res.status(500).json({ error: "Update failed", details: err.message });
    }
});

// --- 7. DELETE ---
router.delete('/:id', auth, async (req, res) => {
    try {
        const uId = req.user.id;
        const pool = req.pool;

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('uid', sql.Int, uId)
            .query(`
                DELETE FROM Stocking
                WHERE StockId = @id AND UserId = @uid
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "Not found or access denied" });
        }
        res.json({ success: true, message: "Removed from inventory." });
    } catch (err) {
        res.status(500).json({ error: "Deletion failed", details: err.message });
    }
});

// ==========================================
// FEED STOCK INVENTORY
// ==========================================

// GET: All Feed Stock for User
router.get('/feed/all', auth, async (req, res) => {
    try {
        const uId = req.user.id;
        const result = await req.pool.request()
            .input('uid', sql.Int, uId)
            .query(`
                SELECT * FROM Feed_Stock
                WHERE UserId = @uid
                ORDER BY PurchaseDate DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Fetch failed", details: err.message });
    }
});

// GET: Distinct Feed Types from Feed_Rules
router.get('/feed/types', auth, async (req, res) => {
    try {
        const result = await req.pool.request()
            .query(`SELECT DISTINCT FeedType FROM Feed_Rules WHERE FeedType IS NOT NULL`);
        res.json(result.recordset.map(r => r.FeedType));
    } catch (err) {
        res.status(500).json({ error: "Fetch failed", details: err.message });
    }
});

// POST: Add Feed Stock
router.post('/feed/add', auth, async (req, res) => {
    try {
        const { feedType, quantity_kg, costPerKg, supplier, purchaseDate } = req.body;
        const uId = req.user.id;
        const total = (parseFloat(quantity_kg) || 0) * (parseFloat(costPerKg) || 0);

        await req.pool.request()
            .input('uid', sql.Int, uId)
            .input('type', sql.NVarChar, feedType)
            .input('qty', sql.Float, quantity_kg)
            .input('cost', sql.Decimal(10, 2), costPerKg)
            .input('total', sql.Decimal(18, 2), total)
            .input('supplier', sql.NVarChar, supplier)
            .input('date', sql.DateTime, purchaseDate || new Date())
            .query(`
                INSERT INTO Feed_Stock (UserId, FeedType, InitialQuantity_kg, CurrentQuantity_kg, CostPerKg, TotalCost, Supplier, PurchaseDate)
                VALUES (@uid, @type, @qty, @qty, @cost, @total, @supplier, @date)
            `);
        res.status(201).json({ success: true, message: "Feed stock added successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Insert failed", details: err.message });
    }
});

// PUT: Update Feed Stock
router.put('/feed/:id', auth, async (req, res) => {
    try {
        const { currentQuantity_kg } = req.body;
        const uId = req.user.id;
        const result = await req.pool.request()
            .input('id', sql.Int, req.params.id)
            .input('uid', sql.Int, uId)
            .input('qty', sql.Float, currentQuantity_kg)
            .query(`
                UPDATE Feed_Stock
                SET CurrentQuantity_kg = @qty
                WHERE StockId = @id AND UserId = @uid
            `);
        if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Not found or access denied" });
        res.json({ success: true, message: "Feed stock updated." });
    } catch (err) {
        res.status(500).json({ error: "Update failed", details: err.message });
    }
});

// DELETE: Delete Feed Stock
router.delete('/feed/:id', auth, async (req, res) => {
    try {
        const uId = req.user.id;
        const result = await req.pool.request()
            .input('id', sql.Int, req.params.id)
            .input('uid', sql.Int, uId)
            .query('DELETE FROM Feed_Stock WHERE StockId = @id AND UserId = @uid');
        if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Not found or access denied" });
        res.json({ success: true, message: "Removed from feed stock." });
    } catch (err) {
        res.status(500).json({ error: "Deletion failed", details: err.message });
    }
});

// ==========================================
// FERTILIZER STOCK INVENTORY
// ==========================================

// GET: All Fertilizer Stock for User
router.get('/fertilizer/all', auth, async (req, res) => {
    try {
        const uId = req.user.id;
        const result = await req.pool.request()
            .input('uid', sql.Int, uId)
            .query(`
                SELECT * FROM Fertilizer_Stock
                WHERE UserId = @uid
                ORDER BY PurchaseDate DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Fetch failed", details: err.message });
    }
});

// GET: Distinct Fertilizer Products
router.get('/fertilizer/products', auth, async (req, res) => {
    try {
        // Collect Organic, Inorganic, and Lime products from the recommendations table
        const result = await req.pool.request().query(`
            SELECT DISTINCT Org_Product as Product, 'Organic' as Category FROM fertilizer_recommendations WHERE Org_Product IS NOT NULL AND Org_Product != ''
            UNION
            SELECT DISTINCT Inorg_Product as Product, 'Inorganic' as Category FROM fertilizer_recommendations WHERE Inorg_Product IS NOT NULL AND Inorg_Product != ''
            UNION
            SELECT DISTINCT Lime_Product as Product, 'Lime' as Category FROM fertilizer_recommendations WHERE Lime_Product IS NOT NULL AND Lime_Product != ''
            ORDER BY Category, Product
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Fetch failed", details: err.message });
    }
});

// POST: Add Fertilizer Stock
router.post('/fertilizer/add', auth, async (req, res) => {
    try {
        const { category, productName, quantity_kg, costPerKg, supplier, purchaseDate } = req.body;
        const uId = req.user.id;
        const total = (parseFloat(quantity_kg) || 0) * (parseFloat(costPerKg) || 0);

        await req.pool.request()
            .input('uid', sql.Int, uId)
            .input('cat', sql.NVarChar, category)
            .input('prod', sql.NVarChar, productName)
            .input('qty', sql.Float, quantity_kg)
            .input('cost', sql.Decimal(10, 2), costPerKg)
            .input('total', sql.Decimal(18, 2), total)
            .input('supplier', sql.NVarChar, supplier)
            .input('date', sql.DateTime, purchaseDate || new Date())
            .query(`
                INSERT INTO Fertilizer_Stock (UserId, Category, ProductName, InitialQuantity_kg, CurrentQuantity_kg, CostPerKg, TotalCost, Supplier, PurchaseDate)
                VALUES (@uid, @cat, @prod, @qty, @qty, @cost, @total, @supplier, @date)
            `);
        res.status(201).json({ success: true, message: "Fertilizer stock added successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Insert failed", details: err.message });
    }
});

// PUT: Update Fertilizer Stock
router.put('/fertilizer/:id', auth, async (req, res) => {
    try {
        const { currentQuantity_kg } = req.body;
        const uId = req.user.id;
        const result = await req.pool.request()
            .input('id', sql.Int, req.params.id)
            .input('uid', sql.Int, uId)
            .input('qty', sql.Float, currentQuantity_kg)
            .query(`
                UPDATE Fertilizer_Stock
                SET CurrentQuantity_kg = @qty
                WHERE StockId = @id AND UserId = @uid
            `);
        if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Not found or access denied" });
        res.json({ success: true, message: "Fertilizer stock updated." });
    } catch (err) {
        res.status(500).json({ error: "Update failed", details: err.message });
    }
});

// DELETE: Delete Fertilizer Stock
router.delete('/fertilizer/:id', auth, async (req, res) => {
    try {
        const uId = req.user.id;
        const result = await req.pool.request()
            .input('id', sql.Int, req.params.id)
            .input('uid', sql.Int, uId)
            .query('DELETE FROM Fertilizer_Stock WHERE StockId = @id AND UserId = @uid');
        if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Not found or access denied" });
        res.json({ success: true, message: "Removed from fertilizer stock." });
    } catch (err) {
        res.status(500).json({ error: "Deletion failed", details: err.message });
    }
});

module.exports = router;