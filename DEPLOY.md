# Hướng dẫn Deploy Backend lên Render

## Bước 1: Chuẩn bị GitHub Repository
1. Push code lên GitHub (nếu chưa có)
2. Đảm bảo có `server/` folder với `package.json` và `src/index.ts`

## Bước 2: Tạo Render Account
1. Vào https://render.com
2. Đăng ký/Đăng nhập bằng GitHub

## Bước 3: Deploy Backend

### Cách 1: Deploy bằng render.yaml (Recommended)
1. Vào https://render.com/new
2. Chọn **Web Service**
3. Kết nối GitHub repository
4. Nếu render.yaml có sẵn, Render sẽ tự detect
5. Chọn branch để deploy (main/master)
6. Bấm **Deploy**

### Cách 2: Deploy thủ công qua Dashboard
1. Vào https://render.com/dashboard
2. Bấm **New +** → **Web Service**
3. Chọn GitHub repository
4. Điền thông tin:
   - **Name**: `spy-duel-backend`
   - **Runtime**: `Node`
   - **Build Command**: `cd server && npm install && npm run build`
   - **Start Command**: `cd server && npm start`
   - **Plan**: `Free` (hoặc Paid nếu muốn)
5. Bấu **Create Web Service**
6. Đợi deploy xong (3-5 phút)

## Bước 4: Lấy Backend URL
- Sau khi deploy xong, Render sẽ cấp cho bạn URL như: `https://spy-duel-backend.onrender.com`
- Sao chép URL này

## Bước 5: Cập nhật Client
1. Mở file `.env.local` trong `client/` folder:
   ```
   VITE_SOCKET_URL=https://spy-duel-backend.onrender.com
   ```
2. Hoặc cập nhật trong `.env.production`:
   ```
   VITE_SOCKET_URL=https://spy-duel-backend.onrender.com
   ```

## Bước 6: Deploy Client
- Build client: `npm run build` trong `client/`
- Deploy client lên Vercel/Netlify/Render
- Đảm bảo client trỏ đúng backend URL

## Troubleshooting

### Backend không kết nối được
- Kiểm tra Render logs: Dashboard → spy-duel-backend → Logs
- Chắc chắn PORT env var được set (mặc định 3000)

### CORS error
- Backend đã có `cors()` middleware, nên không nên có vấn đề
- Nếu có lỗi, kiểm tra [server/src/index.ts](server/src/index.ts)

### Client không connect được backend
- Kiểm tra VITE_SOCKET_URL đúng chưa
- Render free plan sẽ auto-sleep nếu inactive, có thể mất 30 giây để kích hoạt lại

## Lệnh hữu ích

```bash
# Build server
npm run build

# Test locally
npm run dev

# Start production
npm start

# Trong client, build với env var
VITE_SOCKET_URL=https://spy-duel-backend.onrender.com npm run build
```
