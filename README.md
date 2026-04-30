# 🕵️ Spyyyyyyyyyyyy

Một trò chơi web real-time để kiểm tra khả năng suy luận và kỹ năng giao tiếp.

## 🎮 Quy Tắc Chơi

- **Roles**: 1/3 người chơi là Spy, 2/3 là Dân
- **Từ**: Mỗi vòng Dân và Spy nhận 2 từ khác nhau
- **Thảo luận**: Mỗi người lần lượt đưa ra 1 gợi ý (không được nói đúng từ gốc)
- **Bỏ phiếu**: Tất cả vote loại bỏ 1 người
- **Điều kiện thắng**:
  - **Dân thắng**: Loại bỏ tất cả Spy
  - **Spy thắng**: Số lượng Spy ≥ Dân

## 🚀 Cài đặt

### Yêu cầu
- Node.js 16+
- npm hoặc yarn

### Backend Setup

```bash
cd server
npm install
npm run dev
```

Server chạy trên `http://localhost:3000`

### Frontend Setup

```bash
cd client
npm install
npm run dev
```

Client chạy trên `http://localhost:5173`

## 📋 Tính Năng

- ✅ Tạo/Vào phòng qua mã hoặc QR code
- ✅ Turn-based discussion (lần lượt nói)
- ✅ Real-time word validation
- ✅ Round summary modal
- ✅ Local storage persistence
- ✅ Mobile responsive
- ✅ Dark theme UI

## 🏗️ Cấu trúc Project

```
spy-duel/
├── server/                  (Node.js + Express + Socket.IO)
│   ├── src/
│   │   ├── types/          (TypeScript interfaces)
│   │   ├── services/       (GameService, RoomService)
│   │   ├── events/         (Socket.IO handlers)
│   │   └── index.ts        (Main server)
│   └── package.json
│
└── client/                  (React + Vite)
    ├── src/
    │   ├── types/
    │   ├── store/          (Zustand)
    │   ├── hooks/          (useSocket)
    │   ├── pages/          (Lobby, Room, Game)
    │   ├── App.tsx
    │   └── main.tsx
    ├── index.html
    └── package.json
```

## 🎯 Phát Triển Tiếp Theo

- [ ] Hỗ trợ Mũ trắng (white hat role)
- [ ] Lưu lịch sử trò chơi
- [ ] Thống kê người chơi
- [ ] Chat trong trò chơi
- [ ] Ai được chọn làm chủ

---

**Tác giả**: Spy & Duel Team  
**Phiên bản**: 1.0.0
