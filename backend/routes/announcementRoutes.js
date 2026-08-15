const express = require('express');
const router = express.Router();
const sql = require('mssql');
const auth = require('../middleware/auth');

// --- Auto-create Announcements table ---
let tableChecked = false;
async function ensureTable(pool) {
    if (tableChecked) return;
    try {
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Announcements')
            BEGIN
                CREATE TABLE Announcements (
                    AnnouncementId INT IDENTITY(1,1) PRIMARY KEY,
                    Title NVARCHAR(255) NOT NULL,
                    Message NVARCHAR(MAX) NOT NULL,
                    TargetAudience NVARCHAR(50) NOT NULL DEFAULT 'all',
                    TargetUserId INT NULL,
                    CreatedBy INT NOT NULL,
                    CreatedAt DATETIME DEFAULT GETDATE()
                );
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'ActionLink' AND Object_ID = Object_ID(N'Announcements'))
            BEGIN
                ALTER TABLE Announcements ADD ActionLink NVARCHAR(500) NULL;
            END
        `);
        // Track which users have read which announcements
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Announcement_Reads')
            BEGIN
                CREATE TABLE Announcement_Reads (
                    ReadId INT IDENTITY(1,1) PRIMARY KEY,
                    AnnouncementId INT NOT NULL,
                    UserId INT NOT NULL,
                    ReadAt DATETIME DEFAULT GETDATE(),
                    UNIQUE(AnnouncementId, UserId)
                );
            END
        `);
        tableChecked = true;
    } catch (e) {
        console.error("Announcements table check (non-fatal):", e.message);
        tableChecked = true;
    }
}

// ─── ADMIN: Create Announcement ───
router.post('/', auth, async (req, res) => {
    try {
        await ensureTable(req.pool);
        const { title, message, targetAudience, targetUserId } = req.body;
        const createdBy = req.user.id;

        if (!title || !message) {
            return res.status(400).json({ error: "Title and message are required." });
        }

        await req.pool.request()
            .input('title', sql.NVarChar, title)
            .input('message', sql.NVarChar, message)
            .input('target', sql.NVarChar, targetAudience || 'all')
            .input('targetUser', sql.Int, targetUserId || null)
            .input('createdBy', sql.Int, createdBy)
            .query(`
                INSERT INTO Announcements (Title, Message, TargetAudience, TargetUserId, CreatedBy)
                VALUES (@title, @message, @target, @targetUser, @createdBy)
            `);

        res.status(201).json({ success: true, message: "Announcement sent!" });
    } catch (err) {
        res.status(500).json({ error: "Failed to create announcement", details: err.message });
    }
});

// ─── ADMIN: Get all announcements (for admin list) ───
router.get('/admin/all', auth, async (req, res) => {
    try {
        await ensureTable(req.pool);
        const result = await req.pool.request().query(`
            SELECT a.*, u.FullName AS CreatedByName, tu.FullName AS TargetUserName
            FROM Announcements a
            LEFT JOIN Users u ON a.CreatedBy = u.UserId
            LEFT JOIN Users tu ON a.TargetUserId = tu.UserId
            ORDER BY a.CreatedAt DESC
        `);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Fetch failed", details: err.message });
    }
});

// ─── ADMIN: Delete announcement ───
router.delete('/:id', auth, async (req, res) => {
    try {
        await req.pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM Announcements WHERE AnnouncementId = @id');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Delete failed", details: err.message });
    }
});

// ─── ADMIN: Get list of users for targeting ───
router.get('/users/list', auth, async (req, res) => {
    try {
        const result = await req.pool.request().query(`
            SELECT UserId, FullName, Email, Role
            FROM Users
            ORDER BY Role, FullName
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Fetch failed", details: err.message });
    }
});

// ─── USER: Get my notifications ───
router.get('/my', auth, async (req, res) => {
    try {
        await ensureTable(req.pool);
        const uId = req.user.id;
        const userRole = req.user.role;

        // Map role to audience keywords
        const normalizedRole = (userRole || '').toLowerCase();
        const roleAudience = normalizedRole === 'consumer' ? 'consumers' : 'farmers';

        const result = await req.pool.request()
            .input('uid', sql.Int, uId)
            .input('roleAudience', sql.NVarChar, roleAudience)
            .query(`
                SELECT
                    a.AnnouncementId,
                    a.Title,
                    a.Message,
                    a.TargetAudience,
                    a.ActionLink,
                    a.CreatedAt,
                    CASE WHEN ar.ReadId IS NOT NULL THEN 1 ELSE 0 END AS IsRead
                FROM Announcements a
                LEFT JOIN Announcement_Reads ar ON a.AnnouncementId = ar.AnnouncementId AND ar.UserId = @uid
                WHERE
                    a.TargetAudience = 'all'
                    OR a.TargetAudience = @roleAudience
                    OR (a.TargetUserId = @uid)
                ORDER BY a.CreatedAt DESC
            `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Fetch failed", details: err.message });
    }
});

// ─── USER: Mark notification as read ───
router.post('/read/:id', auth, async (req, res) => {
    try {
        await ensureTable(req.pool);
        const uId = req.user.id;
        const announcementId = parseInt(req.params.id);

        await req.pool.request()
            .input('aid', sql.Int, announcementId)
            .input('uid', sql.Int, uId)
            .query(`
                IF NOT EXISTS (SELECT 1 FROM Announcement_Reads WHERE AnnouncementId = @aid AND UserId = @uid)
                BEGIN
                    INSERT INTO Announcement_Reads (AnnouncementId, UserId) VALUES (@aid, @uid)
                END
            `);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Mark read failed", details: err.message });
    }
});

// ─── USER: Mark all as read ───
router.post('/read-all', auth, async (req, res) => {
    try {
        await ensureTable(req.pool);
        const uId = req.user.id;
        const userRole = req.user.role;
        const normalizedRole = (userRole || '').toLowerCase();
        const roleAudience = normalizedRole === 'consumer' ? 'consumers' : 'farmers';

        await req.pool.request()
            .input('uid', sql.Int, uId)
            .input('roleAudience', sql.NVarChar, roleAudience)
            .query(`
                INSERT INTO Announcement_Reads (AnnouncementId, UserId)
                SELECT a.AnnouncementId, @uid
                FROM Announcements a
                WHERE (a.TargetAudience = 'all' OR a.TargetAudience = @roleAudience OR a.TargetUserId = @uid)
                AND NOT EXISTS (
                    SELECT 1 FROM Announcement_Reads ar WHERE ar.AnnouncementId = a.AnnouncementId AND ar.UserId = @uid
                )
            `);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Mark all read failed", details: err.message });
    }
});

module.exports = router;
