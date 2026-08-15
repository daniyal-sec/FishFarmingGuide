// E:/FishFarmingGuide/backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { poolPromise } = require('./config/db');

// 1. INITIALIZE APP
const app = express();

// 2. MIDDLEWARE
app.use(cors());
app.use(express.json());

// 3. DATABASE MIDDLEWARE
// Attaches the connection pool to every request so routes can use req.pool
app.use(async (req, res, next) => {
    try {
        req.pool = await poolPromise;
        next();
    } catch (err) {
        console.error("Database connection middleware error:", err);
        res.status(500).json({ error: "Internal Server Error: Database Connection Failed" });
    }
});

// 4. IMPORT ROUTE FILES
const authRoutes = require('./routes/authRoutes');
const speciesRoutes = require('./routes/speciesRoutes');
const regionsRoute = require('./routes/regionsRoute');
const pondRoutes = require('./routes/pondRoutes');
const stockingRoutes = require('./routes/stockingRoutes'); // Updated to use the new route file
const waterQualityRoutes = require('./routes/waterQualityRoutes'); // <--- ADD THIS
const fertilizersRoute = require('./routes/fertilizersRoute');
const feedRoutes = require('./routes/feedRoutes'); // <--- 1. ADD THIS IMPORT
const expenseRoutes = require('./routes/expenseRoutes'); // 1. Import your new routes
const harvestRoutes = require('./routes/harvestRoutes'); // 1. Import the new Harvest Routes
const inventoryRoutes = require('./routes/inventoryRoutes');
const farmRoutes = require('./routes/farmRoutes');
const mortalityRoutes = require('./routes/mortalityRoutes');
const liveActivityRoutes = require('./routes/liveActivityRoutes');
const medicationRoutes = require('./routes/medicationRoutes');
const infoRoutes = require('./routes/infoRoutes'); // <--- ADD THIS
const marketplaceRoutes = require('./routes/marketplaceRoutes'); // Added marketplace routes
const diseaseRoutes = require('./routes/diseaseRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const adminRoutes = require('./routes/adminRoutes');       // Admin: farms, marketplace mod, user mgmt
const supportRoutes = require('./routes/supportRoutes');   // Support ticket system
const rulesRoutes = require('./routes/rulesRoutes');       // Feed & fertilizer rules management

// 5. REGISTER ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/species', speciesRoutes);
app.use('/api/regions', regionsRoute);
app.use('/api/ponds', pondRoutes);
app.use('/api/stocking', stockingRoutes); // Endpoint updated to /api/stocking
app.use('/api/water-quality', waterQualityRoutes); // <--- ADD THIS
app.use('/api/fertilizers', fertilizersRoute);
app.use('/api/feed', feedRoutes); // <--- 2. REGISTER THE FEED ROUTE
app.use('/api/expenses', expenseRoutes); // 2. Register the expense endpoint
app.use('/api/harvest', harvestRoutes); // 2. Register the Harvest endpoint
app.use('/api/inventory', inventoryRoutes);
app.use('/api/farm', farmRoutes);
app.use('/api/mortality', mortalityRoutes);
app.use('/api/activity', liveActivityRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/info', infoRoutes); // <--- ADD THIS
app.use('/api/marketplace', marketplaceRoutes); // Register marketplace routes
app.use('/api/reviews', reviewRoutes); // Register review routes
app.use('/api/announcements', announcementRoutes); // Register announcement routes
app.use('/api/admin', adminRoutes);       // Admin panel routes (farms, marketplace, users)
app.use('/api/support', supportRoutes);   // Support ticket system
app.use('/api/rules', rulesRoutes);       // Feed & fertilizer rules

// Debug test route
app.get('/api/test-disease', (req, res) => res.json({ msg: "disease test works" }));

app.use('/api/diseases', (req, res, next) => {
    console.log("=> Hit /api/diseases:", req.method, req.originalUrl);
    next();
}, diseaseRoutes);
// 6. HEALTH CHECK & TEST ROUTES
app.get('/test', (req, res) => res.status(200).send("Server is working!"));
app.get('/', (req, res) => res.status(200).send('Fish Farming API is running...'));

// 7. GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: "Something went wrong!",
        message: err.message
    });
});

// 8. START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`✅ Table "Stocking" is active at /api/stocking`);
    console.log(`-----------------------------------------`);
});
// Force nodemon restart
