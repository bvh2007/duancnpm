# TàiLiệuSV – Website chia sẻ tài liệu học tập

Phiên bản này dùng **Node.js + Express + MySQL + HTML/CSS/JavaScript module**. Database được thiết kế theo ERD quan hệ gồm USERS, ROLES, DOCUMENTS, CATEGORIES, SUBJECTS, FACULTIES, TAGS, DOCUMENT_TAGS, RATINGS, DOWNLOADS, FAVORITES, COMMENTS, REPORTS và NOTIFICATIONS.

## 1. Chuẩn bị
- Node.js 18+
- MySQL 8+
- Tạo database bằng `backend/sql/schema.sql` hoặc chạy `npm run db:init` trong thư mục `backend`.

## 2. Cấu hình MySQL
Mở `backend/.env`:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=tailieu_sv
JWT_SECRET=change_this_to_a_long_random_secret
```

Đổi `DB_PASSWORD` nếu MySQL của bạn có mật khẩu.

## 3. Cài đặt và chạy

```bash
cd backend
npm install
npm run db:init
npm start
```

Mở: `http://localhost:3000`

## 4. Chức năng đã nối database
- Đăng ký / đăng nhập bằng JWT + bcrypt
- Upload tài liệu và lưu metadata vào MySQL
- Tài liệu mới có trạng thái `pending`
- Moderator/Admin duyệt hoặc từ chối tài liệu
- Download tăng `download_count` và ghi lịch sử DOWNLOADS
- Rating 1–5 sao, mỗi user chỉ có một rating/tài liệu
- Favorites theo USER ↔ DOCUMENT
- Comments và trả lời comment qua `parent_id`
- Reports cho tài liệu
- Notifications khi tài liệu được duyệt/từ chối
- Tags N-N qua DOCUMENT_TAGS
- Tìm kiếm theo tiêu đề, mô tả, môn học, tag
- Lọc khoa, môn, loại tài liệu và sắp xếp

## 5. Tạo tài khoản quản trị
Đăng ký một tài khoản bình thường trên website, sau đó chạy SQL:

```sql
UPDATE users
SET role_id = (SELECT role_id FROM roles WHERE role_name = 'admin')
WHERE email = 'email-cua-ban@example.com';
```

Sau khi đăng nhập lại, nút **Quản trị** sẽ xuất hiện.

## Dữ liệu demo
Sau khi `npm run db:init`, chạy:

```bash
npm run db:seed
```

Tài khoản demo:
- Admin: `admin@tailieusv.local` / `123456`
- Sinh viên: `an@tailieusv.local` / `123456`
- Sinh viên: `duc@tailieusv.local` / `123456`
- Sinh viên: `nam@tailieusv.local` / `123456`

Dữ liệu demo bao gồm tài liệu đã duyệt, rating, comment, favorite, download, report và notification.
