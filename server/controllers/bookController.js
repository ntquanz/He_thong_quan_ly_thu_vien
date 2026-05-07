const { getPool, sql } = require('../config/database');

// GET tất cả sách
async function getAllBooks(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        MaSach, 
        TenSach, 
        NamXuatBan, 
        TenNXBText as TenNXB, 
        TenTheLoaiText as TenTheLoai, 
        TenTacGia,
        SoLuong
      FROM SACH
      ORDER BY MaSach
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Lỗi lấy danh sách sách:', error.message);
    res.status(500).json({ error: error.message });
  }
}

// GET chi tiết 1 sách
async function getBookById(req, res) {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const result = await pool
      .request()
      .input('maSach', sql.VarChar, id)
      .query(`
        SELECT 
          MaSach, 
          TenSach, 
          NamXuatBan, 
          TenNXBText as TenNXB, 
          TenTheLoaiText as TenTheLoai,
          TenTacGia,
          SoLuong
        FROM SACH
        WHERE MaSach = @maSach
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Sách không tồn tại' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('❌ Lỗi lấy chi tiết sách:', error.message);
    res.status(500).json({ error: error.message });
  }
}

// CREATE sách
async function createBook(req, res) {
  try {
    const { maSach, tenSach, namXuatBan, tenTacGia, tenTheLoai, tenNXB, soLuong } = req.body;

    if (!maSach || !tenSach || !soLuong) {
      return res.status(400).json({ error: 'Mã sách, tên sách, số lượng không được để trống' });
    }

    const pool = await getPool();

    // Use transaction to ensure SACH and BAN_SAO inserts are atomic
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();

      // Check existing MaSach
      const trReq1 = new sql.Request(transaction);
      const checkResult = await trReq1
        .input('maSach', sql.VarChar, maSach)
        .query('SELECT MaSach FROM SACH WHERE MaSach = @maSach');

      if (checkResult.recordset.length > 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Mã sách đã tồn tại' });
      }

      // Insert into SACH
      const trReq2 = new sql.Request(transaction);
      await trReq2
        .input('maSach', sql.VarChar, maSach)
        .input('tenSach', sql.NVarChar, tenSach)
        .input('namXuatBan', sql.Int, namXuatBan || new Date().getFullYear())
        .input('tenTacGia', sql.NVarChar, tenTacGia || null)
        .input('tenTheLoai', sql.NVarChar, tenTheLoai || null)
        .input('tenNXB', sql.NVarChar, tenNXB || null)
        .input('soLuong', sql.Int, soLuong)
        .query(`
          INSERT INTO SACH (MaSach, TenSach, NamXuatBan, TenTacGia, TenTheLoaiText, TenNXBText, SoLuong)
          VALUES (@maSach, @tenSach, @namXuatBan, @tenTacGia, @tenTheLoai, @tenNXB, @soLuong)
        `);

      // Determine existing copies for this MaSach
      const trReq3 = new sql.Request(transaction);
      const existingRes = await trReq3
        .input('maSach', sql.VarChar, maSach)
        .query('SELECT COUNT(*) AS cnt FROM BAN_SAO WHERE MaSach = @maSach');

      const existingCopies = (existingRes.recordset[0] && existingRes.recordset[0].cnt) ? parseInt(existingRes.recordset[0].cnt, 10) : 0;

      // Insert BAN_SAO rows
      for (let i = 1; i <= soLuong; i++) {
        const index = existingCopies + i;
        const maBanSao = `${maSach}-${String(index).padStart(4, '0')}`;
        const trReqIns = new sql.Request(transaction);
        await trReqIns
          .input('maBanSao', sql.VarChar, maBanSao)
          .input('maSach', sql.VarChar, maSach)
          .query("INSERT INTO BAN_SAO (MaBanSao, MaSach, NgayNhap, Tinhtrang) VALUES (@maBanSao, @maSach, GETDATE(), N'Có sẵn')");
      }

      // Update SACH.SoLuong = actual count of BAN_SAO
      const trReqUpdate = new sql.Request(transaction);
      await trReqUpdate
        .input('maSach', sql.VarChar, maSach)
        .query(`
          UPDATE SACH
          SET SoLuong = (SELECT COUNT(*) FROM BAN_SAO WHERE MaSach = @maSach)
          WHERE MaSach = @maSach
        `);

      await transaction.commit();
      res.status(201).json({ message: 'Thêm sách thành công', maSach });
    } catch (txErr) {
      try { await transaction.rollback(); } catch (rbErr) { console.error('Rollback error:', rbErr); }
      console.error('❌ Lỗi transaction thêm sách:', txErr.message);
      res.status(500).json({ error: txErr.message });
    }
  } catch (error) {
    console.error('❌ Lỗi tạo sách:', error.message);
    res.status(500).json({ error: error.message });
  }
}

// UPDATE sách
async function updateBook(req, res) {
  try {
    const { id } = req.params;
    const { tenSach, namXuatBan, tenTacGia, tenTheLoai, tenNXB, soLuong } = req.body;

    const pool = await getPool();
    await pool
      .request()
      .input('maSach', sql.VarChar, id)
      .input('tenSach', sql.NVarChar, tenSach)
      .input('namXuatBan', sql.Int, namXuatBan)
      .input('tenTacGia', sql.NVarChar, tenTacGia)
      .input('tenTheLoai', sql.NVarChar, tenTheLoai)
      .input('tenNXB', sql.NVarChar, tenNXB)
      .input('soLuong', sql.Int, soLuong)
      .query(`
        UPDATE SACH 
        SET TenSach = @tenSach, NamXuatBan = @namXuatBan, 
            TenTacGia = @tenTacGia, TenTheLoaiText = @tenTheLoai, 
            TenNXBText = @tenNXB, SoLuong = @soLuong
        WHERE MaSach = @maSach
      `);

    res.json({ message: 'Cập nhật sách thành công' });
  } catch (error) {
    console.error('❌ Lỗi cập nhật sách:', error.message);
    res.status(500).json({ error: error.message });
  }
}

// DELETE sách
async function deleteBook(req, res) {
  try {
    const { id } = req.params;

    const pool = await getPool();
    await pool
      .request()
      .input('maSach', sql.VarChar, id)
      .query('DELETE FROM SACH WHERE MaSach = @maSach');

    res.json({ message: 'Xóa sách thành công' });
  } catch (error) {
    console.error('❌ Lỗi xóa sách:', error.message);
    res.status(500).json({ error: error.message });
  }
}

// GET danh sách bản sao
async function getAllCopies(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        bs.MaBanSao,
        bs.MaSach,
        s.TenSach,
        bs.Tinhtrang
      FROM BAN_SAO bs
      LEFT JOIN SACH s ON bs.MaSach = s.MaSach
      ORDER BY bs.MaSach ASC, bs.MaBanSao ASC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Lỗi lấy danh sách bản sao:', error.message);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { getAllBooks, getBookById, createBook, updateBook, deleteBook, getAllCopies };
