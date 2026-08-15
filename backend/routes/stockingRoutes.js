const express = require('express');
const router = express.Router();
const sql = require('mssql');
const auth = require('../middleware/auth');

// --- 1. CREATE: Add new stocking record (PROTECTED) ---
router.post("/add", auth, async (req, res) => {
    try {
        const { pondId, speciesId, quantity, pricePerPiece, currentSize, targetSize, stockingDate } = req.body;
        const pool = req.pool;

        const policyData = await pool.request()
            .input("pId", sql.Int, pondId)
            .input("sId", sql.Int, speciesId)
            .query(`
                SELECT p.Size, p.Stage, p.CultivationType, p.CultureType, p.RegionId,
                       ISNULL(s.MaxSpeciesAllowed, 3) AS MaxSpeciesAllowed,
                       s.FeedingZone, s.Name as SpeciesName, s.SmallMaxPerAcre, s.MediumMaxPerAcre, s.LargeMaxPerAcre
                FROM Ponds p
                CROSS JOIN Species s
                WHERE p.PondId = @pId AND s.SpeciesId = @sId
            `);

        if (policyData.recordset.length === 0) {
            return res.status(404).json({
                error: "Configuration Error",
                message: "Species not found or pond does not exist."
            });
        }

        const { Size, Stage, CultivationType, CultureType, RegionId, MaxSpeciesAllowed, FeedingZone, SpeciesName, SmallMaxPerAcre, MediumMaxPerAcre, LargeMaxPerAcre } = policyData.recordset[0];

        const curSizeInput = Number(currentSize) || 0;
        let densityForInput = Number(LargeMaxPerAcre) || 4000;
        if (curSizeInput < 4) densityForInput = Number(SmallMaxPerAcre) || 1500000;
        else if (curSizeInput < 8) densityForInput = Number(MediumMaxPerAcre) || 40000;

        const targetMaxPerAcre = densityForInput;
        const totalPondCapacity = Math.floor(Size * targetMaxPerAcre);

        // 2. CHECK: Total Species Diversity
        const speciesCheck = await pool.request()
            .input("pId", sql.Int, pondId)
            .input("sId", sql.Int, speciesId)
            .query(`
                SELECT COUNT(DISTINCT SpeciesId) as UniqueSpecies
                FROM Stocking
                WHERE CurrentPondId = @pId AND SpeciesId <> @sId AND Quantity > 0
            `);

        if (speciesCheck.recordset[0].UniqueSpecies >= MaxSpeciesAllowed) {
            return res.status(400).json({
                error: "Diversity Limit Reached",
                message: `This ${CultivationType} system only supports up to ${MaxSpeciesAllowed} species.`
            });
        }

        // 2b. CHECK: Biological Compatibility (for Polyculture)
        if (MaxSpeciesAllowed > 1) {
            const compatibilityCheck = await pool.request()
                .input("pId", sql.Int, pondId)
                .input("sId", sql.Int, speciesId)
                .query(`
                    SELECT s.Name
                    FROM Stocking st
                    JOIN Species s ON st.SpeciesId = s.SpeciesId
                    WHERE st.CurrentPondId = @pId AND st.SpeciesId <> @sId AND st.Quantity > 0
                    AND NOT EXISTS (
                        SELECT 1 FROM SpeciesCompatibility c
                        WHERE (c.SpeciesId = @sId AND c.CompatibleWithId = st.SpeciesId)
                           OR (c.SpeciesId = st.SpeciesId AND c.CompatibleWithId = @sId)
                    )
                `);

            if (compatibilityCheck.recordset.length > 0) {
                const conflictSpecies = compatibilityCheck.recordset.map(r => r.Name).join(", ");
                return res.status(400).json({
                    error: "Biological Conflict",
                    message: `${SpeciesName} is not biologically compatible with ${conflictSpecies} in this pond.`
                });
            }
        } else if (speciesCheck.recordset[0].UniqueSpecies > 0) {
            // Monoculture check: If any different species exists
            const monocultureCheck = await pool.request()
                .input("pId", sql.Int, pondId)
                .input("sId", sql.Int, speciesId)
                .query("SELECT TOP 1 s.Name FROM Stocking st JOIN Species s ON st.SpeciesId = s.SpeciesId WHERE st.CurrentPondId = @pId AND st.SpeciesId <> @sId AND st.Quantity > 0");

            if (monocultureCheck.recordset.length > 0) {
                return res.status(400).json({
                    error: "Monoculture Violation",
                    message: `This pond is set for Monoculture and already contains ${monocultureCheck.recordset[0].Name}.`
                });
            }
        }

        // 3. CHECK: Species-Specific Quantity (Advisor Logic)
        let zoneRatio = (FeedingZone === 'Column') ? 0.40 : 0.30;

        // If Monoculture, 100% of the pond belongs to this species
        if (MaxSpeciesAllowed === 1) {
            zoneRatio = 1.0;
        }

        // If pond is empty (no other live species), allow full capacity for first species
        if (speciesCheck.recordset[0].UniqueSpecies === 0) {
            zoneRatio = 1.0;
        }

        const maxQtyForThisSpecies = Math.floor(totalPondCapacity * zoneRatio);

        // OPTIONAL ADVISOR: We no longer hard-block the user if they exceed the feeding zone ratio.
        // The frontend already shows them the optimal 'Max for Species' limit, but we allow them to override it.
        /*
        if (quantity > maxQtyForThisSpecies) {
            return res.status(400).json({
                error: "Inefficient Stocking",
                message: `For better growth, limit ${SpeciesName} (${FeedingZone} feeder) to ${maxQtyForThisSpecies.toLocaleString()} fish in this pond. You entered ${parseInt(quantity).toLocaleString()}. Please reduce the quantity.`
            });
        }
        */

        // FYP_FEATURE_START: CAPACITY_HANDLING_LOGIC_AND_FORMULAS
        // 4. CHECK: Total Physical Density (Utilization %) using Fractional Capacity
        const currentStockRes = await pool.request()
            .input("pId", sql.Int, pondId)
            .query(`
                SELECT st.Quantity, st.CurrentSizeInches, s.SmallMaxPerAcre, s.MediumMaxPerAcre, s.LargeMaxPerAcre
                FROM Stocking st
                JOIN Species s ON st.SpeciesId = s.SpeciesId
                WHERE st.CurrentPondId = @pId AND st.Quantity > 0 AND st.Status != 'Harvested'
            `);

        let fractionalUsage = 0;
        let existingQty = 0;

        currentStockRes.recordset.forEach(batch => {
            const bQty = Number(batch.Quantity) || 0;
            existingQty += bQty;

            const bSize = Number(batch.CurrentSizeInches) || 0;
            let maxPerAcre = Number(batch.LargeMaxPerAcre) || 4000;
            if (bSize < 4) maxPerAcre = Number(batch.SmallMaxPerAcre) || 1500000;
            else if (bSize < 8) maxPerAcre = Number(batch.MediumMaxPerAcre) || 40000;

            let maxForPond = Math.floor(Size * maxPerAcre);
            if (maxForPond > 0) fractionalUsage += (bQty / maxForPond);
        });
        // FYP_FEATURE_END: CAPACITY_HANDLING_LOGIC_AND_FORMULAS

        // Add the new batch to fractional usage
        const newBatchQty = parseInt(quantity);
        const newTotal = existingQty + newBatchQty;
        if (totalPondCapacity > 0) {
            fractionalUsage += (newBatchQty / totalPondCapacity);
        }

        const isPolyculture = (CultureType || CultivationType) === 'Polyculture' || MaxSpeciesAllowed > 1;
        const maxAllowedFraction = isPolyculture ? 0.90 : 1.00;

        if (fractionalUsage > maxAllowedFraction) {
            return res.status(400).json({
                error: "Pond Overcrowded",
                message: isPolyculture
                    ? `Polyculture limit reached! A pond cannot be filled to 100% with multiple species. You can only fill up to 90% of the pond's theoretical monoculture capacity. Adding ${newBatchQty.toLocaleString()} fish exceeds this.`
                    : `Monoculture limit reached! Adding ${newBatchQty.toLocaleString()} fish exceeds the pond's 100% capacity.`
            });
        }

        // 5. INSERT (Includes UserId and inherited RegionId)
        const result = await pool.request()
            .input("uId", sql.Int, req.user.id) // Stamp record with the User's ID
            .input("oPId", sql.Int, pondId)
            .input("cPId", sql.Int, pondId)
            .input("sId", sql.Int, speciesId)

            .input("qty", sql.Int, quantity)
            .input("price", sql.Decimal(10, 2), pricePerPiece)
            .input("curSize", sql.Decimal(4, 2), currentSize)
            .input("tarSize", sql.Decimal(4, 2), targetSize)
            .input("status", sql.NVarChar, Stage)
            .input("date", sql.DateTime, stockingDate || new Date())
            .query(`
                INSERT INTO Stocking (
                    UserId, OriginalPondId, CurrentPondId, SpeciesId, Quantity, PricePerPiece,
                    CurrentSizeInches, TargetSizeInches, StockingDate, Status
                )
                VALUES (@uId, @oPId, @cPId, @sId, @qty, @price, @curSize, @tarSize, @date, @status);
                SELECT CAST(SCOPE_IDENTITY() AS INT) AS StockId;
            `);

        res.status(201).json({
            success: true,
            StockId: result.recordset[0].StockId,
            preview: {
                currentFish: existingQty,
                newTotal: newTotal,
                maximumCapacity: totalPondCapacity,
                utilization: ((newTotal / totalPondCapacity) * 100).toFixed(2) + "%"
            }
        });

    } catch (err) {
        res.status(500).json({ error: "Server Error", details: err.message });
    }
});
router.get("/preview/:pondId/:speciesId", auth, async (req, res) => {
    try {
        const { pondId, speciesId } = req.params;
        const inputQty = parseInt(req.query.quantity) || 0;
        const currentSizeInput = parseFloat(req.query.currentSize) || 0;
        const pool = req.pool;

        const result = await pool.request()
            .input("pId", sql.Int, pondId)
            .input("sId", sql.Int, speciesId)
            .query(`
                SELECT p.Size, p.Stage, p.CultivationType, p.CultureType,
                       ISNULL(s.MaxSpeciesAllowed, 3) AS MaxSpeciesAllowed,
                       (SELECT SUM(Quantity) FROM Stocking WHERE CurrentPondId = @pId AND Status != 'Harvested') as CurrentStock,
                       s.Name as SpeciesName, s.FeedingZone, s.SmallMaxPerAcre, s.MediumMaxPerAcre, s.LargeMaxPerAcre
                FROM Ponds p
                CROSS JOIN Species s
                WHERE p.PondId = @pId AND s.SpeciesId = @sId
            `);

        if (result.recordset.length === 0) return res.status(404).json({ error: "Pond or Species not found" });

        const { Size, Stage, CultureType, CurrentStock, MaxSpeciesAllowed, SpeciesName, FeedingZone, SmallMaxPerAcre, MediumMaxPerAcre, LargeMaxPerAcre } = result.recordset[0];
        const existingQty = CurrentStock || 0;

        // Use currentSize to pick the right density tier — same logic as /add
        let densityForInput;
        if (currentSizeInput < 4) densityForInput = Number(SmallMaxPerAcre) || 750000;
        else if (currentSizeInput < 8) densityForInput = Number(MediumMaxPerAcre) || 18000;
        else densityForInput = Number(LargeMaxPerAcre) || 2000;

        const targetMaxPerAcre = densityForInput;
        const maxCap = Math.floor(Size * targetMaxPerAcre);
        const newTotal = existingQty + inputQty;

        // FETCH EXISTING STOCK TO CALCULATE REMAINING CAPACITY
        const currentStockRes = await pool.request()
            .input("pId", sql.Int, pondId)
            .query(`
                SELECT st.Quantity, st.CurrentSizeInches, s.Name, s.SmallMaxPerAcre, s.MediumMaxPerAcre, s.LargeMaxPerAcre
                FROM Stocking st
                JOIN Species s ON st.SpeciesId = s.SpeciesId
                WHERE st.CurrentPondId = @pId AND st.Quantity > 0 AND st.Status != 'Harvested'
            `);

        let previewFractionalUsage = 0;
        currentStockRes.recordset.forEach(batch => {
            const bQty = Number(batch.Quantity) || 0;
            const bSize = Number(batch.CurrentSizeInches) || 0;

            // Use each batch's own size to pick correct density — matches /add logic
            let maxPerAcre;
            if (bSize < 4) maxPerAcre = Number(batch.SmallMaxPerAcre) || 750000;
            else if (bSize < 8) maxPerAcre = Number(batch.MediumMaxPerAcre) || 18000;
            else maxPerAcre = Number(batch.LargeMaxPerAcre) || 2000;

            let maxForPond = Math.floor(Size * maxPerAcre);
            if (maxForPond > 0) previewFractionalUsage += (bQty / maxForPond);
        });

        const isPolyculture = CultureType === 'Polyculture' || MaxSpeciesAllowed > 1;
        const polyFactor = isPolyculture ? 0.90 : 1.00;

        let remainingFraction = polyFactor - previewFractionalUsage;
        if (remainingFraction < 0) remainingFraction = 0;

        const maxQtyForThisSpecies = Math.floor(remainingFraction * Size * targetMaxPerAcre);

        // 2. CHECK: Biological Compatibility
        let compatibility = { isCompatible: true, message: "Compatible" };

        const existingSpeciesNames = [...new Set(currentStockRes.recordset.map(b => b.Name))];
        const otherSpeciesNames = existingSpeciesNames.filter(n => n !== SpeciesName);
        if (otherSpeciesNames.length > 0) {
            compatibility.message = `${SpeciesName} is compatible with ${otherSpeciesNames.join(", ")} in this pond.`;
        }

        const compatibilityCheck = await pool.request()
            .input("pId", sql.Int, pondId)
            .input("sId", sql.Int, speciesId)
            .query(`
                SELECT s.Name
                FROM Stocking st
                JOIN Species s ON st.SpeciesId = s.SpeciesId
                WHERE st.CurrentPondId = @pId AND st.SpeciesId <> @sId AND st.Quantity > 0
                AND NOT EXISTS (
                    SELECT 1 FROM SpeciesCompatibility c
                    WHERE (c.SpeciesId = @sId AND c.CompatibleWithId = st.SpeciesId)
                       OR (c.SpeciesId = st.SpeciesId AND c.CompatibleWithId = @sId)
                )
            `);

        if (compatibilityCheck.recordset.length > 0) {
            const conflictSpecies = compatibilityCheck.recordset.map(r => r.Name).join(", ");
            compatibility = {
                isCompatible: false,
                message: `${SpeciesName} is incompatible with ${conflictSpecies} in this pond.`
            };
        } else if (MaxSpeciesAllowed === 1) {
            const monocultureCheck = await pool.request()
                .input("pId", sql.Int, pondId)
                .input("sId", sql.Int, speciesId)
                .query("SELECT TOP 1 s.Name FROM Stocking st JOIN Species s ON st.SpeciesId = s.SpeciesId WHERE st.CurrentPondId = @pId AND st.SpeciesId <> @sId AND st.Quantity > 0");

            if (monocultureCheck.recordset.length > 0) {
                compatibility = {
                    isCompatible: false,
                    message: `Monoculture pond already contains ${monocultureCheck.recordset[0].Name}.`
                };
            }
        }

        let usageWithInput = previewFractionalUsage;
        if (maxCap > 0) usageWithInput += (inputQty / maxCap);

        const utilizationPercent = Math.round((usageWithInput / polyFactor) * 100) + "%";

        res.json({
            currentFish: existingQty,
            existingSpeciesNames: existingSpeciesNames,
            newTotal: newTotal,
            maximumCapacity: maxCap,
            maxQtyForThisSpecies: maxQtyForThisSpecies,
            feedingZone: FeedingZone,
            utilization: utilizationPercent,
            compatibility
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- 2. TRANSFER: Nursery to Grow-out (PROTECTED) ---
router.put('/transfer', auth, async (req, res) => {
    try {
        const { stockId, toPondId } = req.body;
        const pool = req.pool;

        // 1. Get Species ID of the batch being transferred
        const stockData = await pool.request()
            .input('sid', sql.Int, stockId)
            .input('uId', sql.Int, req.user.id)
            .query("SELECT SpeciesId FROM Stocking WHERE StockId = @sid AND UserId = @uId");

        if (stockData.recordset.length === 0) {
            return res.status(404).json({ error: "Batch not found" });
        }
        const speciesId = stockData.recordset[0].SpeciesId;

        // 2. Fetch Destination Pond Policy
        const policyData = await pool.request()
            .input("pId", sql.Int, toPondId)
            .input("sId", sql.Int, speciesId)
            .query(`
                SELECT p.Stage, p.CultivationType, p.CultureType,
                       ISNULL(s.MaxSpeciesAllowed, 3) AS MaxSpeciesAllowed
                FROM Ponds p
                CROSS JOIN Species s
                WHERE p.PondId = @pId AND s.SpeciesId = @sId
            `);

        if (policyData.recordset.length === 0) {
            return res.status(404).json({ error: "Destination pond or species not found" });
        }
        const { MaxSpeciesAllowed, Stage } = policyData.recordset[0];

        // 3. CHECK: Total Species Diversity Limit
        const speciesCheck = await pool.request()
            .input("pId", sql.Int, toPondId)
            .input("sId", sql.Int, speciesId)
            .query(`
                SELECT COUNT(DISTINCT SpeciesId) as UniqueSpecies
                FROM Stocking
                WHERE CurrentPondId = @pId AND SpeciesId <> @sId AND Quantity > 0
            `);

        if (speciesCheck.recordset[0].UniqueSpecies >= MaxSpeciesAllowed) {
             return res.status(400).json({
                error: "Diversity Limit Reached",
                message: `The destination pond only supports up to ${MaxSpeciesAllowed} species.`
            });
        }

        // 4. CHECK: Biological Compatibility
        if (MaxSpeciesAllowed > 1) {
            const compatibilityCheck = await pool.request()
                .input("pId", sql.Int, toPondId)
                .input("sId", sql.Int, speciesId)
                .query(`
                    SELECT s.Name
                    FROM Stocking st
                    JOIN Species s ON st.SpeciesId = s.SpeciesId
                    WHERE st.CurrentPondId = @pId AND st.SpeciesId <> @sId AND st.Quantity > 0
                    AND NOT EXISTS (
                        SELECT 1 FROM SpeciesCompatibility c
                        WHERE (c.SpeciesId = @sId AND c.CompatibleWithId = st.SpeciesId)
                           OR (c.SpeciesId = st.SpeciesId AND c.CompatibleWithId = @sId)
                    )
                `);

            if (compatibilityCheck.recordset.length > 0) {
                const conflictSpecies = compatibilityCheck.recordset.map(r => r.Name).join(", ");
                return res.status(400).json({
                    error: "Biological Conflict",
                    message: `Transferred fish is biologically incompatible with ${conflictSpecies} in the destination pond.`
                });
            }
        } else if (speciesCheck.recordset[0].UniqueSpecies > 0) {
            const monocultureCheck = await pool.request()
                .input("pId", sql.Int, toPondId)
                .input("sId", sql.Int, speciesId)
                .query("SELECT TOP 1 s.Name FROM Stocking st JOIN Species s ON st.SpeciesId = s.SpeciesId WHERE st.CurrentPondId = @pId AND st.SpeciesId <> @sId AND st.Quantity > 0");

            if (monocultureCheck.recordset.length > 0) {
                return res.status(400).json({
                    error: "Monoculture Violation",
                    message: `Destination pond is set for Monoculture and already contains ${monocultureCheck.recordset[0].Name}.`
                });
            }
        }

        // 5. Proceed to update
        await pool.request()
            .input('sid', sql.Int, stockId)
            .input('newP', sql.Int, toPondId)
            .input('stage', sql.VarChar, Stage)
            .query(`
                UPDATE Stocking
                SET CurrentPondId = @newP, Status = @stage
                WHERE StockId = @sid
            `);

        res.json({ success: true, message: "Batch transferred and status updated." });
    } catch (err) {
        res.status(500).json({ error: "Transfer failed", details: err.message });
    }
});

// --- 3. READ: Inventory (PROTECTED - Filtered by User) ---
router.get('/', auth, async (req, res) => {
    try {
        const result = await req.pool.request()
            .input("uId", sql.Int, req.user.id)
            .query(`
                SELECT st.*, s.Name AS SpeciesName, s.FeedingZone,
                       p.PondName AS CurrentPondName, p.Stage AS CurrentPondStage,
                       st.LastSizeUpdateDate
                FROM Stocking st
                JOIN Species s ON st.SpeciesId = s.SpeciesId
                JOIN Ponds p ON st.CurrentPondId = p.PondId
                WHERE st.UserId = @uId
                ORDER BY st.StockingDate DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Fetch failed", details: err.message });
    }
});

// --- 4. UPDATE: Growth Sampling (PROTECTED) ---
router.put('/:id', auth, async (req, res) => {
    try {
        const { quantity, currentSize, targetSize, recordDate } = req.body;
        const pool = req.pool;

        // Perform capacity validation if size or quantity is being changed
        if (currentSize !== undefined || quantity !== undefined) {
            const batchRes = await pool.request()
                .input('id', sql.Int, req.params.id)
                .query("SELECT CurrentPondId, Quantity, CurrentSizeInches FROM Stocking WHERE StockId = @id");

            if (batchRes.recordset.length > 0) {
                const { CurrentPondId, Quantity, CurrentSizeInches } = batchRes.recordset[0];

                // Fetch pond details
                const pondRes = await pool.request()
                    .input('pId', sql.Int, CurrentPondId)
                    .query(`
                        SELECT p.Size, p.Stage, p.CultivationType, p.CultureType
                        FROM Ponds p
                        WHERE p.PondId = @pId
                    `);

                if (pondRes.recordset.length > 0) {
                    const pond = pondRes.recordset[0];

                    // Fetch ALL batches in the pond to calculate fractional capacity
                    const allStockRes = await pool.request()
                        .input('pId', sql.Int, CurrentPondId)
                        .query(`
                            SELECT st.StockId, st.Quantity, st.CurrentSizeInches, s.SmallMaxPerAcre, s.MediumMaxPerAcre, s.LargeMaxPerAcre
                            FROM Stocking st
                            JOIN Species s ON st.SpeciesId = s.SpeciesId
                            WHERE st.CurrentPondId = @pId AND st.Quantity > 0 AND st.Status != 'Harvested'
                        `);

                    let fractionalUsage = 0;
                    let totalQty = 0;

                    allStockRes.recordset.forEach(batch => {
                        let bQty = Number(batch.Quantity) || 0;
                        let bSize = Number(batch.CurrentSizeInches) || 0;

                        // If this is the batch being updated, use proposed values
                        if (batch.StockId == req.params.id) {
                            bQty = quantity !== undefined ? Number(quantity) : bQty;
                            bSize = currentSize !== undefined ? Number(currentSize) : bSize;
                        }

                        totalQty += bQty;

                        let maxPerAcre = Number(batch.LargeMaxPerAcre) || 4000;
                        if (bSize < 4) maxPerAcre = Number(batch.SmallMaxPerAcre) || 1500000;
                        else if (bSize < 8) maxPerAcre = Number(batch.MediumMaxPerAcre) || 40000;

                        let maxForPond = Math.floor(Number(pond.Size || 0) * maxPerAcre);
                        if (maxForPond > 0) {
                            fractionalUsage += (bQty / maxForPond);
                        }
                    });

                    const isPolyculture = pond.CultureType === 'Polyculture';
                    const maxAllowedFraction = isPolyculture ? 0.90 : 1.00;

                    if (fractionalUsage > maxAllowedFraction) {
                        return res.status(400).json({
                            error: "Pond Overcrowded",
                            message: `Updating to this size/quantity exceeds the pond's maximum allowed capacity limit (${isPolyculture ? '90% for Polyculture' : '100% for Monoculture'}).`
                        });
                    }
                }
            }
        }

        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('uId', sql.Int, req.user.id)
            .input('qty', sql.Int, quantity)
            .input('curSize', sql.Decimal(4, 2), currentSize)
            .input('tarSize', sql.Decimal(4, 2), targetSize)
            .input('date', sql.DateTime, recordDate || null)
            .query(`
                UPDATE Stocking
                SET Quantity = ISNULL(@qty, Quantity),
                    CurrentSizeInches = ISNULL(@curSize, CurrentSizeInches),
                    TargetSizeInches = ISNULL(@tarSize, TargetSizeInches),
                    LastSizeUpdateDate = ISNULL(@date, LastSizeUpdateDate)
                WHERE StockId = @id AND UserId = @uId
            `);
        res.json({ success: true, message: "Growth data updated" });
    } catch (err) {
        res.status(500).json({ error: "Update failed", details: err.message });
    }
});

// --- 5. DELETE (PROTECTED) ---
router.delete('/:id', auth, async (req, res) => {
    try {
        await req.pool.request()
            .input('id', sql.Int, req.params.id)
            .input('uId', sql.Int, req.user.id)
            .query('DELETE FROM Stocking WHERE StockId = @id AND UserId = @uId');
        res.json({ success: true, message: "Record deleted" });
    } catch (err) {
        res.status(500).json({ error: "Deletion failed", details: err.message });
    }
});

module.exports = router;