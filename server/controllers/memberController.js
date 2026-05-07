const { getPool, sql } = require('../config/database');

// GET tất cả bạn đọc
async function getAllMembers(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        MaDocGia,
        HoTen,
        SoDienThoai,
        DiaChi,
        NgayCapThe,
        NgayHetHan,
        GioiTinh,
        TrangThai
      FROM DOC_GIA
      ORDER BY MaDocGia ASC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Lỗi lấy danh sách bạn đọc:', error.message);
    res.status(500).json({ error: error.message });
  }
}

// GET chi tiết bạn đọc
async function getMemberById(req, res) {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const result = await pool
      .request()
      .input('maDocGia', sql.VarChar, id)
      .query(`
        SELECT 
          MaDocGia,
          HoTen,
          SoDienThoai,
          DiaChi,
          NgayCapThe,
          NgayHetHan,
          GioiTinh,
          TrangThai
        FROM DOC_GIA
        WHERE MaDocGia = @maDocGia
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Bạn đọc không tồn tại' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('❌ Lỗi lấy chi tiết bạn đọc:', error.message);
    res.status(500).json({ error: error.message });
  }
}

// CREATE bạn đọc
async function createMember(req, res) {
  try {
    const { maDocGia, hoTen, soDienThoai, diaChi, ngayCapThe, ngayHetHan, gioiTinh } = req.body;

    if (!maDocGia || !hoTen || !ngayCapThe || !ngayHetHan) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    const pool = await getPool();
    await pool
      .request()
      .input('maDocGia', sql.VarChar, maDocGia)
      .input('hoTen', sql.NVarChar, hoTen)
      .input('soDienThoai', sql.VarChar, soDienThoai || null)
      .input('diaChi', sql.NVarChar, diaChi || null)
      .input('ngayCapThe', sql.Date, new Date(ngayCapThe))
      .input('ngayHetHan', sql.Date, new Date(ngayHetHan))
      .input('gioiTinh', sql.NVarChar, gioiTinh || null)
      .query(`
        INSERT INTO DOC_GIA (MaDocGia, HoTen, SoDienThoai, DiaChi, NgayCapThe, NgayHetHan, GioiTinh, TrangThai)
        VALUES (@maDocGia, @hoTen, @soDienThoai, @diaChi, @ngayCapThe, @ngayHetHan, @gioiTinh, N'Hoạt động')
      `);

    res.status(201).json({ message: 'Thêm bạn đọc thành công', maDocGia });
  } catch (error) {
    console.error('❌ Lỗi tạo bạn đọc:', error.message);
    res.status(500).json({ error: error.message });
  }
}

// UPDATE bạn đọc
async function updateMember(req, res) {
  try {
    const { id } = req.params;
    const { hoTen, soDienThoai, diaChi, ngayHetHan, gioiTinh, trangThai } = req.body;

    const pool = await getPool();
    await pool
      .request()
      .input('maDocGia', sql.VarChar, id)
      .input('hoTen', sql.NVarChar, hoTen)
      .input('soDienThoai', sql.VarChar, soDienThoai)
      .input('diaChi', sql.NVarChar, diaChi)
      .input('ngayHetHan', sql.Date, new Date(ngayHetHan))
      .input('gioiTinh', sql.NVarChar, gioiTinh)
      .input('trangThai', sql.NVarChar, trangThai)
      .query(`
        UPDATE DOC_GIA 
        SET HoTen = @hoTen, SoDienThoai = @soDienThoai, DiaChi = @diaChi,
            NgayHetHan = @ngayHetHan, GioiTinh = @gioiTinh, TrangThai = @trangThai
        WHERE MaDocGia = @maDocGia
      `);

    res.json({ message: 'Cập nhật bạn đọc thành công' });
  } catch (error) {
    console.error('❌ Lỗi cập nhật bạn đọc:', error.message);
    res.status(500).json({ error: error.message });
  }
}

// DELETE bạn đọc
async function deleteMember(req, res) {
  try {
    const { id } = req.params;

    const pool = await getPool();
    // Không cho xóa nếu độc giả đã có lịch sử phiếu mượn
    const checkLoans = await pool
      .request()
      .input('maDocGia', sql.VarChar, id)
      .query('SELECT COUNT(*) AS total FROM PHIEU_MUON WHERE MaDocGia = @maDocGia');

    const totalLoans = checkLoans.recordset?.[0]?.total || 0;
    if (totalLoans > 0) {
      return res.status(400).json({
        error: 'Độc giả này đã có lịch sử phiếu mượn, không thể xóa. Hãy xử lý dữ liệu liên quan trước.',
      });
    }

    await pool
      .request()
      .input('maDocGia', sql.VarChar, id)
      .query('DELETE FROM DOC_GIA WHERE MaDocGia = @maDocGia');

    res.json({ message: 'Xóa bạn đọc thành công' });
  } catch (error) {
    console.error('❌ Lỗi xóa bạn đọc:', error.message);
    res.status(500).json({ error: error.message });
  }
}

// Kiểm tra và cập nhật trạng thái bạn đọc quá hạn
async function checkExpiredMembers(req, res) {
  try {
    const pool = await getPool();

    // Đặt 'Bị khóa' cho thẻ đã quá hạn > 30 ngày
    const lockResult = await pool.request().query(`
      UPDATE DOC_GIA
      SET TrangThai = N'Bị khóa'
      WHERE NgayHetHan < DATEADD(DAY, -30, CAST(GETDATE() AS DATE))
        AND TrangThai <> N'Bị khóa'
    `);

    // Đặt 'Hết hạn' cho thẻ đã quá hạn nhưng chưa tới mức bị khóa
    const expireResult = await pool.request().query(`
      UPDATE DOC_GIA
      SET TrangThai = N'Hết hạn'
      WHERE NgayHetHan < CAST(GETDATE() AS DATE)
        AND TrangThai NOT IN (N'Hết hạn', N'Bị khóa')
    `);

    const rowsAffected = (lockResult.rowsAffected[0] || 0) + (expireResult.rowsAffected[0] || 0);

    res.json({ message: 'Cập nhật trạng thái bạn đọc quá hạn hoàn tất', rowsAffected });
  } catch (error) {
    console.error('❌ Lỗi kiểm tra cập nhật bạn đọc quá hạn:', error.message);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { getAllMembers, getMemberById, createMember, updateMember, deleteMember, checkExpiredMembers };
