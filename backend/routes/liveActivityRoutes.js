const express = require('express');
const router = express.Router();
const sql = require('mssql');
const auth = require('../middleware/auth');

router.get('/feed', auth, async (req, res) => {
       try {
              // This 'id' comes from your JWT token (currently 22)
              const loggedInUserId = req.user.id;
              const pool = req.pool;

              const result = await pool.request()
                     .input('activeUser', sql.Int, loggedInUserId)
                     .query(`
            SELECT TOP 20
                Category,
                Description,
                ActivityTime,
                CASE
                    WHEN DATEDIFF(SECOND, ActivityTime, GETDATE()) < 60 THEN 'Just now'
                    WHEN DATEDIFF(MINUTE, ActivityTime, GETDATE()) < 60 THEN CAST(DATEDIFF(MINUTE, ActivityTime, GETDATE()) AS VARCHAR) + ' mins ago'
                    WHEN DATEDIFF(HOUR, ActivityTime, GETDATE()) < 24 THEN CAST(DATEDIFF(HOUR, ActivityTime, GETDATE()) AS VARCHAR) + ' hrs ago'
                    ELSE CAST(DATEDIFF(DAY, ActivityTime, GETDATE()) AS VARCHAR) + ' days ago'
                END AS RelativeTime
            FROM (
                -- 1. YOUR SETUP: Only shows setup for the logged-in UserId
                SELECT 'System' as Category,
                       'Farm setup completed: ' + FarmName as Description,
                       CreatedAt as ActivityTime,
                       UserId
                FROM Users
                WHERE UserId = @activeUser

                UNION ALL

                -- 2. YOUR PONDS: Only shows ponds created by the logged-in UserId
                SELECT 'System' as Category,
                       'New pond created: ' + PondName as Description,
                       CreatedAt as ActivityTime,
                       UserId
                FROM Ponds
                WHERE UserId = @activeUser

                UNION ALL

                -- 3. YOUR MORTALITY: Joins with Ponds to verify owner is @activeUser
                SELECT 'Mortality' as Category,
                       CAST(M.Quantity_dead as VARCHAR) + ' fish loss in ' + P.PondName as Description,
                       M.LogDate as ActivityTime,
                       P.UserId
                FROM Mortality_Logs M
                INNER JOIN Ponds P ON M.PondId = P.PondId
                WHERE P.UserId = @activeUser

                UNION ALL

                -- 4. YOUR FEEDING: Joins with Ponds to verify owner is @activeUser
                SELECT 'Feeding' as Category,
                       CAST(FL.Quantity_kg as VARCHAR) + 'kg feed added to ' + P.PondName as Description,
                       FL.FeedDate as ActivityTime,
                       P.UserId
                FROM Feed_Logs FL
                INNER JOIN Ponds P ON FL.PondId = P.PondId
                WHERE P.UserId = @activeUser

                UNION ALL

                -- 5. STOCKING
                SELECT 'Stocking' as Category,
                       'Pond ' + P.PondName + ' stocked with ' + CAST(S.Quantity as VARCHAR) + ' ' + SP.Name as Description,
                       S.StockingDate as ActivityTime,
                       P.UserId
                FROM Stocking S
                INNER JOIN Ponds P ON S.CurrentPondId = P.PondId
                INNER JOIN Species SP ON S.SpeciesId = SP.SpeciesID
                WHERE P.UserId = @activeUser

                UNION ALL

                -- 6. HARVEST
                SELECT 'Harvest' as Category,
                       CAST(H.Quantity_pieces as VARCHAR) + ' ' + SP.Name + ' harvested from ' + P.PondName as Description,
                       H.HarvestDate as ActivityTime,
                       P.UserId
                FROM Harvest_Logs H
                INNER JOIN Ponds P ON H.PondId = P.PondId
                INNER JOIN Species SP ON H.SpeciesId = SP.SpeciesID
                WHERE P.UserId = @activeUser

                UNION ALL

                -- 7. EXPENSES
                SELECT 'Expense' as Category,
                       Category + ' expense logged for ' + P.PondName + ': ' + CAST(Amount as VARCHAR) as Description,
                       ExpenseDate as ActivityTime,
                       P.UserId
                FROM Expense_log E
                INNER JOIN Ponds P ON E.PondId = P.PondId
                WHERE P.UserId = @activeUser

                UNION ALL

                -- 8. FERTILIZERS
                SELECT 'Fertilizer' as Category,
                       CAST(QuantityApplied as VARCHAR) + 'kg ' + ProductName + ' applied to ' + P.PondName as Description,
                       ApplicationDate as ActivityTime,
                       P.UserId
                FROM Fertilizers_Logs FL
                INNER JOIN Ponds P ON FL.PondId = P.PondId
                WHERE P.UserId = @activeUser

                UNION ALL

                -- 9. WATER QUALITY
                SELECT 'Water Quality' as Category,
                       'Water cycle recorded for ' + P.PondName as Description,
                       recorded_at as ActivityTime,
                       P.UserId
                FROM water_quality_logs W
                INNER JOIN Ponds P ON W.PondId = P.PondId
                WHERE P.UserId = @activeUser

                UNION ALL

                -- 10. MEDICATIONS
                SELECT 'Medication' as Category,
                       'Medication (' + ProductName + ') applied to ' + P.PondName as Description,
                       ApplicationDate as ActivityTime,
                       P.UserId
                FROM Medication_Logs ML
                INNER JOIN Ponds P ON ML.PondId = P.PondId
                WHERE P.UserId = @activeUser

                UNION ALL

                -- 11. DISEASE OUTBREAKS
                SELECT 'Disease' as Category,
                       Severity + ' ' + DiseaseName + ' outbreak logged in ' + P.PondName as Description,
                       LoggedDate as ActivityTime,
                       P.UserId
                FROM Disease_Outbreaks DO
                INNER JOIN Ponds P ON DO.PondId = P.PondId
                WHERE P.UserId = @activeUser
            ) AS AllMyActivities
            ORDER BY ActivityTime DESC
        `);

              // If you see [], it means UserId 22 has no data in the tables yet
              res.json(result.recordset);

       } catch (err) {
              console.error("Feed Error:", err.message);
              res.status(500).json({ error: "Failed to fetch your specific activity feed." });
       }
});

module.exports = router;