import { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import { join } from 'path'

const AUTH_DIR = join(process.cwd(), 'wa-auth')

let sock: any = null
let qrDataUrl = ''
let connected = false

export function getWaStatus() {
  return { connected, qr: qrDataUrl }
}

export async function initWa() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 0] as any }))
    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['JanAushadhiGenerix', 'Desktop', '1.0'],
    })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update
      if (qr) {
        QRCode.toDataURL(qr).then((d) => { qrDataUrl = d }).catch(() => {})
      }
      if (connection === 'open') {
        connected = true
        qrDataUrl = ''
        console.log('[WA] ✅ Personal WhatsApp connected')
      }
      if (connection === 'close') {
        connected = false
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
        if (statusCode !== DisconnectReason.loggedOut) {
          console.log('[WA] reconnecting…')
          setTimeout(() => initWa(), 3000)
        } else {
          console.log('[WA] logged out')
        }
      }
    })
  } catch (e: any) {
    console.error('[WA] init failed:', e?.message || e)
  }
}

export async function sendWaMessage(phone: string, text: string): Promise<{ ok: boolean; error?: string }> {
  if (!sock || !connected) return { ok: false, error: 'WhatsApp not connected — scan QR first' }
  const digits = phone.replace(/\D/g, '')
  const jid = `${digits.length === 10 ? '91' + digits : digits}@s.whatsapp.net`
  try {
    await sock.sendMessage(jid, { text })
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) }
  }
}

export function logoutWa() {
  try { if (sock) sock.logout() } catch {}
  connected = false
  qrDataUrl = ''
}
