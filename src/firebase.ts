import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'

export const firebaseConfig = {
  apiKey: "AIzaSyB7cHydRZnSIlMvjEuXZYf48nHtiJlO0ww",
  authDomain: "myapp-10df8.firebaseapp.com",
  databaseURL: "https://myapp-10df8-default-rtdb.firebaseio.com",
  projectId: "myapp-10df8",
  storageBucket: "myapp-10df8.firebasestorage.app",
  messagingSenderId: "403822606671",
  appId: "1:403822606671:web:5cd00139d2ab58c6252d3a",
  measurementId: "G-S3JZ4C2262"
}

// 🔑 Paste your VAPID key here (Firebase Console → Project Settings → Cloud Messaging → Web Push certificates).
// getToken() fails until a real key is set.
export const VAPID_KEY = 'BFCRLN4AJotV2s4xvgtlN834gKkY25aIeFlw2AwayvttSHlJTslJqQHfTbHyaVsAizwumxY6bSbWVlZS2X3UmBo'

let app: FirebaseApp
try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig)
} catch {
  app = initializeApp(firebaseConfig)
}

export function getFirebaseApp(): FirebaseApp {
  return app
}

export async function getFcmToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  if (!('Notification' in window)) {
    console.warn('[FCM] Notifications not supported in this browser')
    return null
  }
  try {
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => {})
    }
    const messaging = getMessaging(app)
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('[FCM] Notification permission not granted')
      return null
    }
    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    if (!token) {
      console.warn('[FCM] No registration token. Check VAPID key + SW.')
      return null
    }
    console.log('[FCM] ✅ Token:', token)
    return token
  } catch (err: any) {
    console.error('[FCM] getToken failed:', err?.message || err)
    return null
  }
}

export function onForegroundMessage(callback: (payload: any) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  try {
    const messaging = getMessaging(app)
    return onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground message:', payload)
      callback(payload)
    })
  } catch (err: any) {
    console.error('[FCM] onMessage failed:', err?.message || err)
    return () => {}
  }
}
