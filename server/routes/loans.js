const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAllLoans, getLoanById, createLoan, returnBook } = require('../controllers/loanController');

// GET /api/loans - Lấy tất cả phiếu mượn (cần xác thực)
router.get('/', authenticateToken, getAllLoans);

// GET /api/loans/:id - Lấy chi tiết phiếu mượn (cần xác thực)
router.get('/:id', authenticateToken, getLoanById);

// POST /api/loans - Tạo phiếu mượn (cần xác thực)
router.post('/', authenticateToken, createLoan);

// PUT /api/loans/:id/return - Trả sách (cần xác thực)
router.put('/:id/return', authenticateToken, returnBook);

module.exports = router;
