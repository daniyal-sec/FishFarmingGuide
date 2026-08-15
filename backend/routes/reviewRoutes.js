const express = require('express');
const router = express.Router();
const sql = require('mssql');
const auth = require('../middleware/auth');

// Auto-migrate schema to add new columns if they don't exist
(async () => {
    try {
        const { poolPromise } = require('../config/db');
        const pool = await poolPromise;
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'FarmerReply' AND Object_ID = Object_ID(N'FarmReviews'))
            BEGIN
                ALTER TABLE FarmReviews ADD FarmerReply NVARCHAR(500) NULL;
            END
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'IsRead' AND Object_ID = Object_ID(N'FarmReviews'))
            BEGIN
                ALTER TABLE FarmReviews ADD IsRead BIT DEFAULT 0 NOT NULL;
            END
        `);
    } catch (err) {
        console.error("Schema migration failed for FarmReviews:", err);
    }
})();

// GET /api/reviews/:farmId - Get all reviews for a farm
router.get('/:farmId', auth, async (req, res) => {
    try {
        const pool = req.pool;
        const { farmId } = req.params;

        const result = await pool.request()
            .input('fId', sql.Int, parseInt(farmId))
            .query(`
                SELECT
                    R.ReviewId, R.Rating, R.Comment, R.CreatedAt, R.FarmerReply, R.IsRead,
                    U.FullName as ReviewerName
                FROM FarmReviews R
                JOIN Users U ON R.UserId = U.UserId
                WHERE R.FarmId = @fId
                ORDER BY R.CreatedAt DESC
            `);

        // Also get average rating
        const avgResult = await pool.request()
            .input('fId', sql.Int, parseInt(farmId))
            .query(`
                SELECT
                    ISNULL(AVG(CAST(Rating AS FLOAT)), 0) as AvgRating,
                    COUNT(*) as TotalReviews
                FROM FarmReviews
                WHERE FarmId = @fId
            `);

        const stats = avgResult.recordset[0];

        res.json({
            success: true,
            data: {
                reviews: result.recordset,
                avgRating: Number(stats.AvgRating).toFixed(1),
                totalReviews: stats.TotalReviews
            }
        });
    } catch (err) {
        console.error("Get Reviews Error:", err);
        res.status(500).json({ error: "Failed to fetch reviews", details: err.message });
    }
});

// POST /api/reviews - Submit a review
router.post('/', auth, async (req, res) => {
    try {
        const pool = req.pool;
        const userId = req.user.id;
        const { farmId, rating, comment } = req.body;

        if (!farmId || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Invalid review data. Rating must be 1-5." });
        }

        // Check if user already reviewed this farm
        const existing = await pool.request()
            .input('fId', sql.Int, parseInt(farmId))
            .input('uId', sql.Int, userId)
            .query(`SELECT ReviewId FROM FarmReviews WHERE FarmId = @fId AND UserId = @uId`);

        if (existing.recordset.length > 0) {
            // Update existing review
            await pool.request()
                .input('fId', sql.Int, parseInt(farmId))
                .input('uId', sql.Int, userId)
                .input('rating', sql.Int, parseInt(rating))
                .input('comment', sql.NVarChar, comment || null)
                .query(`
                    UPDATE FarmReviews
                    SET Rating = @rating, Comment = @comment, CreatedAt = GETDATE(), FarmerReply = NULL, IsRead = 0
                    WHERE FarmId = @fId AND UserId = @uId
                `);
            return res.json({ success: true, message: "Review updated successfully" });
        }

        // Insert new review
        await pool.request()
            .input('fId', sql.Int, parseInt(farmId))
            .input('uId', sql.Int, userId)
            .input('rating', sql.Int, parseInt(rating))
            .input('comment', sql.NVarChar, comment || null)
            .query(`
                INSERT INTO FarmReviews (FarmId, UserId, Rating, Comment)
                VALUES (@fId, @uId, @rating, @comment)
            `);

        res.status(201).json({ success: true, message: "Review submitted successfully" });
    } catch (err) {
        console.error("Submit Review Error:", err);
        res.status(500).json({ error: "Failed to submit review", details: err.message });
    }
});

// PUT /api/reviews/:reviewId/reply - Farmer replies to a review
router.put('/:reviewId/reply', auth, async (req, res) => {
    try {
        const pool = req.pool;
        const { reviewId } = req.params;
        const { reply } = req.body;
        const farmerId = req.user.id;

        await pool.request()
            .input('rId', sql.Int, parseInt(reviewId))
            .input('reply', sql.NVarChar, reply)
            .query(`
                UPDATE FarmReviews
                SET FarmerReply = @reply, IsRead = 1
                WHERE ReviewId = @rId
            `);

        // Notify the consumer
        const reviewDetails = await pool.request()
            .input('rId', sql.Int, parseInt(reviewId))
            .query(`
                SELECT r.UserId as ConsumerId, u.FarmName, r.FarmId
                FROM FarmReviews r
                JOIN Farm f ON r.FarmId = f.FarmId
                JOIN Users u ON f.UserId = u.UserId
                WHERE r.ReviewId = @rId
            `);

        if (reviewDetails.recordset.length > 0) {
            const { ConsumerId, FarmName, FarmId } = reviewDetails.recordset[0];
            const title = "New Reply to Your Review";
            const message = `The farmer at ${FarmName} replied to your review: "${reply}"`;
            const actionLink = `/marketplace?reviewFarmId=${FarmId}&farmName=${encodeURIComponent(FarmName)}`;

            // Make sure Announcements table and columns exist
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
            } catch (e) {
                console.error("Announcements table check failed:", e.message);
            }

            await pool.request()
                .input('title', sql.NVarChar, title)
                .input('message', sql.NVarChar, message)
                .input('targetUser', sql.Int, ConsumerId)
                .input('createdBy', sql.Int, farmerId)
                .input('actionLink', sql.NVarChar, actionLink)
                .query(`
                    INSERT INTO Announcements (Title, Message, TargetAudience, TargetUserId, CreatedBy, ActionLink)
                    VALUES (@title, @message, 'user', @targetUser, @createdBy, @actionLink)
                `);
        }

        res.json({ success: true, message: "Reply submitted successfully" });
    } catch (err) {
        console.error("Reply Review Error:", err);
        res.status(500).json({ error: "Failed to submit reply" });
    }
});

// PUT /api/reviews/:reviewId/read - Mark review as read
router.put('/:reviewId/read', auth, async (req, res) => {
    try {
        const pool = req.pool;
        const { reviewId } = req.params;

        await pool.request()
            .input('rId', sql.Int, parseInt(reviewId))
            .query(`UPDATE FarmReviews SET IsRead = 1 WHERE ReviewId = @rId`);

        res.json({ success: true, message: "Review marked as read" });
    } catch (err) {
        console.error("Mark Read Error:", err);
        res.status(500).json({ error: "Failed to mark as read" });
    }
});

module.exports = router;
