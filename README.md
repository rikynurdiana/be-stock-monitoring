# NestJS WebSocket Stock & Investment Server

Aplikasi backend real-time berbasis [NestJS](https://nestjs.com/) untuk menampilkan data saham dan investasi menggunakan WebSocket (Socket.IO). Cocok untuk backend aplikasi frontend (web/mobile) yang ingin menampilkan harga saham, perubahan harga, dan chart historis secara dinamis.

## Fitur Utama

- **WebSocket Real-Time Stock Data**
  - Subscribe data saham tertentu (BBRI, BBCA, TLKM, ANTM)
  - Data harga, perubahan, dan persentase perubahan dikirim setiap 5 detik
- **WebSocket Real-Time Chart Data**
  - Subscribe data chart (historis harga) untuk satu/lebih saham
  - Data chart berisi 30 data historis (per menit), update setiap 5 detik (data berkelanjutan)
- **Sinkronisasi Data**
  - Harga saham dan chart selalu konsisten, menggunakan sumber data yang sama
- **Request Fleksibel**
  - Request satu symbol atau banyak symbol sekaligus, response selalu array
- **Manajemen Interval per Client**
  - Update data periodik hanya untuk symbol yang diminta client
  - Interval otomatis dihentikan saat client disconnect
- **Integrasi Real Data Stock dari YFinance**
  - Sudah bisa menggunakan Real Data dari YFinance karena menggunakan service yang dibuat oleh [https://github.com/rikynurdiana/py-stock-monitoring]

## Cara Menjalankan

```bash
npm install
npm run start:dev
```

## Cara Menggunakan WebSocket (Socket.IO)

### 1. Stock Data
- **Event listen:** `stockData`
- **Event request:** `getStock`
- **Payload:**
  - Satu symbol: `"BBRI"`
  - Banyak symbol: `["BBRI", "BBCA"]`
- **Response:**
  ```json
  [
    {
      "symbol": "BBRI",
      "price": 5400,
      "change": 10,
      "changePercent": 0.19
    }
  ]
  ```

### 2. Chart Data
- **Event listen:** `chartData`
- **Event request:** `getChart`
- **Payload:**
  - Satu symbol: `"BBRI"`
  - Banyak symbol: `["BBRI", "BBCA"]`
- **Response:**
  ```json
  [
    {
      "symbol": "BBRI",
      "chart": [
        { "timestamp": 1716450000, "price": 5400 },
        ...
      ]
    }
  ]
  ```

- Data chart akan diupdate otomatis setiap 5 detik, hanya data terbaru yang berubah, data sebelumnya tetap.

## Contoh Client (Node.js)
```js
const { io } = require("socket.io-client");
const socket = io("http://localhost:3000");

socket.on("connect", () => {
  socket.emit("getStock", ["BBRI", "BBCA"]);
  socket.emit("getChart", "BBRI");
});

socket.on("stockData", (data) => {
  console.log("stockData", data);
});

socket.on("chartData", (data) => {
  console.log("chartData", data);
});
```

## Daftar Symbol Saham Dummy
- BBRI
- BBCA
- TLKM
- ANTM

## Lisensi
MIT
