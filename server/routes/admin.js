const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getSummary } = require('../controllers/adminController');

// GET /api/admin/summary
router.get('/summary', authenticateToken, getSummary);

module.exports = router;
