// --- PHẦN 1: FIREBASE MESSAGING (XỬ LÝ THÔNG BÁO CHẠY NGẦM) ---
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCtwzMGOI4NvYQUdnIixYIV8xW7K61qzdY",
  authDomain: "workflow-bb753.firebaseapp.com",
  projectId: "workflow-bb753",
  storageBucket: "workflow-bb753.firebasestorage.app",
  messagingSenderId: "608288170073",
  appId: "1:608288170073:web:056cb8e6e2c4425b151148"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Đã nhận thông báo chạy ngầm:', payload);
  const notificationTitle = payload.notification.title || "FocusFlow nhắc bạn!";
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'focusflow-notification',
    renotify: true
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// --- PHẦN 2: OFFLINE CACHE (CHẠY KHI KHÔNG CÓ MẠNG) ---
const CACHE_NAME = 'focusflow-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Đã mở cache');
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
