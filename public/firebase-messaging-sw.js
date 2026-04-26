// public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Sử dụng đúng cấu hình bạn vừa gửi
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

// Xử lý thông báo khi App đang đóng hoặc chạy ngầm (quan trọng để không bị miss)
messaging.onBackgroundMessage((payload) => {
  console.log('Đã nhận thông báo chạy ngầm:', payload);
  
  const notificationTitle = payload.notification.title || "FocusFlow nhắc bạn!";
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png', // Đảm bảo file này có trong thư mục public
    badge: '/logo192.png',
    tag: 'focusflow-notification', // Tránh hiện nhiều thông báo trùng lặp
    renotify: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
