import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import QRCode from 'qrcode'

const __dirname = dirname(fileURLToPath(import.meta.url))
const AUTH_DIR = join(__dirname, 'wa-auth')
const PORT = process.env.PORT || 3000

let sock = null
let qrDataUrl = ''
let connected = false

const getStatus = () => ({ connected, qr: qrDataUrl })

async function initWa() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 0] }))
    sock = makeWASocket({ version, auth: state, printQRInTerminal: false, browser: ['JanAushadhiGenerix', 'Desktop', '1.0'] })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update
      if (qr) QRCode.toDataURL(qr).then((d) => { qrDataUrl = d }).catch(() => {})
      if (connection === 'open') { connected = true; qrDataUrl = ''; console.log('[WA] connected') }
      if (connection === 'close') {
        connected = false
        const code = lastDisconnect?.error?.output?.statusCode
        if (code !== DisconnectReason.loggedOut) setTimeout(initWa, 3000)
      }
    })
  } catch (e) {
    console.error('[WA] init failed', e?.message || e)
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const SEND_DELAY_MS = parseInt(process.env.WA_SEND_DELAY_MS || '1500')

async function sendWa(phone, text) {
  if (!sock || !connected) return { ok: false, error: 'not connected' }
  const d = phone.replace(/\D/g, '')
  const jid = `${d.length === 10 ? '91' + d : d}@s.whatsapp.net`
  try {
    await sock.sendMessage(jid, { text })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

function logout() {
  try { if (sock) sock.logout() } catch {}
  connected = false
  qrDataUrl = ''
}

const server = http.createServer(async (req, res) => {
  const url = (req.url || '/').split('?')[0]

  if (url === '/api/wa/status' || url === '/api/wa/qr') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify(getStatus()))
  }
  if (url === '/api/wa/logout' && req.method === 'POST') {
    logout()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ok: true }))
  }
  if (url === '/api/whatsapp/bulk-send' && req.method === 'POST') {
    let raw = ''
    for await (const c of req) raw += c
    let parsed = {}
    try { parsed = JSON.parse(raw || '{}') } catch {}
    const { template, customers } = parsed
    if (!Array.isArray(customers) || customers.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'customers array required' }))
    }
    if (!template || typeof template !== 'string') {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'template required' }))
    }
    if (!connected) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'WhatsApp not connected — scan QR first', results: [] }))
    }
    const results = []
    let i = 0
    for (const cust of customers) {
      if (i > 0) await sleep(SEND_DELAY_MS)
      i++
      const phone = String(cust.phone || '').trim()
      const docket = String(cust.docket || '').trim()
      if (!phone) { results.push({ phone, docket, status: 'skipped', error: 'no phone' }); continue }
      const msg = template.replace(/\{docket\}/gi, docket || '(N/A)')
      const r = await sendWa(phone, msg)
      results.push({ phone, docket, status: r.ok ? 'sent' : 'failed', error: r.error })
    }
    const sent = results.filter((r) => r.status === 'sent').length
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ sent, failed: results.length - sent, results }))
  }
  if (url === '/' || url === '/bulk.html') {
    try {
      const html = await readFile(join(__dirname, 'bulk.html'))
      res.writeHead(200, { 'Content-Type': 'text/html' })
      return res.end(html)
    } catch {
      res.writeHead(404)
      return res.end('bulk.html not found')
    }
  }
  res.writeHead(404)
  res.end('Not found')
})

server.listen(PORT, () => {
  console.log(`JanAushadhiGenerix Bulk WhatsApp running at http://localhost:${PORT}`)
  initWa()
})
