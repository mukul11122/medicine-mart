importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js')

firebase.initializeApp({
  apiKey: "AIzaSyB7cHydRZnSIlMvjEuXZYf48nHtiJlO0ww",
  authDomain: "myapp-10df8.firebaseapp.com",
  databaseURL: "https://myapp-10df8-default-rtdb.firebaseio.com",
  projectId: "myapp-10df8",
  storageBucket: "myapp-10df8.firebasestorage.app",
  messagingSenderId: "403822606671",
  appId: "1:403822606671:web:5cd00139d2ab58c6252d3a",
  measurementId: "G-S3JZ4C2262"
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message:', payload)
  const notificationTitle = payload.notification?.title || 'JanAushadhiGenerix'
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
  }
  self.registration.showNotification(notificationTitle, notificationOptions)
})
