const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/database');

// Login - kiểm tra từ database
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username và password không được để trống' });
    }

    // Tìm nhân viên theo username (MaNhanVien)
    const pool = await getPool();
    const result = await pool
      .request()
      .input('maNhanVien', sql.VarChar, username)
      .query('SELECT MaNhanVien, HoTen, ChucVu FROM NHAN_VIEN WHERE MaNhanVien = @maNhanVien');

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Username hoặc password không chính xác' });
    }

    const user = result.recordset[0];

    // Kiểm tra password (tạm thời check password cứng, sau sẽ hash)
    // Tài khoản mẫu: nv01, ql01 với password 123456
    if (password !== '123456') {
      return res.status(401).json({ error: 'Username hoặc password không chính xác' });
    }

    // Tạo JWT token
    const token = jwt.sign(
      { 
        maNhanVien: user.MaNhanVien, 
        hoTen: user.HoTen, 
        chucVu: user.ChucVu 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        maNhanVien: user.MaNhanVien,
        hoTen: user.HoTen,
        chucVu: user.ChucVu,
      },
    });
  } catch (error) {
    console.error('❌ Lỗi login:', error.message);
    res.status(500).json({ error: 'Lỗi máy chủ: ' + error.message });
  }
}

// Logout (đơn giản chỉ xóa token ở client)
function logout(req, res) {
  res.json({ message: 'Đăng xuất thành công' });
}

module.exports = { login, logout };
