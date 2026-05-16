const { getPool, sql } = require('../config/database');

// GET /api/admin/summary
async function getSummary(req, res) {
  try {
    // role check: allow users with chucVu containing 'quan' or 'quản' (quản lý)
    const role = (req.user && req.user.chucVu) ? String(req.user.chucVu).toLowerCase() : '';
    console.log('🔍 Admin check - user:', req.user?.maNhanVien, 'role:', role);
    
    const isManager = role.includes('quản') || role.includes('quan');
    if (!isManager) {
      console.log('❌ Access denied for role:', role);
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const pool = await getPool();

    // Run queries sequentially and gather results
    const totalBooksRes = await pool.request().query('SELECT COUNT(*) AS totalBooks FROM SACH');
    const totalCopiesRes = await pool.request().query('SELECT COUNT(*) AS totalCopies FROM BAN_SAO');
    const totalMembersRes = await pool.request().query('SELECT COUNT(*) AS totalMembers FROM DOC_GIA');

    const membersByStatusRes = await pool.request().query(`
      SELECT TrangThai, COUNT(*) AS count FROM DOC_GIA GROUP BY TrangThai
    `);

    const loansOpenRes = await pool.request().query("SELECT COUNT(*) AS openLoans FROM PHIEU_MUON WHERE TrangThai = N'Đang mượn'");
    const loansReturnedRes = await pool.request().query("SELECT COUNT(*) AS returnedLoans FROM PHIEU_MUON WHERE TrangThai = N'Đã trả'");

    const overdueRes = await pool.request().query(`
      SELECT COUNT(*) AS overdueCount FROM PHIEU_MUON
      WHERE TrangThai = N'Đang mượn' AND NgayHenTra < CAST(GETDATE() AS DATE)
    `);

    const totalFinesRes = await pool.request().query('SELECT SUM(TienPhat) AS totalFines FROM PHIEU_MUON');

    const topBooksRes = await pool.request().query(`
      SELECT TOP 10 s.MaSach, s.TenSach, COUNT(*) AS borrowCount
      FROM PHIEU_MUON pm
      LEFT JOIN BAN_SAO bs ON pm.MaBanSao = bs.MaBanSao
      LEFT JOIN SACH s ON bs.MaSach = s.MaSach
      GROUP BY s.MaSach, s.TenSach
      ORDER BY borrowCount DESC
    `);

    const monthlyRes = await pool.request().query(`
      SELECT YEAR(NgayMuon) AS yr, MONTH(NgayMuon) AS m, COUNT(*) AS cnt
      FROM PHIEU_MUON
      WHERE NgayMuon >= DATEADD(MONTH, -11, CAST(GETDATE() AS DATE))
      GROUP BY YEAR(NgayMuon), MONTH(NgayMuon)
      ORDER BY yr, m
    `);

    const summary = {
      totalBooks: totalBooksRes.recordset[0].totalBooks || 0,
      totalCopies: totalCopiesRes.recordset[0].totalCopies || 0,
      totalMembers: totalMembersRes.recordset[0].totalMembers || 0,
      membersByStatus: membersByStatusRes.recordset,
      openLoans: loansOpenRes.recordset[0].openLoans || 0,
      returnedLoans: loansReturnedRes.recordset[0].returnedLoans || 0,
      overdueCount: overdueRes.recordset[0].overdueCount || 0,
      totalFines: totalFinesRes.recordset[0].totalFines || 0,
      topBooks: topBooksRes.recordset,
      monthlyBorrow: monthlyRes.recordset,
    };

    res.json(summary);
  } catch (error) {
    console.error('❌ Lỗi lấy báo cáo tổng quan:', error.message);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { getSummary };
