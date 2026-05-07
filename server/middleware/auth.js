const jwt = require('jsonwebtoken');

// Middleware xác thực JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Không có token, vui lòng đăng nhập' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
    }
    req.user = user; // Lưu thông tin user vào request
    next();
  });
};

module.exports = { authenticateToken };
