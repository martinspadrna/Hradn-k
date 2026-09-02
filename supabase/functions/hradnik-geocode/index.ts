import { createClient } from 'npm:@supabase/supabase-js@2.112.4'

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
)

const PAGES = [
  'https://www.hrady-zriceniny.cz/hrady_seznam_komplet.htm',
  'https://www.hrady-zriceniny.cz/hrady_seznam_komplet2.htm',
  'https://www.hrady-zriceniny.cz/hrady_seznam_komplet3.htm',
  'https://www.hrady-zriceniny.cz/hrady_seznam_komplet4.htm',
]
const MASTER_URL = /hrady_seznam_komplet/i

function clean(v: unknown) {
  return String(v ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function norm(v = '') {
  return clean(v)
    .toLocaleLowerCase('cs-CZ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—−]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hrefFrom(raw = '') {
  return raw.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] || ''
}

function abs(base: string, href: string) {
  try {
    const u = new URL(href, base)
    if (u.hostname === 'hrady-zriceniny.cz') u.hostname = 'www.hrady-zriceniny.cz'
    if (u.protocol === 'http:') u.protocol = 'https:'
    return u.href
  } catch {
    return ''
  }
}

function isObjectUrl(url = '') {
  return /hrady-zriceniny\.cz\/(?:hrad|zamek|tvrz|objekt|tisk)_/i.test(url) && !MASTER_URL.test(url)
}

function parseList(html: string, pageUrl: string) {
  const out: any[] = []
  for (const m of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells: string[] = []
    const raw: string[] = []
    for (const c of m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)) {
      raw.push(c[1])
      cells.push(clean(c[1]))
    }
    if (cells.length < 3) continue
    const n = Number((cells[0] || '').replace(/[^0-9]/g, ''))
    if (!Number.isFinite(n) || n < 1 || n > 5000) continue
    const idx = cells.findIndex((x, i) => i > 0 && x.length >= 2 && x.length <= 180)
    if (idx < 1) continue
    const name = cells[idx]
    const character = cells[idx + 1] || ''
    const district = cells[idx + 2] || ''
    const region = cells[idx + 3] || ''
    if (!/(hrad|zámek|zřícen|tvrz|klášter|komenda|opevně|bašta|věž|palác)/i.test(character)) continue
    const objectHref = raw.map(hrefFrom).map(h => abs(pageUrl, h)).find(isObjectUrl) || ''
    out.push({ name, character, district, region, url: objectHref })
  }
  return out
}

async function get(url: string, ms = 30000) {
  const c = new AbortController()
  const timer = setTimeout(() => c.abort(), ms)
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Hradnik/1.0 (+https://hradnik.vercel.app)' }, signal: c.signal })
    if (!r.ok) return null
    return await r.text()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function extractGps(html: string) {
  const text = clean(html)
  const m = text.match(/GPS:[\s\S]{0,700}?\|\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/i)
  if (!m) return null
  const latitude = Number(m[1])
  const longitude = Number(m[2])
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude < 48 || latitude > 52 || longitude < 11 || longitude > 20) return null
  return { latitude, longitude }
}

function heuristics(name: string, kind: string) {
  const base = norm(name).replace(/\s+/g, '-')
  const k = norm(kind)
  const prefixes = k.includes('zřícen') ? ['zricenina', 'hrad', 'zamek', 'tvrz'] : k.includes('zám') ? ['zamek', 'hrad', 'tvrz'] : k.includes('tvrz') ? ['tvrz', 'hrad', 'zamek'] : ['hrad', 'zricenina', 'zamek', 'tvrz']
  return prefixes.map(p => `https://www.hrady-zriceniny.cz/${p}_${base}.htm`)
}

async function sourceIndex() {
  const all: any[] = []
  const fetched = await Promise.all(PAGES.map(async page => ({ page, html: await get(page) })))
  for (const x of fetched) if (x.html) all.push(...parseList(x.html, x.page))
  const byKey = new Map<string, any[]>()
  const byName = new Map<string, any[]>()
  for (const x of all) {
    if (!x.url) continue
    const nameKey = norm(x.name)
    const key = `${nameKey}|${norm(x.district)}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key)!.push(x)
    if (!byName.has(nameKey)) byName.set(nameKey, [])
    byName.get(nameKey)!.push(x)
  }
  return { byKey, byName, records: all.length }
}

async function findGps(p: any, index: Awaited<ReturnType<typeof sourceIndex>>) {
  const candidates: string[] = []
  const add = (url: string) => { if (url && !candidates.includes(url)) candidates.push(url) }
  if (p.source_url && isObjectUrl(p.source_url)) add(p.source_url)
  for (const x of index.byKey.get(`${norm(p.name)}|${norm(p.district)}`) || []) add(x.url)
  const sameName = index.byName.get(norm(p.name)) || []
  if (sameName.length === 1) add(sameName[0].url)
  for (const u of heuristics(p.name, p.kind || '')) add(u)
  for (const url of candidates.slice(0, 8)) {
    const html = await get(url)
    if (!html) continue
    const gps = extractGps(html)
    if (gps) return { ...gps, source_url: url, source: 'Hrady-zříceniny.cz', confidence: 0.99 }
  }
  return null
}

async function keyOk(req: Request) {
  const { data } = await db.from('hradnik_sync_control').select('sync_key').eq('id', true).maybeSingle()
  const key = data?.sync_key || Deno.env.get('HRADNIK_GEOCODE_KEY') || ''
  if (!key) return true
  return req.headers.get('x-hradnik-geocode-key') === key || req.headers.get('x-hradnik-sync-key') === key
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204 })
  if (req.method !== 'POST') return Response.json({ ok: true, service: 'hradnik-geocode' })
  if (!(await keyOk(req))) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    const limit = Math.min(50, Math.max(1, Number(body.limit) || 25))
    const index = await sourceIndex()
    const { data: places, error } = await db.from('hradnik_places').select('id,name,kind,character,municipality,district,region,latitude,longitude,source_url').eq('is_visible', true).eq('is_current', true).or('latitude.is.null,longitude.is.null').order('id').limit(limit)
    if (error) throw error
    let updated = 0
    let unresolved = 0
    const results: any[] = []
    for (const p of places || []) {
      const gps = await findGps(p, index)
      if (!gps) {
        unresolved++
        results.push({ id: p.id, name: p.name, status: 'unresolved' })
        continue
      }
      const { error: ue } = await db.from('hradnik_places').update({ latitude: gps.latitude, longitude: gps.longitude, source_url: gps.source_url, last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', p.id)
      if (ue) {
        results.push({ id: p.id, name: p.name, status: 'error', error: ue.message })
        continue
      }
      const { error: se } = await db.from('hradnik_place_sources').upsert({ place_id: p.id, source_key: 'hrady_zriceniny_gps', external_id: `${p.id}:gps`, source_url: gps.source_url, source_label: 'Hrady-zříceniny.cz – GPS', fetched_at: new Date().toISOString(), confidence: gps.confidence, raw_data: { latitude: gps.latitude, longitude: gps.longitude, matched_name: p.name }, is_active: true }, { onConflict: 'place_id,source_key,external_id' })
      if (se) console.error('source upsert failed', p.id, se)
      updated++
      results.push({ id: p.id, name: p.name, status: 'updated', latitude: gps.latitude, longitude: gps.longitude, source_url: gps.source_url })
    }
    return Response.json({ ok: true, requested: limit, processed: places?.length || 0, updated, unresolved, sourceRecords: index.records, results })
  } catch (e) {
    console.error(e)
    return Response.json({ error: String(e) }, { status: 500 })
  }
})