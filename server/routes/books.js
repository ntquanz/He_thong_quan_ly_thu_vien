const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAllBooks, getBookById, createBook, updateBook, deleteBook, getAllCopies } = require('../controllers/bookController');

// GET /api/books - Lấy tất cả sách
router.get('/', getAllBooks);

// GET /api/books/copies - Lấy danh sách bản sao
router.get('/copies', getAllCopies);

// GET /api/books/:id - Lấy chi tiết sách
router.get('/:id', getBookById);

// POST /api/books - Tạo sách (cần xác thực)
router.post('/', authenticateToken, createBook);

// PUT /api/books/:id - Cập nhật sách (cần xác thực)
router.put('/:id', authenticateToken, updateBook);

// DELETE /api/books/:id - Xóa sách (cần xác thực)
router.delete('/:id', authenticateToken, deleteBook);

module.exports = router;
