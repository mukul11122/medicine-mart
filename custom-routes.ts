import 'dotenv/config'
import { Hono } from 'hono'
import { prisma } from './src/lib/db'
import { hash, compare } from 'bcryptjs'
import { randomBytes } from 'crypto'
import twilio from 'twilio'
import nodemailer from 'nodemailer'
import { writeFile, mkdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { initWa, getWaStatus, sendWaMessage, logoutWa } from './src/lib/wa'

const app = new Hono()

// ── Twilio Config ────────────────────────────────────────────
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

let twilioClient: ReturnType<typeof twilio> | null = null
if (twilioAccountSid && twilioAuthToken) {
  twilioClient = twilio(twilioAccountSid, twilioAuthToken)
  console.log('[Twilio] ✅ SMS gateway configured')
} else {
  console.log('[Twilio] ⚠️ No credentials — OTP in response (dev mode)')
}

// ── Store Email Alert (Nodemailer) ───────────────────────
const smtpHost = process.env.SMTP_HOST
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const storeEmail = process.env.STORE_EMAIL

let mailer: ReturnType<typeof nodemailer.createTransport> | null = null
if (smtpHost && smtpUser && smtpPass && storeEmail) {
  mailer = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: smtpUser, pass: smtpPass },
  })
  console.log('[Mailer] ✅ SMTP configured →', storeEmail)
} else {
  console.log('[Mailer] ⚠️ No SMTP creds — email alerts off (set SMTP_HOST/SMTP_USER/SMTP_PASS/STORE_EMAIL)')
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!mailer) return false
  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || smtpUser,
      to,
      subject,
      html,
    })
    return true
  } catch (e: any) {
    console.error('[Mailer] ❌ send failed:', e?.message || e)
    return false
  }
}

async function sendStoreEmail(subject: string, html: string) {
  if (!storeEmail) return
  const ok = await sendEmail(storeEmail, subject, html)
  if (ok) console.log('[Mailer] ✅ Order alert emailed')
}

// ── Personal WhatsApp (Baileys) bulk sender ─────────────
// OTP still uses Twilio SMS. This uses the store owner's personal
// WhatsApp account (scanned QR) for bulk customer messages.

app.get('/wa/status', async (c) => c.json(getWaStatus()))
app.get('/wa/qr', async (c) => c.json(getWaStatus()))
app.post('/wa/logout', async (c) => { logoutWa(); return c.json({ ok: true }) })

// small delay between bulk sends (lowers ban risk)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const SEND_DELAY_MS = parseInt(process.env.WA_SEND_DELAY_MS || '1500')

app.post('/whatsapp/bulk-send', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { template, customers } = body
  if (!Array.isArray(customers) || customers.length === 0) {
    return c.json({ error: 'customers array required' }, 400)
  }
  if (!template || typeof template !== 'string') {
    return c.json({ error: 'template required' }, 400)
  }
  const { connected } = getWaStatus()
  if (!connected) {
    return c.json({ error: 'WhatsApp not connected — scan QR first', results: [] }, 400)
  }
  const results: any[] = []
  let i = 0
  for (const cust of customers) {
    if (i > 0) await sleep(SEND_DELAY_MS)
    i++
    const phone = String(cust.phone || '').trim()
    const docket = String(cust.docket || '').trim()
    if (!phone) {
      results.push({ phone, docket, status: 'skipped', error: 'no phone' })
      continue
    }
    const msg = template.replace(/\{docket\}/gi, docket || '(N/A)')
    const r = await sendWaMessage(phone, msg)
    results.push({ phone, docket, status: r.ok ? 'sent' : 'failed', error: r.error })
  }
  const sent = results.filter((r) => r.status === 'sent').length
  return c.json({ sent, failed: results.length - sent, results })
})

// ── Auth Routes ──────────────────────────────────────────────

app.post('/auth/register', async (c) => {
  const body = await c.req.json()
  const { email, password, name, phone } = body

  if (!email || !password || !name) {
    return c.json({ error: 'Email, password, and name are required' }, 400)
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return c.json({ error: 'Email already registered' }, 409)
  }

  const hashedPassword = await hash(password, 10)
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name, phone, role: 'customer' },
  })

  return c.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } })
})

app.post('/auth/login', async (c) => {
  const body = await c.req.json()
  const { email, password } = body

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const valid = await compare(password, user.password)
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  return c.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone },
  })
})

// ── OTP Routes ─────────────────────────────────────────────

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

app.post('/auth/send-otp', async (c) => {
  const body = await c.req.json()
  const { phone, purpose = 'register' } = body

  if (!phone || phone.length < 10) {
    return c.json({ error: 'Valid phone number is required' }, 400)
  }

  const normalizedPhone = phone.replace(/\D/g, '').slice(-10)

  // For login, check user exists
  if (purpose === 'login') {
    const user = await prisma.user.findFirst({ where: { phone: normalizedPhone } })
    if (!user) {
      return c.json({ error: 'No account found with this phone number' }, 404)
    }
  }

  // Rate limit: max 3 OTPs per phone per 10 minutes
  const recentOtps = await prisma.otpVerification.findMany({
    where: {
      phone: normalizedPhone,
      purpose,
      createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
    },
  })
  if (recentOtps.length >= 3) {
    return c.json({ error: 'Too many OTP requests. Please wait 10 minutes.' }, 429)
  }

  // Invalidate old OTPs
  await prisma.otpVerification.updateMany({
    where: { phone: normalizedPhone, purpose, verified: false },
    data: { verified: true },
  })

  const otp = generateOtp()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

  await prisma.otpVerification.create({
    data: { phone: normalizedPhone, otp, purpose, expiresAt },
  })

  // Send SMS via Twilio (or fallback to dev mode)
  if (twilioClient && twilioPhoneNumber) {
    try {
      await twilioClient.messages.create({
        body: `Your JanAushadhi verification code is: ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`,
        from: twilioPhoneNumber,
        to: `+91${normalizedPhone}`,
      })
      console.log(`[Twilio] ✅ OTP sent to +91${normalizedPhone}`)
      return c.json({
        message: `OTP sent to +91 ${normalizedPhone}`,
        // Don't include OTP in response when sending real SMS
      })
    } catch (smsError: any) {
      console.error(`[Twilio] ❌ SMS failed:`, smsError.message)
      // Still return success so the user can retry — but log the error
      // In production, you might want to return a 502 here
    }
  }

  // Fallback: Dev mode — include OTP in response
  console.log(`[Dev] OTP for ${normalizedPhone}: ${otp} (purpose: ${purpose})`)
  return c.json({
    message: `OTP sent to +91 ${normalizedPhone}`,
    otp, // Dev only — removed when Twilio is active
  })
})

app.post('/auth/verify-otp', async (c) => {
  const body = await c.req.json()
  const { phone, otp, purpose = 'register', name, email, password } = body

  if (!phone || !otp) {
    return c.json({ error: 'Phone and OTP are required' }, 400)
  }

  const normalizedPhone = phone.replace(/\D/g, '').slice(-10)

  const record = await prisma.otpVerification.findFirst({
    where: { phone: normalizedPhone, otp, purpose, verified: false },
    orderBy: { createdAt: 'desc' },
  })

  if (!record) {
    return c.json({ error: 'Invalid OTP' }, 400)
  }

  if (new Date() > record.expiresAt) {
    return c.json({ error: 'OTP has expired. Please request a new one.' }, 400)
  }

  if (record.attempts >= 5) {
    return c.json({ error: 'Too many attempts. Please request a new OTP.' }, 400)
  }

  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verified: true, attempts: { increment: 1 } },
  })

  // Handle different purposes
  if (purpose === 'login') {
    const user = await prisma.user.findFirst({ where: { phone: normalizedPhone } })
    if (!user) {
      return c.json({ error: 'No account found' }, 404)
    }
    return c.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone },
      verified: true,
    })
  }

  if (purpose === 'register') {
    if (!name || !email || !password) {
      return c.json({ error: 'Name, email, and password required for registration' }, 400)
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } })
    if (existingEmail) {
      return c.json({ error: 'Email already registered' }, 409)
    }

    const existingPhone = await prisma.user.findFirst({ where: { phone: normalizedPhone } })
    if (existingPhone) {
      return c.json({ error: 'Phone number already registered' }, 409)
    }

    const hashedPassword = await hash(password, 10)
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, phone: normalizedPhone, role: 'customer' },
    })

    return c.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone },
      verified: true,
    })
  }

  if (purpose === 'checkout') {
    return c.json({ verified: true, phone: normalizedPhone })
  }

  return c.json({ verified: true })
})

// ── Password Reset (email link, no schema change) ──────────
const RESET_TOKENS_FILE = join(process.cwd(), 'reset-tokens.json')
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutes

type ResetToken = { token: string; email: string; expiresAt: number }

async function readResetTokens(): Promise<ResetToken[]> {
  try {
    return JSON.parse(await readFile(RESET_TOKENS_FILE, 'utf8')) as ResetToken[]
  } catch {
    return []
  }
}

async function writeResetTokens(tokens: ResetToken[]) {
  await writeFile(RESET_TOKENS_FILE, JSON.stringify(tokens, null, 2))
}

app.post('/auth/forgot-password', async (c) => {
  const { email } = await c.req.json()
  if (!email) return c.json({ error: 'Email is required' }, 400)

  const user = await prisma.user.findUnique({ where: { email } })
  // Always respond the same to avoid leaking which emails are registered.
  if (user) {
    const token = randomBytes(32).toString('hex')
    const tokens = (await readResetTokens()).filter((t) => t.email !== email)
    tokens.push({ token, email, expiresAt: Date.now() + RESET_TOKEN_TTL_MS })
    await writeResetTokens(tokens)

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const resetLink = `${frontendUrl}/reset-password?token=${token}`
    await sendEmail(
      email,
      'Reset your JanAushadhiGenerix password',
      `<p>Hi ${user.name || 'there'},</p>
       <p>We received a request to reset your password. Click the link below to choose a new password. This link expires in 30 minutes.</p>
       <p><a href="${resetLink}">${resetLink}</a></p>
       <p>If you didn't request this, you can safely ignore this email.</p>
       <p>— JanAushadhiGenerix</p>`,
    )
  }
  return c.json({ message: 'If that account exists, a password reset link has been sent to your email.' })
})

app.post('/auth/reset-password', async (c) => {
  const { token, password } = await c.req.json()
  if (!token || !password || String(password).length < 6) {
    return c.json({ error: 'Token and a password of at least 6 characters are required' }, 400)
  }

  const tokens = await readResetTokens()
  const record = tokens.find((t) => t.token === token)
  if (!record || record.expiresAt < Date.now()) {
    return c.json({ error: 'Invalid or expired reset link. Please request a new one.' }, 400)
  }

  const user = await prisma.user.findUnique({ where: { email: record.email } })
  if (!user) return c.json({ error: 'Account not found' }, 400)

  await prisma.user.update({
    where: { email: record.email },
    data: { password: await hash(String(password), 10) },
  })
  await writeResetTokens(tokens.filter((t) => t.token !== token))

  return c.json({ message: 'Password updated. You can now sign in.' })
})

// ── Medicine Routes (prefixed /shop to avoid CRUD collision) ─

app.get('/shop/search', async (c) => {
  const q = c.req.query('q') || ''
  const category = c.req.query('category') || ''
  const sort = c.req.query('sort') || 'name'
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const skip = (page - 1) * limit

  const where: any = { isActive: true }

  if (q) {
    where.OR = [
      { name: { contains: q } },
      { genericName: { contains: q } },
      { composition: { contains: q } },
      { manufacturer: { contains: q } },
      { description: { contains: q } },
    ]
  }

  if (category) {
    where.category = { slug: category }
  }

  const orderBy: any = sort === 'price_asc' ? { sellingPrice: 'asc' }
    : sort === 'price_desc' ? { sellingPrice: 'desc' }
    : sort === 'discount' ? { discount: 'desc' }
    : sort === 'rating' ? { rating: 'desc' }
    : { name: 'asc' }

  const [medicines, total] = await Promise.all([
    prisma.medicine.findMany({
      where,
      include: { category: true },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.medicine.count({ where }),
  ])

  return c.json({ medicines, total, page, totalPages: Math.ceil(total / limit) })
})

app.get('/shop/featured', async (c) => {
  const medicines = await prisma.medicine.findMany({
    where: { isActive: true, isFeatured: true },
    include: { category: true },
    take: 8,
  })
  return c.json({ medicines })
})

app.get('/shop/medicine/:slug', async (c) => {
  const slug = c.req.param('slug')
  const medicine = await prisma.medicine.findUnique({
    where: { slug },
    include: { category: true },
  })

  if (!medicine) {
    return c.json({ error: 'Medicine not found' }, 404)
  }

  const similar = await prisma.medicine.findMany({
    where: {
      categoryId: medicine.categoryId,
      id: { not: medicine.id },
      isActive: true,
    },
    include: { category: true },
    take: 4,
  })

  return c.json({ medicine, similar })
})

app.get('/shop/category/:slug', async (c) => {
  const slug = c.req.param('slug')
  const category = await prisma.category.findUnique({ where: { slug } })
  if (!category) return c.json({ error: 'Category not found' }, 404)

  const medicines = await prisma.medicine.findMany({
    where: { categoryId: category.id, isActive: true },
    include: { category: true },
  })

  return c.json({ category, medicines })
})

// ── Categories ───────────────────────────────────────────────

app.get('/shop/categories', async (c) => {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { medicines: true } } },
  })
  return c.json({ categories })
})

// ── Cart Routes ──────────────────────────────────────────────

app.get('/cart/:userId', async (c) => {
  const userId = c.req.param('userId')
  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: { medicine: true },
  })
  const total = items.reduce((sum, item) => sum + item.medicine.sellingPrice * item.quantity, 0)
  return c.json({ items, total, count: items.length })
})

app.post('/cart/add', async (c) => {
  const body = await c.req.json()
  const { userId, medicineId, quantity = 1 } = body

  const existing = await prisma.cartItem.findUnique({
    where: { userId_medicineId: { userId, medicineId } },
  })

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    })
  } else {
    await prisma.cartItem.create({
      data: { userId, medicineId, quantity },
    })
  }

  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: { medicine: true },
  })
  const total = items.reduce((sum, item) => sum + item.medicine.sellingPrice * item.quantity, 0)
  return c.json({ items, total, count: items.length })
})

app.post('/cart/update', async (c) => {
  const body = await c.req.json()
  const { userId, medicineId, quantity } = body

  if (quantity <= 0) {
    await prisma.cartItem.delete({
      where: { userId_medicineId: { userId, medicineId } },
    })
  } else {
    await prisma.cartItem.update({
      where: { userId_medicineId: { userId, medicineId } },
      data: { quantity },
    })
  }

  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: { medicine: true },
  })
  const total = items.reduce((sum, item) => sum + item.medicine.sellingPrice * item.quantity, 0)
  return c.json({ items, total, count: items.length })
})

app.post('/cart/remove', async (c) => {
  const body = await c.req.json()
  const { userId, medicineId } = body

  await prisma.cartItem.delete({
    where: { userId_medicineId: { userId, medicineId } },
  })

  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: { medicine: true },
  })
  const total = items.reduce((sum, item) => sum + item.medicine.sellingPrice * item.quantity, 0)
  return c.json({ items, total, count: items.length })
})

// ── Order Routes ─────────────────────────────────────────────

app.post('/orders/create', async (c) => {
  const body = await c.req.json()
  const { userId, addressId, paymentMethod, notes, couponCode } = body

  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: { medicine: true },
  })

  if (cartItems.length === 0) {
    return c.json({ error: 'Cart is empty' }, 400)
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.medicine.sellingPrice * item.quantity, 0)
  let discount = 0

  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } })
    if (coupon && coupon.isActive) {
      discount = Math.min(subtotal * coupon.discount / 100, coupon.maxDiscount || Infinity)
      if (subtotal >= coupon.minOrder) {
        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        })
      } else {
        discount = 0
      }
    }
  }

  const deliveryCharge = subtotal >= 300 ? 0 : 40
  const taxableAmount = subtotal - discount
  const gstAmount = taxableAmount * 0.12
  const total = taxableAmount + gstAmount + deliveryCharge

  const orderNumber = `JAN${Date.now().toString(36).toUpperCase()}`

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId,
      addressId,
      status: 'confirmed',
      subtotal,
      deliveryCharge,
      gstAmount,
      discount,
      total,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
      notes,
    },
  })

  for (const item of cartItems) {
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        medicineId: item.medicineId,
        quantity: item.quantity,
        price: item.medicine.sellingPrice,
        total: item.medicine.sellingPrice * item.quantity,
      },
    })

    // Decrease stock
    await prisma.medicine.update({
      where: { id: item.medicineId },
      data: { stockQuantity: { decrement: item.quantity } },
    })
  }

  // ── Notify store via Email ──
  const customer = await prisma.user.findUnique({ where: { id: userId } })
  const address = addressId ? await prisma.address.findUnique({ where: { id: addressId } }) : null
  const itemsRows = cartItems
    .map((i) => `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee">${i.quantity} x ${i.medicine.name}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">₹${(i.medicine.sellingPrice * i.quantity).toFixed(2)}</td></tr>`)
    .join('')
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;color:#111">
      <h2 style="color:#16a34a;margin-bottom:8px">🛒 New Order — JanAushadhiGenerix</h2>
      <p><b>Order:</b> ${order.orderNumber}</p>
      <p><b>Customer:</b> ${customer?.name || 'N/A'} (${customer?.phone || 'N/A'})</p>
      <p><b>📍 Address:</b> ${address ? `${address.line1}, ${address.city}, ${address.state} - ${address.pincode}` : 'N/A'}</p>
      <table style="width:100%;border-collapse:collapse;margin:12px 0">
        <thead><tr><th style="text-align:left;border-bottom:2px solid #ddd;padding:4px 8px">Item</th><th style="text-align:right;border-bottom:2px solid #ddd;padding:4px 8px">Amount</th></tr></thead>
        <tbody>${itemsRows}</tbody>
      </table>
      <p style="font-size:16px"><b>Total: ₹${total.toFixed(2)}</b></p>
    </div>`
  await sendStoreEmail(`New Order ${order.orderNumber}`, html)

  // Clear cart
  await prisma.cartItem.deleteMany({ where: { userId } })

  return c.json({
    order: { ...order, items: cartItems },
    message: 'Order placed successfully',
  })
})

app.get('/orders/:userId', async (c) => {
  const userId = c.req.param('userId')
  const orders = await prisma.order.findMany({
    where: { userId },
    include: { items: { include: { medicine: true } }, address: true },
    orderBy: { createdAt: 'desc' },
  })
  return c.json({ orders })
})

app.get('/orders/detail/:orderId', async (c) => {
  const orderId = c.req.param('orderId')
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { medicine: true } }, address: true, user: true },
  })
  if (!order) return c.json({ error: 'Order not found' }, 404)
  return c.json({ order })
})

app.patch('/orders/:orderId/status', async (c) => {
  const orderId = c.req.param('orderId')
  const body = await c.req.json()
  const { status } = body

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status },
  })

  return c.json({ order })
})

// ── Address Routes ───────────────────────────────────────────

app.get('/addresses/:userId', async (c) => {
  const userId = c.req.param('userId')
  const addresses = await prisma.address.findMany({ where: { userId } })
  return c.json({ addresses })
})

app.post('/addresses', async (c) => {
  const body = await c.req.json()
  const address = await prisma.address.create({ data: body })
  return c.json({ address })
})

// ── Coupon Routes ────────────────────────────────────────────

app.post('/coupons/validate', async (c) => {
  const body = await c.req.json()
  const { code, subtotal } = body

  const coupon = await prisma.coupon.findUnique({ where: { code } })
  if (!coupon || !coupon.isActive) {
    return c.json({ error: 'Invalid coupon code' }, 400)
  }

  if (subtotal < coupon.minOrder) {
    return c.json({ error: `Minimum order of ₹${coupon.minOrder} required` }, 400)
  }

  if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
    return c.json({ error: 'Coupon has expired' }, 400)
  }

  const discountAmount = Math.min(subtotal * coupon.discount / 100, coupon.maxDiscount || Infinity)

  return c.json({
    coupon: {
      code: coupon.code,
      description: coupon.description,
      discount: coupon.discount,
      discountAmount,
    },
  })
})

// ── Wishlist Routes ──────────────────────────────────────────

app.get('/wishlist/:userId', async (c) => {
  const userId = c.req.param('userId')
  const items = await prisma.wishlist.findMany({
    where: { userId },
    include: { medicine: true },
  })
  return c.json({ items })
})

app.post('/wishlist/toggle', async (c) => {
  const body = await c.req.json()
  const { userId, medicineId } = body

  const existing = await prisma.wishlist.findUnique({
    where: { userId_medicineId: { userId, medicineId } },
  })

  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } })
    return c.json({ added: false })
  } else {
    await prisma.wishlist.create({ data: { userId, medicineId } })
    return c.json({ added: true })
  }
})

// ── Admin Routes ─────────────────────────────────────────────

app.get('/admin/stats', async (c) => {
  const [totalSales, totalOrders, totalCustomers, totalMedicines, lowStockCount] = await Promise.all([
    prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: 'paid' } }),
    prisma.order.count(),
    prisma.user.count({ where: { role: 'customer' } }),
    prisma.medicine.count({ where: { isActive: true } }),
    prisma.medicine.count({ where: { isActive: true, stockQuantity: { lte: 10 } } }),
  ])

  const recentOrders = await prisma.order.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const topMedicines = await prisma.orderItem.groupBy({
    by: ['medicineId'],
    _sum: { quantity: true, total: true },
    _count: true,
    orderBy: { _sum: { total: 'desc' } },
    take: 5,
  })

  // Get medicine details for top medicines
  const topMedicineIds = topMedicines.map(t => t.medicineId)
  const topMedicineDetails = await prisma.medicine.findMany({
    where: { id: { in: topMedicineIds } },
  })

  const topMedicinesWithDetails = topMedicines.map(t => ({
    ...t,
    medicine: topMedicineDetails.find(m => m.id === t.medicineId),
  }))

  return c.json({
    totalSales: totalSales._sum.total || 0,
    totalOrders,
    totalCustomers,
    totalMedicines,
    lowStockCount,
    recentOrders,
    topMedicines: topMedicinesWithDetails,
  })
})

app.get('/admin/medicines', async (c) => {
  const medicines = await prisma.medicine.findMany({
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  })
  return c.json({ medicines })
})

app.post('/admin/medicines', async (c) => {
  const body = await c.req.json()
  const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const medicine = await prisma.medicine.create({
    data: { ...body, slug },
  })

  return c.json({ medicine })
})

app.patch('/admin/medicines/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()

  const medicine = await prisma.medicine.update({
    where: { id },
    data: body,
  })

  return c.json({ medicine })
})

app.delete('/admin/medicines/:id', async (c) => {
  const id = c.req.param('id')
  await prisma.medicine.delete({ where: { id } })
  return c.json({ success: true })
})

app.get('/admin/orders', async (c) => {
  const orders = await prisma.order.findMany({
    include: { user: true, items: { include: { medicine: true } }, address: true },
    orderBy: { createdAt: 'desc' },
  })
  return c.json({ orders })
})

app.get('/admin/inventory/low-stock', async (c) => {
  const allActive = await prisma.medicine.findMany({
    where: { isActive: true },
    include: { category: true },
  })
  const lowStock = allActive.filter(m => m.stockQuantity <= m.minimumStockLevel)
  return c.json({ medicines: lowStock })
})

// ── Stock Management ─────────────────────────────────────────

app.post('/admin/inventory/stock-in', async (c) => {
  const body = await c.req.json()
  const { medicineId, quantity, batchNumber, expiryDate } = body

  if (!medicineId || !quantity || quantity <= 0) {
    return c.json({ error: 'medicineId and positive quantity required' }, 400)
  }

  const updateData: any = {
    stockQuantity: { increment: quantity },
  }
  if (batchNumber) updateData.batchNumber = batchNumber
  if (expiryDate) updateData.expiryDate = new Date(expiryDate)

  const medicine = await prisma.medicine.update({
    where: { id: medicineId },
    data: updateData,
    include: { category: true },
  })

  return c.json({ medicine, message: `Added ${quantity} units to ${medicine.name}` })
})

app.post('/admin/inventory/stock-out', async (c) => {
  const body = await c.req.json()
  const { medicineId, quantity, reason } = body

  if (!medicineId || !quantity || quantity <= 0) {
    return c.json({ error: 'medicineId and positive quantity required' }, 400)
  }

  const medicine = await prisma.medicine.findUnique({ where: { id: medicineId } })
  if (!medicine) return c.json({ error: 'Medicine not found' }, 404)
  if (medicine.stockQuantity < quantity) {
    return c.json({ error: `Insufficient stock. Available: ${medicine.stockQuantity}` }, 400)
  }

  const updated = await prisma.medicine.update({
    where: { id: medicineId },
    data: { stockQuantity: { decrement: quantity } },
    include: { category: true },
  })

  return c.json({ medicine: updated, message: `Removed ${quantity} units from ${updated.name}${reason ? ` (${reason})` : ''}` })
})

app.post('/admin/inventory/bulk-update', async (c) => {
  const body = await c.req.json()
  const { updates } = body as { updates: { medicineId: string; stockQuantity: number }[] }

  if (!Array.isArray(updates) || updates.length === 0) {
    return c.json({ error: 'updates array required' }, 400)
  }

  const results = []
  for (const u of updates) {
    const med = await prisma.medicine.update({
      where: { id: u.medicineId },
      data: { stockQuantity: u.stockQuantity },
    })
    results.push(med)
  }

  return c.json({ updated: results.length, message: `Updated ${results.length} medicines` })
})

// ── Inventory Report ─────────────────────────────────────────

app.get('/admin/inventory/report', async (c) => {
  const medicines = await prisma.medicine.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { name: 'asc' },
  })

  const totalItems = medicines.reduce((sum, m) => sum + m.stockQuantity, 0)
  const totalValue = medicines.reduce((sum, m) => sum + m.sellingPrice * m.stockQuantity, 0)
  const totalMrpValue = medicines.reduce((sum, m) => sum + m.mrp * m.stockQuantity, 0)
  const lowStock = medicines.filter(m => m.stockQuantity <= m.minimumStockLevel)
  const outOfStock = medicines.filter(m => m.stockQuantity === 0)
  const expiringSoon = medicines.filter(m => {
    if (!m.expiryDate) return false
    const daysUntil = (new Date(m.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return daysUntil <= 90 && daysUntil > 0
  })

  // Category breakdown
  const byCategory: Record<string, { count: number; value: number; items: number }> = {}
  for (const m of medicines) {
    const cat = m.category?.name || 'Uncategorized'
    if (!byCategory[cat]) byCategory[cat] = { count: 0, value: 0, items: 0 }
    byCategory[cat].count++
    byCategory[cat].value += m.sellingPrice * m.stockQuantity
    byCategory[cat].items += m.stockQuantity
  }

  return c.json({
    summary: {
      totalMedicines: medicines.length,
      totalStockItems: totalItems,
      totalStockValue: totalValue,
      totalMrpValue,
      potentialSavings: totalMrpValue - totalValue,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      expiringSoonCount: expiringSoon.length,
    },
    lowStock,
    outOfStock,
    expiringSoon,
    byCategory,
  })
})

// ── Image Upload ──────────────────────────────────────────

const UPLOAD_DIR = join(process.cwd(), 'public', 'products')
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

app.post('/upload', async (c) => {
  try {
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    const body = await c.req.parseBody()
    const file = body['image']

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No image file provided' }, 400)
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json({ error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF` }, 400)
    }

    if (file.size > MAX_SIZE) {
      return c.json({ error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB` }, 400)
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/_{2,}/g, '_')
    const filename = `${timestamp}-${safeName}`
    const filepath = join(UPLOAD_DIR, filename)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await writeFile(filepath, buffer)

    const imageUrl = `/products/${filename}`
    console.log(`[Upload] ✅ Saved: ${imageUrl} (${(file.size / 1024).toFixed(1)}KB)`)

    return c.json({ imageUrl, filename, size: file.size })
  } catch (error: any) {
    console.error('[Upload] ❌ Error:', error.message)
    return c.json({ error: 'Upload failed: ' + error.message }, 500)
  }
})

// ── Medicine Image Update ──────────────────────────────────

app.patch('/admin/medicines/:id/image', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.parseBody()
  const file = body['image']

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No image file provided' }, 400)
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return c.json({ error: `Invalid file type: ${file.type}` }, 400)
  }

  if (file.size > MAX_SIZE) {
    return c.json({ error: `File too large. Max: 5MB` }, 400)
  }

  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/_{2,}/g, '_')
  const filename = `${timestamp}-${safeName}`
  const filepath = join(UPLOAD_DIR, filename)

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  await writeFile(filepath, buffer)

  const imageUrl = `/products/${filename}`

  const medicine = await prisma.medicine.update({
    where: { id },
    data: { imageUrl },
    include: { category: true },
  })

  return c.json({ medicine, imageUrl })
})

// ── FCM Push Notification ───────────────────────────────────

const FCM_TOKENS_FILE = join(process.cwd(), 'fcm-tokens.json')

async function saveFcmToken(token: string, userId?: string) {
  try {
    let tokens: any[] = []
    if (existsSync(FCM_TOKENS_FILE)) {
      const raw = await readFile(FCM_TOKENS_FILE, 'utf-8')
      tokens = JSON.parse(raw || '[]')
    }
    const existing = tokens.find((t) => t.token === token)
    if (existing) {
      if (userId) existing.userId = userId
      existing.updatedAt = new Date().toISOString()
    } else {
      tokens.push({
        token,
        userId: userId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
    await writeFile(FCM_TOKENS_FILE, JSON.stringify(tokens, null, 2))
    console.log('[FCM] ✅ Token saved')
  } catch (e) {
    console.error('[FCM] save token failed', e)
  }
}

app.post('/fcm/register', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { token, userId } = body
  if (!token) return c.json({ error: 'token required' }, 400)
  await saveFcmToken(token, userId)
  return c.json({ success: true, message: 'FCM token registered' })
})

app.get('/fcm/tokens', async (c) => {
  try {
    if (!existsSync(FCM_TOKENS_FILE)) return c.json({ tokens: [] })
    const raw = await readFile(FCM_TOKENS_FILE, 'utf-8')
    return c.json({ tokens: JSON.parse(raw || '[]') })
  } catch {
    return c.json({ tokens: [] })
  }
})

// ── Start personal WhatsApp client (Baileys) ──────────
void initWa()

export default app
