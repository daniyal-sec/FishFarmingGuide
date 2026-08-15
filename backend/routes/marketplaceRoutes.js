const express = require('express');
const router = express.Router();
const sql = require('mssql');
const auth = require('../middleware/auth');

// Helper: Check if FarmReviews table exists
let reviewsTableExists = null;
async function checkReviewsTable(pool) {
    if (reviewsTableExists !== null) return reviewsTableExists;
    try {
        const r = await pool.request().query(`
            SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'FarmReviews'
        `);
        reviewsTableExists = r.recordset.length > 0;
    } catch {
        reviewsTableExists = false;
    }
    return reviewsTableExists;
}

// Helper: Ensure MarketplaceFavorites table exists
let favTableChecked = false;
async function ensureFavoritesTable(pool) {
    if (favTableChecked) return;
    try {
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MarketplaceFavorites')
            CREATE TABLE MarketplaceFavorites (
                FavoriteId INT IDENTITY(1,1) PRIMARY KEY,
                UserId INT NOT NULL,
                FarmId INT NOT NULL,
                SpeciesId INT NOT NULL,
                CreatedAt DATETIME DEFAULT GETDATE(),
                UNIQUE(UserId, FarmId, SpeciesId)
            )
        `);
        favTableChecked = true;
    } catch (err) {
        console.error("Favorites table error:", err.message);
    }
}

// Helper: Ensure PurchaseRequests table exists
let reqTableChecked = false;
async function ensureRequestsTable(pool) {
    if (reqTableChecked) return;
    try {
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PurchaseRequests')
            CREATE TABLE PurchaseRequests (
                RequestId INT IDENTITY(1,1) PRIMARY KEY,
                BuyerUserId INT NOT NULL,
                FarmId INT NOT NULL,
                SpeciesId INT NOT NULL,
                Message NVARCHAR(500),
                Status VARCHAR(20) DEFAULT 'Pending',
                CreatedAt DATETIME DEFAULT GETDATE()
            )
            IF COL_LENGTH('PurchaseRequests', 'Quantity') IS NULL
            BEGIN
                ALTER TABLE PurchaseRequests ADD Quantity INT DEFAULT 0;
            END
            IF COL_LENGTH('PurchaseRequests', 'SalePrice') IS NULL
            BEGIN
                ALTER TABLE PurchaseRequests ADD SalePrice DECIMAL(12,2);
            END
            IF COL_LENGTH('PurchaseRequests', 'FarmerReply') IS NULL
            BEGIN
                ALTER TABLE PurchaseRequests ADD FarmerReply NVARCHAR(500);
            END
        `);
        reqTableChecked = true;
    } catch (err) {
        console.error("PurchaseRequests table error:", err.message);
    }
}

let salesLogTableChecked = false;
async function ensureSalesLogsTable(pool) {
    if (salesLogTableChecked) return;
    try {
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
                    SaleDate DATETIME DEFAULT GETDATE(),
                    FarmId INT,
                    BuyerUserId INT,
                    SalePrice DECIMAL(12,2),
                    RequestId INT
                )
            END
            ELSE
            BEGIN
                IF COL_LENGTH('Sales_Logs', 'FarmId') IS NULL ALTER TABLE Sales_Logs ADD FarmId INT;
                IF COL_LENGTH('Sales_Logs', 'BuyerUserId') IS NULL ALTER TABLE Sales_Logs ADD BuyerUserId INT;
                IF COL_LENGTH('Sales_Logs', 'SalePrice') IS NULL ALTER TABLE Sales_Logs ADD SalePrice DECIMAL(12,2);
                IF COL_LENGTH('Sales_Logs', 'RequestId') IS NULL ALTER TABLE Sales_Logs ADD RequestId INT;
            END
        `);
        salesLogTableChecked = true;
    } catch (err) {
        console.error("SalesLogs table error:", err.message);
    }
}

// GET /api/marketplace
router.get('/', auth, async (req, res) => {
    const { species, regionId } = req.query;
    try {
        const pool = req.pool;
        const hasReviews = await checkReviewsTable(pool);

        let avgRatingClause = "0 as AvgRating";
        let reviewCountClause = "0 as ReviewCount";
        if (hasReviews) {
            avgRatingClause = "ISNULL((SELECT AVG(CAST(R2.Rating AS FLOAT)) FROM FarmReviews R2 WHERE R2.FarmId = F.FarmId), 0) as AvgRating";
            reviewCountClause = "ISNULL((SELECT COUNT(*) FROM FarmReviews R2 WHERE R2.FarmId = F.FarmId), 0) as ReviewCount";
        }

        let speciesFilter = '';
        if (species && species !== 'all') {
            speciesFilter = 'AND S.Name = @speciesName';
        }
        let regionFilter = '';
        let consumerProv = null;
        let consumerDist = null;

        if (regionId && regionId !== 'all') {
            if (regionId === 'nearest') {
                const userRes = await pool.request()
                    .input('reqUserId', sql.Int, req.user.id)
                    .query('SELECT Province, District FROM Users WHERE UserId = @reqUserId');

                consumerProv = userRes.recordset[0]?.Province || '';
                consumerDist = userRes.recordset[0]?.District || '';

                // We'll add the inputs to the request later
                if (consumerProv) {
                    regionFilter = "AND (RG.Province = @consumerProv OR RG.RegionName LIKE '%' + @consumerDist + '%')";
                } else {
                    // Fallback if no province exists for the user
                    regionFilter = "AND 1=0";
                }
            } else {
                regionFilter = 'AND F.RegionId = @regionId';
            }
        }

        const query = `
            SELECT
                U.FarmName,
                U.FullName as FarmerName,
                U.Email,
                U.Phone,
                F.FarmId,
                S.SpeciesId,
                S.Name as SpeciesName,
                S.MaxMarketPrice,
                MAX(ST.Status) as StockStatus,
                SUM(ST.Quantity) as TotalQuantity,
                AVG(ST.CurrentSizeInches) as AvgSizeInches,
                AVG(ST.PricePerPiece) as AvgPrice,
                MAX(ST.StockingDate) as LastStocked,
                MAX(CAST(ISNULL(ST.IsForSale, 0) AS INT)) as IsForSale,
                SUM(ISNULL(ST.ForSaleQuantity, 0)) as ForSaleQuantity,
                AVG(NULLIF(ST.ForSalePricePerFish, 0)) as ForSalePricePerFish,
                RG.RegionName,
                ${avgRatingClause},
                ${reviewCountClause}
            FROM Stocking ST
            JOIN Ponds P ON ST.CurrentPondId = P.PondId
            JOIN Farm F ON P.FarmId = F.FarmId
            JOIN Users U ON F.UserId = U.UserId
            JOIN Species S ON ST.SpeciesId = S.SpeciesId
            LEFT JOIN Regions RG ON F.RegionId = RG.RegionId
            WHERE ST.Quantity > 0
            ${speciesFilter}
            ${regionFilter}
            GROUP BY
                U.FarmName, U.FullName, U.Email, U.Phone, F.FarmId,
                S.SpeciesId, S.Name, S.MaxMarketPrice, RG.RegionName
            ORDER BY U.FarmName ASC
        `;

        const request = pool.request();
        if (species && species !== 'all') {
            request.input('speciesName', sql.NVarChar, species);
        }
        if (regionId && regionId !== 'all') {
            if (regionId === 'nearest') {
                request.input('consumerProv', sql.NVarChar, consumerProv);
                request.input('consumerDist', sql.NVarChar, consumerDist);
            } else {
                request.input('regionId', sql.Int, parseInt(regionId, 10));
            }
        }

        const result = await request.query(query);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Marketplace GET error:", err);
        res.status(500).json({ error: "Failed to fetch active stock", details: err.message });
    }
});

// GET /api/marketplace/species
router.get('/species', auth, async (req, res) => {
    try {
        const pool = req.pool;
        const result = await pool.request().query(`
            SELECT DISTINCT S.Name
            FROM Stocking ST
            JOIN Species S ON ST.SpeciesId = S.SpeciesId
            WHERE ST.Quantity > 0
            ORDER BY S.Name ASC
        `);
        res.json({ success: true, data: result.recordset.map(r => r.Name) });
    } catch (err) {
        console.error("Species list error:", err);
        res.status(500).json({ error: "Failed to fetch species list" });
    }
});

// ═══ NOTIFICATION TABLE HELPERS ═══

let favStockNotifChecked = false;
async function ensureFavStockNotifications(pool) {
    if (favStockNotifChecked) return;
    try {
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
        favStockNotifChecked = true;
    } catch (err) { console.error("FavoriteStockNotifications table error:", err.message); }
}

let farmFavAlertChecked = false;
async function ensureFarmFavoriteAlerts(pool) {
    if (farmFavAlertChecked) return;
    try {
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'FarmFavoriteAlerts')
            CREATE TABLE FarmFavoriteAlerts (
                AlertId INT IDENTITY(1,1) PRIMARY KEY,
                FarmerUserId INT NOT NULL,
                ConsumerUserId INT NOT NULL,
                ConsumerName NVARCHAR(100),
                FarmId INT NOT NULL,
                IsRead BIT DEFAULT 0,
                CreatedAt DATETIME DEFAULT GETDATE()
            )
        `);
        farmFavAlertChecked = true;
    } catch (err) { console.error("FarmFavoriteAlerts table error:", err.message); }
}

// ═══ FAVORITES ═══

// GET /api/marketplace/favorites
router.get('/favorites', auth, async (req, res) => {
    try {
        const pool = req.pool;
        await ensureFavoritesTable(pool);
        const result = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .query('SELECT FarmId, SpeciesId FROM MarketplaceFavorites WHERE UserId = @userId');
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.json({ success: true, data: [] });
    }
});

// POST /api/marketplace/favorite
router.post('/favorite', auth, async (req, res) => {
    const { farmId, speciesId } = req.body;
    try {
        const pool = req.pool;
        await ensureFavoritesTable(pool);
        await ensureFarmFavoriteAlerts(pool);
        const existing = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .input('farmId', sql.Int, farmId)
            .input('speciesId', sql.Int, speciesId)
            .query('SELECT FavoriteId FROM MarketplaceFavorites WHERE UserId = @userId AND FarmId = @farmId AND SpeciesId = @speciesId');

        if (existing.recordset.length > 0) {
            await pool.request()
                .input('id', sql.Int, existing.recordset[0].FavoriteId)
                .query('DELETE FROM MarketplaceFavorites WHERE FavoriteId = @id');
            res.json({ success: true, favorited: false });
        } else {
            await pool.request()
                .input('userId', sql.Int, req.user.id)
                .input('farmId', sql.Int, farmId)
                .input('speciesId', sql.Int, speciesId)
                .query('INSERT INTO MarketplaceFavorites (UserId, FarmId, SpeciesId) VALUES (@userId, @farmId, @speciesId)');

            // Create alert for the farm owner
            try {
                const farmOwner = await pool.request()
                    .input('farmId', sql.Int, farmId)
                    .query('SELECT F.UserId as FarmerUserId FROM Farm F WHERE F.FarmId = @farmId');
                if (farmOwner.recordset.length > 0) {
                    const farmerUserId = farmOwner.recordset[0].FarmerUserId;
                    const consumerInfo = await pool.request()
                        .input('uid', sql.Int, req.user.id)
                        .query('SELECT FullName FROM Users WHERE UserId = @uid');
                    const consumerName = consumerInfo.recordset[0]?.FullName || 'A consumer';
                    await pool.request()
                        .input('farmerUserId', sql.Int, farmerUserId)
                        .input('consumerUserId', sql.Int, req.user.id)
                        .input('consumerName', sql.NVarChar, consumerName)
                        .input('farmId', sql.Int, farmId)
                        .query('INSERT INTO FarmFavoriteAlerts (FarmerUserId, ConsumerUserId, ConsumerName, FarmId) VALUES (@farmerUserId, @consumerUserId, @consumerName, @farmId)');
                }
            } catch (alertErr) { console.error("Farm favorite alert error:", alertErr.message); }

            res.json({ success: true, favorited: true });
        }
    } catch (err) {
        console.error("Favorite toggle error:", err);
        res.status(500).json({ error: "Failed to toggle favorite" });
    }
});

// ═══ CONSUMER: FAVORITE STOCK NOTIFICATIONS ═══

// GET /api/marketplace/favorite-notifications
router.get('/favorite-notifications', auth, async (req, res) => {
    try {
        const pool = req.pool;
        await ensureFavStockNotifications(pool);
        const result = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .query('SELECT * FROM FavoriteStockNotifications WHERE ConsumerUserId = @userId ORDER BY CreatedAt DESC');
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Fav stock notif error:", err);
        res.json({ success: true, data: [] });
    }
});

// POST /api/marketplace/favorite-notifications/:id/read
router.post('/favorite-notifications/:id/read', auth, async (req, res) => {
    try {
        const pool = req.pool;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('userId', sql.Int, req.user.id)
            .query('UPDATE FavoriteStockNotifications SET IsRead = 1 WHERE NotificationId = @id AND ConsumerUserId = @userId');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Failed" }); }
});

// POST /api/marketplace/favorite-notifications/read-all
router.post('/favorite-notifications/read-all', auth, async (req, res) => {
    try {
        const pool = req.pool;
        await pool.request()
            .input('userId', sql.Int, req.user.id)
            .query('UPDATE FavoriteStockNotifications SET IsRead = 1 WHERE ConsumerUserId = @userId');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Failed" }); }
});

// ═══ FARMER: FARM FAVORITE ALERTS ═══

// GET /api/marketplace/farm-favorite-alerts
router.get('/farm-favorite-alerts', auth, async (req, res) => {
    try {
        const pool = req.pool;
        await ensureFarmFavoriteAlerts(pool);
        const result = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .query(`SELECT A.*, U.FarmName
                    FROM FarmFavoriteAlerts A
                    LEFT JOIN Farm F ON A.FarmId = F.FarmId
                    LEFT JOIN Users U ON F.UserId = U.UserId
                    WHERE A.FarmerUserId = @userId
                    ORDER BY A.CreatedAt DESC`);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Farm fav alerts error:", err);
        res.json({ success: true, data: [] });
    }
});

// POST /api/marketplace/farm-favorite-alerts/:id/read
router.post('/farm-favorite-alerts/:id/read', auth, async (req, res) => {
    try {
        const pool = req.pool;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('userId', sql.Int, req.user.id)
            .query('UPDATE FarmFavoriteAlerts SET IsRead = 1 WHERE AlertId = @id AND FarmerUserId = @userId');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Failed" }); }
});

// POST /api/marketplace/farm-favorite-alerts/read-all
router.post('/farm-favorite-alerts/read-all', auth, async (req, res) => {
    try {
        const pool = req.pool;
        await pool.request()
            .input('userId', sql.Int, req.user.id)
            .query('UPDATE FarmFavoriteAlerts SET IsRead = 1 WHERE FarmerUserId = @userId');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Failed" }); }
});

// ═══ PURCHASE REQUESTS ═══

// POST /api/marketplace/request-buy
router.post('/request-buy', auth, async (req, res) => {
    const { farmId, speciesId, message, quantity } = req.body;
    try {
        const pool = req.pool;
        await ensureRequestsTable(pool);
        const existing = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .input('farmId', sql.Int, farmId)
            .input('speciesId', sql.Int, speciesId)
            .query("SELECT RequestId FROM PurchaseRequests WHERE BuyerUserId = @userId AND FarmId = @farmId AND SpeciesId = @speciesId AND Status = 'Pending'");

        if (existing.recordset.length > 0) {
            return res.status(400).json({ error: "You already have a pending request for this item." });
        }

        await pool.request()
            .input('userId', sql.Int, req.user.id)
            .input('farmId', sql.Int, farmId)
            .input('speciesId', sql.Int, speciesId)
            .input('message', sql.NVarChar, message || null)
            .input('qty', sql.Int, quantity || 0)
            .query('INSERT INTO PurchaseRequests (BuyerUserId, FarmId, SpeciesId, Message, Quantity) VALUES (@userId, @farmId, @speciesId, @message, @qty)');

        res.status(201).json({ success: true, message: "Purchase request sent!" });
    } catch (err) {
        console.error("Request buy error:", err);
        res.status(500).json({ error: "Failed to create purchase request" });
    }
});

// GET /api/marketplace/my-requests
router.get('/my-requests', auth, async (req, res) => {
    try {
        const pool = req.pool;
        await ensureRequestsTable(pool);
        await ensureExtraColumns(pool);
        const result = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .query(`
                SELECT PR.RequestId, PR.Status, PR.Message, PR.CreatedAt,
                    PR.Quantity, PR.SalePrice, PR.FarmerReply, PR.FarmId,
                    U.FarmName, U.FullName as FarmerName, S.Name as SpeciesName
                FROM PurchaseRequests PR
                JOIN Farm F ON PR.FarmId = F.FarmId
                JOIN Users U ON F.UserId = U.UserId
                JOIN Species S ON PR.SpeciesId = S.SpeciesId
                WHERE PR.BuyerUserId = @userId
                ORDER BY PR.CreatedAt DESC
            `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("My requests error:", err);
        res.status(500).json({ error: "Failed to fetch requests" });
    }
});

// GET /api/marketplace/my-requests/count
router.get('/my-requests/count', auth, async (req, res) => {
    try {
        const pool = req.pool;
        await ensureRequestsTable(pool);
        const result = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .query("SELECT COUNT(*) as count FROM PurchaseRequests WHERE BuyerUserId = @userId AND Status = 'Pending'");
        res.json({ success: true, count: result.recordset[0].count });
    } catch (err) {
        res.json({ success: true, count: 0 });
    }
});

// ═══ FARMER-SIDE: INCOMING REQUESTS ═══

// Helper: Ensure extra columns exist on PurchaseRequests
let columnsChecked = false;
async function ensureExtraColumns(pool) {
    if (columnsChecked) return;
    try {
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='PurchaseRequests' AND COLUMN_NAME='Quantity')
                ALTER TABLE PurchaseRequests ADD Quantity INT DEFAULT 0;
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='PurchaseRequests' AND COLUMN_NAME='FarmerReply')
                ALTER TABLE PurchaseRequests ADD FarmerReply NVARCHAR(1000);
            IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='PurchaseRequests' AND COLUMN_NAME='SalePrice')
                ALTER TABLE PurchaseRequests ADD SalePrice DECIMAL(12,2);
        `);
        columnsChecked = true;
    } catch (err) {
        console.error("Column check error:", err.message);
    }
}

// GET /api/marketplace/incoming-requests
router.get('/incoming-requests', auth, async (req, res) => {
    try {
        const pool = req.pool;
        await ensureRequestsTable(pool);
        await ensureExtraColumns(pool);
        const result = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .query(`
                SELECT PR.RequestId, PR.Status, PR.Message, PR.CreatedAt,
                    PR.Quantity, PR.FarmerReply, PR.SalePrice, PR.FarmId,
                    BU.FullName as BuyerName, BU.Email as BuyerEmail,
                    S.Name as SpeciesName, S.SpeciesId
                FROM PurchaseRequests PR
                JOIN Farm F ON PR.FarmId = F.FarmId
                JOIN Users BU ON PR.BuyerUserId = BU.UserId
                JOIN Species S ON PR.SpeciesId = S.SpeciesId
                WHERE F.UserId = @userId
                ORDER BY PR.CreatedAt DESC
            `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Incoming requests error:", err);
        res.status(500).json({ error: "Failed to fetch incoming requests" });
    }
});

// GET /api/marketplace/incoming-requests/count
router.get('/incoming-requests/count', auth, async (req, res) => {
    try {
        const pool = req.pool;
        await ensureRequestsTable(pool);
        const result = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .query(`
                SELECT COUNT(*) as count FROM PurchaseRequests PR
                JOIN Farm F ON PR.FarmId = F.FarmId
                WHERE F.UserId = @userId AND PR.Status = 'Pending'
            `);
        res.json({ success: true, count: result.recordset[0].count });
    } catch (err) {
        res.json({ success: true, count: 0 });
    }
});

// POST /api/marketplace/reply - farmer replies to a request
router.post('/reply', auth, async (req, res) => {
    const { requestId, replyMessage } = req.body;
    try {
        const pool = req.pool;
        await ensureRequestsTable(pool);
        await pool.request()
            .input('id', sql.Int, requestId)
            .input('reply', sql.NVarChar, replyMessage)
            .query("UPDATE PurchaseRequests SET FarmerReply = @reply, Status = 'Replied' WHERE RequestId = @id");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to send reply" });
    }
});

// POST /api/marketplace/approve-sell - farmer approves and confirms sale
// This now also deducts the sold quantity from Stocking and logs the sale
router.post('/approve-sell', auth, async (req, res) => {
    const { requestId, salePrice } = req.body;
    const transaction = new sql.Transaction(req.pool);
    try {
        const pool = req.pool;
        await ensureRequestsTable(pool);
        await ensureSalesLogsTable(pool);

        // 1. Get the purchase request details
        const prResult = await pool.request()
            .input('id', sql.Int, requestId)
            .query(`SELECT PR.RequestId, PR.FarmId, PR.SpeciesId, PR.Quantity, PR.BuyerUserId
                    FROM PurchaseRequests PR WHERE PR.RequestId = @id`);

        if (prResult.recordset.length === 0) {
            return res.status(404).json({ error: "Purchase request not found." });
        }

        const pr = prResult.recordset[0];
        const soldQty = pr.Quantity || 0;

        await transaction.begin();

        // 2. Update the PurchaseRequest status
        const updateReq = new sql.Request(transaction);
        await updateReq
            .input('id', sql.Int, requestId)
            .input('price', sql.Decimal(12, 2), salePrice || null)
            .query("UPDATE PurchaseRequests SET Status = 'Approved', SalePrice = @price WHERE RequestId = @id");

        // 3. Deduct stock from farmer's Stocking table (FIFO from harvested/for-sale batches)
        if (soldQty > 0) {
            // Get the farmer's for-sale stocking batches for this species in this farm
            const batchReq = new sql.Request(transaction);
            const batches = await batchReq
                .input('farmId', sql.Int, pr.FarmId)
                .input('speciesId', sql.Int, pr.SpeciesId)
                .query(`
                    SELECT ST.StockId, ST.Quantity, ISNULL(ST.ForSaleQuantity, 0) as ForSaleQuantity, ST.PricePerPiece, ST.CurrentPondId
                    FROM Stocking ST
                    JOIN Ponds P ON ST.CurrentPondId = P.PondId
                    WHERE P.FarmId = @farmId AND ST.SpeciesId = @speciesId
                      AND ST.IsForSale = 1 AND ST.Quantity > 0
                    ORDER BY ST.StockingDate ASC
                `);

            let remaining = soldQty;
            for (const batch of batches.recordset) {
                if (remaining <= 0) break;

                const availableInBatch = batch.ForSaleQuantity > 0 ? batch.ForSaleQuantity : batch.Quantity;
                const deduct = Math.min(availableInBatch, remaining);
                remaining -= deduct;

                const deductReq = new sql.Request(transaction);
                await deductReq
                    .input('stockId', sql.Int, batch.StockId)
                    .input('deduct', sql.Int, deduct)
                    .query(`
                        UPDATE Stocking
                        SET ForSaleQuantity = CASE WHEN ForSaleQuantity > 0 THEN ForSaleQuantity - @deduct ELSE 0 END,
                            Quantity = Quantity - @deduct
                        WHERE StockId = @stockId
                    `);

                // Mark batch as 'Sold' if fully depleted
                const checkReq = new sql.Request(transaction);
                await checkReq
                    .input('stockId', sql.Int, batch.StockId)
                    .query(`
                        UPDATE Stocking
                        SET Status = 'Sold', IsForSale = 0
                        WHERE StockId = @stockId AND Quantity <= 0
                    `);
                // Insert into Sales_Logs for this specific batch
                const saleLogReq = new sql.Request(transaction);
                await saleLogReq
                    .input('farmId', sql.Int, pr.FarmId)
                    .input('speciesId', sql.Int, pr.SpeciesId)
                    .input('buyerId', sql.Int, pr.BuyerUserId)
                    .input('qty', sql.Int, deduct)
                    .input('price', sql.Decimal(12, 2), salePrice || 0)
                    .input('reqId', sql.Int, requestId)
                    .input('stockId', sql.Int, batch.StockId)
                    .input('userId', sql.Int, req.user.id)
                    .input('pondId', sql.Int, batch.CurrentPondId)
                    .query(`
                        INSERT INTO Sales_Logs (StockId, UserId, SpeciesId, PondId, QuantitySold, PricePerPiece, FarmId, BuyerUserId, SalePrice, RequestId)
                        VALUES (@stockId, @userId, @speciesId, @pondId, @qty, @price, @farmId, @buyerId, @price, @reqId)
                    `);
            }
        } // Add missing closing brace here

        await transaction.commit();
        res.json({ success: true, message: "Sale approved! Stock has been deducted." });
    } catch (err) {
        try { await transaction.rollback(); } catch(e) {}
        console.error("Approve-sell error:", err);
        res.status(500).json({ error: "Failed to approve sale", details: err.message });
    }
});

// POST /api/marketplace/reprocess-approved - fix already-approved requests where stock wasn't deducted
router.post('/reprocess-approved', auth, async (req, res) => {
    const { requestId } = req.body;
    const transaction = new sql.Transaction(req.pool);
    try {
        const pool = req.pool;
        await ensureSalesLogsTable(pool);

        // 1. Get the approved purchase request
        const prResult = await pool.request()
            .input('id', sql.Int, requestId)
            .query(`SELECT PR.RequestId, PR.FarmId, PR.SpeciesId, PR.Quantity, PR.BuyerUserId, PR.SalePrice
                    FROM PurchaseRequests PR WHERE PR.RequestId = @id AND PR.Status = 'Approved'`);

        if (prResult.recordset.length === 0) {
            return res.status(404).json({ error: "No approved request found with that ID." });
        }

        // 2. Check if stock was already deducted (Sales_Logs exists for this request)
        const alreadyProcessed = await pool.request()
            .input('reqId', sql.Int, requestId)
            .query("SELECT COUNT(*) as cnt FROM Sales_Logs WHERE RequestId = @reqId");

        if (alreadyProcessed.recordset[0].cnt > 0) {
            return res.status(400).json({ error: "Stock was already deducted for this request." });
        }

        const pr = prResult.recordset[0];
        const soldQty = pr.Quantity || 0;
        const salePrice = pr.SalePrice || 0;

        if (soldQty <= 0) {
            return res.status(400).json({ error: "No quantity to deduct." });
        }

        await transaction.begin();

        // 3. Deduct stock (same FIFO logic as approve-sell)
        const batchReq = new sql.Request(transaction);
        const batches = await batchReq
            .input('farmId', sql.Int, pr.FarmId)
            .input('speciesId', sql.Int, pr.SpeciesId)
            .query(`
                SELECT ST.StockId, ST.Quantity, ISNULL(ST.ForSaleQuantity, 0) as ForSaleQuantity, ST.PricePerPiece, ST.CurrentPondId
                FROM Stocking ST
                JOIN Ponds P ON ST.CurrentPondId = P.PondId
                WHERE P.FarmId = @farmId AND ST.SpeciesId = @speciesId
                  AND ST.IsForSale = 1 AND ST.Quantity > 0
                ORDER BY ST.StockingDate ASC
            `);

        let remaining = soldQty;
        for (const batch of batches.recordset) {
            if (remaining <= 0) break;

            const availableInBatch = batch.ForSaleQuantity > 0 ? batch.ForSaleQuantity : batch.Quantity;
            const deduct = Math.min(availableInBatch, remaining);
            remaining -= deduct;

            const deductReq = new sql.Request(transaction);
            await deductReq
                .input('stockId', sql.Int, batch.StockId)
                .input('deduct', sql.Int, deduct)
                .query(`
                    UPDATE Stocking
                    SET ForSaleQuantity = CASE WHEN ForSaleQuantity > 0 THEN ForSaleQuantity - @deduct ELSE 0 END,
                        Quantity = Quantity - @deduct
                    WHERE StockId = @stockId
                `);

            const checkReq = new sql.Request(transaction);
            await checkReq
                .input('stockId', sql.Int, batch.StockId)
                .query(`
                    UPDATE Stocking
                    SET Status = 'Sold', IsForSale = 0
                    WHERE StockId = @stockId AND Quantity <= 0
                `);

            const saleLogReq = new sql.Request(transaction);
            await saleLogReq
                .input('farmId', sql.Int, pr.FarmId)
                .input('speciesId', sql.Int, pr.SpeciesId)
                .input('buyerId', sql.Int, pr.BuyerUserId)
                .input('qty', sql.Int, deduct)
                .input('price', sql.Decimal(12, 2), salePrice)
                .input('reqId', sql.Int, requestId)
                .input('stockId', sql.Int, batch.StockId)
                .input('userId', sql.Int, req.user.id)
                .input('pondId', sql.Int, batch.CurrentPondId)
                .query(`
                    INSERT INTO Sales_Logs (StockId, UserId, SpeciesId, PondId, QuantitySold, PricePerPiece, FarmId, BuyerUserId, SalePrice, RequestId)
                    VALUES (@stockId, @userId, @speciesId, @pondId, @qty, @price, @farmId, @buyerId, @price, @reqId)
                `);
        }

        await transaction.commit();
        console.log(`Reprocessed approved request #${requestId}: deducted ${soldQty - remaining} fish`);
        res.json({ success: true, message: `Stock deducted! ${soldQty - remaining} fish removed from inventory.` });
    } catch (err) {
        try { await transaction.rollback(); } catch(e) {}
        console.error("Reprocess error:", err);
        res.status(500).json({ error: "Failed to reprocess", details: err.message });
    }
});

// POST /api/marketplace/deny - farmer denies a request
router.post('/deny', auth, async (req, res) => {
    const { requestId } = req.body;
    try {
        const pool = req.pool;
        await pool.request()
            .input('id', sql.Int, requestId)
            .query("UPDATE PurchaseRequests SET Status = 'Denied' WHERE RequestId = @id");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to deny request" });
    }
});

// DELETE /api/marketplace/request/:id
router.delete('/request/:id', auth, async (req, res) => {
    try {
        const pool = req.pool;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM PurchaseRequests WHERE RequestId = @id');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete request" });
    }
});

module.exports = router;
