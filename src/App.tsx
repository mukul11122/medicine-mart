import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { cn } from '@/lib/cn'
import { ImageUploader } from '@/components/ImageUploader'
import { getFcmToken, onForegroundMessage } from './firebase'

// ── Types ────────────────────────────────────────────────────

interface User {
  id: string
  email: string
  name: string
  role: string
  phone?: string
}

interface Category {
  id: string
  name: string
  slug: string
  icon?: string
  description?: string
  _count?: { medicines: number }
}

interface Medicine {
  id: string
  sku: string
  name: string
  genericName: string
  slug: string
  composition: string
  manufacturer: string
  categoryId: string
  packSize: string
  mrp: number
  sellingPrice: number
  discount: number
  stockQuantity: number
  minimumStockLevel: number
  description?: string
  dosageInfo?: string
  benefits?: string
  sideEffects?: string
  prescriptionRequired: boolean
  isFeatured: boolean
  imageUrl?: string
  rating: number
  reviewCount: number
  category?: Category
}

interface CartItem {
  id: string
  medicineId: string
  quantity: number
  medicine: Medicine
}

interface Order {
  id: string
  orderNumber: string
  status: string
  subtotal: number
  deliveryCharge: number
  gstAmount: number
  discount: number
  total: number
  paymentMethod?: string
  paymentStatus: string
  createdAt: string
  items: (OrderItem & { medicine: Medicine })[]
  address?: Address
  user?: User
}

interface OrderItem {
  id: string
  quantity: number
  price: number
  total: number
}

interface Address {
  id: string
  name: string
  phone: string
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
  type: string
  isDefault: boolean
}

interface Coupon {
  code: string
  description: string
  discount: number
  discountAmount: number
}

type Page = 'home' | 'medicines' | 'medicine-detail' | 'cart' | 'checkout' | 'login' | 'register' | 'orders' | 'order-detail' | 'admin' | 'admin-medicines' | 'admin-orders' | 'admin-add-medicine' | 'admin-inventory' | 'wishlist' | 'profile' | 'forgot-password' | 'reset-password'

interface AppState {
  page: Page
  setPage: (page: Page) => void
  user: User | null
  setUser: (user: User | null) => void
  cart: CartItem[]
  setCart: (cart: CartItem[]) => void
  cartCount: number
  selectedMedicine: Medicine | null
  setSelectedMedicine: (m: Medicine | null) => void
  selectedOrder: Order | null
  setSelectedOrder: (o: Order | null) => void
  darkMode: boolean
  setDarkMode: (d: boolean) => void
  refreshCart: () => void
  resetToken: string | null
}

const AppContext = createContext<AppState>({
  page: 'home', setPage: () => {},
  user: null, setUser: () => {},
  cart: [], setCart: () => {},
  cartCount: 0,
  selectedMedicine: null, setSelectedMedicine: () => {},
  selectedOrder: null, setSelectedOrder: () => {},
  darkMode: false, setDarkMode: () => {},
  refreshCart: () => {},
  resetToken: null,
})

// ── API Helpers ──────────────────────────────────────────────

async function api(path: string, options?: RequestInit) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  return res.json()
}

// ── Main App ─────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [user, setUser] = useState<User | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartCount, setCartCount] = useState(0)
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('jan-dark') === 'true'
    }
    return false
  })
  const [resetToken, setResetToken] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('jan-dark', String(darkMode))
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  // Open password-reset page when arriving via a reset link (?token=...)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      setResetToken(token)
      setPage('reset-password')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // ── Firebase Cloud Messaging (push notifications) ──
  useEffect(() => {
    let unsub: (() => void) | undefined
    ;(async () => {
      const token = await getFcmToken()
      if (token) {
        try {
          await api('/fcm/register', {
            method: 'POST',
            body: JSON.stringify({ token, userId: user?.id }),
          })
        } catch (e) {
          console.error('[FCM] register failed', e)
        }
      }
      unsub = onForegroundMessage((payload: any) => {
        const title = payload?.notification?.title || 'JanAushadhiGenerix'
        const body = payload?.notification?.body || ''
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body })
        } else {
          console.log(`[FCM] ${title}: ${body}`)
        }
      })
    })()
    return () => { if (unsub) unsub() }
  }, [user?.id])

  const refreshCart = useCallback(async () => {
    if (!user) return
    try {
      const data = await api(`/cart/${user.id}`)
      setCart(data.items || [])
      setCartCount(data.count || 0)
    } catch {}
  }, [user])

  useEffect(() => {
    refreshCart()
  }, [refreshCart])

  const ctx: AppState = {
    page, setPage, user, setUser,
    cart, setCart, cartCount,
    selectedMedicine, setSelectedMedicine,
    selectedOrder, setSelectedOrder,
    darkMode, setDarkMode, refreshCart, resetToken,
  }

  return (
    <AppContext.Provider value={ctx}>
      <div className={cn(
        'min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors',
      )}>
        <header className="fixed top-0 inset-x-0 z-50">
        {/* Hotline Bar */}
        <div className="bg-green-700 text-white text-sm py-1.5 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="animate-pulse">📞</span>
              <span className="font-semibold">Order Helpline:</span>
              <a href="tel:+919458353800" className="underline font-bold hover:text-green-200 transition-colors">94583 53800</a>
            </span>
            <span className="hidden sm:inline text-green-300">|</span>
            <a
              href="https://wa.me/919458353800?text=Hi%2C%20I%20want%20to%20order%20medicines"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 px-3 py-1 rounded-full text-xs font-semibold transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp Order
            </a>
            <span className="hidden sm:inline text-green-300">|</span>
            <span className="text-green-200 text-xs">🕐 9 AM - 9 PM, All Days</span>
          </div>
        </div>
        <Navbar />
        </header>
        <main className="pt-28">
          {page === 'home' && <HomePage />}
          {page === 'medicines' && <MedicinesPage />}
          {page === 'medicine-detail' && <MedicineDetailPage />}
          {page === 'cart' && <CartPage />}
          {page === 'checkout' && <CheckoutPage />}
          {page === 'login' && <LoginPage />}
          {page === 'register' && <RegisterPage />}
          {page === 'orders' && <OrdersPage />}
          {page === 'order-detail' && <OrderDetailPage />}
          {page === 'admin' && <AdminDashboard />}
          {page === 'admin-medicines' && <AdminMedicines />}
          {page === 'admin-orders' && <AdminOrders />}
          {page === 'admin-add-medicine' && <AdminAddMedicine />}
          {page === 'admin-inventory' && <AdminInventory />}
          {page === 'wishlist' && <WishlistPage />}
          {page === 'profile' && <ProfilePage />}
          {page === 'forgot-password' && <ForgotPasswordPage />}
          {page === 'reset-password' && <ResetPasswordPage token={resetToken} />}
        </main>
        <Footer />
      </div>
    </AppContext.Provider>
  )
}

// ── Download App Button ──────────────────────────────────────

function DownloadAppButton({ variant = 'default' }: { variant?: 'default' | 'small' }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); setCanInstall(true) }
    window.addEventListener('beforeinstallprompt', handler)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (!isStandalone) setCanInstall(true)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setCanInstall(false)
      setDeferredPrompt(null)
    } else {
      alert('To install this app:\n\n📱 iPhone/iPad:\n1. Tap the Share button (↑)\n2. Scroll down → "Add to Home Screen"\n3. Tap Add\n\n🤖 Android:\n1. Tap the ⋮ menu\n2. Tap "Install app" or "Add to Home Screen"')
    }
  }

  if (!canInstall) return null

  if (variant === 'small') {
    return (
      <button onClick={handleInstall} className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        Install App
      </button>
    )
  }

  return (
    <button onClick={handleInstall} className="px-4 py-2 bg-white text-green-700 text-sm font-semibold rounded-lg hover:bg-green-50 transition-colors flex items-center gap-2 shadow-sm">
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
      Download App
    </button>
  )
}

// ── Navbar ───────────────────────────────────────────────────

function Navbar() {
  const { page, setPage, user, setUser, cartCount, darkMode, setDarkMode } = useContext(AppContext)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // If already installed or iOS, still show the button with instructions
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (isStandalone) {
      setCanInstall(false)
    } else if (isIOS || !window.beforeinstallprompt) {
      setCanInstall(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setCanInstall(false)
      }
      setDeferredPrompt(null)
    } else {
      // iOS or unsupported — show instructions
      alert('To install this app:\n\n📱 iPhone/iPad:\n1. Tap the Share button (↑)\n2. Scroll down → "Add to Home Screen"\n3. Tap Add\n\n🤖 Android:\n1. Tap the ⋮ menu\n2. Tap "Install app" or "Add to Home Screen"')
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setPage('medicines')
    }
  }

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => setPage('home')} className="flex items-center gap-2 shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30 shadow-sm">
              <img src="/pmbjp-emblem.png" alt="JanAushadhiGenerix — PMBJP" className="h-11 w-11 object-contain" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-lg text-green-700 dark:text-green-400 leading-tight">JanAushadhiGenerix</span>
              <span className="text-[10px] block text-gray-500 dark:text-gray-400 -mt-1">Pradhan Mantri Bhartiya Janaushadhi Pariyojana</span>
            </div>
          </button>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search medicines, generic names..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </form>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <NavButton active={page === 'home'} onClick={() => setPage('home')}>Home</NavButton>
            <NavButton active={page === 'medicines'} onClick={() => setPage('medicines')}>Medicines</NavButton>

            {canInstall && (
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download App
              </button>
            )}

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {user ? (
              <>
                <button
                  onClick={() => setPage('cart')}
                  className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>

                {user.role === 'admin' && (
                  <NavButton active={page === 'admin'} onClick={() => setPage('admin')}>Admin</NavButton>
                )}

                <div className="relative group">
                  <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-700 dark:text-green-300 font-semibold text-sm">
                      {user.name?.[0] || 'U'}
                    </div>
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <button onClick={() => setPage('profile')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">My Profile</button>
                    <button onClick={() => setPage('orders')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">My Orders</button>
                    <button onClick={() => setPage('wishlist')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Wishlist</button>
                    <button onClick={() => { setUser(null); setPage('home') }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700">Logout</button>
                  </div>
                </div>
              </>
            ) : (
              <button onClick={() => setPage('login')} className="ml-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
                Login
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <button onClick={() => { setPage('home'); setMobileMenuOpen(false) }} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">Home</button>
            <button onClick={() => { setPage('medicines'); setMobileMenuOpen(false) }} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">Medicines</button>
            <button onClick={() => { handleInstall(); setMobileMenuOpen(false) }} className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download App
            </button>
            {user ? (
              <>
                <button onClick={() => { setPage('cart'); setMobileMenuOpen(false) }} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">Cart ({cartCount})</button>
                <button onClick={() => { setPage('orders'); setMobileMenuOpen(false) }} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">My Orders</button>
                <button onClick={() => { setPage('wishlist'); setMobileMenuOpen(false) }} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">Wishlist</button>
                {user.role === 'admin' && <button onClick={() => { setPage('admin'); setMobileMenuOpen(false) }} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">Admin Panel</button>}
                <button onClick={() => { setUser(null); setPage('home'); setMobileMenuOpen(false) }} className="block w-full text-left px-3 py-2 rounded-lg text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">Logout</button>
              </>
            ) : (
              <button onClick={() => { setPage('login'); setMobileMenuOpen(false) }} className="block w-full text-left px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium">Login</button>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
        active
          ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      )}
    >
      {children}
    </button>
  )
}

// ── Home Page ────────────────────────────────────────────────

function HomePage() {
  const { setPage, setSelectedMedicine } = useContext(AppContext)
  const [featured, setFeatured] = useState<Medicine[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api('/shop/featured'),
      api('/shop/categories'),
    ]).then(([meds, cats]) => {
      setFeatured(meds.medicines || [])
      setCategories(cats.categories || [])
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1 rounded-full text-sm mb-4">
              <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
              Pradhan Mantri Bhartiya Janaushadhi Pariyojana
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Quality Medicines at<br />
              <span className="text-yellow-300">Affordable Prices</span>
            </h1>
            <p className="text-lg text-green-100 mb-8">
              Up to 90% savings on branded medicines. All generic medicines are WHO-GMP certified
              and approved by DCGI.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setPage('medicines')} className="px-6 py-3 bg-white text-green-700 font-semibold rounded-lg hover:bg-green-50 transition-colors">
                Browse Medicines
              </button>
              <button onClick={() => setPage('medicines')} className="px-6 py-3 border-2 border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors">
                Upload Prescription
              </button>
            </div>
            <div className="flex gap-8 mt-10 text-center">
              <div>
                <p className="text-2xl font-bold">1000+</p>
                <p className="text-sm text-green-200">Medicines</p>
              </div>
              <div>
                <p className="text-2xl font-bold">Up to 90%</p>
                <p className="text-sm text-green-200">Savings</p>
              </div>
              <div>
                <p className="text-2xl font-bold">100%</p>
                <p className="text-sm text-green-200">Genuine</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Strip */}
      <section className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '✅', title: 'Genuine Medicines', desc: 'WHO-GMP certified' },
              { icon: '💰', title: 'Best Prices', desc: 'Up to 90% off MRP' },
              { icon: '🚚', title: 'Free Delivery', desc: 'On orders above ₹300' },
              { icon: '🔒', title: 'Secure Payment', desc: 'UPI, Cards, COD' },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <span className="text-2xl">{b.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{b.title}</p>
                  <p className="text-xs text-gray-500">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {/* Download App Banner */}
      <section className="bg-green-50 dark:bg-green-950/20 border-b border-green-200 dark:border-green-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📱</span>
              <div>
                <p className="text-sm font-semibold">Get the JanAushadhiGenerix App</p>
                <p className="text-xs text-gray-500">Install now for faster ordering & exclusive offers</p>
              </div>
            </div>
            <DownloadAppButton variant="small" />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Browse by Category</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Find medicines by health condition</p>
          </div>
          <button onClick={() => setPage('medicines')} className="text-green-600 dark:text-green-400 text-sm font-medium hover:underline">
            View All →
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setPage('medicines') }}
              className="group p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-green-300 dark:hover:border-green-700 hover:shadow-md transition-all text-center"
            >
              <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">{cat.icon}</span>
              <p className="font-medium text-sm">{cat.name}</p>
              {cat._count && (
                <p className="text-xs text-gray-500 mt-1">{cat._count.medicines} medicines</p>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Featured Medicines */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Featured Medicines</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Popular medicines at the best prices</p>
          </div>
          <button onClick={() => setPage('medicines')} className="text-green-600 dark:text-green-400 text-sm font-medium hover:underline">
            View All →
          </button>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
                <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featured.map(med => (
              <MedicineCard key={med.id} medicine={med} onClick={() => { setSelectedMedicine(med); setPage('medicine-detail') }} />
            ))}
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', icon: '🔍', title: 'Search', desc: 'Search for your medicine by name, generic name, or health condition' },
              { step: '2', icon: '📋', title: 'Upload Rx', desc: 'Upload your prescription for prescription medicines' },
              { step: '3', icon: '💳', title: 'Pay Securely', desc: 'Pay via UPI, cards, net banking or cash on delivery' },
              { step: '4', icon: '📦', title: 'Get Delivered', desc: 'Free delivery on orders above ₹300 to your doorstep' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center justify-center text-xl font-bold mx-auto mb-3">
                  {s.step}
                </div>
                <p className="text-2xl mb-2">{s.icon}</p>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Info */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 md:p-12 text-white">
          <div className="max-w-xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">About JanAushadhi Pariyojana</h2>
            <p className="text-green-100 mb-4">
              The Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP) is a campaign launched by the
              Department of Pharmaceuticals, Ministry of Chemicals & Fertilizers, Government of India.
            </p>
            <p className="text-green-100 mb-6">
              It provides quality generic medicines at affordable prices — up to 90% less than branded equivalents.
              All medicines are sourced from WHO-GMP certified manufacturers and undergo rigorous quality testing.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-lg text-sm">
                🏥 10,000+ Janaushadhi Kendras
              </div>
              <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-lg text-sm">
                💊 2,000+ Medicines
              </div>
              <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-lg text-sm">
                🏭 300+ Surgical Products
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Product Showcase Carousel */}
      <ProductShowcase />

    </div>
  )
}

// ── Product Showcase (Flashing Carousel) ──────────────────

function ProductShowcase() {
  const { setPage, setSelectedMedicine } = useContext(AppContext)
  const [products, setProducts] = useState<Medicine[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/shop/featured').then(d => {
      const meds = d.medicines || []
      setProducts(meds)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (products.length === 0) return
    const timer = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % products.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [products.length])

  if (loading || products.length === 0) return null

  const visibleCount = 6
  const getVisibleProducts = () => {
    const visible = []
    for (let i = 0; i < visibleCount; i++) {
      visible.push(products[(activeIdx + i) % products.length])
    }
    return visible
  }

  const categoryImages: Record<string, { bg: string; emoji: string }> = {
    analgesics: { bg: 'from-blue-400 to-blue-600', emoji: '💊' },
    antibiotics: { bg: 'from-red-400 to-red-600', emoji: '💉' },
    cardiovascular: { bg: 'from-pink-400 to-rose-600', emoji: '❤️' },
    diabetes: { bg: 'from-orange-400 to-amber-600', emoji: '🩺' },
    antacids: { bg: 'from-teal-400 to-teal-600', emoji: '🫁' },
    vitamins: { bg: 'from-yellow-400 to-yellow-600', emoji: '✨' },
    respiratory: { bg: 'from-cyan-400 to-cyan-600', emoji: '🫁' },
    dermatology: { bg: 'from-purple-400 to-purple-600', emoji: '🧴' },
    musculoskeletal: { bg: 'from-green-400 to-green-600', emoji: '🦴' },
    pediatrics: { bg: 'from-indigo-400 to-indigo-600', emoji: '👶' },
  }

  const getCatStyle = (slug: string) => categoryImages[slug] || { bg: 'from-green-400 to-green-600', emoji: '💊' }

  return (
    <section className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">Our Products</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Quality medicines at affordable prices</p>
          {/* Flashing dots indicator */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {products.slice(0, Math.min(products.length, 20)).map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-300',
                  i === activeIdx % Math.min(products.length, 20)
                    ? 'bg-green-600 w-6'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                )}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {getVisibleProducts().map((med, i) => {
            const catStyle = getCatStyle(med.category?.slug || '')
            return (
              <div
                key={`${med.id}-${activeIdx}-${i}`}
                onClick={() => { setSelectedMedicine(med); setPage('medicine-detail'); window.scrollTo(0, 0) }}
                className={cn(
                  'group cursor-pointer rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all duration-500',
                  i === 0 ? 'ring-2 ring-green-400 dark:ring-green-600' : ''
                )}
              >
                <div className={cn(
                  'h-32 flex items-center justify-center bg-gradient-to-br transition-all duration-700 overflow-hidden',
                  catStyle.bg,
                  i === 0 ? 'opacity-100 scale-100' : 'opacity-80 scale-95'
                )}>
                  {med.imageUrl ? (
                    <img src={med.imageUrl} alt={med.name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <span className={cn(
                      'text-4xl transition-all duration-700',
                      i === 0 ? 'animate-bounce' : 'group-hover:scale-110'
                    )}>
                      {catStyle.emoji}
                    </span>
                  )}
                </div>
                <div className="p-3 bg-white dark:bg-gray-900">
                  <p className="text-[10px] text-green-600 dark:text-green-400 font-medium truncate">{med.genericName}</p>
                  <h4 className="text-xs font-semibold mt-0.5 line-clamp-2 group-hover:text-green-600 transition-colors">{med.name}</h4>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-green-700 dark:text-green-400">₹{med.sellingPrice.toFixed(0)}</span>
                    {med.discount > 0 && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">{med.discount}% OFF</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => setPage('medicines')}
            className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            View All {products.length}+ Medicines →
          </button>
        </div>
      </div>
    </section>
  )
}

// ── Medicine Card ────────────────────────────────────────────

function MedicineCard({ medicine: med, onClick }: { medicine: Medicine; onClick: () => void }) {
  const { user, refreshCart } = useContext(AppContext)
  const [adding, setAdding] = useState(false)

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return
    setAdding(true)
    try {
      await api('/cart/add', { method: 'POST', body: JSON.stringify({ userId: user.id, medicineId: med.id }) })
      refreshCart()
    } finally {
      setAdding(false)
    }
  }

  return (
    <div onClick={onClick} className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:shadow-lg hover:border-green-200 dark:hover:border-green-800 transition-all cursor-pointer">
      {/* Image */}
      <div className="h-40 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 flex items-center justify-center relative overflow-hidden">
        {med.imageUrl ? (
          <img src={med.imageUrl} alt={med.name} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <span className="text-5xl opacity-60">💊</span>
        )}
        {med.discount > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {med.discount}% OFF
          </span>
        )}
        {med.prescriptionRequired && (
          <span className="absolute top-2 right-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Rx
          </span>
        )}
      </div>

      <div className="p-4">
        <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">{med.genericName}</p>
        <h3 className="font-semibold text-sm mb-1 line-clamp-1 group-hover:text-green-600 transition-colors">{med.name}</h3>
        <p className="text-xs text-gray-500 mb-2">{med.manufacturer}</p>
        <p className="text-xs text-gray-400 mb-3">{med.packSize}</p>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-bold text-green-700 dark:text-green-400">₹{med.sellingPrice.toFixed(2)}</span>
          {med.mrp > med.sellingPrice && (
            <span className="text-sm text-gray-400 line-through">₹{med.mrp.toFixed(2)}</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-yellow-500 text-xs">★</span>
            <span className="text-xs text-gray-500">{med.rating} ({med.reviewCount})</span>
          </div>
          {user ? (
            <button
              onClick={handleAddToCart}
              disabled={adding || med.stockQuantity <= 0}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                med.stockQuantity <= 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              )}
            >
              {med.stockQuantity <= 0 ? 'Out of Stock' : adding ? 'Adding...' : 'Add to Cart'}
            </button>
          ) : (
            <span className="text-xs text-gray-400">Login to buy</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Medicines Page ───────────────────────────────────────────

function MedicinesPage() {
  const { setSelectedMedicine, setPage } = useContext(AppContext)
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [sort, setSort] = useState('name')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    api('/shop/categories').then(d => setCategories(d.categories || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ sort, limit: '50' })
    if (searchQuery) params.set('q', searchQuery)
    if (selectedCategory) params.set('category', selectedCategory)

    api(`/shop/search?${params}`).then(d => {
      setMedicines(d.medicines || [])
      setTotal(d.total || 0)
    }).finally(() => setLoading(false))
  }, [sort, selectedCategory, searchQuery])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sticky top-20">
            <h3 className="font-semibold mb-4">Filters</h3>

            <div className="mb-6">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 block mb-2">Search</label>
              <input
                type="text"
                placeholder="Medicine name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            <div className="mb-6">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 block mb-2">Category</label>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={cn('block w-full text-left px-3 py-1.5 text-sm rounded-lg', !selectedCategory ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-800')}
                >
                  All Categories
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={cn('block w-full text-left px-3 py-1.5 text-sm rounded-lg', selectedCategory === cat.slug ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-800')}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 block mb-2">Sort By</label>
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none"
              >
                <option value="name">Name (A-Z)</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="discount">Highest Discount</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              {total} medicines found {selectedCategory && `in ${categories.find(c => c.slug === selectedCategory)?.name}`}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
                  <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : medicines.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">🔍</p>
              <h3 className="text-lg font-semibold mb-2">No medicines found</h3>
              <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {medicines.map(med => (
                <MedicineCard
                  key={med.id}
                  medicine={med}
                  onClick={() => { setSelectedMedicine(med); setPage('medicine-detail') }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Medicine Detail Page ─────────────────────────────────────

function MedicineDetailPage() {
  const { selectedMedicine: med, setPage, user, refreshCart, setSelectedMedicine } = useContext(AppContext)
  const [quantity, setQuantity] = useState(1)
  const [similar, setSimilar] = useState<Medicine[]>([])
  const [adding, setAdding] = useState(false)
  const [activeTab, setActiveTab] = useState('description')

  useEffect(() => {
    if (med) {
      api(`/shop/medicine/${med.slug}`).then(d => {
        if (d.similar) setSimilar(d.similar)
      })
    }
  }, [med])

  if (!med) return <div className="max-w-7xl mx-auto px-4 py-20 text-center"><p>Medicine not found</p></div>

  const handleAddToCart = async () => {
    if (!user) { setPage('login'); return }
    setAdding(true)
    try {
      for (let i = 0; i < quantity; i++) {
        await api('/cart/add', { method: 'POST', body: JSON.stringify({ userId: user.id, medicineId: med.id }) })
      }
      refreshCart()
    } finally {
      setAdding(false)
    }
  }

  const savings = (med.mrp - med.sellingPrice) * quantity

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <button onClick={() => setPage('home')} className="hover:text-green-600">Home</button>
        <span>/</span>
        <button onClick={() => setPage('medicines')} className="hover:text-green-600">Medicines</button>
        <span>/</span>
        <span className="text-gray-800 dark:text-gray-200">{med.name}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Image */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-2xl p-8 flex items-center justify-center min-h-[300px] overflow-hidden">
          {med.imageUrl ? (
            <img src={med.imageUrl} alt={med.name} className="max-w-full max-h-[280px] object-contain" />
          ) : (
            <span className="text-[120px] opacity-50">💊</span>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            {med.prescriptionRequired && (
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium px-2 py-0.5 rounded-full">Prescription Required</span>
            )}
            {med.discount > 0 && (
              <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium px-2 py-0.5 rounded-full">{med.discount}% OFF</span>
            )}
          </div>

          <p className="text-green-600 dark:text-green-400 text-sm font-medium mb-1">{med.genericName}</p>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{med.name}</h1>
          <p className="text-gray-500 text-sm mb-4">by {med.manufacturer} • {med.packSize}</p>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
              <span className="text-yellow-500">★</span>
              <span className="text-sm font-medium">{med.rating}</span>
            </div>
            <span className="text-sm text-gray-500">({med.reviewCount} reviews)</span>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-green-700 dark:text-green-400">₹{med.sellingPrice.toFixed(2)}</span>
              {med.mrp > med.sellingPrice && (
                <>
                  <span className="text-lg text-gray-400 line-through">₹{med.mrp.toFixed(2)}</span>
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                    You save ₹{savings.toFixed(2)}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Inclusive of all taxes</p>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Composition: <span className="font-medium text-gray-800 dark:text-gray-200">{med.composition}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Stock: <span className={cn('font-medium', med.stockQuantity > 0 ? 'text-green-600' : 'text-red-500')}>
                {med.stockQuantity > 0 ? `${med.stockQuantity} units available` : 'Out of stock'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-l-lg"
              >
                −
              </button>
              <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-r-lg"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={adding || med.stockQuantity <= 0}
              className={cn(
                'flex-1 py-3 rounded-lg font-semibold text-sm transition-colors',
                med.stockQuantity <= 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              )}
            >
              {med.stockQuantity <= 0 ? 'Out of Stock' : adding ? 'Adding...' : 'Add to Cart'}
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">✓ 100% Genuine</span>
            <span className="flex items-center gap-1">✓ Free Delivery ₹300+</span>
            <span className="flex items-center gap-1">✓ Secure Payment</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 mb-12">
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {['description', 'dosage', 'sideEffects', 'benefits'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-6 py-3 text-sm font-medium capitalize border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.replace(/([A-Z])/g, ' $1')}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'description' && <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{med.description || 'No description available.'}</p>}
          {activeTab === 'dosage' && <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{med.dosageInfo || 'Dosage information not available.'}</p>}
          {activeTab === 'sideEffects' && <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{med.sideEffects || 'No known side effects at recommended doses.'}</p>}
          {activeTab === 'benefits' && <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{med.benefits || 'Benefits information not available.'}</p>}
        </div>
      </div>

      {/* Similar Medicines */}
      {similar.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-6">Similar Medicines</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {similar.map(s => (
              <MedicineCard
                key={s.id}
                medicine={s}
                onClick={() => { setSelectedMedicine(s); window.scrollTo(0, 0) }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Cart Page ────────────────────────────────────────────────

function CartPage() {
  const { user, cart, refreshCart, setPage } = useContext(AppContext)
  const [updating, setUpdating] = useState<string | null>(null)

  if (!user) return <AuthRequired message="Please login to view your cart" />

  const subtotal = cart.reduce((sum, item) => sum + item.medicine.sellingPrice * item.quantity, 0)
  const deliveryCharge = subtotal >= 300 ? 0 : 40
  const gstAmount = subtotal * 0.12
  const total = subtotal + gstAmount + deliveryCharge

  const updateQuantity = async (medicineId: string, quantity: number) => {
    setUpdating(medicineId)
    try {
      await api('/cart/update', { method: 'POST', body: JSON.stringify({ userId: user.id, medicineId, quantity }) })
      refreshCart()
    } finally {
      setUpdating(null)
    }
  }

  const removeItem = async (medicineId: string) => {
    await api('/cart/remove', { method: 'POST', body: JSON.stringify({ userId: user.id, medicineId }) })
    refreshCart()
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">🛒</p>
        <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Add medicines to get started</p>
        <button onClick={() => setPage('medicines')} className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">
          Browse Medicines
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Shopping Cart ({cart.length} items)</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map(item => (
            <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex gap-4">
              <div className="w-16 h-16 bg-green-50 dark:bg-green-950/30 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-2xl">💊</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-green-600 dark:text-green-400">{item.medicine.genericName}</p>
                <h3 className="font-medium text-sm">{item.medicine.name}</h3>
                <p className="text-xs text-gray-500">{item.medicine.manufacturer} • {item.medicine.packSize}</p>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-lg">
                      <button onClick={() => updateQuantity(item.medicineId, item.quantity - 1)} className="px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-l-lg">−</button>
                      <span className="px-3 py-1 text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.medicineId, item.quantity + 1)} className="px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-r-lg">+</button>
                    </div>
                    {updating === item.medicineId && <span className="text-xs text-gray-400">Updating...</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-green-700 dark:text-green-400">₹{(item.medicine.sellingPrice * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeItem(item.medicineId)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 sticky top-20">
            <h3 className="font-semibold mb-4">Order Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal ({cart.length} items)</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">GST (12%)</span>
                <span>₹{gstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Delivery</span>
                <span className={deliveryCharge === 0 ? 'text-green-600 font-medium' : ''}>
                  {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
                </span>
              </div>
              {deliveryCharge > 0 && (
                <p className="text-xs text-green-600">Add ₹{(300 - subtotal).toFixed(2)} more for free delivery</p>
              )}
              <div className="border-t border-gray-200 dark:border-gray-800 pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-green-700 dark:text-green-400">₹{total.toFixed(2)}</span>
              </div>
            </div>
            <button onClick={() => setPage('checkout')} className="w-full mt-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors">
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Checkout Page ────────────────────────────────────────────

function CheckoutPage() {
  const { user, cart, setPage, refreshCart } = useContext(AppContext)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponError, setCouponError] = useState('')
  const [placing, setPlacing] = useState(false)
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [newAddress, setNewAddress] = useState({ name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', type: 'home' })
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [checkoutPhone, setCheckoutPhone] = useState('')
  const [checkoutOtp, setCheckoutOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')

  useEffect(() => {
    if (user) {
      api(`/addresses/${user.id}`).then(d => {
        const addrs = d.addresses || []
        setAddresses(addrs)
        if (addrs.length > 0) setSelectedAddress(addrs[0])
      })
    }
  }, [user])

  useEffect(() => {
    if (otpTimer > 0) {
      const t = setTimeout(() => setOtpTimer(otpTimer - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [otpTimer])

  if (!user) return <AuthRequired message="Please login to checkout" />
  if (cart.length === 0) { setPage('cart'); return null }

  const subtotal = cart.reduce((sum, item) => sum + item.medicine.sellingPrice * item.quantity, 0)
  const discount = appliedCoupon?.discountAmount || 0
  const deliveryCharge = subtotal >= 300 ? 0 : 40
  const taxableAmount = subtotal - discount
  const gstAmount = taxableAmount * 0.12
  const total = taxableAmount + gstAmount + deliveryCharge

  const validateCoupon = async () => {
    setCouponError('')
    try {
      const res = await api('/coupons/validate', { method: 'POST', body: JSON.stringify({ code: couponCode, subtotal }) })
      if (res.error) { setCouponError(res.error); return }
      setAppliedCoupon(res.coupon)
    } catch {
      setCouponError('Invalid coupon code')
    }
  }

  const placeOrder = async () => {
    if (!selectedAddress) return
    setPlacing(true)
    try {
      const res = await api('/orders/create', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          addressId: selectedAddress.id,
          paymentMethod,
          couponCode: appliedCoupon?.code,
        }),
      })
      if (res.error) return
      refreshCart()
      setPage('orders')
    } finally {
      setPlacing(false)
    }
  }

  const addAddress = async () => {
    const res = await api('/addresses', {
      method: 'POST',
      body: JSON.stringify({ ...newAddress, userId: user.id }),
    })
    if (res.address) {
      setAddresses(prev => [...prev, res.address])
      setSelectedAddress(res.address)
      setShowAddAddress(false)
      setNewAddress({ name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', type: 'home' })
    }
  }

  const handleSendCheckoutOtp = async () => {
    setOtpError('')
    if (!checkoutPhone || checkoutPhone.length < 10) { setOtpError('Enter a valid 10-digit phone number'); return }
    setOtpLoading(true)
    try {
      const res = await api('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone: checkoutPhone, purpose: 'checkout' }) })
      if (res.error) { setOtpError(res.error); return }
      setOtpSent(true)
      setOtpTimer(30)
    } catch {
      setOtpError('Failed to send OTP.')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyCheckoutOtp = async () => {
    setOtpError('')
    if (!checkoutOtp || checkoutOtp.length !== 6) { setOtpError('Enter the 6-digit OTP'); return }
    setOtpLoading(true)
    try {
      const res = await api('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone: checkoutPhone, otp: checkoutOtp, purpose: 'checkout' }) })
      if (res.error) { setOtpError(res.error); return }
      if (res.verified) {
        setPhoneVerified(true)
        setShowOtpModal(false)
        placeOrder()
      }
    } catch {
      setOtpError('Verification failed.')
    } finally {
      setOtpLoading(false)
    }
  }

  const handlePlaceOrderClick = () => {
    if (phoneVerified) {
      placeOrder()
    } else {
      const phone = selectedAddress?.phone || user.phone || ''
      setCheckoutPhone(phone.replace(/\D/g, '').slice(-10))
      setShowOtpModal(true)
      setOtpSent(false)
      setCheckoutOtp('')
      setOtpError('')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Address Selection */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Delivery Address</h2>
              <button onClick={() => setShowAddAddress(!showAddAddress)} className="text-sm text-green-600 dark:text-green-400 hover:underline">
                + Add New
              </button>
            </div>

            {showAddAddress && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Full Name" value={newAddress.name} onChange={e => setNewAddress(p => ({...p, name: e.target.value}))} className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800" />
                  <input placeholder="Phone" value={newAddress.phone} onChange={e => setNewAddress(p => ({...p, phone: e.target.value}))} className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800" />
                </div>
                <input placeholder="Address Line 1" value={newAddress.line1} onChange={e => setNewAddress(p => ({...p, line1: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800" />
                <input placeholder="Address Line 2 (optional)" value={newAddress.line2} onChange={e => setNewAddress(p => ({...p, line2: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800" />
                <div className="grid grid-cols-3 gap-3">
                  <input placeholder="City" value={newAddress.city} onChange={e => setNewAddress(p => ({...p, city: e.target.value}))} className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800" />
                  <input placeholder="State" value={newAddress.state} onChange={e => setNewAddress(p => ({...p, state: e.target.value}))} className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800" />
                  <input placeholder="Pincode" value={newAddress.pincode} onChange={e => setNewAddress(p => ({...p, pincode: e.target.value}))} className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800" />
                </div>
                <button onClick={addAddress} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">Save Address</button>
              </div>
            )}

            <div className="space-y-3">
              {addresses.map(addr => (
                <label key={addr.id} className={cn('flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                  selectedAddress?.id === addr.id ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                )}>
                  <input type="radio" name="address" checked={selectedAddress?.id === addr.id} onChange={() => setSelectedAddress(addr)} className="mt-1" />
                  <div>
                    <p className="font-medium text-sm">{addr.name} <span className="text-xs text-gray-500 ml-2">{addr.type}</span></p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{addr.city}, {addr.state} - {addr.pincode}</p>
                    <p className="text-xs text-gray-500 mt-1">Phone: {addr.phone}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="font-semibold mb-4">Payment Method</h2>
            <div className="space-y-3">
              {[
                { id: 'upi', label: 'UPI', desc: 'Google Pay, PhonePe, Paytm' },
                { id: 'card', label: 'Credit/Debit Card', desc: 'Visa, Mastercard, RuPay' },
                { id: 'netbanking', label: 'Net Banking', desc: 'All major banks' },
                { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when you receive' },
              ].map(method => (
                <label key={method.id} className={cn('flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  paymentMethod === method.id ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                )}>
                  <input type="radio" name="payment" checked={paymentMethod === method.id} onChange={() => setPaymentMethod(method.id)} />
                  <div>
                    <p className="font-medium text-sm">{method.label}</p>
                    <p className="text-xs text-gray-500">{method.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Phone Verification Status */}
          {phoneVerified && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4 flex items-center gap-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-400">Phone Verified</p>
                <p className="text-xs text-green-600 dark:text-green-500">+91 {checkoutPhone} — verified for checkout</p>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 sticky top-20">
            <h3 className="font-semibold mb-4">Order Summary</h3>

            <div className="max-h-48 overflow-y-auto space-y-3 mb-4">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 bg-green-50 dark:bg-green-950/30 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-sm">💊</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{item.medicine.name}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <span className="text-xs font-medium">₹{(item.medicine.sellingPrice * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Coupon */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800"
                />
                <button onClick={validateCoupon} className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">Apply</button>
              </div>
              {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
              {appliedCoupon && (
                <div className="mt-2 flex items-center justify-between bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                  <span className="text-xs text-green-700 dark:text-green-400">{appliedCoupon.code} applied!</span>
                  <button onClick={() => { setAppliedCoupon(null); setCouponCode('') }} className="text-xs text-red-500">Remove</button>
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm border-t border-gray-200 dark:border-gray-800 pt-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">GST (12%)</span>
                <span>₹{gstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Delivery</span>
                <span className={deliveryCharge === 0 ? 'text-green-600 font-medium' : ''}>
                  {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-800 pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-green-700 dark:text-green-400">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrderClick}
              disabled={placing || !selectedAddress}
              className="w-full mt-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {placing ? 'Placing Order...' : phoneVerified ? 'Place Order' : 'Verify Phone & Place Order'}
            </button>

            <p className="text-[10px] text-gray-400 text-center mt-3">
              By placing this order, you agree to our terms and conditions.
            </p>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-2xl mx-auto mb-3">📱</div>
              <h2 className="text-xl font-bold">Verify Phone Number</h2>
              <p className="text-sm text-gray-500 mt-1">Enter OTP to confirm your order</p>
            </div>

            {!otpSent ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Phone Number</label>
                  <div className="flex gap-2">
                    <span className="px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 shrink-0">+91</span>
                    <input
                      type="tel"
                      value={checkoutPhone}
                      onChange={e => setCheckoutPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="98765 43210"
                      className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>
                </div>
                {otpError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{otpError}</p>}
                <button onClick={handleSendCheckoutOtp} disabled={otpLoading || checkoutPhone.length < 10} className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {otpLoading ? 'Sending...' : 'Send OTP'}
                </button>
                <button onClick={() => setShowOtpModal(false)} className="w-full text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  <p className="text-sm text-green-700 dark:text-green-400">OTP sent to +91 {checkoutPhone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Enter 6-digit OTP</label>
                  <input
                    type="text"
                    value={checkoutOtp}
                    onChange={e => setCheckoutOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none text-center text-2xl tracking-[0.5em] font-mono"
                    maxLength={6}
                    autoFocus
                  />
                </div>
                {otpError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{otpError}</p>}
                <button onClick={handleVerifyCheckoutOtp} disabled={otpLoading || checkoutOtp.length !== 6} className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {otpLoading ? 'Verifying...' : 'Verify & Place Order'}
                </button>
                <div className="text-center">
                  {otpTimer > 0 ? (
                    <p className="text-sm text-gray-500">Resend OTP in {otpTimer}s</p>
                  ) : (
                    <button onClick={handleSendCheckoutOtp} disabled={otpLoading} className="text-sm text-green-600 dark:text-green-400 font-medium hover:underline">
                      Resend OTP
                    </button>
                  )}
                </div>
                <button onClick={() => { setShowOtpModal(false); setOtpSent(false) }} className="w-full text-sm text-gray-500 hover:text-gray-700">← Change phone number</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Auth Pages ───────────────────────────────────────────────

function LoginPage() {
  const { setUser, setPage } = useContext(AppContext)
  const [loginMode, setLoginMode] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (otpTimer > 0) {
      const t = setTimeout(() => setOtpTimer(otpTimer - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [otpTimer])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      if (res.error) { setError(res.error); return }
      setUser(res.user)
      setPage(res.user.role === 'admin' ? 'admin' : 'home')
    } catch {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async () => {
    setError('')
    if (!phone || phone.length < 10) { setError('Enter a valid 10-digit phone number'); return }
    setOtpLoading(true)
    try {
      const res = await api('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone, purpose: 'login' }) })
      if (res.error) { setError(res.error); return }
      setOtpSent(true)
      setOtpTimer(30)
      // Dev mode: capture OTP from response if available
      if (res.otp) setOtp(res.otp)
    } catch {
      setError('Failed to send OTP. Try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!otp || otp.length !== 6) { setError('Enter the 6-digit OTP'); return }
    setLoading(true)
    try {
      const res = await api('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp, purpose: 'login' }) })
      if (res.error) { setError(res.error); return }
      if (res.user) {
        setUser(res.user)
        setPage(res.user.role === 'admin' ? 'admin' : 'home')
      }
    } catch {
      setError('Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg p-8">
          <div className="text-center mb-8">
            <img src="/pmbjp-emblem.png" alt="Jan Aushadhi" className="w-14 h-14 mx-auto mb-3 rounded-lg object-contain" />
            <h1 className="text-xl font-bold">Welcome Back</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to JanAushadhiGenerix</p>
          </div>

          {/* Login Mode Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6">
            <button
              onClick={() => { setLoginMode('email'); setError(''); setOtpSent(false); setOtp('') }}
              className={cn('flex-1 py-2 text-sm font-medium rounded-md transition-colors', loginMode === 'email' ? 'bg-white dark:bg-gray-900 shadow-sm text-green-700 dark:text-green-400' : 'text-gray-500')}
            >
              📧 Email Login
            </button>
            <button
              onClick={() => { setLoginMode('otp'); setError('') }}
              className={cn('flex-1 py-2 text-sm font-medium rounded-md transition-colors', loginMode === 'otp' ? 'bg-white dark:bg-gray-900 shadow-sm text-green-700 dark:text-green-400' : 'text-gray-500')}
            >
              📱 OTP Login
            </button>
          </div>

          {loginMode === 'email' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end -mt-2">
                <button
                  type="button"
                  onClick={() => setPage('forgot-password')}
                  className="text-sm text-green-700 dark:text-green-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={otpSent ? handleVerifyOtp : (e) => { e.preventDefault(); handleSendOtp() }} className="space-y-4">
              {!otpSent ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Phone Number</label>
                    <div className="flex gap-2">
                      <span className="px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 shrink-0">+91</span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="98765 43210"
                        className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">OTP will be sent for verification</p>
                  </div>

                  {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

                  <button
                    type="submit"
                    disabled={otpLoading || phone.length < 10}
                    className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {otpLoading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </>
              ) : (
                <>
                  <div className="text-center bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <p className="text-sm text-green-700 dark:text-green-400">OTP sent to +91 {phone}</p>
                  </div>
                  {/* Dev mode: show OTP if returned in response */}
                  {otp && (
                    <div className="text-center bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2">
                      <p className="text-xs text-yellow-700 dark:text-yellow-400">ℹ️ Dev mode: Your OTP is <strong>{otp}</strong></p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Enter 6-digit OTP</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none text-center text-2xl tracking-[0.5em] font-mono"
                      maxLength={6}
                      autoFocus
                      required
                    />
                  </div>

                  {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                  </button>

                  <div className="text-center">
                    {otpTimer > 0 ? (
                      <p className="text-sm text-gray-500">Resend OTP in {otpTimer}s</p>
                    ) : (
                      <button type="button" onClick={handleSendOtp} disabled={otpLoading} className="text-sm text-green-600 dark:text-green-400 font-medium hover:underline">
                        {otpLoading ? 'Sending...' : 'Resend OTP'}
                      </button>
                    )}
                  </div>

                  <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setError('') }} className="w-full text-sm text-gray-500 hover:text-gray-700">
                    ← Change phone number
                  </button>
                </>
              )}
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <button onClick={() => setPage('register')} className="text-green-600 dark:text-green-400 font-medium hover:underline">
                Sign Up
              </button>
            </p>
          </div>

          <div className="mt-6 border-t border-gray-200 dark:border-gray-800 pt-4">
            <p className="text-xs text-gray-400 text-center mb-3">Demo Accounts</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setLoginMode('email'); setEmail('demo@example.com'); setPassword('customer123') }}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span className="font-medium block">Customer</span>
                <span className="text-gray-500">demo@example.com</span>
              </button>
              <button
                onClick={() => { setLoginMode('email'); setEmail('admin@janaushadhi.gov.in'); setPassword('admin123') }}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span className="font-medium block">Admin</span>
                <span className="text-gray-500">admin@janaushadhi.gov.in</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ForgotPasswordPage() {
  const { setPage } = useContext(AppContext)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const res = await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
      if (res.error) { setError(res.error); return }
      setMessage(res.message || 'If that account exists, a reset link has been sent.')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg p-8">
          <div className="text-center mb-8">
            <img src="/pmbjp-emblem.png" alt="Jan Aushadhi" className="w-14 h-14 mx-auto mb-3 rounded-lg object-contain" />
            <h1 className="text-xl font-bold">Forgot Password</h1>
            <p className="text-sm text-gray-500 mt-1">We'll email you a reset link</p>
          </div>

          {message ? (
            <div className="text-center">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-700 dark:text-green-400">{message}</p>
              </div>
              <button onClick={() => setPage('login')} className="text-sm text-green-700 dark:text-green-400 hover:underline">Back to sign in</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  required
                />
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>

              <button type="button" onClick={() => setPage('login')} className="w-full text-sm text-gray-500 hover:underline">Back to sign in</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function ResetPasswordPage({ token }: { token: string | null }) {
  const { setPage } = useContext(AppContext)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!token) { setError('Missing reset token. Open the link from your email again.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      const res = await api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) })
      if (res.error) { setError(res.error); return }
      setMessage(res.message || 'Password updated. You can now sign in.')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg p-8">
          <div className="text-center mb-8">
            <img src="/pmbjp-emblem.png" alt="Jan Aushadhi" className="w-14 h-14 mx-auto mb-3 rounded-lg object-contain" />
            <h1 className="text-xl font-bold">Set New Password</h1>
            <p className="text-sm text-gray-500 mt-1">Choose a new password for your account</p>
          </div>

          {message ? (
            <div className="text-center">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-700 dark:text-green-400">{message}</p>
              </div>
              <button type="button" onClick={() => { setPage('login') }} className="text-sm text-green-700 dark:text-green-400 hover:underline">Back to sign in</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!token && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">No reset token found. Open the link sent to your email.</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  required
                />
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Updating...' : 'Update password'}
              </button>

              <button type="button" onClick={() => setPage('login')} className="w-full text-sm text-gray-500 hover:underline">Back to sign in</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function RegisterPage() {
  const { setUser, setPage } = useContext(AppContext)
  const [regMode, setRegMode] = useState<'email' | 'phone'>('email')
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  useEffect(() => {
    if (otpTimer > 0) {
      const t = setTimeout(() => setOtpTimer(otpTimer - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [otpTimer])

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Full name is required'); return }
    if (!form.email.trim()) { setError('Email is required'); return }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    try {
      const res = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, phone: form.phone || undefined }),
      })
      if (res.error) { setError(res.error); return }
      if (res.user) {
        setUser(res.user)
        setRegistered(true)
      }
    } catch {
      setError('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const validateAndSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Full name is required'); return }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (!form.phone || form.phone.replace(/\D/g, '').length < 10) { setError('Valid phone number is required'); return }

    setLoading(true)
    try {
      const res = await api('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone: form.phone, purpose: 'register' }) })
      if (res.error) { setError(res.error); return }
      setOtpSent(true)
      setStep('otp')
      setOtpTimer(30)
    } catch {
      setError('Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!otp || otp.length !== 6) { setError('Enter the 6-digit OTP'); return }

    setLoading(true)
    try {
      const res = await api('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: form.phone, otp, purpose: 'register', name: form.name, email: form.email, password: form.password }),
      })
      if (res.error) { setError(res.error); return }
      if (res.user) {
        setUser(res.user)
        setRegistered(true)
      }
    } catch {
      setError('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await api('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone: form.phone, purpose: 'register' }) })
      if (res.error) { setError(res.error); return }
      setOtpTimer(30)
    } catch {
      setError('Failed to resend OTP.')
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string) => setForm(p => ({...p, [field]: value}))

  if (registered) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-3xl mx-auto mb-4">🎉</div>
            <h1 className="text-xl font-bold mb-2">Account Created!</h1>
            <p className="text-sm text-gray-500 mb-6">Welcome to JanAushadhiGenerix, {form.name}!</p>
            <button onClick={() => setPage('home')} className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors">
              Start Shopping →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg p-8">
          <div className="text-center mb-6">
            <img src="/pmbjp-emblem.png" alt="Jan Aushadhi" className="w-14 h-14 mx-auto mb-3 rounded-lg object-contain" />
            <h1 className="text-xl font-bold">
              {step === 'otp' ? 'Verify Phone Number' : 'Create Account'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {step === 'otp' ? `OTP sent to +91 ${form.phone}` : 'Join JanAushadhiGenerix — order medicines easily'}
            </p>
          </div>

          {/* Registration Mode Tabs (only on form step) */}
          {step === 'form' && (
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6">
              <button
                onClick={() => { setRegMode('email'); setError('') }}
                className={cn('flex-1 py-2 text-sm font-medium rounded-md transition-colors', regMode === 'email' ? 'bg-white dark:bg-gray-900 shadow-sm text-green-700 dark:text-green-400' : 'text-gray-500')}
              >
                📧 Email & Password
              </button>
              <button
                onClick={() => { setRegMode('phone'); setError('') }}
                className={cn('flex-1 py-2 text-sm font-medium rounded-md transition-colors', regMode === 'phone' ? 'bg-white dark:bg-gray-900 shadow-sm text-green-700 dark:text-green-400' : 'text-gray-500')}
              >
                📱 Phone + OTP
              </button>
            </div>
          )}

          {/* Step Indicator */}
          {regMode === 'phone' && (
            <div className="flex items-center gap-2 mb-6">
              <div className={cn('flex-1 h-1 rounded-full', step === 'form' ? 'bg-green-600' : 'bg-green-600')} />
              <div className={cn('flex-1 h-1 rounded-full', step === 'otp' ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700')} />
            </div>
          )}

          {/* ── EMAIL REGISTRATION ── */}
          {step === 'form' && regMode === 'email' && (
            <form onSubmit={handleEmailRegister} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Full Name</label>
                <input type="text" value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Rajesh Kumar" className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Email Address</label>
                <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="you@example.com" className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Phone Number <span className="text-gray-400 font-normal">(optional)</span></label>
                <div className="flex gap-2">
                  <span className="px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 shrink-0">+91</span>
                  <input type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Password</label>
                <input type="password" value={form.password} onChange={e => updateField('password', e.target.value)} placeholder="Min. 6 characters" className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Confirm Password</label>
                <input type="password" value={form.confirmPassword} onChange={e => updateField('confirmPassword', e.target.value)} placeholder="Re-enter password" className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none" required />
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

              <button type="submit" disabled={loading} className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          )}

          {/* ── PHONE + OTP REGISTRATION ── */}
          {step === 'form' && regMode === 'phone' && (
            <form onSubmit={validateAndSendOtp} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Full Name</label>
                <input type="text" value={form.name} onChange={e => updateField('name', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Phone Number</label>
                <div className="flex gap-2">
                  <span className="px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 shrink-0">+91</span>
                  <input type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none" required />
                </div>
                <p className="text-xs text-gray-400 mt-1">We'll send an OTP to verify your number</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Password</label>
                <input type="password" value={form.password} onChange={e => updateField('password', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Confirm Password</label>
                <input type="password" value={form.confirmPassword} onChange={e => updateField('confirmPassword', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none" required />
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

              <button type="submit" disabled={loading} className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
                {loading ? 'Sending OTP...' : 'Send OTP & Verify Phone'}
              </button>
            </form>
          )}

          {/* ── OTP VERIFICATION (Phone mode only) ── */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
              <div className="text-center bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-2">
                <p className="text-sm text-green-700 dark:text-green-400">📱 Enter the 6-digit code sent to +91 {form.phone}</p>
              </div>

              {otp && (
                <div className="text-center bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 mb-2">
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">ℹ️ Dev mode: Your OTP is <strong>{otp}</strong></p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Enter OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6}
                  autoFocus
                  required
                />
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

              <button type="submit" disabled={loading || otp.length !== 6} className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
                {loading ? 'Verifying & Creating Account...' : 'Verify OTP & Create Account'}
              </button>

              <div className="text-center">
                {otpTimer > 0 ? (
                  <p className="text-sm text-gray-500">Resend OTP in {otpTimer}s</p>
                ) : (
                  <button type="button" onClick={resendOtp} disabled={loading} className="text-sm text-green-600 dark:text-green-400 font-medium hover:underline">
                    {loading ? 'Sending...' : 'Resend OTP'}
                  </button>
                )}
              </div>

              <button type="button" onClick={() => { setStep('form'); setOtp(''); setError('') }} className="w-full text-sm text-gray-500 hover:text-gray-700">
                ← Edit details
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <button onClick={() => setPage('login')} className="text-green-600 dark:text-green-400 font-medium hover:underline">Sign In</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Orders Page ──────────────────────────────────────────────

function OrdersPage() {
  const { user, setPage, setSelectedOrder } = useContext(AppContext)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      api(`/orders/${user.id}`).then(d => {
        setOrders(d.orders || [])
      }).finally(() => setLoading(false))
    }
  }, [user])

  if (!user) return <AuthRequired message="Please login to view orders" />

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    packed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    shipped: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    returned: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4 mb-3"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📦</p>
          <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
          <p className="text-gray-500 text-sm mb-6">Start shopping to see your orders here</p>
          <button onClick={() => setPage('medicines')} className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">
            Browse Medicines
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div
              key={order.id}
              onClick={() => { setSelectedOrder(order); setPage('order-detail') }}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 cursor-pointer hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-500">Order #{order.orderNumber}</p>
                  <p className="text-sm text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', statusColors[order.status])}>
                  {order.status}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-3">
                {order.items.slice(0, 3).map((item, i) => (
                  <div key={i} className="w-8 h-8 bg-green-50 dark:bg-green-950/30 rounded flex items-center justify-center">
                    <span className="text-sm">💊</span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <span className="text-xs text-gray-500">+{order.items.length - 3} more</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">{order.items.length} item{order.items.length > 1 ? 's' : ''}</p>
                <p className="font-bold text-green-700 dark:text-green-400">₹{order.total.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OrderDetailPage() {
  const { selectedOrder: order, setPage } = useContext(AppContext)

  if (!order) return <div className="max-w-4xl mx-auto px-4 py-20 text-center"><p>Order not found</p></div>

  const statusSteps = ['confirmed', 'packed', 'shipped', 'delivered']
  const currentStep = statusSteps.indexOf(order.status)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => setPage('orders')} className="text-sm text-green-600 dark:text-green-400 hover:underline mb-4 inline-block">← Back to Orders</button>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">₹{order.total.toFixed(2)}</p>
            <p className="text-xs text-gray-500 capitalize">{order.paymentMethod || 'UPI'} • {order.paymentStatus}</p>
          </div>
        </div>

        {/* Status Tracker */}
        {order.status !== 'cancelled' && order.status !== 'returned' && (
          <div className="flex items-center justify-between mb-8 px-4">
            {statusSteps.map((step, i) => (
              <div key={step} className="flex-1 flex flex-col items-center relative">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10',
                  i <= currentStep ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                )}>
                  {i < currentStep ? '✓' : i + 1}
                </div>
                <p className="text-[10px] text-gray-500 mt-1 capitalize text-center">{step}</p>
                {i < statusSteps.length - 1 && (
                  <div className={cn('absolute top-4 left-1/2 w-full h-0.5', i < currentStep ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700')} />
                )}
              </div>
            ))}
          </div>
        )}

        {order.status === 'cancelled' && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm mb-6">
            This order has been cancelled.
          </div>
        )}

        {/* Items */}
        <h3 className="font-semibold mb-3">Items</h3>
        <div className="space-y-3">
          {order.items.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="w-10 h-10 bg-green-50 dark:bg-green-950/30 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-sm">💊</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.medicine.name}</p>
                <p className="text-xs text-gray-500">Qty: {item.quantity} × ₹{item.price.toFixed(2)}</p>
              </div>
              <span className="text-sm font-medium">₹{item.total.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="border-t border-gray-200 dark:border-gray-800 mt-4 pt-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{order.subtotal.toFixed(2)}</span></div>
          {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{order.discount.toFixed(2)}</span></div>}
          <div className="flex justify-between"><span className="text-gray-500">GST</span><span>₹{order.gstAmount.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Delivery</span><span>{order.deliveryCharge === 0 ? 'FREE' : `₹${order.deliveryCharge.toFixed(2)}`}</span></div>
          <div className="flex justify-between font-bold text-lg border-t border-gray-200 dark:border-gray-800 pt-2"><span>Total</span><span className="text-green-700 dark:text-green-400">₹{order.total.toFixed(2)}</span></div>
        </div>

        {order.address && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-xs font-medium text-gray-500 mb-1">Deliver to</p>
            <p className="text-sm">{order.address.name}, {order.address.line1}, {order.address.city}, {order.address.state} - {order.address.pincode}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Admin Dashboard ──────────────────────────────────────────

function AdminDashboard() {
  const { setPage } = useContext(AppContext)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/admin/stats').then(d => setStats(d)).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm">JanAushadhiGenerix management</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPage('admin-medicines')} className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
            Manage Medicines
          </button>
          <button onClick={() => setPage('admin-orders')} className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
            Manage Orders
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { title: 'Total Revenue', value: `₹${(stats?.totalSales || 0).toLocaleString('en-IN')}`, icon: '💰', color: 'text-green-600' },
          { title: 'Total Orders', value: stats?.totalOrders || 0, icon: '📦', color: 'text-blue-600' },
          { title: 'Customers', value: stats?.totalCustomers || 0, icon: '👥', color: 'text-purple-600' },
          { title: 'Low Stock', value: stats?.lowStockCount || 0, icon: '⚠️', color: 'text-orange-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{stat.title}</p>
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setPage('admin-add-medicine')} className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-left hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
              <span className="text-2xl block mb-1">➕</span>
              <p className="text-sm font-medium">Add Medicine</p>
            </button>
            <button onClick={() => setPage('admin-medicines')} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-left hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              <span className="text-2xl block mb-1">💊</span>
              <p className="text-sm font-medium">View Inventory</p>
            </button>
            <button onClick={() => setPage('admin-orders')} className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-left hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
              <span className="text-2xl block mb-1">📋</span>
              <p className="text-sm font-medium">Process Orders</p>
            </button>
            <button onClick={() => setPage('admin-inventory')} className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-left hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
              <span className="text-2xl block mb-1">📊</span>
              <p className="text-sm font-medium">Inventory Report</p>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="font-semibold mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {(stats?.recentOrders || []).map((order: any) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-gray-500">{order.user?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">₹{order.total?.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 capitalize">{order.status}</p>
                </div>
              </div>
            ))}
            {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">No orders yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Admin Medicines ──────────────────────────────────────────

function AdminMedicines() {
  const { setPage } = useContext(AppContext)
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadMedicines = () => {
    api('/admin/medicines').then(d => setMedicines(d.medicines || [])).finally(() => setLoading(false))
  }

  useEffect(() => { loadMedicines() }, [])

  const handleImageUpdate = async (medicineId: string, imageUrl: string) => {
    await api(`/admin/medicines/${medicineId}`, {
      method: 'PATCH',
      body: JSON.stringify({ imageUrl }),
    })
    loadMedicines()
  }

  const filtered = medicines.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.genericName.toLowerCase().includes(search.toLowerCase()) ||
    m.sku.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Medicine Inventory</h1>
          <p className="text-gray-500 text-sm">{medicines.length} medicines in stock</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPage('admin')} className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
            ← Dashboard
          </button>
          <button onClick={() => setPage('admin-add-medicine')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
            + Add Medicine
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search medicines..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Image</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Medicine</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">MRP</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(med => (
                <tr key={med.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-2">
                    <ImageUploader
                      currentImage={med.imageUrl}
                      onUpload={(url) => handleImageUpdate(med.id, url)}
                      size="sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{med.name}</p>
                    <p className="text-xs text-gray-500">{med.genericName}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{med.sku}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{med.category?.name}</td>
                  <td className="px-4 py-3 text-sm">₹{med.mrp.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400">₹{med.sellingPrice.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-sm font-medium', med.stockQuantity <= med.minimumStockLevel ? 'text-orange-500' : 'text-gray-700 dark:text-gray-300')}>
                      {med.stockQuantity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                      med.stockQuantity > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    )}>
                      {med.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Admin Add Medicine ───────────────────────────────────────

function AdminAddMedicine() {
  const { setPage } = useContext(AppContext)
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newMedicineId, setNewMedicineId] = useState<string | null>(null)
  const [newMedicineImage, setNewMedicineImage] = useState<string>('')
  const [form, setForm] = useState({
    sku: '', name: '', genericName: '', composition: '', manufacturer: '',
    categoryId: '', packSize: '', mrp: '', sellingPrice: '', gst: '12',
    stockQuantity: '', minimumStockLevel: '10', description: '', dosageInfo: '',
    benefits: '', sideEffects: '', prescriptionRequired: false,
  })

  useEffect(() => {
    api('/shop/categories').then(d => setCategories(d.categories || []))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api('/admin/medicines', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          mrp: parseFloat(form.mrp),
          sellingPrice: parseFloat(form.sellingPrice),
          gst: parseFloat(form.gst),
          stockQuantity: parseInt(form.stockQuantity),
          minimumStockLevel: parseInt(form.minimumStockLevel),
          isActive: true,
          isFeatured: false,
          rating: 0,
          reviewCount: 0,
        }),
      })
      if (res.medicine) {
        setNewMedicineId(res.medicine.id)
        setSaved(true)
      } else {
        setSaved(true)
        setTimeout(() => setPage('admin-medicines'), 1500)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (imageUrl: string) => {
    setNewMedicineImage(imageUrl)
    if (newMedicineId) {
      await api(`/admin/medicines/${newMedicineId}`, {
        method: 'PATCH',
        body: JSON.stringify({ imageUrl }),
      })
    }
  }

  const updateField = (field: string, value: any) => setForm(p => ({...p, [field]: value}))

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Add New Medicine</h1>
        <button onClick={() => setPage('admin')} className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
          ← Back
        </button>
      </div>

      {saved ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
          <p className="text-4xl mb-3">✅</p>
          <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">Medicine Added Successfully!</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">Now upload a product picture (optional)</p>

          <div className="flex justify-center mb-6">
            <ImageUploader
              currentImage={newMedicineImage || undefined}
              onUpload={handleImageUpload}
              size="lg"
            />
          </div>

          {newMedicineImage && (
            <p className="text-sm text-green-600 dark:text-green-400 mb-4">✅ Image uploaded successfully!</p>
          )}

          <div className="flex justify-center gap-3">
            <button
              onClick={() => setPage('admin-medicines')}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
            >
              {newMedicineImage ? 'Done — View Inventory' : 'Skip — View Inventory'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
          {/* Image Upload Section */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-dashed border-gray-300 dark:border-gray-600">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Picture</p>
                <p className="text-xs text-gray-500 mt-0.5">Upload after saving (image upload available on next step)</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="SKU" value={form.sku} onChange={v => updateField('sku', v)} placeholder="JAN-XXX-000" required />
            <Field label="Medicine Name" value={form.name} onChange={v => updateField('name', v)} placeholder="Paracetamol 500mg" required />
            <Field label="Generic Name" value={form.genericName} onChange={v => updateField('genericName', v)} placeholder="Paracetamol" required />
            <Field label="Composition" value={form.composition} onChange={v => updateField('composition', v)} placeholder="Paracetamol IP 500mg" required />
            <Field label="Manufacturer" value={form.manufacturer} onChange={v => updateField('manufacturer', v)} placeholder="Janaushadhi Generic" required />
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Category</label>
              <select value={form.categoryId} onChange={e => updateField('categoryId', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800" required>
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Field label="Pack Size" value={form.packSize} onChange={v => updateField('packSize', v)} placeholder="10 tablets" required />
            <Field label="MRP (₹)" value={form.mrp} onChange={v => updateField('mrp', v)} type="number" placeholder="10.00" required />
            <Field label="Selling Price (₹)" value={form.sellingPrice} onChange={v => updateField('sellingPrice', v)} type="number" placeholder="7.00" required />
            <Field label="GST (%)" value={form.gst} onChange={v => updateField('gst', v)} type="number" />
            <Field label="Stock Quantity" value={form.stockQuantity} onChange={v => updateField('stockQuantity', v)} type="number" required />
            <Field label="Min Stock Level" value={form.minimumStockLevel} onChange={v => updateField('minimumStockLevel', v)} type="number" />
          </div>

          <Field label="Description" value={form.description} onChange={v => updateField('description', v)} placeholder="Medicine description..." />
          <Field label="Dosage Info" value={form.dosageInfo} onChange={v => updateField('dosageInfo', v)} placeholder="1 tablet twice daily" />
          <Field label="Benefits" value={form.benefits} onChange={v => updateField('benefits', v)} placeholder="Key benefits" />
          <Field label="Side Effects" value={form.sideEffects} onChange={v => updateField('sideEffects', v)} placeholder="Potential side effects" />

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.prescriptionRequired} onChange={e => updateField('prescriptionRequired', e.target.checked)} className="rounded" />
            <span className="text-sm font-medium">Prescription Required</span>
          </label>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setPage('admin-medicines')} className="px-6 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Medicine'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, required }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none"
      />
    </div>
  )
}

// ── Admin Orders ─────────────────────────────────────────────

function AdminOrders() {
  const { setPage } = useContext(AppContext)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const loadOrders = () => {
    api('/admin/orders').then(d => setOrders(d.orders || [])).finally(() => setLoading(false))
  }

  useEffect(() => { loadOrders() }, [])

  const updateStatus = async (orderId: string, status: string) => {
    await api(`/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
    loadOrders()
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    packed: 'bg-purple-100 text-purple-700',
    shipped: 'bg-indigo-100 text-indigo-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Order Management</h1>
        <button onClick={() => setPage('admin')} className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">← Dashboard</button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn('px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors',
              filter === f ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50'
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} {f !== 'all' && `(${orders.filter(o => o.status === f).length})`}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map(order => (
          <div key={order.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold">#{order.orderNumber}</p>
                <p className="text-sm text-gray-500">{order.user?.name} • {order.user?.email}</p>
                <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString('en-IN')}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">₹{order.total.toFixed(2)}</p>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', statusColors[order.status])}>
                  {order.status}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {order.items.map(item => (
                <div key={item.id} className="bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg text-xs">
                  {item.medicine.name} × {item.quantity}
                </div>
              ))}
            </div>

            {order.address && (
              <p className="text-xs text-gray-500 mb-4">📍 {order.address.line1}, {order.address.city}, {order.address.state} - {order.address.pincode}</p>
            )}

            <div className="flex gap-2 flex-wrap">
              {order.status === 'pending' && (
                <button onClick={() => updateStatus(order.id, 'confirmed')} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">Confirm</button>
              )}
              {order.status === 'confirmed' && (
                <button onClick={() => updateStatus(order.id, 'packed')} className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700">Mark Packed</button>
              )}
              {order.status === 'packed' && (
                <button onClick={() => updateStatus(order.id, 'shipped')} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">Mark Shipped</button>
              )}
              {order.status === 'shipped' && (
                <button onClick={() => updateStatus(order.id, 'delivered')} className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">Mark Delivered</button>
              )}
              {['pending', 'confirmed'].includes(order.status) && (
                <button onClick={() => updateStatus(order.id, 'cancelled')} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200">Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Wishlist Page ────────────────────────────────────────────

function WishlistPage() {
  const { user, setPage, setSelectedMedicine } = useContext(AppContext)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      api(`/wishlist/${user.id}`).then(d => setItems(d.items || [])).finally(() => setLoading(false))
    }
  }, [user])

  if (!user) return <AuthRequired message="Please login to view your wishlist" />

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Wishlist</h1>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1,2,3].map(i => <div key={i} className="bg-white dark:bg-gray-900 rounded-xl h-64 animate-pulse"></div>)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">💝</p>
          <h3 className="text-lg font-semibold mb-2">Your wishlist is empty</h3>
          <button onClick={() => setPage('medicines')} className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">
            Browse Medicines
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map(item => (
            <MedicineCard
              key={item.id}
              medicine={item.medicine}
              onClick={() => { setSelectedMedicine(item.medicine); setPage('medicine-detail') }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Profile Page ─────────────────────────────────────────────

function ProfilePage() {
  const { user, setPage } = useContext(AppContext)

  if (!user) return <AuthRequired message="Please login to view your profile" />

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-2xl font-bold">
            {user.name?.[0] || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Email</label>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Phone</label>
              <p className="text-sm font-medium">{user.phone || 'Not provided'}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Role</label>
              <p className="text-sm font-medium capitalize">{user.role}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 grid grid-cols-2 gap-3">
          <button onClick={() => setPage('orders')} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span className="text-2xl block mb-1">📦</span>
            <p className="text-sm font-medium">My Orders</p>
          </button>
          <button onClick={() => setPage('wishlist')} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span className="text-2xl block mb-1">💝</span>
            <p className="text-sm font-medium">Wishlist</p>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Auth Required ────────────────────────────────────────────

function AuthRequired({ message }: { message: string }) {
  const { setPage } = useContext(AppContext)
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <p className="text-5xl mb-4">🔒</p>
      <h3 className="text-lg font-semibold mb-2">{message}</h3>
      <button onClick={() => setPage('login')} className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">
        Sign In
      </button>
    </div>
  )
}

// ── Admin Inventory ──────────────────────────────────────────

function AdminInventory() {
  const { setPage } = useContext(AppContext)
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'low-stock' | 'stock-in' | 'stock-out'>('overview')
  const [stockMedicine, setStockMedicine] = useState('')
  const [stockQty, setStockQty] = useState('')
  const [stockBatch, setStockBatch] = useState('')
  const [stockReason, setStockReason] = useState('')
  const [stockMsg, setStockMsg] = useState('')
  const [stockErr, setStockErr] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      api('/admin/medicines'),
      api('/admin/inventory/report'),
    ]).then(([meds, rep]) => {
      setMedicines(meds.medicines || [])
      setReport(rep)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const doStockIn = async () => {
    setStockMsg(''); setStockErr('')
    if (!stockMedicine || !stockQty) { setStockErr('Select medicine and quantity'); return }
    const res = await api('/admin/inventory/stock-in', {
      method: 'POST',
      body: JSON.stringify({ medicineId: stockMedicine, quantity: parseInt(stockQty), batchNumber: stockBatch || undefined }),
    })
    if (res.error) { setStockErr(res.error); return }
    setStockMsg(res.message)
    setStockQty(''); setStockBatch('')
    load()
  }

  const doStockOut = async () => {
    setStockMsg(''); setStockErr('')
    if (!stockMedicine || !stockQty) { setStockErr('Select medicine and quantity'); return }
    const res = await api('/admin/inventory/stock-out', {
      method: 'POST',
      body: JSON.stringify({ medicineId: stockMedicine, quantity: parseInt(stockQty), reason: stockReason || undefined }),
    })
    if (res.error) { setStockErr(res.error); return }
    setStockMsg(res.message)
    setStockQty(''); setStockReason('')
    load()
  }

  const filtered = medicines.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.sku.toLowerCase().includes(search.toLowerCase()) ||
    m.genericName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-gray-500 text-sm">Stock tracking, alerts, and reports</p>
        </div>
        <button onClick={() => setPage('admin')} className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">← Dashboard</button>
      </div>

      {/* Summary Cards */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { title: 'Total Stock Value', value: `₹${report.summary.totalStockValue.toLocaleString('en-IN')}`, icon: '💰', color: 'text-green-600' },
            { title: 'Total Items', value: report.summary.totalStockItems.toLocaleString(), icon: '📦', color: 'text-blue-600' },
            { title: 'Low Stock Alerts', value: report.summary.lowStockCount, icon: '⚠️', color: 'text-orange-600', alert: report.summary.lowStockCount > 0 },
            { title: 'Out of Stock', value: report.summary.outOfStockCount, icon: '🚨', color: 'text-red-600', alert: report.summary.outOfStockCount > 0 },
          ].map((stat, i) => (
            <div key={i} className={cn('bg-white dark:bg-gray-900 rounded-xl border p-6', stat.alert ? 'border-orange-300 dark:border-orange-800' : 'border-gray-200 dark:border-gray-800')}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">{stat.title}</p>
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'overview' as const, label: '📦 Full Inventory' },
          { id: 'low-stock' as const, label: '⚠️ Low Stock' },
          { id: 'stock-in' as const, label: '📥 Stock In' },
          { id: 'stock-out' as const, label: '📤 Stock Out' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setStockMsg(''); setStockErr('') }}
            className={cn('px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors',
              activeTab === tab.id ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stock In / Stock Out Form */}
      {(activeTab === 'stock-in' || activeTab === 'stock-out') && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <h3 className="font-semibold mb-4">{activeTab === 'stock-in' ? '📥 Add Stock (Stock In)' : '📤 Remove Stock (Stock Out)'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Medicine</label>
              <select value={stockMedicine} onChange={e => setStockMedicine(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800">
                <option value="">Select medicine...</option>
                {medicines.map(m => <option key={m.id} value={m.id}>{m.name} (Stock: {m.stockQuantity})</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Quantity</label>
              <input type="number" value={stockQty} onChange={e => setStockQty(e.target.value)} placeholder="Enter quantity" min="1" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">{activeTab === 'stock-in' ? 'Batch Number' : 'Reason'}</label>
              <input
                type="text"
                value={activeTab === 'stock-in' ? stockBatch : stockReason}
                onChange={e => activeTab === 'stock-in' ? setStockBatch(e.target.value) : setStockReason(e.target.value)}
                placeholder={activeTab === 'stock-in' ? 'Batch number (optional)' : 'Damaged, expired, etc.'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={activeTab === 'stock-in' ? doStockIn : doStockOut}
                className={cn('w-full py-2.5 rounded-lg text-sm font-semibold text-white',
                  activeTab === 'stock-in' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'
                )}
              >
                {activeTab === 'stock-in' ? 'Add Stock' : 'Remove Stock'}
              </button>
            </div>
          </div>
          {stockMsg && <p className="mt-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">✅ {stockMsg}</p>}
          {stockErr && <p className="mt-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">❌ {stockErr}</p>}
        </div>
      )}

      {/* Low Stock Alerts */}
      {activeTab === 'low-stock' && report && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <h3 className="font-semibold mb-4">⚠️ Low Stock Alerts</h3>
          {report.lowStock.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">✅ All medicines are well-stocked!</p>
          ) : (
            <div className="space-y-2">
              {report.lowStock.map((m: Medicine) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.sku} • Min: {m.minimumStockLevel}</p>
                  </div>
                  <span className="text-sm font-bold text-orange-600">{m.stockQuantity} left</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category Breakdown */}
      {activeTab === 'overview' && report && Object.keys(report.byCategory).length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <h3 className="font-semibold mb-4">📊 Stock by Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(report.byCategory).map(([cat, data]: [string, any]) => (
              <div key={cat} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-sm font-medium">{cat}</p>
                <p className="text-xs text-gray-500">{data.count} medicines • {data.items} units</p>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">₹{data.value.toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search medicines by name, SKU, or generic name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none"
        />
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Medicine</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">MRP</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Min Level</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(med => {
                const isLow = med.stockQuantity <= med.minimumStockLevel && med.stockQuantity > 0
                const isOut = med.stockQuantity === 0
                return (
                  <tr key={med.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{med.name}</p>
                      <p className="text-xs text-gray-500">{med.genericName}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{med.sku}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{med.category?.name}</td>
                    <td className="px-4 py-3 text-sm">₹{med.mrp.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400">₹{med.sellingPrice.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm font-bold', isOut ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-gray-700 dark:text-gray-300')}>
                        {med.stockQuantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{med.minimumStockLevel}</td>
                    <td className="px-4 py-3 text-sm font-medium">₹{(med.sellingPrice * med.stockQuantity).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      {isOut ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Out of Stock</span>
                      ) : isLow ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Low Stock</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">In Stock</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Footer ───────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/pmbjp-emblem.png" alt="PMBJP" className="h-10 w-10 object-contain rounded" />
              <span className="font-bold text-green-700 dark:text-green-400">JanAushadhiGenerix</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Quality generic medicines at affordable prices under Pradhan Mantri Bhartiya Janaushadhi Pariyojana.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><button className="hover:text-green-600">About Us</button></li>
              <li><button className="hover:text-green-600">Medicines</button></li>
              <li><button className="hover:text-green-600">Nearby Stores</button></li>
              <li><button className="hover:text-green-600">Track Order</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Categories</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><button className="hover:text-green-600">Analgesics</button></li>
              <li><button className="hover:text-green-600">Antibiotics</button></li>
              <li><button className="hover:text-green-600">Cardiovascular</button></li>
              <li><button className="hover:text-green-600">Diabetes Care</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Contact</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2">
                <span className="animate-pulse">📞</span>
                <a href="tel:+919458353800" className="hover:text-green-600 font-semibold">94583 53800</a>
              </li>
              <li>
                <a href="https://wa.me/919458353800?text=Hi%2C%20I%20want%20to%20order%20medicines" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-green-600">
                  <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp Order
                </a>
              </li>
              <li>📧 support@janaushadhi.gov.in</li>
              <li>🌐 janaushadhi.gov.in</li>
              <li>📍 New Delhi, India</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-800 mt-8 pt-6 text-center text-xs text-gray-400">
          <p>© 2026 JanAushadhiGenerix — Pradhan Mantri Bhartiya Janaushadhi Pariyojana</p>
          <p className="mt-1">Under the Department of Pharmaceuticals, Ministry of Chemicals & Fertilizers, Government of India</p>
        </div>
      </div>
    </footer>
  )
}
