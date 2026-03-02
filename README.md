# Hướng dẫn Cài đặt Telegram Bot trên Cloudflare Workers

Project này là phần khung cơ bản giúp bạn tạo một Telegram Bot bằng JavaScript và thiết lập cho nó hoạt động không cần máy chủ (serverless) thông qua Cloudflare Workers.

## 1. Cài đặt các thư viện cần thiết
Mở terminal (PowerShell hoặc Command Prompt) trong thư mục project này và chạy lệnh:
```bash
npm install
```

## 2. Tạo Bot trên Telegram
1. Mở ứng dụng Telegram, tìm tài khoản `@BotFather`.
2. Bấm `/newbot` và làm theo hướng dẫn để lấy `Bot Token` (ví dụ: `123456789:ABCDefghIJKlmnOPQRstuVWxyz`).

## 3. Cấu hình Cloudflare KV (Lưu trữ dữ liệu)
Bot này sử dụng KV (Key-Value) của Cloudflare để lưu trữ danh sách người đăng ký và trạng thái của ứng dụng.

1. Đăng nhập vào Cloudflare qua terminal:
   ```bash
   npx wrangler login
   ```
2. Tạo một KV Namespace mới có tên `BOT_DATA` bằng lệnh:
   ```bash
   npx wrangler kv:namespace create "BOT_DATA"
   ```
3. Sau khi chạy lệnh trên, terminal sẽ xuất ra một đoạn mã hướng dẫn, ví dụ:
   ```toml
   [[kv_namespaces]]
   binding = "BOT_DATA"
   id = "MỘT_CHUỖI_ID_DÀI"
   ```
   Hãy copy đoạn mã này và dán đè lên cấu hình `[[kv_namespaces]]` trong file `wrangler.toml` của bạn.

## 4. Deploy Bot lên Cloudflare Workers
1. Thay đổi ID của game/ứng dụng bạn muốn theo dõi trong file `wrangler.toml` tại mục `APP_ID`. (Mặc định đang là ID của trò Genshin Impact).
2. Thêm Bot Token vào biến cấu hình bảo mật (Secret) trên Cloudflare. Chạy lệnh:
   ```bash
   npx wrangler secret put SECRET_TELEGRAM_BOT_TOKEN
   ```
   Sau đó dán Token bạn lấy từ BotFather vào terminal và nhấn Enter.
3. Chạy lệnh Deploy lên mạng lưới Cloudflare:
   ```bash
   npm run deploy
   ```
   *Lưu ý: Hệ thống đã được cấu hình tự động chạy hàm kiểm tra theo dõi App (Cron Trigger) mỗi giờ một lần (`0 * * * *`).*

4. Khi chạy xong, Wrangler sẽ cung cấp cho bạn một đường dẫn (ví dụ: `https://telegram-bot.<username>.workers.dev`). Hãy lưu lại URL này.

## 5. Cấu hình Webhook cho Telegram
Webhook giúp mỗi khi có tin nhắn, Telegram sẽ tự động gọi sang Cloudflare thay vì bot phải liên tục hỏi Telegram.
Thay Token và URL vào đường link sau, mở link trên trình duyệt:
```
https://api.telegram.org/bot<Thay_Token_Vào_Đây>/setWebhook?url=<Thay_URL_Của_Cloudflare_Vào_Đây>
```
*Bạn sẽ thấy một phản hồi JSON hiển thị {"ok":true,"result":true,"description":"Webhook was set"}*

## 6. Đẩy Source Code lên GitHub
1. Khởi tạo Git repository (nếu bạn có cài sẵn git):
   ```bash
   git init
   git add .
   git commit -m "Khởi tạo project Telegram Bot"
   ```
2. Lên GitHub, tạo một Repository mới.
3. Làm theo hướng dẫn của GitHub để đẩy mã của bạn lên:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<tên_tài_khoản>/<tên_repo>.git
   git push -u origin main
   ```
