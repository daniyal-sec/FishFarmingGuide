const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// GET: Fetch all guides and their nested sections
router.get('/guides', auth, async (req, res) => {
    try {
        const pool = req.pool;

        // 1. Fetch main Guides sorted by DisplayOrder
        const guidesResult = await pool.request().query(`
            SELECT * FROM KnowledgeGuides
            ORDER BY TabCategory, DisplayOrder
        `);
        const guides = guidesResult.recordset;

        if (guides.length === 0) {
            return res.json([]);
        }

        // 2. Fetch all Sections belonging to those guides
        const sectionsResult = await pool.request().query(`
            SELECT * FROM KnowledgeSections
            ORDER BY GuideId, DisplayOrder
        `);
        const sections = sectionsResult.recordset;

        // 3. Nest Sections into their parent Guides mapping
        const nestedGuides = guides.map(guide => {
            return {
                ...guide,
                sections: sections.filter(sec => sec.GuideId === guide.GuideId)
            };
        });

        res.json(nestedGuides);
    } catch (err) {
        res.status(500).json({ error: "Database Error", message: err.message });
    }
});

// POST: Add a new Knowledge Guide
router.post('/guides', auth, async (req, res) => {
    try {
        const { tabCategory, title, displayOrder = 0 } = req.body;
        const pool = req.pool;

        if (!tabCategory || !title) {
            return res.status(400).json({ error: "TabCategory and Title are required." });
        }

        const result = await pool.request()
            .input('TabCategory', tabCategory)
            .input('Title', title)
            .input('DisplayOrder', displayOrder)
            .query(`
                INSERT INTO KnowledgeGuides (TabCategory, Title, DisplayOrder)
                OUTPUT INSERTED.*
                VALUES (@TabCategory, @Title, @DisplayOrder)
            `);

        res.status(201).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: "Database Error", message: err.message });
    }
});

// DELETE: Remove a Knowledge Guide (and its sections via cascade)
router.delete('/guides/:id', auth, async (req, res) => {
    try {
        const guideId = req.params.id;
        const pool = req.pool;

        await pool.request()
            .input('GuideId', guideId)
            .query(`DELETE FROM KnowledgeGuides WHERE GuideId = @GuideId`);

        res.json({ message: "Guide deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Database Error", message: err.message });
    }
});

// POST: Add a new Section to a Guide
router.post('/sections', auth, async (req, res) => {
    try {
        const { guideId, title, contentText, displayOrder = 0 } = req.body;
        const pool = req.pool;

        if (!guideId || !title || !contentText) {
            return res.status(400).json({ error: "GuideId, Title, and ContentText are required." });
        }

        const result = await pool.request()
            .input('GuideId', guideId)
            .input('Title', title)
            .input('ContentText', contentText)
            .input('DisplayOrder', displayOrder)
            .query(`
                INSERT INTO KnowledgeSections (GuideId, Title, ContentText, DisplayOrder)
                OUTPUT INSERTED.*
                VALUES (@GuideId, @Title, @ContentText, @DisplayOrder)
            `);

        res.status(201).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: "Database Error", message: err.message });
    }
});

// DELETE: Remove a Section
router.delete('/sections/:id', auth, async (req, res) => {
    try {
        const sectionId = req.params.id;
        const pool = req.pool;

        await pool.request()
            .input('SectionId', sectionId)
            .query(`DELETE FROM KnowledgeSections WHERE SectionId = @SectionId`);

        res.json({ message: "Section deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Database Error", message: err.message });
    }
});

module.exports = router;
