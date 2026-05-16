# Hệ thống Quản lý Thư viện (dự án mẫu)

Phiên bản rút gọn của hệ thống quản lý thư viện — gồm backend Node/Express, cơ sở dữ liệu SQL, và frontend tĩnh (HTML/JS). Mục đích: minh họa CRUD sách, độc giả, phiếu mượn, và một số luật nghiệp vụ.

---

## Tổng quan
- Backend: Node.js + Express (thư mục `server/`)
- Frontend: tệp tĩnh trong `public/` (mở `index.html` để dùng giao diện)
- Database: file SQL mẫu `quanlythuvien.sql`

---

## Cấu trúc hệ thống (thành phần chính)
- `server/` — mã backend:
	- `server/app.js` — khởi tạo Express, middleware và route mount
	- `server/routes/` — định nghĩa đường dẫn API (auth, books, members, loans)
	- `server/controllers/` — logic xử lý cho từng resource (CRUD, transaction)
	- `server/config/database.js` — cấu hình kết nối MSSQL
	- `server/middleware/auth.js` — middleware JWT
- `public/` — giao diện front-end tĩnh, mã client-side (`app.js`, `index.html`, `styles.css`)
- `quanlythuvien.sql` — file schema & dữ liệu mẫu để import vào SQL Server
- `package.json` / `package-lock.json` — định nghĩa dependency và scripts
- `.env` (không commit) — chứa cấu hình môi trường (DB, JWT secret...)

---

## Yêu cầu (Prerequisites)
- Node.js (>=14) và npm
- Microsoft SQL Server (hoặc SQL Server Express) để import `quanlythuvien.sql`

---

## Thiết lập nhanh (Quick start)

1. Clone và cài phụ thuộc:

```bash
git clone <repo-url>
cd QuanLyThuVien
npm install
```

2. Tạo file cấu hình (chỉ những biến quan trọng):

```bash
cp .env.example .env
# chỉnh DB_* và JWT_SECRET trong .env
```

3. Import database (chạy file `quanlythuvien.sql` vào SQL Server).

4. Chạy server:

```bash
npm run dev
# mở http://localhost:5000
```

---

## File cấu hình môi trường
Tạo file `.env` (không chứa thông tin thật) hoặc sao chép từ `.env.example` và điền các biến cần thiết. Ví dụ tối thiểu:

```
DB_SERVER=localhost\\SQLEXPRESS      # hoặc tên server/instance của bạn
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=quanlythuvien
JWT_SECRET=replace_with_secure_random_string
PORT=5000
```

Giữ file `.env` ngoài version control — đó là lý do dự án có `.env.example` để chia sẻ các khóa mà không lộ giá trị thật.

---

## Điểm cần biết khi chạy
- Frontend lưu token JWT trong `localStorage` (dễ dùng cho demo). Với môi trường production cân nhắc dùng httpOnly cookie.
- CORS hiện đang mở toàn bộ origin — nếu deploy lên server công khai, hãy giới hạn origin.

---

## API chính (tóm tắt)
- `POST /api/auth/login` — đăng nhập, trả `token`
- `GET /api/books` — lấy danh sách sách
- `POST /api/books` — tạo sách (cần token)
- `GET /api/members` — lấy danh sách độc giả
- `POST /api/members` — tạo độc giả (cần token)
- `GET /api/loans` — lấy phiếu mượn (cần token)
- `POST /api/loans` — tạo phiếu mượn (cần token)

Xem file `server/routes/` để biết chi tiết endpoint.
