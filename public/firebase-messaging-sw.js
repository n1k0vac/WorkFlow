importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Dán cấu hình Firebase của bạn vào đây
const firebaseConfig = {
  apiKey: "AIzaSy...", 
  authDomain: "workflow-bb753.firebaseapp.com",
  projectId: "workflow-bb753",
  storageBucket: "workflow-bb753.firebasestorage.app",
  messagingSenderId: "608288170073",
  appId: "1:608288170073:web:..."
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Xử lý khi có tin nhắn đến mà App đang đóng
messaging.onBackgroundMessage((payload) => {
  console.log('Nhận thông báo chạy ngầm:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
