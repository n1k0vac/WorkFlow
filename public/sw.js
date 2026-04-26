// Tên của bộ nhớ đệm (Cache)
const CACHE_NAME = 'focusflow-v1';

// Những file cần lưu lại máy người dùng để chạy Offline
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png'
];

// Sự kiện Cài đặt Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Đã mở cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Sự kiện lấy dữ liệu (Khi người dùng mở app lúc mất mạng)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Nếu tìm thấy file trong cache thì trả về, không thì tải từ mạng
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
