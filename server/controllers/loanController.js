const { getPool, sql } = require('../config/database');

// GET tất cả phiếu mượn
async function getAllLoans(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        pm.MaPhieu,
        pm.MaDocGia,
        dg.HoTen as TenDocGia,
        pm.MaBanSao,
        s.TenSach,
        pm.MaNhanVien,
        nv.HoTen as TenNhanVien,
        pm.NgayMuon,
        pm.NgayHenTra,
        pm.NgayTraThuc,
        pm.TienPhat,
        pm.TrangThai
      FROM PHIEU_MUON pm
      LEFT JOIN DOC_GIA dg ON pm.MaDocGia = dg.MaDocGia
      LEFT JOIN BAN_SAO bs ON pm.MaBanSao = bs.MaBanSao
      LEFT JOIN SACH s ON bs.MaSach = s.MaSach
      LEFT JOIN NHAN_VIEN nv ON pm.MaNhanVien = nv.MaNhanVien
      ORDER BY pm.NgayMuon DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Lỗi lấy danh sách phiếu mượn:', error.message);
    res.status(500).json({ error: error.message });
  }
}

// GET chi tiết phiếu mượn
async function getLoanById(req, res) {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const result = await pool
      .request()
      .input('maPhieu', sql.Int, id)
      .query(`
        SELECT 
          pm.MaPhieu,
          pm.MaDocGia,
          dg.HoTen as TenDocGia,
          pm.MaBanSao,
          s.TenSach,
          pm.MaNhanVien,
          nv.HoTen as TenNhanVien,
          pm.NgayMuon,
          pm.NgayHenTra,
          pm.NgayTraThuc,
          pm.TienPhat,
          pm.TrangThai
        FROM PHIEU_MUON pm
        LEFT JOIN DOC_GIA dg ON pm.MaDocGia = dg.MaDocGia
        LEFT JOIN BAN_SAO bs ON pm.MaBanSao = bs.MaBanSao
        LEFT JOIN SACH s ON bs.MaSach = s.MaSach
        LEFT JOIN NHAN_VIEN nv ON pm.MaNhanVien = nv.MaNhanVien
        WHERE pm.MaPhieu = @maPhieu
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Phiếu mượn không tồn tại' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('❌ Lỗi lấy chi tiết phiếu mượn:', error.message);
    res.status(500).json({ error: error.message });
  }
}

// CREATE phiếu mượn
async function createLoan(req, res) {
  try {
    const pool = await getPool();

    const { maDocGia, maBanSao } = req.body;
    const maNhanVien = req.user?.maNhanVien;
    const loanDate = new Date();
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1);

    if (!maDocGia || !maBanSao) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    if (!maNhanVien) {
      return res.status(401).json({ error: 'Không xác định được nhân viên thực hiện' });
    }

    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();

      const requestCopy = new sql.Request(transaction);
      const copyResult = await requestCopy
        .input('maBanSao', sql.VarChar, maBanSao)
        .query(`
          SELECT MaBanSao, Tinhtrang
          FROM BAN_SAO
          WHERE MaBanSao = @maBanSao
        `);

      if (copyResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Bản sao không tồn tại' });
      }

      if (String(copyResult.recordset[0].Tinhtrang).trim() !== 'Có sẵn') {
        await transaction.rollback();
        return res.status(400).json({ error: 'Bản sao này hiện không còn sẵn sàng để mượn' });
      }

      const requestMember = new sql.Request(transaction);
      const memberResult = await requestMember
        .input('maDocGia', sql.VarChar, maDocGia)
        .query(`
          SELECT MaDocGia, TrangThai, NgayHetHan
          FROM DOC_GIA
          WHERE MaDocGia = @maDocGia
        `);

      if (memberResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Độc giả không tồn tại' });
      }

      const member = memberResult.recordset[0];
      if (String(member.TrangThai).trim() !== 'Hoạt động') {
        await transaction.rollback();
        return res.status(400).json({ error: 'Độc giả đang không ở trạng thái Hoạt động' });
      }

      const requestInsert = new sql.Request(transaction);
      await requestInsert
        .input('maDocGia', sql.VarChar, maDocGia)
        .input('maBanSao', sql.VarChar, maBanSao)
        .input('maNhanVien', sql.VarChar, maNhanVien)
        .query(`
          INSERT INTO PHIEU_MUON (MaDocGia, MaBanSao, MaNhanVien, NgayMuon, NgayHenTra, TrangThai)
          VALUES (
            @maDocGia,
            @maBanSao,
            @maNhanVien,
            CAST(GETDATE() AS DATE),
            CAST(DATEADD(MONTH, 1, GETDATE()) AS DATE),
            N'Đang mượn'
          )
        `);

      const requestUpdateCopy = new sql.Request(transaction);
      await requestUpdateCopy
        .input('maBanSao', sql.VarChar, maBanSao)
        .query(`
          UPDATE BAN_SAO
          SET Tinhtrang = N'Đang mượn'
          WHERE MaBanSao = @maBanSao
        `);

      await transaction.commit();
      res.status(201).json({
        message: 'Tạo phiếu mượn thành công',
        ngayMuon: loanDate.toISOString().slice(0, 10),
        ngayHenTra: dueDate.toISOString().slice(0, 10),
        trangThai: 'Đang mượn',
      });
    } catch (txError) {
      try { await transaction.rollback(); } catch (rbError) { console.error('Rollback error:', rbError); }
      throw txError;
    }
  } catch (error) {
    console.error('❌ Lỗi tạo phiếu mượn:', error.message);
    res.status(500).json({ error: error.message });
  }
}

// RETURN sách (Trả sách)
async function returnBook(req, res) {
  try {
    const { id } = req.params;
    const { tinhTrangTra, tienPhatBoSung } = req.body;

    const conditionAlias = {
      'nguyen ven': 'Nguyên vẹn',
      'nguyên vẹn': 'Nguyên vẹn',
      hong: 'Hỏng',
      'hỏng': 'Hỏng',
      mat: 'Mất',
      'mất': 'Mất',
    };

    const normalizedInput = String(tinhTrangTra || '').trim().toLowerCase();
    const normalizedCondition = conditionAlias[normalizedInput];
    if (!normalizedCondition) {
      return res.status(400).json({ error: 'Tình trạng trả sách không hợp lệ' });
    }

    const parsedExtraFine = Number(tienPhatBoSung ?? 0);
    if ((normalizedCondition === 'Hỏng' || normalizedCondition === 'Mất') && (Number.isNaN(parsedExtraFine) || parsedExtraFine < 0)) {
      return res.status(400).json({ error: 'Vui lòng nhập tiền phạt hợp lệ cho sách hỏng/mất' });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();

      const requestLoan = new sql.Request(transaction);
      const loanResult = await requestLoan
        .input('maPhieu', sql.Int, id)
        .query(`
          SELECT MaBanSao, TrangThai, NgayHenTra
          FROM PHIEU_MUON
          WHERE MaPhieu = @maPhieu
        `);

      if (loanResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Phiếu mượn không tồn tại' });
      }

      const loan = loanResult.recordset[0];
      if (String(loan.TrangThai).trim() === 'Đã trả') {
        await transaction.rollback();
        return res.status(400).json({ error: 'Phiếu mượn này đã được xác nhận trả trước đó' });
      }

      const maBanSao = loan.MaBanSao;
      const ngayTraThuc = new Date();

      const dueDate = new Date(loan.NgayHenTra);
      dueDate.setHours(0, 0, 0, 0);

      const returnDateOnly = new Date(ngayTraThuc);
      returnDateOnly.setHours(0, 0, 0, 0);

      const msPerDay = 24 * 60 * 60 * 1000;
      const soNgayMuonTre = Math.max(0, Math.floor((returnDateOnly.getTime() - dueDate.getTime()) / msPerDay));
      const tienPhatTreHan = soNgayMuonTre * 5000;
      const tienPhatPhuThu = (normalizedCondition === 'Hỏng' || normalizedCondition === 'Mất') ? parsedExtraFine : 0;
      const tongTienPhat = tienPhatTreHan + tienPhatPhuThu;

      const requestUpdateLoan = new sql.Request(transaction);
      await requestUpdateLoan
        .input('maPhieu', sql.Int, id)
        .input('ngayTraThuc', sql.Date, ngayTraThuc)
        .input('tienPhat', sql.Decimal(10, 0), tongTienPhat)
        .query(`
          UPDATE PHIEU_MUON
          SET NgayTraThuc = @ngayTraThuc, TienPhat = @tienPhat, TrangThai = N'Đã trả'
          WHERE MaPhieu = @maPhieu
        `);

      const tinhTrangBanSaoMoi = normalizedCondition === 'Nguyên vẹn' ? 'Có sẵn' : normalizedCondition;
      const requestUpdateCopy = new sql.Request(transaction);
      await requestUpdateCopy
        .input('maBanSao', sql.VarChar, maBanSao)
        .input('tinhTrang', sql.NVarChar, tinhTrangBanSaoMoi)
        .query(`
          UPDATE BAN_SAO
          SET Tinhtrang = @tinhTrang
          WHERE MaBanSao = @maBanSao
        `);

      await transaction.commit();

      res.json({
        message: 'Xác nhận trả sách thành công',
        ngayTraThuc: ngayTraThuc.toISOString().slice(0, 10),
        soNgayMuonTre,
        tienPhatTreHan,
        tienPhatBoSung: tienPhatPhuThu,
        tongTienPhat,
        tinhTrangTra: normalizedCondition,
      });
    } catch (txError) {
      try { await transaction.rollback(); } catch (rbError) { console.error('Rollback error:', rbError); }
      throw txError;
    }
  } catch (error) {
    console.error('❌ Lỗi trả sách:', error.message);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { getAllLoans, getLoanById, createLoan, returnBook };
