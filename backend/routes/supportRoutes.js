// ═══════════════════════════════════════════════════════════════════════════
// supportRoutes.js — Support Ticket System
// Allows farmers/consumers to submit tickets, and admin to reply/close them
// Table: Support_Tickets (auto-created if missing)
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const auth = require('../middleware/auth');

// ─── HELPER: Auto-create Support_Tickets table ──────────────────────────
let tableChecked = false;
async function ensureTable(pool) {
    if (tableChecked) return;
    try {
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Support_Tickets')
            CREATE TABLE Support_Tickets (
                TicketId INT IDENTITY(1,1) PRIMARY KEY,
                UserId INT NOT NULL,              -- Who submitted the ticket
                Subject NVARCHAR(500) NOT NULL,    -- Brief subject line
                Message NVARCHAR(MAX),             -- Full description
                Category NVARCHAR(100) DEFAULT 'General',  -- Bug, Feature, General
                Status NVARCHAR(50) DEFAULT 'Open',        -- Open, Responded, Closed
                AdminReply NVARCHAR(MAX),           -- Admin's response text
                CreatedAt DATETIME DEFAULT GETDATE(),
                UpdatedAt DATETIME DEFAULT GETDATE()
            )
        `);
        tableChecked = true;
    } catch (err) {
        console.error("Support table creation error:", err.message);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// USER-FACING ENDPOINTS (farmers/consumers)
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/support/create — Submit a new support ticket
router.post('/create', auth, async (req, res) => {
    try {
        const pool = req.pool;
        await ensureTable(pool);
        const { subject, message, category } = req.body;

        if (!subject) return res.status(400).json({ error: "Subject is required" });

        await pool.request()
            .input('uid', sql.Int, req.user.id)
            .input('subject', sql.NVarChar, subject)
            .input('message', sql.NVarChar, message || '')
            .input('category', sql.NVarChar, category || 'General')
            .query(`
                INSERT INTO Support_Tickets (UserId, Subject, Message, Category)
                VALUES (@uid, @subject, @message, @category)
            `);

        res.status(201).json({ success: true, message: "Ticket submitted successfully!" });
    } catch (err) {
        console.error("Create ticket error:", err);
        res.status(500).json({ error: "Failed to create ticket" });
    }
});

// GET /api/support/my-tickets — Fetch current user's tickets
router.get('/my-tickets', auth, async (req, res) => {
    try {
        const pool = req.pool;
        await ensureTable(pool);

        const result = await pool.request()
            .input('uid', sql.Int, req.user.id)
            .query(`
                SELECT TicketId, Subject, Message, Category, Status, AdminReply, CreatedAt, UpdatedAt
                FROM Support_Tickets
                WHERE UserId = @uid
                ORDER BY CreatedAt DESC
            `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch tickets" });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN-FACING ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/support/admin/all — Fetch ALL tickets (admin only)
router.get('/admin/all', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
    try {
        const pool = req.pool;
        await ensureTable(pool);

        const result = await pool.request().query(`
            SELECT
                ST.TicketId, ST.Subject, ST.Message, ST.Category,
                ST.Status, ST.AdminReply, ST.CreatedAt, ST.UpdatedAt,
                U.FullName AS UserName, U.Email AS UserEmail
            FROM Support_Tickets ST
            JOIN Users U ON ST.UserId = U.UserId
            ORDER BY
                CASE ST.Status WHEN 'Open' THEN 0 WHEN 'Responded' THEN 1 ELSE 2 END,
                ST.CreatedAt DESC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("Admin tickets error:", err);
        res.status(500).json({ error: "Failed to fetch tickets" });
    }
});

// PUT /api/support/admin/:id/reply — Admin replies to a ticket
router.put('/admin/:id/reply', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
    try {
        const pool = req.pool;
        const { reply } = req.body;

        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('reply', sql.NVarChar, reply)
            .query(`
                UPDATE Support_Tickets
                SET AdminReply = @reply, Status = 'Responded', UpdatedAt = GETDATE()
                WHERE TicketId = @id
            `);
        res.json({ success: true, message: "Reply sent" });
    } catch (err) {
        res.status(500).json({ error: "Failed to reply" });
    }
});

// PUT /api/support/admin/:id/close — Admin closes a ticket
router.put('/admin/:id/close', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
    try {
        const pool = req.pool;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query("UPDATE Support_Tickets SET Status = 'Closed', UpdatedAt = GETDATE() WHERE TicketId = @id");
        res.json({ success: true, message: "Ticket closed" });
    } catch (err) {
        res.status(500).json({ error: "Failed to close ticket" });
    }
});

module.exports = router;
