const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAllMembers, getMemberById, createMember, updateMember, deleteMember, checkExpiredMembers } = require('../controllers/memberController');

// GET /api/members - Lấy tất cả bạn đọc
router.get('/', getAllMembers);

// POST /api/members/check-expirations - Kiểm tra và cập nhật trạng thái quá hạn (cần xác thực)
router.post('/check-expirations', authenticateToken, checkExpiredMembers);

// GET /api/members/:id - Lấy chi tiết bạn đọc
router.get('/:id', getMemberById);

// POST /api/members - Tạo bạn đọc (cần xác thực)
router.post('/', authenticateToken, createMember);

// PUT /api/members/:id - Cập nhật bạn đọc (cần xác thực)
router.put('/:id', authenticateToken, updateMember);

// DELETE /api/members/:id - Xóa bạn đọc (cần xác thực)
router.delete('/:id', authenticateToken, deleteMember);

module.exports = router;
