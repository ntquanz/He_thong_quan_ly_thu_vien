const API_URL = 'http://localhost:5000/api';

function formatDateOnly(value) {
  if (!value) return 'N/A';

  const raw = String(value);
  const datePart = raw.length >= 10 ? raw.slice(0, 10) : raw;
  const [year, month, day] = datePart.split('-');

  if (!year || !month || !day) return raw;

  return `${day}/${month}/${year}`;
}

// Kiểm tra token khi load trang
window.addEventListener('load', () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    // Nếu không có token, redirect đến login
    window.location.href = '/login.html';
    return;
  }

  // Hiển thị thông tin user
  const userInfo = document.getElementById('userInfo');
  userInfo.textContent = `👤 ${user.hoTen} (${user.chucVu})`;

  // Nếu là quản lý, thêm nút Báo cáo vào nav
  addAdminButtonIfNeeded(user);

  // Load danh sách sách mặc định
  loadBooks();
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
});

// Thêm nút Báo cáo nếu user là quản lý
function addAdminButtonIfNeeded(user) {
  if (!user || !user.chucVu) return;
  
  const chucVuStr = String(user.chucVu).toLowerCase();
  const isManager = chucVuStr.includes('quản') || chucVuStr.includes('quan');
  
  if (isManager) {
    const nav = document.querySelector('nav');
    if (nav) {
      const btn = document.createElement('button');
      btn.textContent = '📊 Báo cáo';
      btn.addEventListener('click', loadAdminDashboard);
      nav.appendChild(btn);
    }
  }
}

// Lấy danh sách sách
async function loadBooks() {
  try {
    const response = await fetch(`${API_URL}/books`);
    const books = await response.json();

    let html = `
      <h2>📖 Danh sách Sách</h2>
      <button class="add-btn" onclick="showAddBookForm()">➕ Thêm sách mới</button>
      <div id="addBookForm" style="display: none; margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
        <h3>Thêm sách mới</h3>
        <form id="bookForm" style="display: grid; gap: 12px;">
          <label>Mã sách: <input type="text" name="maSach" required></label>
          <label>Tên sách: <input type="text" name="tenSach" required></label>
          <label>Năm xuất bản: <input type="number" name="namXuatBan" value="${new Date().getFullYear()}"></label>
          <label>Tác giả: <input type="text" name="tenTacGia" placeholder="VD: Nguyễn Văn A, Trần Thị B"></label>
          <label>Thể loại: <input type="text" name="tenTheLoai" placeholder="VD: Lập trình"></label>
          <label>Nhà xuất bản: <input type="text" name="tenNXB" placeholder="VD: NXB Kim Đồng"></label>
          <label>Số lượng: <input type="number" name="soLuong" required min="1"></label>
          <div style="display: flex; gap: 10px;">
            <button type="submit" class="primary-btn">Lưu</button>
            <button type="button" class="secondary-btn" onclick="hideAddBookForm()">Hủy</button>
          </div>
        </form>
      </div>
    `;
    html += '<table border="1"><tr><th>Mã sách</th><th>Tên sách</th><th>Năm XB</th><th>Tác giả</th><th>Thể loại</th><th>Nhà XB</th><th>Số lượng</th></tr>';

    books.forEach(book => {
      html += `<tr>
        <td>${book.MaSach}</td>
        <td>${book.TenSach}</td>
        <td>${book.NamXuatBan}</td>
        <td>${book.TenTacGia || 'N/A'}</td>
        <td>${book.TenTheLoai || 'N/A'}</td>
        <td>${book.TenNXB || 'N/A'}</td>
        <td>${book.SoLuong}</td>
      </tr>`;
    });

    html += '</table>';
    document.getElementById('content').innerHTML = html;

    // Gắn event cho form
    document.getElementById('bookForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(document.getElementById('bookForm'));
      const data = {
        maSach: formData.get('maSach'),
        tenSach: formData.get('tenSach'),
        namXuatBan: parseInt(formData.get('namXuatBan')),
        tenTacGia: formData.get('tenTacGia'),
        tenTheLoai: formData.get('tenTheLoai'),
        tenNXB: formData.get('tenNXB'),
        soLuong: parseInt(formData.get('soLuong')),
      };

      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/books`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error);

        alert('Thêm sách thành công!');
        hideAddBookForm();
        loadBooks(); // Reload danh sách
      } catch (error) {
        alert('Lỗi: ' + error.message);
      }
    });
  } catch (error) {
    console.error('Lỗi:', error);
    document.getElementById('content').innerHTML = '<p style="color: red;">Lỗi khi tải danh sách sách</p>';
  }
}

function showAddBookForm() {
  document.getElementById('addBookForm').style.display = 'block';
}

function hideAddBookForm() {
  document.getElementById('addBookForm').style.display = 'none';
  document.getElementById('bookForm').reset();
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getNextYearInputValue() {
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  return nextYear.toISOString().slice(0, 10);
}

// Lấy danh sách bạn đọc
async function loadMembers() {
  try {
    // Cập nhật trạng thái quá hạn trước khi lấy danh sách
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${API_URL}/members/check-expirations`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.warn('Không thể kiểm tra trạng thái quá hạn:', err);
    }

    const response = await fetch(`${API_URL}/members`);
    const members = await response.json();

    let html = `
      <h2>👥 Danh sách Độc giả</h2>
      <button class="add-btn" onclick="showAddMemberForm()">➕ Đăng ký độc giả</button>
      <div id="addMemberForm" style="display: none; margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
        <h3>Đăng ký độc giả mới</h3>
        <form id="memberForm" style="display: grid; gap: 12px;">
          <label>Mã độc giả: <input type="text" name="maDocGia" required></label>
          <label>Họ tên: <input type="text" name="hoTen" required></label>
          <label>Số điện thoại: <input type="text" name="soDienThoai"></label>
          <label>Địa chỉ: <input type="text" name="diaChi"></label>
          <label>Ngày cấp thẻ: <input type="date" name="ngayCapThe" value="${getTodayInputValue()}"></label>
          <label>Ngày hết hạn: <input type="date" name="ngayHetHan" value="${getNextYearInputValue()}"></label>
          <label>Giới tính:
            <select name="gioiTinh">
              <option value="">-- Chọn --</option>
              <option value="Nam">Nam</option>
              <option value="Nu">Nu</option>
            </select>
          </label>
          <div style="display: flex; gap: 10px;">
            <button type="submit" class="primary-btn">Lưu</button>
            <button type="button" class="secondary-btn" onclick="hideAddMemberForm()">Hủy</button>
          </div>
        </form>
      </div>
    `;
    html += '<table border="1"><tr><th>Mã</th><th>Họ tên</th><th>Điện thoại</th><th>Địa chỉ</th><th>Ngày cấp</th><th>Hạn thẻ</th><th>Trạng thái</th><th>Thao tác</th></tr>';

    members.forEach(member => {
      const st = String(member.TrangThai || '').trim().toLowerCase();
      let rowStyle = '';
      let statusStyle = '';
      if (st === 'hết hạn' || st === 'het han' || st === 'bị khóa' || st === 'bi khoa') {
        rowStyle = 'background-color: #ffe5e5;';
        statusStyle = 'color: #b00020; font-weight: 700;';
      }

      html += `<tr style="${rowStyle}">
        <td>${member.MaDocGia}</td>
        <td>${member.HoTen}</td>
        <td>${member.SoDienThoai || 'N/A'}</td>
        <td>${member.DiaChi || 'N/A'}</td>
        <td>${formatDateOnly(member.NgayCapThe)}</td>
        <td>${formatDateOnly(member.NgayHetHan)}</td>
        <td style="${statusStyle}">${member.TrangThai}</td>
        <td style="display:flex;gap:4px;"><button class="primary-btn" style="padding:6px 12px;font-size:13px;flex:1;border:none;border-radius:4px;cursor:pointer;" onclick="openEditMemberModal('${member.MaDocGia}')">Sửa</button> <button class="danger-btn" style="padding:6px 12px;font-size:13px;flex:1;border:none;border-radius:4px;cursor:pointer;" onclick="deleteMember('${member.MaDocGia}')">Xóa</button></td>
      </tr>`;
    });

    html += `</table>
      <div id="editMemberModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1000;">
        <div style="max-width:520px; margin:80px auto; background:#fff; border-radius:10px; padding:20px; box-shadow:0 8px 24px rgba(0,0,0,0.2);">
          <h3 style="margin-top:0;">Cập nhật Độc giả</h3>
          <form id="editMemberForm" style="display:grid; gap:12px;">
            <input type="hidden" id="editMemberId" />
            
            <label>Mã độc giả: <input type="text" id="editMaDocGia" disabled></label>
            <label>Họ tên: <input type="text" id="editHoTen" required></label>
            <label>Số điện thoại: <input type="text" id="editSoDienThoai"></label>
            <label>Địa chỉ: <input type="text" id="editDiaChi"></label>
            <label>Ngày cấp thẻ: <input type="date" id="editNgayCapThe" disabled></label>
            <label>Ngày hết hạn: <input type="date" id="editNgayHetHan" required></label>
            <label>Giới tính:
              <select id="editGioiTinh">
                <option value="">-- Chọn --</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </label>
            <label>Trạng thái:
              <select id="editTrangThai">
                <option value="Hoạt động">Hoạt động</option>
                <option value="Hết hạn">Hết hạn</option>
                <option value="Bị khóa">Bị khóa</option>
              </select>
            </label>

            <div style="display:flex; gap:10px;">
              <button type="submit" class="primary-btn">Lưu</button>
              <button type="button" class="secondary-btn" onclick="closeEditMemberModal()">Hủy</button>
            </div>
          </form>
        </div>
      </div>`;
    document.getElementById('content').innerHTML = html;

    document.getElementById('editMemberForm').addEventListener('submit', submitEditMember);

    document.getElementById('memberForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(document.getElementById('memberForm'));
      const data = {
        maDocGia: formData.get('maDocGia'),
        hoTen: formData.get('hoTen'),
        soDienThoai: formData.get('soDienThoai'),
        diaChi: formData.get('diaChi'),
        ngayCapThe: formData.get('ngayCapThe'),
        ngayHetHan: formData.get('ngayHetHan'),
        gioiTinh: formData.get('gioiTinh'),
      };

      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error);

        alert('Đăng ký độc giả thành công!');
        hideAddMemberForm();
        loadMembers();
      } catch (error) {
        alert('Lỗi: ' + error.message);
      }
    });
  } catch (error) {
    console.error('Lỗi:', error);
    document.getElementById('content').innerHTML = '<p style="color: red;">Lỗi khi tải danh sách bạn đọc</p>';
  }
}

function showAddMemberForm() {
  document.getElementById('addMemberForm').style.display = 'block';
}

function hideAddMemberForm() {
  document.getElementById('addMemberForm').style.display = 'none';
  document.getElementById('memberForm').reset();
}

async function deleteMember(maDocGia) {
  const confirmed = confirm(`Bạn có chắc muốn xóa độc giả ${maDocGia}?`);
  if (!confirmed) return;

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/members/${encodeURIComponent(maDocGia)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Xóa độc giả thất bại');

    alert('Xóa độc giả thành công!');
    loadMembers();
  } catch (error) {
    alert('Lỗi: ' + error.message);
  }
}

async function openEditMemberModal(maDocGia) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/members/${encodeURIComponent(maDocGia)}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('Không thể tải thông tin độc giả');

    const member = await res.json();
    document.getElementById('editMemberId').value = member.MaDocGia;
    document.getElementById('editMaDocGia').value = member.MaDocGia;
    document.getElementById('editHoTen').value = member.HoTen;
    document.getElementById('editSoDienThoai').value = member.SoDienThoai || '';
    document.getElementById('editDiaChi').value = member.DiaChi || '';
    document.getElementById('editNgayCapThe').value = String(member.NgayCapThe || '').slice(0, 10);
    document.getElementById('editNgayHetHan').value = String(member.NgayHetHan || '').slice(0, 10);
    document.getElementById('editGioiTinh').value = member.GioiTinh || '';
    document.getElementById('editTrangThai').value = member.TrangThai || 'Hoạt động';

    document.getElementById('editMemberModal').style.display = 'block';
  } catch (error) {
    alert('Lỗi: ' + error.message);
  }
}

function closeEditMemberModal() {
  document.getElementById('editMemberModal').style.display = 'none';
  document.getElementById('editMemberForm').reset();
}

async function submitEditMember(e) {
  e.preventDefault();

  const maDocGia = document.getElementById('editMemberId').value;
  const hoTen = document.getElementById('editHoTen').value.trim();
  const soDienThoai = document.getElementById('editSoDienThoai').value.trim();
  const diaChi = document.getElementById('editDiaChi').value.trim();
  const ngayHetHan = document.getElementById('editNgayHetHan').value;
  const gioiTinh = document.getElementById('editGioiTinh').value;
  const trangThai = document.getElementById('editTrangThai').value;

  if (!hoTen) {
    alert('Vui lòng nhập họ tên');
    return;
  }

  if (!ngayHetHan) {
    alert('Vui lòng chọn ngày hết hạn');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/members/${encodeURIComponent(maDocGia)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        hoTen,
        soDienThoai: soDienThoai || null,
        diaChi: diaChi || null,
        ngayHetHan,
        gioiTinh: gioiTinh || null,
        trangThai,
      }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Cập nhật thất bại');

    alert('Cập nhật độc giả thành công!');
    closeEditMemberModal();
    loadMembers();
  } catch (error) {
    alert('Lỗi: ' + error.message);
  }
}

// Lấy danh sách bản sao
async function loadCopies() {
  try {
    const response = await fetch(`${API_URL}/books/copies`);
    const copies = await response.json();

    const booksSummary = copies.reduce((summary, copy) => {
      const key = copy.MaSach;
      if (!summary[key]) {
        summary[key] = {
          maSach: copy.MaSach,
          tenSach: copy.TenSach || 'N/A',
          total: 0,
          borrowed: 0,
          available: 0,
        };
      }

      summary[key].total += 1;
      if (String(copy.Tinhtrang).trim() === 'Đang mượn') {
        summary[key].borrowed += 1;
      } else if (String(copy.Tinhtrang).trim() === 'Có sẵn') {
        summary[key].available += 1;
      }

      return summary;
    }, {});

    const summaryRows = Object.values(booksSummary).sort((a, b) => a.maSach.localeCompare(b.maSach));

    let html = `
      <h2>📚 Danh sách Bản sao</h2>
      <div class="search-panel">
        <input id="copySearchInput" type="text" placeholder="Tìm theo mã sách hoặc tên sách..." />
        <button class="primary-btn" type="button" onclick="filterCopies()">Tìm kiếm</button>
        <button class="secondary-btn" type="button" onclick="clearCopySearch()">Xóa lọc</button>
      </div>
      <div class="note-box">
        <strong>Cách xem trạng thái:</strong> nếu <em>Đang mượn = Tổng bản sao</em> thì sách đó đã được mượn hết.
      </div>
      <h3 style="margin-top: 20px;">Tổng hợp theo đầu sách</h3>
      <table border="1" id="copySummaryTable">
        <tr><th>Mã sách</th><th>Tên sách</th><th>Tổng bản sao</th><th>Đang mượn</th><th>Có sẵn</th><th>Đã mượn hết?</th></tr>
    `;

    summaryRows.forEach((item) => {
      const fullyBorrowed = item.total > 0 && item.borrowed === item.total;
      html += `<tr>
        <td>${item.maSach}</td>
        <td>${item.tenSach}</td>
        <td>${item.total}</td>
        <td>${item.borrowed}</td>
        <td>${item.available}</td>
        <td>${fullyBorrowed ? 'Đã mượn hết' : 'Chưa mượn hết'}</td>
      </tr>`;
    });

    html += `</table>
      <h3 style="margin-top: 28px;">Chi tiết bản sao</h3>
      <table border="1" id="copyDetailTable">
        <tr><th>Mã bản sao</th><th>Mã sách</th><th>Tên sách</th><th>Trạng thái</th></tr>
      </table>
    `;

    document.getElementById('content').innerHTML = html;

    window.__copiesData = copies;

    renderCopiesList(copies);
  } catch (error) {
    console.error('Lỗi:', error);
    document.getElementById('content').innerHTML = '<p style="color: red;">Lỗi khi tải danh sách bản sao</p>';
  }
}

function renderCopiesList(copies, keyword = '') {
  const table = document.getElementById('copyDetailTable');
  if (!table) return;

  const normalizedKeyword = keyword.trim().toLowerCase();
  const filtered = normalizedKeyword
    ? copies.filter((copy) => {
        const maSach = String(copy.MaSach || '').toLowerCase();
        const tenSach = String(copy.TenSach || '').toLowerCase();
        const maBanSao = String(copy.MaBanSao || '').toLowerCase();
        return maSach.includes(normalizedKeyword) || tenSach.includes(normalizedKeyword) || maBanSao.includes(normalizedKeyword);
      })
    : copies;

  const rowsHtml = filtered.map((copy) => {
    const status = String(copy.Tinhtrang || '').trim().toLowerCase();

    let rowStyle = '';
    let statusStyle = '';

    if (status === 'hỏng' || status === 'mất' || status === 'hong' || status === 'mat') {
      rowStyle = 'background-color: #ffe5e5;';
      statusStyle = 'color: #b00020; font-weight: 700;';
    } else if (status === 'đang mượn' || status === 'dang muon') {
      rowStyle = 'background-color: #fff8cc;';
      statusStyle = 'color: #8a6d00; font-weight: 700;';
    }

    return `
      <tr style="${rowStyle}">
        <td>${copy.MaBanSao}</td>
        <td>${copy.MaSach}</td>
        <td>${copy.TenSach || 'N/A'}</td>
        <td style="${statusStyle}">${copy.Tinhtrang}</td>
      </tr>
    `;
  }).join('');

  table.innerHTML = `
    <tr><th>Mã bản sao</th><th>Mã sách</th><th>Tên sách</th><th>Trạng thái</th></tr>
    ${rowsHtml || '<tr><td colspan="4">Không tìm thấy bản sao phù hợp</td></tr>'}
  `;
}

function filterCopies() {
  const input = document.getElementById('copySearchInput');
  if (!input) return;
  window.__copiesSearchKeyword = input.value;
  renderCopiesList(window.__copiesData || [], input.value);
}

function clearCopySearch() {
  const input = document.getElementById('copySearchInput');
  if (!input) return;
  input.value = '';
  window.__copiesSearchKeyword = '';
  renderCopiesList(window.__copiesData || [], '');
}

// Lấy danh sách phiếu mượn (cần token)
async function loadLoans() {
  try {
    const token = localStorage.getItem('token');

    const [membersResponse, copiesResponse, loansResponse] = await Promise.all([
      fetch(`${API_URL}/members`),
      fetch(`${API_URL}/books/copies`),
      fetch(`${API_URL}/loans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
    ]);

    if (!loansResponse.ok) {
      if (loansResponse.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
        window.location.href = '/login.html';
        return;
      }
      throw new Error('Không có quyền xem phiếu mượn');
    }

    const members = await membersResponse.json();
    const copies = await copiesResponse.json();
    const loans = await loansResponse.json();
    const sortedLoans = [...loans].sort((a, b) => {
      const aReturned = String(a.TrangThai).trim() === 'Đã trả' ? 1 : 0;
      const bReturned = String(b.TrangThai).trim() === 'Đã trả' ? 1 : 0;

      if (aReturned !== bReturned) {
        return aReturned - bReturned; // Chưa trả (0) lên trước, đã trả (1) xuống sau
      }

      return Number(b.MaPhieu) - Number(a.MaPhieu);
    });

    const availableCopies = copies.filter((copy) => String(copy.Tinhtrang).trim() === 'Có sẵn');

    let html = `
      <h2>🎫 Danh sách Phiếu Mượn</h2>
      <button class="add-btn" onclick="showAddLoanForm()">➕ Tạo phiếu mượn</button>
      <div id="addLoanForm" style="display: none; margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
        <h3>Tạo phiếu mượn mới</h3>
        <form id="loanForm" style="display: grid; gap: 12px;">
          <label>Mã độc giả: <input type="text" id="maDocGiaInput" name="maDocGia" placeholder="VD: DG001" required></label>
          <label>Mã bản sao: <input type="text" id="maBanSaoInput" name="maBanSao" placeholder="VD: SACH-0001" required></label>
          <div id="loanStatusBox" style="color: #b00; font-weight: bold; min-height: 20px;"></div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <button type="button" id="checkLoanBtn" class="secondary-btn">Kiểm tra</button>
            <button type="submit" id="loanSubmitBtn" class="primary-btn" disabled>Lưu phiếu mượn</button>
            <button type="button" class="secondary-btn" onclick="hideAddLoanForm()">Hủy</button>
          </div>
        </form>
      </div>
    `;
    html += '<table border="1"><tr><th>Mã phiếu</th><th>Độc giả</th><th>Sách</th><th>Ngày mượn</th><th>Hạn trả</th><th>Ngày trả thực</th><th>Trạng thái</th><th>Tiền phạt</th><th>Xác nhận trả sách</th></tr>';

    sortedLoans.forEach(loan => {
      const isReturned = String(loan.TrangThai).trim() === 'Đã trả';
      html += `<tr${isReturned ? ' style="background-color: #fff4a3;"' : ''}>
        <td>${loan.MaPhieu}</td>
        <td>${loan.TenDocGia}</td>
        <td>${loan.TenSach}</td>
        <td>${formatDateOnly(loan.NgayMuon)}</td>
        <td>${formatDateOnly(loan.NgayHenTra)}</td>
        <td>${formatDateOnly(loan.NgayTraThuc)}</td>
        <td>${loan.TrangThai}</td>
        <td>${loan.TienPhat || 0}</td>
        <td>
          ${isReturned
            ? 'Đã xác nhận'
            : `<button class="primary-btn" onclick='openReturnModal(${loan.MaPhieu}, ${JSON.stringify(String(loan.NgayHenTra || ''))})'>Xác nhận trả</button>`}
        </td>
      </tr>`;
    });

    html += `</table>
      <div id="returnModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1000;">
        <div style="max-width:520px; margin:80px auto; background:#fff; border-radius:10px; padding:20px; box-shadow:0 8px 24px rgba(0,0,0,0.2);">
          <h3 style="margin-top:0;">Xác nhận trả sách</h3>
          <div id="returnLoanInfo" style="margin-bottom:12px; color:#333;"></div>
          <form id="returnForm" style="display:grid; gap:12px;">
            <input type="hidden" id="returnLoanId" />
            <input type="hidden" id="returnDueDate" />

            <div>
              <strong>Tình trạng sách:</strong>
              <div style="margin-top:8px; display:grid; gap:6px;">
                <label><input type="radio" name="tinhTrangTra" value="Nguyên vẹn" checked> Nguyên vẹn</label>
                <label><input type="radio" name="tinhTrangTra" value="Hỏng"> Hỏng</label>
                <label><input type="radio" name="tinhTrangTra" value="Mất"> Mất</label>
              </div>
            </div>

            <div id="extraFineRow" style="display:none;">
              <label>Tiền phạt bổ sung: <input type="number" id="extraFineInput" min="0" step="1000" placeholder="VD: 20000"></label>
            </div>

            <div id="returnCalcInfo" style="background:#f7f7f7; border-radius:8px; padding:10px; color:#333;"></div>

            <div style="display:flex; gap:10px;">
              <button type="submit" class="primary-btn">Xác nhận</button>
              <button type="button" class="secondary-btn" onclick="closeReturnModal()">Hủy</button>
            </div>
          </form>
        </div>
      </div>`;
    document.getElementById('content').innerHTML = html;

    // Kiểm tra dữ liệu đầu vào (maDocGia, maBanSao) trước khi cho phép submit
    document.getElementById('checkLoanBtn').addEventListener('click', async () => {
      const maDocGia = document.getElementById('maDocGiaInput').value.trim();
      const maBanSao = document.getElementById('maBanSaoInput').value.trim();
      const statusBox = document.getElementById('loanStatusBox');
      const submitBtn = document.getElementById('loanSubmitBtn');
      submitBtn.disabled = true;
      statusBox.style.color = '#b00';
      statusBox.textContent = '';

      if (!maDocGia || !maBanSao) {
        statusBox.textContent = 'Vui lòng nhập cả Mã độc giả và Mã bản sao.';
        return;
      }

      try {
        // Kiểm tra độc giả
        const memRes = await fetch(`${API_URL}/members/${encodeURIComponent(maDocGia)}`);
        if (!memRes.ok) {
          const err = await memRes.json().catch(() => ({}));
          statusBox.textContent = `Độc giả không tồn tại: ${err.error || memRes.statusText}`;
          return;
        }
        const member = await memRes.json();
        if (String(member.TrangThai).trim() !== 'Hoạt động') {
          statusBox.textContent = 'Độc giả hiện không hoạt động.';
          return;
        }

        // Kiểm tra bản sao từ dữ liệu copies đã tải
        const copy = copies.find(c => String(c.MaBanSao).toLowerCase() === maBanSao.toLowerCase());
        if (!copy) {
          statusBox.textContent = 'Mã bản sao không tồn tại.';
          return;
        }
        if (String(copy.Tinhtrang).trim() !== 'Có sẵn') {
          statusBox.textContent = 'Bản sao hiện không có sẵn.';
          return;
        }

        statusBox.style.color = 'green';
        statusBox.textContent = 'Hợp lệ — bạn có thể lưu phiếu mượn.';
        submitBtn.disabled = false;
      } catch (err) {
        statusBox.textContent = 'Lỗi khi kiểm tra: ' + (err.message || err);
      }
    });

    document.getElementById('loanForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const maDocGia = document.getElementById('maDocGiaInput').value.trim();
      const maBanSao = document.getElementById('maBanSaoInput').value.trim();
      const submitBtn = document.getElementById('loanSubmitBtn');
      submitBtn.disabled = true;

      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/loans`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ maDocGia, maBanSao }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Tạo phiếu mượn thất bại');

        alert(`Tạo phiếu mượn thành công! Ngày mượn: ${formatDateOnly(result.ngayMuon)} - Hạn trả: ${formatDateOnly(result.ngayHenTra)}`);
        hideAddLoanForm();
        loadLoans();
      } catch (error) {
        alert('Lỗi: ' + error.message);
        submitBtn.disabled = false;
      }
    });

    document.getElementById('returnForm').addEventListener('submit', submitReturnLoan);
    document.querySelectorAll('input[name="tinhTrangTra"]').forEach((el) => {
      el.addEventListener('change', () => {
        updateExtraFineVisibility();
        updateReturnCalcInfo();
      });
    });

    const extraFineInput = document.getElementById('extraFineInput');
    if (extraFineInput) {
      extraFineInput.addEventListener('input', updateReturnCalcInfo);
    }
  } catch (error) {
    console.error('Lỗi:', error);
    document.getElementById('content').innerHTML = '<p style="color: red;">Lỗi khi tải danh sách phiếu mượn</p>';
  }
}

function showAddLoanForm() {
  document.getElementById('addLoanForm').style.display = 'block';
}

function hideAddLoanForm() {
  document.getElementById('addLoanForm').style.display = 'none';
  document.getElementById('loanForm').reset();
}

async function confirmReturnLoan(maPhieu) {
  openReturnModal(maPhieu, '');
}

function getSelectedReturnCondition() {
  const checked = document.querySelector('input[name="tinhTrangTra"]:checked');
  return checked ? checked.value : 'Nguyên vẹn';
}

function calculateLateDaysFromDueDate(dueDateRaw) {
  if (!dueDateRaw) return 0;

  const dueDateOnly = new Date(String(dueDateRaw).slice(0, 10));
  if (Number.isNaN(dueDateOnly.getTime())) return 0;

  dueDateOnly.setHours(0, 0, 0, 0);

  const todayOnly = new Date();
  todayOnly.setHours(0, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.floor((todayOnly.getTime() - dueDateOnly.getTime()) / msPerDay);
  return Math.max(0, diff);
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function updateExtraFineVisibility() {
  const condition = getSelectedReturnCondition();
  const row = document.getElementById('extraFineRow');
  const input = document.getElementById('extraFineInput');
  if (!row || !input) return;

  const needExtraFine = condition === 'Hỏng' || condition === 'Mất';
  row.style.display = needExtraFine ? 'block' : 'none';

  if (needExtraFine) {
    input.required = true;
  } else {
    input.required = false;
    input.value = '';
  }
}

function updateReturnCalcInfo() {
  const calcInfo = document.getElementById('returnCalcInfo');
  const dueDateRaw = document.getElementById('returnDueDate')?.value || '';
  const condition = getSelectedReturnCondition();
  const extraFine = Number(document.getElementById('extraFineInput')?.value || 0);
  const lateDays = calculateLateDaysFromDueDate(dueDateRaw);
  const lateFine = lateDays * 5000;
  const validExtraFine = Number.isNaN(extraFine) ? 0 : extraFine;
  const totalFine = lateFine + ((condition === 'Hỏng' || condition === 'Mất') ? validExtraFine : 0);

  if (!calcInfo) return;

  calcInfo.innerHTML = `
    <div>Ngày trả thực sẽ tự điền: <strong>${formatDateOnly(new Date().toISOString())}</strong></div>
    <div>Ngày mượn trễ: <strong>${lateDays}</strong> ngày</div>
    <div>Phạt trễ hạn: <strong>${formatCurrency(lateFine)}</strong> VND (5000 x ${lateDays})</div>
    <div>Tổng tiền phạt dự kiến: <strong>${formatCurrency(totalFine)}</strong> VND</div>
  `;
}

function openReturnModal(maPhieu, ngayHenTraRaw) {
  const modal = document.getElementById('returnModal');
  const info = document.getElementById('returnLoanInfo');
  const loanIdInput = document.getElementById('returnLoanId');
  const dueDateInput = document.getElementById('returnDueDate');

  if (!modal || !info || !loanIdInput || !dueDateInput) return;

  loanIdInput.value = maPhieu;
  dueDateInput.value = String(ngayHenTraRaw || '').slice(0, 10);
  info.innerHTML = `
    <div>Mã phiếu: <strong>#${maPhieu}</strong></div>
    <div>Hạn trả: <strong>${formatDateOnly(dueDateInput.value)}</strong></div>
  `;

  const defaultOption = document.querySelector('input[name="tinhTrangTra"][value="Nguyên vẹn"]');
  if (defaultOption) defaultOption.checked = true;

  const extraFineInput = document.getElementById('extraFineInput');
  if (extraFineInput) extraFineInput.value = '';

  updateExtraFineVisibility();
  updateReturnCalcInfo();

  modal.style.display = 'block';
}

function closeReturnModal() {
  const modal = document.getElementById('returnModal');
  if (modal) modal.style.display = 'none';
}

async function submitReturnLoan(e) {
  e.preventDefault();

  const maPhieu = document.getElementById('returnLoanId')?.value;
  const condition = getSelectedReturnCondition();
  const extraFineInput = document.getElementById('extraFineInput');
  const extraFineRaw = extraFineInput ? extraFineInput.value : '';

  if ((condition === 'Hỏng' || condition === 'Mất') && extraFineRaw === '') {
    alert('Vui lòng nhập tiền phạt bổ sung cho sách hỏng/mất.');
    return;
  }

  const extraFine = Number(extraFineRaw || 0);
  if (Number.isNaN(extraFine) || extraFine < 0) {
    alert('Tiền phạt bổ sung không hợp lệ.');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/loans/${maPhieu}/return`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        tinhTrangTra: condition,
        tienPhatBoSung: extraFine,
      }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Xác nhận trả sách thất bại');

    alert(
      `Xác nhận trả sách thành công!\n` +
      `Ngày trả thực: ${formatDateOnly(result.ngayTraThuc)}\n` +
      `Phạt trễ hạn: ${formatCurrency(result.tienPhatTreHan)} VND\n` +
      `Phạt bổ sung: ${formatCurrency(result.tienPhatBoSung)} VND\n` +
      `Tổng phạt: ${formatCurrency(result.tongTienPhat)} VND`
    );

    closeReturnModal();
    loadLoans();
  } catch (error) {
    alert('Lỗi: ' + error.message);
  }
}

// Load admin dashboard (available cho quản lý)
async function loadAdminDashboard() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/admin/summary`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      if (res.status === 403) {
        alert('Bạn không có quyền xem báo cáo');
        return;
      }
      throw new Error('Không thể tải báo cáo');
    }

    const data = await res.json();

    const cardsHtml = `
      <div class="cards">
        <div class="card">Tổng Sách<br><strong>${data.totalBooks}</strong></div>
        <div class="card">Tổng Bản sao<br><strong>${data.totalCopies}</strong></div>
        <div class="card">Tổng Độc giả<br><strong>${data.totalMembers}</strong></div>
        <div class="card">Đang mượn<br><strong>${data.openLoans}</strong></div>
        <div class="card">Quá hạn<br><strong>${data.overdueCount}</strong></div>
        <div class="card">Tổng tiền phạt<br><strong>${formatCurrency(data.totalFines)}</strong></div>
      </div>
    `;

    let membersStatusHtml = '<table border="1"><tr><th>Trạng thái</th><th>Số lượng</th></tr>';
    (data.membersByStatus || []).forEach(s => {
      membersStatusHtml += `<tr><td>${s.TrangThai}</td><td>${s.count}</td></tr>`;
    });
    membersStatusHtml += '</table>';

    let topBooksHtml = '<table border="1"><tr><th>Rank</th><th>Mã sách</th><th>Tên sách</th><th>Số lần mượn</th></tr>';
    (data.topBooks || []).forEach((b, i) => {
      topBooksHtml += `<tr><td>${i+1}</td><td>${b.MaSach || ''}</td><td>${b.TenSach || ''}</td><td>${b.borrowCount}</td></tr>`;
    });
    topBooksHtml += '</table>';

    let monthlyHtml = '<table border="1"><tr><th>Năm</th><th>Tháng</th><th>Số phiếu mượn</th></tr>';
    (data.monthlyBorrow || []).forEach(r => {
      monthlyHtml += `<tr><td>${r.yr}</td><td>${r.m}</td><td>${r.cnt}</td></tr>`;
    });
    monthlyHtml += '</table>';

    const html = `
      <h2>📊 Báo cáo Tổng quan</h2>
      ${cardsHtml}
      <h3>Trạng thái độc giả</h3>
      ${membersStatusHtml}
      <h3>Top sách mượn nhiều nhất</h3>
      ${topBooksHtml}
      <h3>Số phiếu mượn theo tháng (12 tháng gần nhất)</h3>
      ${monthlyHtml}
    `;

    document.getElementById('content').innerHTML = html;
  } catch (err) {
    console.error(err);
    document.getElementById('content').innerHTML = '<p style="color:red;">Lỗi khi tải báo cáo</p>';
  }
}
