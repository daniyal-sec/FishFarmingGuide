const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // Look for the token in the 'Authorization' header
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    // Usually, tokens are sent as "Bearer <token>"
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

    try {
        const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SECRET_KEY';
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified; // This adds the user ID and Role to the request
        next();
    } catch (err) {
        console.error("JWT Verification Error:", err.message);
        res.status(401).json({ error: "Invalid token" });
    }
};