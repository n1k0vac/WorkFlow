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

// ĐOẠN CODE ĐĂNG KÝ SERVICE WORKER ĐỂ BẬT TÍNH NĂNG PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker đăng ký thành công với scope: ', registration.scope);
      })
      .catch(err => {
        console.log('ServiceWorker đăng ký thất bại: ', err);
      });
  });
}
