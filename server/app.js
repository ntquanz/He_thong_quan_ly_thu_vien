const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { connectDatabase } = require('./config/database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static('public'));

// Root route
app.get('/', (req, res) => {
  res.redirect('/api');
});

// Test API
app.get('/api/health', (req, res) => {
  res.json({ message: '✅ Server đang chạy bình thường!' });
});

// API Documentation
app.get('/api', (req, res) => {
  res.json({
    message: 'Hệ thống Quản lý Thư viện API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/login': 'Đăng nhập',
        'POST /api/auth/logout': 'Đăng xuất',
      },
      books: {
        'GET /api/books': 'Lấy danh sách sách',
        'GET /api/books/:id': 'Lấy chi tiết sách',
        'GET /api/books/copies': 'Lấy danh sách bản sao',
        'POST /api/books': 'Tạo sách (cần token)',
        'PUT /api/books/:id': 'Cập nhật sách (cần token)',
        'DELETE /api/books/:id': 'Xóa sách (cần token)',
      },
      members: {
        'GET /api/members': 'Lấy danh sách bạn đọc',
        'GET /api/members/:id': 'Lấy chi tiết bạn đọc',
        'POST /api/members': 'Tạo bạn đọc (cần token)',
        'PUT /api/members/:id': 'Cập nhật bạn đọc (cần token)',
        'DELETE /api/members/:id': 'Xóa bạn đọc (cần token)',
      },
      loans: {
        'GET /api/loans': 'Lấy danh sách phiếu mượn (cần token)',
        'GET /api/loans/:id': 'Lấy chi tiết phiếu mượn (cần token)',
        'POST /api/loans': 'Tạo phiếu mượn (cần token)',
        'PUT /api/loans/:id/return': 'Trả sách (cần token)',
      },
    },
  });
});

// Routes (sẽ thêm sau)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/members', require('./routes/members'));
app.use('/api/loans', require('./routes/loans'));

// Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('❌ Lỗi:', err.message);
  res.status(500).json({ error: err.message });
});

// Start Server
async function startServer() {
  try {
    // Kết nối Database
    await connectDatabase();

    // Khởi động server
    app.listen(PORT, () => {
      console.log(`\n🚀 Server đang chạy tại: http://localhost:${PORT}`);
      console.log('📝 Test API: http://localhost:5000/api/health\n');
    });
  } catch (error) {
    console.error('❌ Không thể khởi động server:', error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
