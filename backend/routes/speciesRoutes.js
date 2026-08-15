const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { poolPromise } = require('../config/db');
const auth = require('../middleware/auth');

// 1. GET: Fetch all APPROVED species (Public-facing)
router.get('/', auth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const request = pool.request();

        // Return only approved species for the main list
        const query = 'SELECT * FROM Species WHERE IsApproved = 1';

        const result = await request.query(query);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Database error", message: err.message });
    }
});

// 1b. GET: Fetch regional species (Punjab, Sindh, etc.)
router.get('/regional', auth, async (req, res) => {
    try {
        const province = req.query.province; // e.g., "KPK Valleys (Peshawar, Mardan, Swat)"
        if (!province) return res.status(400).json({ error: "Province is required" });

        // Extract base region name (e.g., "KPK Valleys" from "KPK Valleys (Peshawar...)")
        const baseRegion = province.split('(')[0].trim();

        const pool = await poolPromise;
        const result = await pool.request()
            .input('province', sql.NVarChar, province)
            .input('baseRegion', sql.NVarChar, baseRegion)
            .query(`
                SELECT * FROM Species
                WHERE (LOWER(CompatibleRegions) LIKE '%' + LOWER(@province) + '%'
                OR LOWER(CompatibleRegions) LIKE '%' + LOWER(@baseRegion) + '%'
                OR LOWER(CompatibleRegions) LIKE '%all regions%')
                AND IsApproved = 1
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Database error", message: err.message });
    }
});

// 2. GET: Ping test (Public)
router.get('/ping', (req, res) => {
    res.send("Species Route file is loaded and working!");
});

// 2b. GET: Generate dynamic polyculture mixes based on SpeciesCompatibility
router.get('/polyculture/mixes', auth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT
                s1.SpeciesId as MainId,
                s1.Name as MainName,
                s2.SpeciesId as PartnerId,
                s2.Name as PartnerName,
                c.CompatibilityReason
            FROM SpeciesCompatibility c
            INNER JOIN Species s1 ON c.SpeciesId = s1.SpeciesId
            INNER JOIN Species s2 ON c.CompatibleWithId = s2.SpeciesId
        `);

        // Group by Main Species
        const grouped = {};
        result.recordset.forEach(row => {
            if (!grouped[row.MainId]) {
                grouped[row.MainId] = {
                    id: row.MainId,
                    name: `${row.MainName}-Centric Mix`,
                    level: "Dynamic Mix",
                    levelColor: "bg-emerald-50 text-emerald-600 border-emerald-100",
                    mainSpecies: row.MainName,
                    partners: [],
                    reasons: []
                };
            }
            grouped[row.MainId].partners.push(row.PartnerName);
            grouped[row.MainId].reasons.push(row.CompatibilityReason);
        });

        const mixes = Object.values(grouped).map(group => {
            const totalSpecies = 1 + group.partners.length;
            const percentage = Math.round(100 / totalSpecies);

            const ratio = [
                { species: group.mainSpecies, percentage: `${percentage}%`, count: "Varies by Pond" }
            ];

            group.partners.forEach(p => {
                ratio.push({ species: p, percentage: `${percentage}%`, count: "Varies by Pond" });
            });

            // Adjust last item to ensure total is 100% just in case of rounding errors (not strictly needed but good for display)

            return {
                id: group.id,
                name: group.name,
                level: group.level,
                levelColor: group.levelColor,
                totalFish: "Varies by Size",
                expectedYield: "Depends on density",
                advantages: group.reasons.join(" "),
                ratio: ratio
            };
        });

        // Add a two-way mix generator as well to make it interesting
        // Some species might only be a partner. We can also do bidirectional grouping, but this is a good start.

        res.json(mixes);
    } catch (err) {
        res.status(500).json({ error: "Database error", message: err.message });
    }
});

// 3. POST: Add a new custom Species (Protected)
router.post('/add', auth, async (req, res) => {
    try {
        const data = req.body;
        const pool = await poolPromise;
        const request = pool.request();

        request.input('Name', sql.NVarChar, data.Name);
        request.input('ImageUrl', sql.NVarChar, data.ImageUrl);
        request.input('MaxStockingDensity', sql.Decimal(10, 2), data.MaxStockingDensity);
        request.input('IsApproved', sql.Bit, 0);
        request.input('CompatibleRegions', sql.NVarChar, data.CompatibleRegions);
        request.input('MinTemp', sql.Int, data.MinTemp);
        request.input('MaxTemp', sql.Int, data.MaxTemp);
        request.input('MinPH', sql.Decimal(3, 1), data.MinPH);
        request.input('MaxPH', sql.Decimal(3, 1), data.MaxPH);
        request.input('MinDO', sql.Decimal(3, 1), data.MinDO);
        request.input('FingerlingSizeG', sql.Int, data.FingerlingSizeG);
        request.input('MarketSizeKG', sql.Decimal(10, 2), data.MarketSizeKG);
        request.input('HarvestTimeMonths', sql.Int, data.HarvestTimeMonths);
        request.input('SurvivalRateLower', sql.Decimal(5, 2), data.SurvivalRateLower);
        request.input('SurvivalRateUpper', sql.Decimal(5, 2), data.SurvivalRateUpper);
        request.input('MinMarketPrice', sql.Decimal(10, 2), data.MinMarketPrice);
        request.input('MaxMarketPrice', sql.Decimal(10, 2), data.MaxMarketPrice);
        request.input('Description', sql.NVarChar, data.Description);
        request.input('FeedingZone', sql.NVarChar, data.FeedingZone);
        request.input('SubmittedBy', sql.Int, req.user.id);

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const addReq = new sql.Request(transaction);

            // Re-bind all inputs to the transaction request
            addReq.input('Name', sql.NVarChar, data.Name);
            addReq.input('ImageUrl', sql.NVarChar, data.ImageUrl);
            addReq.input('MaxStockingDensity', sql.Decimal(10, 2), data.MaxStockingDensity);
            addReq.input('IsApproved', sql.Bit, 0);
            addReq.input('CompatibleRegions', sql.NVarChar, data.CompatibleRegions);
            addReq.input('MinTemp', sql.Int, data.MinTemp);
            addReq.input('MaxTemp', sql.Int, data.MaxTemp);
            addReq.input('MinPH', sql.Decimal(3, 1), data.MinPH);
            addReq.input('MaxPH', sql.Decimal(3, 1), data.MaxPH);
            addReq.input('MinDO', sql.Decimal(3, 1), data.MinDO);
            addReq.input('FingerlingSizeG', sql.Int, data.FingerlingSizeG);
            addReq.input('MarketSizeKG', sql.Decimal(10, 2), data.MarketSizeKG);
            addReq.input('HarvestTimeMonths', sql.Int, data.HarvestTimeMonths);
            addReq.input('SurvivalRateLower', sql.Decimal(5, 2), data.SurvivalRateLower);
            addReq.input('SurvivalRateUpper', sql.Decimal(5, 2), data.SurvivalRateUpper);
            addReq.input('MinMarketPrice', sql.Decimal(10, 2), data.MinMarketPrice);
            addReq.input('MaxMarketPrice', sql.Decimal(10, 2), data.MaxMarketPrice);
            addReq.input('Description', sql.NVarChar, data.Description);
            addReq.input('FeedingZone', sql.NVarChar, data.FeedingZone);
            addReq.input('SubmittedBy', sql.Int, req.user.id);

            const result = await addReq.query(`
            INSERT INTO Species (
                Name, ImageUrl, MaxStockingDensity, IsApproved, CompatibleRegions,
                MinTemp, MaxTemp, MinPH, MaxPH, MinDO, FingerlingSizeG,
                MarketSizeKG, HarvestTimeMonths, SurvivalRateLower, SurvivalRateUpper,
                MinMarketPrice, MaxMarketPrice, Description, FeedingZone, SubmittedBy
            ) VALUES (
                @Name, @ImageUrl, @MaxStockingDensity, @IsApproved, @CompatibleRegions,
                @MinTemp, @MaxTemp, @MinPH, @MaxPH, @MinDO, @FingerlingSizeG,
                @MarketSizeKG, @HarvestTimeMonths, @SurvivalRateLower, @SurvivalRateUpper,
                @MinMarketPrice, @MaxMarketPrice, @Description, @FeedingZone, @SubmittedBy
            );
            SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewSpeciesId;
            `);

            const newSpeciesId = result.recordset[0].NewSpeciesId;

            // Insert Compatible Species
            if (data.CompatibleSpeciesIds && Array.isArray(data.CompatibleSpeciesIds)) {
                for (const partnerId of data.CompatibleSpeciesIds) {
                    const compReq = new sql.Request(transaction);
                    compReq.input('SpeciesId', sql.Int, newSpeciesId);
                    compReq.input('CompatibleWithId', sql.Int, partnerId);
                    compReq.input('Reason', sql.NVarChar, 'Custom Poly-culture compatibility');
                    await compReq.query(`
                        INSERT INTO SpeciesCompatibility (SpeciesId, CompatibleWithId, CompatibilityReason)
                        VALUES (@SpeciesId, @CompatibleWithId, @Reason)
                    `);
                }
            }

            // Insert Feed Rules
            const insertFeed = async (stage, feedType, minSize, maxSize, rate, freq) => {
                if (!feedType) return;
                const feedReq = new sql.Request(transaction);
                feedReq.input('SpeciesID', sql.Int, newSpeciesId);
                feedReq.input('Stage', sql.NVarChar, stage);
                feedReq.input('MinSize', sql.Float, minSize);
                feedReq.input('MaxSize', sql.Float, maxSize);
                feedReq.input('Rate', sql.Float, rate);
                feedReq.input('FeedType', sql.NVarChar, feedType);
                feedReq.input('Freq', sql.NVarChar, freq);

                await feedReq.query(`
                    INSERT INTO Feed_Rules (SpeciesID, Stage, MinSize_inch, MaxSize_inch, DailyRate_Percent, ConditionFactor_K, FeedType, Frequency)
                    VALUES (@SpeciesID, @Stage, @MinSize, @MaxSize, @Rate, 0.01, @FeedType, @Freq)
                `);
            };

            await insertFeed('Fingerling', data.FingerlingFeedType, 1.0, 5.0, 5.0, '3-4 times daily');
            await insertFeed('Grow-out', data.GrowOutFeedType, 5.0, 20.0, 3.0, '2-3 times daily');

            await transaction.commit();
            res.status(201).json({ success: true, message: "Custom species and feed guidelines added successfully!" });
        } catch (txnErr) {
            await transaction.rollback();
            throw txnErr;
        }

    } catch (err) {
        console.error("Species Add Error:", err);
        res.status(500).json({ error: "Failed to add species", message: err.message });
    }
});

// 4. GET Compatibility for a specific Species (Protected)
router.get('/:id/compatibility', auth, async (req, res) => {
    try {
        const pool = await poolPromise; // Standardized to poolPromise
        const result = await pool.request()
            .input('speciesId', sql.Int, req.params.id)
            .query(`
                SELECT
                    c.CompatibilityId,
                    s1.Name AS MainSpeciesName,
                    s2.Name AS CompatibleSpeciesName,
                    c.CompatibilityReason
                FROM SpeciesCompatibility c
                INNER JOIN Species s1 ON c.SpeciesId = s1.SpeciesId
                INNER JOIN Species s2 ON c.CompatibleWithId = s2.SpeciesId
                WHERE c.SpeciesId = @speciesId OR c.CompatibleWithId = @speciesId
            `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Database error", message: err.message });
    }
});

// 5. GET: Admin view of PENDING species (Admin only)
router.get('/admin/pending', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Access denied. Admin role required." });
        }

        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Species WHERE IsApproved = 0');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Database error", message: err.message });
    }
});

// 6. PUT: Approve a species (Admin only)
router.put('/:id/approve', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Access denied. Admin role required." });
        }

        const pool = await poolPromise;
        await pool.request()
            .input('speciesId', sql.Int, req.params.id)
            .query('UPDATE Species SET IsApproved = 1 WHERE SpeciesId = @speciesId');

        res.json({ success: true, message: "Species approved successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Database error", message: err.message });
    }
});

// 7b. PUT: Admin update species stocking limits
router.put('/:id/stocking-limits', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
        const d = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('SmallMaxPerAcre', sql.Int, d.SmallMaxPerAcre || null)
            .input('MediumMaxPerAcre', sql.Int, d.MediumMaxPerAcre || null)
            .input('LargeMaxPerAcre', sql.Int, d.LargeMaxPerAcre || null)
            .input('CultivationType', sql.NVarChar, d.CultivationType || 'Semi-Intensive')
            .input('CultureType', sql.NVarChar, d.CultureType || 'Polyculture')
            .input('MaxSpeciesAllowed', sql.Int, d.MaxSpeciesAllowed || 3)
            .input('FeedingZone', sql.NVarChar, d.FeedingZone || 'Column')
            .query(`
                UPDATE Species SET
                    SmallMaxPerAcre = @SmallMaxPerAcre,
                    MediumMaxPerAcre = @MediumMaxPerAcre,
                    LargeMaxPerAcre = @LargeMaxPerAcre,
                    CultivationType = @CultivationType,
                    CultureType = @CultureType,
                    MaxSpeciesAllowed = @MaxSpeciesAllowed,
                    FeedingZone = @FeedingZone
                WHERE SpeciesId = @id
            `);
        res.json({ success: true, message: "Stocking limits updated" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update stocking limits", details: err.message });
    }
});

// 7c. PUT: Admin edit species info
router.put('/:id/edit', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
        const d = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('Name', sql.NVarChar, d.Name)
            .input('CompatibleRegions', sql.NVarChar, d.CompatibleRegions || '')
            .input('MinTemp', sql.Int, d.MinTemp || 20)
            .input('MaxTemp', sql.Int, d.MaxTemp || 32)
            .input('MinPH', sql.Decimal(3, 1), d.MinPH || 6.5)
            .input('MaxPH', sql.Decimal(3, 1), d.MaxPH || 8.5)
            .input('MinDO', sql.Decimal(3, 1), d.MinDO || 4)
            .input('MarketSizeKG', sql.Decimal(10, 2), d.MarketSizeKG || 1)
            .input('HarvestTimeMonths', sql.Int, d.HarvestTimeMonths || 6)
            .input('MinMarketPrice', sql.Decimal(10, 2), d.MinMarketPrice || 200)
            .input('MaxMarketPrice', sql.Decimal(10, 2), d.MaxMarketPrice || 400)
            .input('FingerlingSizeG', sql.Int, d.FingerlingSizeG || 5)
            .input('SurvivalRateLower', sql.Decimal(5, 2), d.SurvivalRateLower || 75)
            .input('SurvivalRateUpper', sql.Decimal(5, 2), d.SurvivalRateUpper || 90)
            .input('MaxStockingDensity', sql.Decimal(10, 2), d.MaxStockingDensity || 1)
            .input('FeedingZone', sql.NVarChar, d.FeedingZone || 'Column')
            .input('Description', sql.NVarChar, d.Description || '')
            .input('ImageUrl', sql.NVarChar, d.ImageUrl || '')
            .query(`
                UPDATE Species SET
                    Name = @Name, CompatibleRegions = @CompatibleRegions,
                    MinTemp = @MinTemp, MaxTemp = @MaxTemp,
                    MinPH = @MinPH, MaxPH = @MaxPH, MinDO = @MinDO,
                    MarketSizeKG = @MarketSizeKG, HarvestTimeMonths = @HarvestTimeMonths,
                    MinMarketPrice = @MinMarketPrice, MaxMarketPrice = @MaxMarketPrice,
                    FingerlingSizeG = @FingerlingSizeG,
                    SurvivalRateLower = @SurvivalRateLower, SurvivalRateUpper = @SurvivalRateUpper,
                    MaxStockingDensity = @MaxStockingDensity, FeedingZone = @FeedingZone,
                    Description = @Description, ImageUrl = @ImageUrl
                WHERE SpeciesId = @id
            `);
        res.json({ success: true, message: "Species updated" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update species", details: err.message });
    }
});

// 7c. POST: Admin add species (pre-approved)
router.post('/admin/add', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
        const d = req.body;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('Name', sql.NVarChar, d.Name)
            .input('CompatibleRegions', sql.NVarChar, d.CompatibleRegions || '')
            .input('MinTemp', sql.Int, d.MinTemp || 20)
            .input('MaxTemp', sql.Int, d.MaxTemp || 32)
            .input('MinPH', sql.Decimal(3, 1), d.MinPH || 6.5)
            .input('MaxPH', sql.Decimal(3, 1), d.MaxPH || 8.5)
            .input('MinDO', sql.Decimal(3, 1), d.MinDO || 4)
            .input('MarketSizeKG', sql.Decimal(10, 2), d.MarketSizeKG || 1)
            .input('HarvestTimeMonths', sql.Int, d.HarvestTimeMonths || 6)
            .input('MinMarketPrice', sql.Decimal(10, 2), d.MinMarketPrice || 200)
            .input('MaxMarketPrice', sql.Decimal(10, 2), d.MaxMarketPrice || 400)
            .input('FingerlingSizeG', sql.Int, d.FingerlingSizeG || 5)
            .input('SurvivalRateLower', sql.Decimal(5, 2), d.SurvivalRateLower || 75)
            .input('SurvivalRateUpper', sql.Decimal(5, 2), d.SurvivalRateUpper || 90)
            .input('MaxStockingDensity', sql.Decimal(10, 2), d.MaxStockingDensity || 1)
            .input('FeedingZone', sql.NVarChar, d.FeedingZone || 'Column')
            .input('Description', sql.NVarChar, d.Description || '')
            .input('ImageUrl', sql.NVarChar, d.ImageUrl || '')
            .query(`
                INSERT INTO Species (
                    Name, CompatibleRegions, MinTemp, MaxTemp, MinPH, MaxPH, MinDO,
                    MarketSizeKG, HarvestTimeMonths, MinMarketPrice, MaxMarketPrice,
                    FingerlingSizeG, SurvivalRateLower, SurvivalRateUpper,
                    MaxStockingDensity, FeedingZone, Description, ImageUrl, IsApproved
                ) VALUES (
                    @Name, @CompatibleRegions, @MinTemp, @MaxTemp, @MinPH, @MaxPH, @MinDO,
                    @MarketSizeKG, @HarvestTimeMonths, @MinMarketPrice, @MaxMarketPrice,
                    @FingerlingSizeG, @SurvivalRateLower, @SurvivalRateUpper,
                    @MaxStockingDensity, @FeedingZone, @Description, @ImageUrl, 1
                )
            `);
        res.status(201).json({ success: true, message: "Species added" });
    } catch (err) {
        res.status(500).json({ error: "Failed to add species", details: err.message });
    }
});

// 7. DELETE: Reject/Delete a species (Admin only)
router.delete('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Access denied. Admin role required." });
        }

        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const reqQuery = new sql.Request(transaction);
            reqQuery.input('speciesId', sql.Int, req.params.id);

            // Delete configuration data associated with the species first to satisfy FKs
            await reqQuery.query('DELETE FROM SpeciesCompatibility WHERE SpeciesId = @speciesId OR CompatibleWithId = @speciesId');
            await reqQuery.query('DELETE FROM Feed_Rules WHERE SpeciesID = @speciesId');

            // Delete the species itself
            await reqQuery.query('DELETE FROM Species WHERE SpeciesId = @speciesId');

            await transaction.commit();
            res.json({ success: true, message: "Species rejected and deleted." });
        } catch (txnErr) {
            await transaction.rollback();

            // If the species is still referenced elsewhere (like in Stocking, Harvest, etc.)
            if (txnErr.message.includes('REFERENCE constraint')) {
                return res.status(400).json({ error: "This species is currently in use (e.g., in ponds or marketplace) and cannot be deleted." });
            }
            throw txnErr; // Rethrow to be caught by the outer catch
        }
    } catch (err) {
        res.status(500).json({ error: "Database error", message: err.message });
    }
});

module.exports = router;