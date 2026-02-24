# Kiến Trúc & Luồng Hoạt Động (Workflow) - OPhim Stremio Addon

Tài liệu này giải thích cách Addon của bạn đóng vai trò là "cầu nối" giữa ứng dụng **Stremio** và hệ thống **OPhim API**.

## 1. Sơ đồ kiến trúc tổng quan
```text
[ Stremio App ] <---> [ Cloudflare Workers (Hono) ] <---> [ OPhim API ]
      (Client)               (Addon Trung Gian)               (Data Source)
```

## 2. Các thành phần chính

### A. Định danh thực thể (ID Mapping)
Để đồng bộ giữa hai hệ thống, chúng ta sử dụng quy ước ID:
- **ID định dạng:** `ophim:{slug}` (Ví dụ: `ophim:tro-choi-con-muc`)
- **Tại sao?** Vì OPhim truy vấn phim dựa trên `slug`, việc lưu slug ngay trong ID giúp Addon không cần truy vấn ngược lại để tìm slug khi người dùng nhấn xem.

### B. Các luồng xử lý chính

#### 1. Giai đoạn Manifest (Khởi tạo)
- **Stremio:** Gọi `GET /manifest.json`.
- **Addon:** Trả về cấu hình (tên, các loại phim hỗ trợ, và quan trọng nhất là các `idPrefixes: ["ophim:"]`).
- **Kết quả:** Stremio biết rằng nếu thấy bất kỳ phim nào có ID bắt đầu bằng `ophim:`, nó sẽ hỏi addon này để lấy link xem.

#### 2. Giai đoạn Catalog (Khám phá phim)
- **Stremio:** Gọi `GET /catalog/movie/ophim_new_movie.json`.
- **Addon:** 
    1. Gọi API OPhim: `https://ophim1.com/v1/api/danh-sach/phim-moi-cap-nhat`.
    2. Duyệt danh sách phim trả về.
    3. Chuyển đổi dữ liệu OPhim sang chuẩn Stremio (Meta Preview Object).
    4. Trả về cho Stremio.
- **Kết quả:** Người dùng thấy danh sách poster phim OPhim hiện ra trong Stremio.

#### 3. Giai đoạn Meta (Thông tin chi tiết)
- **Stremio:** Người dùng click vào 1 phim -> Gọi `GET /meta/movie/ophim:{slug}.json`.
- **Addon:**
    1. Lấy `{slug}` từ ID.
    2. Gọi API OPhim: `https://ophim1.com/v1/api/phim/{slug}`.
    3. Trích xuất: Nội dung, diễn viên, đạo diễn, năm sản xuất.
    4. Nếu là phim bộ: Trích xuất danh sách tập phim từ `episodes` để tạo ra menu chọn tập trong Stremio.
- **Kết quả:** Trang chi tiết phim hiện ra đẹp mắt với đầy đủ thông tin.

#### 4. Giai đoạn Stream (Lấy link xem)
- **Stremio:** Người dùng chọn 1 tập/server -> Gọi `GET /stream/movie/ophim:{slug}:{episode}.json`.
- **Addon:**
    1. Gọi lại API chi tiết phim của OPhim.
    2. Tìm đúng tập phim người dùng yêu cầu.
    3. Lấy trường `link_m3u8`.
    4. Trả về cho Stremio dưới dạng `url: "..."`.
- **Kết quả:** Trình phát video của Stremio mở link m3u8 và bắt đầu phát phim.

## 3. Tại sao chọn Hono & Cloudflare Workers?
1. **Tốc độ:** Code chạy tại Edge (gần người dùng nhất), giảm độ trễ tối đa.
2. **CORS:** Stremio require CORS rất nghiêm ngặt, Hono xử lý việc này chỉ với vài dòng code.
3. **Mã nguồn nhẹ:** Toàn bộ Addon chỉ khoảng ~20KB, rất dễ bảo trì.

## 4. Tóm tắt luồng dữ liệu (Data Transformation)
| Dữ liệu OPhim | Dữ liệu Stremio | Ghi chú |
| :--- | :--- | :--- |
| `name` | `name` | Tên tiếng Việt |
| `origin_name` | `description` | Tên gốc |
| `thumb_url` | `poster` | Ảnh dọc |
| `poster_url` | `background` | Ảnh nền ngang |
| `link_m3u8` | `url` | Link trực tiếp để phát |
