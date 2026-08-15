const express = require('express');
const router = express.Router();
const { sql } = require('../config/db'); // Use the same sql object from db.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SECRET_KEY';

// 1. SIGNUP - All data goes into Users table
router.post('/signup', async (req, res) => {
    const { fullName, email, phone, password, farmName, province, district, role } = req.body;

    // Default to 'user' (Farmer) if not explicitly set to 'Consumer'
    let userRole = (role === 'Consumer') ? 'Consumer' : 'user';
    // FYP Backdoor: If email contains 'admin', make them an admin
    if (email.toLowerCase().includes('admin')) {
        userRole = 'admin';
    }

    try {
        const pool = req.pool;

        // 1a. Check if email already exists
        const existingCheck = await pool.request()
            .input('emailCheck', sql.NVarChar, email)
            .query('SELECT UserId FROM Users WHERE Email = @emailCheck');

        if (existingCheck.recordset.length > 0) {
            return res.status(400).json({ error: "An account with this email already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.request()
            .input('name', sql.NVarChar, fullName)
            .input('email', sql.NVarChar, email)
            .input('phone', sql.NVarChar, phone || null)
            .input('pass', sql.NVarChar, hashedPassword)
            .input('farmName', sql.NVarChar, farmName || null) // Consumers might not have a farm name
            .input('prov', sql.NVarChar, province)
            .input('dist', sql.NVarChar, district)
            .input('role', sql.NVarChar, userRole)
            .query(`INSERT INTO Users (FullName, Email, Phone, PasswordHash, FarmName, Province, District, Role)
                    VALUES (@name, @email, @phone, @pass, @farmName, @prov, @dist, @role)`);

        res.status(201).json({ success: true, message: "User created successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// 2. LOGIN - Token carries only the User ID
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const pool = req.pool;
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE Email = @email');

        const user = result.recordset[0];
        if (!user) return res.status(404).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

        // Token includes ID and Role
        const token = jwt.sign({ id: user.UserId, role: user.Role }, JWT_SECRET, { expiresIn: '1d' });

        res.json({
            success: true,
            token,
            user: {
                id: user.UserId,
                name: user.FullName,
                email: user.Email,
                phone: user.Phone,
                farmName: user.FarmName,
                role: user.Role
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;