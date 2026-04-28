import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// HỦY ĐĂNG KÝ SERVICE WORKER ĐỂ TRÁNH LỖI CACHE CỨNG (Phải ấn Ctrl+F5)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister();
      console.log('Đã hủy đăng ký Service Worker cũ thành công.');
    }
  }).catch((err) => {
    console.log('Lỗi khi hủy đăng ký Service Worker: ', err);
  });
}
