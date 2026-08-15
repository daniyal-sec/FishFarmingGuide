// ═══════════════════════════════════════════════════════════════════════════
// adminRoutes.js — Admin-only endpoints for platform-wide management
// Handles: Farm Overview, Marketplace Moderation, User Management
// All endpoints require auth middleware and admin role check
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const auth = require('../middleware/auth');

// ─── MIDDLEWARE: Admin role check ─────────────────────────────────────────
// Ensures only admin users can access these routes
function adminOnly(req, res, next) {
    const userRole = (req.user.role || '').toLowerCase();
    console.log(`[Admin Check] UserId=${req.user.id}, Role='${req.user.role}', Normalized='${userRole}'`);
    if (userRole !== 'admin') {
        return res.status(403).json({ error: "Admin access required", yourRole: req.user.role });
    }
    next();
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: FARM OVERVIEW
// Shows all farms on the platform with stats (ponds, acres, fish stock)
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin/activity-logs — Fetch all platform activity logs
router.get('/activity-logs', auth, adminOnly, async (req, res) => {
    try {
        const pool = req.pool;
        const result = await pool.request().query(`
            SELECT TOP 100
                Category,
                Description,
                ActivityTime,
                CASE
                    WHEN DATEDIFF(SECOND, ActivityTime, GETDATE()) < 60 THEN 'Just now'
                    WHEN DATEDIFF(MINUTE, ActivityTime, GETDATE()) < 60 THEN CAST(DATEDIFF(MINUTE, ActivityTime, GETDATE()) AS VARCHAR) + ' mins ago'
                    WHEN DATEDIFF(HOUR, ActivityTime, GETDATE()) < 24 THEN CAST(DATEDIFF(HOUR, ActivityTime, GETDATE()) AS VARCHAR) + ' hrs ago'
                    ELSE CAST(DATEDIFF(DAY, ActivityTime, GETDATE()) AS VARCHAR) + ' days ago'
                END AS RelativeTime,
                UserName,
                UserEmail
            FROM (
                SELECT 'System' as Category,
                       'Farm setup completed: ' + FarmName as Description,
                       CreatedAt as ActivityTime,
                       FullName as UserName,
                       Email as UserEmail
                FROM Users
                WHERE Role = 'user'
                UNION ALL
                SELECT 'System' as Category,
                       'New pond created: ' + P.PondName as Description,
                       P.CreatedAt as ActivityTime,
                       U.FullName as UserName,
                       U.Email as UserEmail
                FROM Ponds P
                JOIN Users U ON P.UserId = U.UserId
                UNION ALL
                SELECT 'Mortality' as Category,
                       CAST(M.Quantity_dead as VARCHAR) + ' fish loss in ' + P.PondName as Description,
                       M.LogDate as ActivityTime,
                       U.FullName as UserName,
                       U.Email as UserEmail
                FROM Mortality_Logs M
                INNER JOIN Ponds P ON M.PondId = P.PondId
                JOIN Users U ON P.UserId = U.UserId
                UNION ALL
                SELECT 'Feeding' as Category,
                       CAST(FL.Quantity_kg as VARCHAR) + 'kg feed added to ' + P.PondName as Description,
                       FL.FeedDate as ActivityTime,
                       U.FullName as UserName,
                       U.Email as UserEmail
                FROM Feed_Logs FL
                INNER JOIN Ponds P ON FL.PondId = P.PondId
                JOIN Users U ON P.UserId = U.UserId
            ) AS AllActivity
            ORDER BY ActivityTime DESC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Admin Activity Logs Error:", err);
        res.status(500).json({ error: "Failed to fetch activity logs" });
    }
});

// GET /api/admin/farms — Fetch all farms with aggregated stats
router.get('/farms', auth, adminOnly, async (req, res) => {
    try {
        const pool = req.pool;
        const result = await pool.request().query(`
            SELECT
                F.FarmId,
                U.FullName AS OwnerName,
                U.Email AS OwnerEmail,
                U.FarmName,
                RG.RegionName,
                F.TotalAreaAcres AS Acres,
                F.SetupDate,
                -- Count ponds belonging to this farm
                (SELECT COUNT(*) FROM Ponds P WHERE P.FarmId = F.FarmId) AS PondCount,
                -- Sum all live fish across all ponds in this farm
                (SELECT ISNULL(SUM(ST.Quantity), 0)
                 FROM Stocking ST
                 JOIN Ponds P ON ST.CurrentPondId = P.PondId
                 WHERE P.FarmId = F.FarmId AND ST.Quantity > 0) AS StockedFish
            FROM Farm F
            JOIN Users U ON F.UserId = U.UserId
            LEFT JOIN Regions RG ON F.RegionId = RG.RegionId
            ORDER BY F.SetupDate DESC
        `);

        // Calculate platform-wide summary stats
        const farms = result.recordset;
        const totalFarms = farms.length;
        const totalAcres = farms.reduce((sum, f) => sum + (f.Acres || 0), 0);
        const maxAcres = totalAcres * 4; // Estimated platform capacity
        const totalPonds = farms.reduce((sum, f) => sum + (f.PondCount || 0), 0);
        const totalFish = farms.reduce((sum, f) => sum + (f.StockedFish || 0), 0);

        res.json({
            success: true,
            stats: { totalFarms, totalAcres, maxAcres, totalPonds, totalFish },
            data: farms
        });
    } catch (err) {
        console.error("Admin farms error:", err);
        res.status(500).json({ error: "Failed to fetch farms", details: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: MARKETPLACE MODERATION
// Admin can view and remove active marketplace listings & purchase requests
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin/marketplace/listings — All active for-sale listings
router.get('/marketplace/listings', auth, adminOnly, async (req, res) => {
    try {
        const pool = req.pool;
        const result = await pool.request().query(`
            SELECT
                ST.StockId,
                U.FarmName,
                U.FullName AS SellerName,
                U.Email AS SellerEmail,
                U.Phone AS SellerPhone,
                S.Name AS SpeciesName,
                ISNULL(ST.ForSaleQuantity, ST.Quantity) AS Quantity,
                ISNULL(ST.ForSalePricePerFish, ST.PricePerPiece) AS PricePerUnit
            FROM Stocking ST
            JOIN Ponds P ON ST.CurrentPondId = P.PondId
            JOIN Farm F ON P.FarmId = F.FarmId
            JOIN Users U ON F.UserId = U.UserId
            JOIN Species S ON ST.SpeciesId = S.SpeciesId
            WHERE ST.IsForSale = 1 AND ST.Quantity > 0
            ORDER BY U.FarmName ASC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Admin listings error:", err);
        res.status(500).json({ error: "Failed to fetch listings" });
    }
});

// DELETE /api/admin/marketplace/listings/:stockId — Remove a listing (set IsForSale=0)
router.delete('/marketplace/listings/:stockId', auth, adminOnly, async (req, res) => {
    try {
        const pool = req.pool;
        await pool.request()
            .input('id', sql.Int, req.params.stockId)
            .query("UPDATE Stocking SET IsForSale = 0, ForSaleQuantity = 0 WHERE StockId = @id");
        res.json({ success: true, message: "Listing removed" });
    } catch (err) {
        res.status(500).json({ error: "Failed to remove listing" });
    }
});

// GET /api/admin/marketplace/requests — All purchase requests globally
router.get('/marketplace/requests', auth, adminOnly, async (req, res) => {
    try {
        const pool = req.pool;

        // Safely check if PurchaseRequests table exists before querying
        const tableCheck = await pool.request().query(`
            SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PurchaseRequests'
        `);
        if (tableCheck.recordset.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const result = await pool.request().query(`
            SELECT
                PR.RequestId,
                PR.CreatedAt,
                PR.Status,
                PR.Quantity,
                BU.FullName AS ConsumerName,
                BU.Email AS ConsumerEmail,
                U.FarmName AS TargetFarm,
                U.FullName AS FarmerName,
                S.Name AS SpeciesName
            FROM PurchaseRequests PR
            JOIN Users BU ON PR.BuyerUserId = BU.UserId
            JOIN Farm F ON PR.FarmId = F.FarmId
            JOIN Users U ON F.UserId = U.UserId
            JOIN Species S ON PR.SpeciesId = S.SpeciesId
            ORDER BY PR.CreatedAt DESC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Admin requests error:", err);
        res.status(500).json({ error: "Failed to fetch requests" });
    }
});

// DELETE /api/admin/marketplace/requests/:id — Delete a purchase request
router.delete('/marketplace/requests/:id', auth, adminOnly, async (req, res) => {
    try {
        const pool = req.pool;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query("DELETE FROM PurchaseRequests WHERE RequestId = @id");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete request" });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: USER MANAGEMENT
// Admin can view all users, change roles, toggle status, delete users
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin/users — All registered users with farm stats
router.get('/users', auth, adminOnly, async (req, res) => {
    try {
        const pool = req.pool;
        const result = await pool.request().query(`
            SELECT
                U.UserId,
                U.FullName,
                U.Email,
                U.Phone,
                U.Role,
                U.FarmName,
                -- Get region from the user's farm
                RG.RegionName,
                F.TotalAreaAcres AS Acres,
                F.FarmId,
                -- Check if user is active (default to 1 if column doesn't exist)
                1 AS IsActive,
                -- Count ponds
                ISNULL((SELECT COUNT(*) FROM Ponds P WHERE P.FarmId = F.FarmId), 0) AS PondCount,
                -- Sum fish stock
                ISNULL((SELECT SUM(ST.Quantity) FROM Stocking ST JOIN Ponds P ON ST.CurrentPondId = P.PondId WHERE P.FarmId = F.FarmId AND ST.Quantity > 0), 0) AS StockCount
            FROM Users U
            LEFT JOIN Farm F ON U.UserId = F.UserId
            LEFT JOIN Regions RG ON F.RegionId = RG.RegionId
            ORDER BY U.FullName ASC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Admin users error:", err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// PUT /api/admin/users/:id/role — Change a user's role (user/admin/consumer)
router.put('/users/:id/role', auth, adminOnly, async (req, res) => {
    try {
        const { role } = req.body;
        const pool = req.pool;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('role', sql.NVarChar, role)
            .query("UPDATE Users SET Role = @role WHERE UserId = @id");
        res.json({ success: true, message: `Role updated to ${role}` });
    } catch (err) {
        res.status(500).json({ error: "Failed to update role" });
    }
});

// PUT /api/admin/users/:id/phone — Update a user's phone
router.put('/users/:id/phone', auth, adminOnly, async (req, res) => {
    try {
        const { phone } = req.body;
        const pool = req.pool;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('phone', sql.NVarChar, phone)
            .query("UPDATE Users SET Phone = @phone WHERE UserId = @id");
        res.json({ success: true, message: `Phone updated` });
    } catch (err) {
        res.status(500).json({ error: "Failed to update phone" });
    }
});

// PUT /api/admin/users/:id/suspend — Toggle suspend/activate user
router.put('/users/:id/suspend', auth, adminOnly, async (req, res) => {
    try {
        const pool = req.pool;

        // Ensure IsActive column exists
        await pool.request().query(`
            IF COL_LENGTH('Users', 'IsActive') IS NULL
                ALTER TABLE Users ADD IsActive BIT DEFAULT 1
        `);

        // Toggle the status
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query("UPDATE Users SET IsActive = CASE WHEN ISNULL(IsActive, 1) = 1 THEN 0 ELSE 1 END WHERE UserId = @id");

        // Return new status
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query("SELECT ISNULL(IsActive, 1) AS IsActive FROM Users WHERE UserId = @id");

        const newStatus = result.recordset[0]?.IsActive;
        res.json({ success: true, isActive: newStatus, message: newStatus ? "User activated" : "User suspended" });
    } catch (err) {
        console.error("Suspend user error:", err);
        res.status(500).json({ error: "Failed to toggle user status", details: err.message });
    }
});

// DELETE /api/admin/users/:id — Delete a user and ALL their data
router.delete('/users/:id', auth, adminOnly, async (req, res) => {
    try {
        const pool = req.pool;
        const userId = parseInt(req.params.id);
        console.log(`[Admin] Deleting user ${userId}...`);

        // Don't allow deleting yourself
        if (userId === req.user.id) {
            return res.status(400).json({ error: "Cannot delete your own admin account" });
        }

        // Use a transaction so everything succeeds or fails together
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Delete pond-level child records
            const r1 = new sql.Request(transaction);
            r1.input('uid', sql.Int, userId);
            await r1.query(`
                IF OBJECT_ID('Expense_log') IS NOT NULL
                    DELETE FROM Expense_log WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
                IF OBJECT_ID('Feed_Logs') IS NOT NULL
                    DELETE FROM Feed_Logs WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
                IF OBJECT_ID('Mortality_Logs') IS NOT NULL
                    DELETE FROM Mortality_Logs WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
                IF OBJECT_ID('Harvest_Logs') IS NOT NULL
                    DELETE FROM Harvest_Logs WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
                IF OBJECT_ID('water_quality_logs') IS NOT NULL
                    DELETE FROM water_quality_logs WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
                IF OBJECT_ID('Fertilizers_Logs') IS NOT NULL
                    DELETE FROM Fertilizers_Logs WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
                IF OBJECT_ID('Pond_Inventory') IS NOT NULL
                    DELETE FROM Pond_Inventory WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
                IF OBJECT_ID('Pond_Inventory_Old_Backup') IS NOT NULL
                    DELETE FROM Pond_Inventory_Old_Backup WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
                IF OBJECT_ID('Medication_Logs') IS NOT NULL
                    DELETE FROM Medication_Logs WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
                IF OBJECT_ID('Disease_Outbreaks') IS NOT NULL
                    DELETE FROM Disease_Outbreaks WHERE PondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
            `);
            console.log(`[Admin] Step 1 done: pond-level child records`);

            // 2. Delete Stocking + Sales_Logs
            const r2 = new sql.Request(transaction);
            r2.input('uid', sql.Int, userId);
            await r2.query(`
                IF OBJECT_ID('Sales_Logs') IS NOT NULL
                BEGIN
                    DELETE FROM Sales_Logs WHERE StockId IN (SELECT StockId FROM Stocking WHERE UserId = @uid);
                    DELETE FROM Sales_Logs WHERE UserId = @uid;
                    DELETE FROM Sales_Logs WHERE BuyerUserId = @uid;
                    DELETE FROM Sales_Logs WHERE FarmId IN (SELECT FarmId FROM Farm WHERE UserId = @uid);
                END
                DELETE FROM Stocking WHERE UserId = @uid;
                DELETE FROM Stocking WHERE CurrentPondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
                DELETE FROM Stocking WHERE OriginalPondId IN (SELECT PondId FROM Ponds WHERE UserId = @uid);
            `);
            console.log(`[Admin] Step 2 done: stocking + sales logs`);

            // 3. Delete user-level and farm-level records
            const r3 = new sql.Request(transaction);
            r3.input('uid', sql.Int, userId);
            await r3.query(`
                IF OBJECT_ID('PurchaseRequests') IS NOT NULL
                BEGIN
                    DELETE FROM PurchaseRequests WHERE BuyerUserId = @uid;
                    DELETE FROM PurchaseRequests WHERE FarmId IN (SELECT FarmId FROM Farm WHERE UserId = @uid);
                END
                IF OBJECT_ID('Support_Tickets') IS NOT NULL
                    DELETE FROM Support_Tickets WHERE UserId = @uid;
                IF OBJECT_ID('Announcement_Reads') IS NOT NULL
                    DELETE FROM Announcement_Reads WHERE UserId = @uid;
                IF OBJECT_ID('Announcements') IS NOT NULL
                    DELETE FROM Announcements WHERE CreatedBy = @uid;
                IF OBJECT_ID('Reviews') IS NOT NULL
                    DELETE FROM Reviews WHERE UserId = @uid;
                IF OBJECT_ID('FarmReviews') IS NOT NULL
                BEGIN
                    DELETE FROM FarmReviews WHERE UserId = @uid;
                    DELETE FROM FarmReviews WHERE FarmId IN (SELECT FarmId FROM Farm WHERE UserId = @uid);
                END
                IF OBJECT_ID('Feed_Stock') IS NOT NULL
                    DELETE FROM Feed_Stock WHERE UserId = @uid;
                IF OBJECT_ID('Fertilizer_Stock') IS NOT NULL
                    DELETE FROM Fertilizer_Stock WHERE UserId = @uid;
                IF OBJECT_ID('Medication_Stock') IS NOT NULL
                    DELETE FROM Medication_Stock WHERE UserId = @uid;
                IF OBJECT_ID('MarketplaceFavorites') IS NOT NULL
                BEGIN
                    DELETE FROM MarketplaceFavorites WHERE UserId = @uid;
                    DELETE FROM MarketplaceFavorites WHERE FarmId IN (SELECT FarmId FROM Farm WHERE UserId = @uid);
                END
                IF OBJECT_ID('FavoriteStockNotifications') IS NOT NULL
                BEGIN
                    DELETE FROM FavoriteStockNotifications WHERE ConsumerUserId = @uid;
                    DELETE FROM FavoriteStockNotifications WHERE FarmId IN (SELECT FarmId FROM Farm WHERE UserId = @uid);
                END
                IF OBJECT_ID('FarmFavoriteAlerts') IS NOT NULL
                BEGIN
                    DELETE FROM FarmFavoriteAlerts WHERE FarmerUserId = @uid;
                    DELETE FROM FarmFavoriteAlerts WHERE ConsumerUserId = @uid;
                END
                IF OBJECT_ID('DailyTasks') IS NOT NULL
                    DELETE FROM DailyTasks WHERE UserId = @uid;
                IF OBJECT_ID('Marketplace_Listings') IS NOT NULL
                BEGIN
                    DELETE FROM Marketplace_Listings WHERE UserId = @uid;
                    DELETE FROM Marketplace_Listings WHERE FarmId IN (SELECT FarmId FROM Farm WHERE UserId = @uid);
                END
            `);
            console.log(`[Admin] Step 3 done: user-level records`);

            // 4. Delete Ponds
            const r4 = new sql.Request(transaction);
            r4.input('uid', sql.Int, userId);
            await r4.query("DELETE FROM Ponds WHERE UserId = @uid");
            console.log(`[Admin] Step 4 done: ponds`);

            // 5. Delete Farm
            const r5 = new sql.Request(transaction);
            r5.input('uid', sql.Int, userId);
            await r5.query("DELETE FROM Farm WHERE UserId = @uid");
            console.log(`[Admin] Step 5 done: farm`);

            // 6. Finally delete the User
            const r6 = new sql.Request(transaction);
            r6.input('uid', sql.Int, userId);
            await r6.query("DELETE FROM Users WHERE UserId = @uid");
            console.log(`[Admin] Step 6 done: user deleted`);

            await transaction.commit();
            console.log(`[Admin] User ${userId} fully deleted.`);
            res.json({ success: true, message: "User and all associated data deleted" });
        } catch (innerErr) {
            await transaction.rollback();
            throw innerErr;
        }
    } catch (err) {
        console.error("Delete user error:", err.message);
        console.error("Delete user full error:", err);
        res.status(500).json({ error: "Failed to delete user", details: err.message });
    }
});

module.exports = router;
