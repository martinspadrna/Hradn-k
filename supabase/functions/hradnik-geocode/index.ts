import { createClient } from 'npm:@supabase/supabase-js'

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
)

const HRADY = 'https://www.hrady-zriceniny.cz/'
const PAGES = [
  `${HRADY}hrady_seznam_komplet.htm`,
  `${HRADY}hrady_seznam_komplet2.htm`,
  `${HRADY}hrady_seznam_komplet3.htm`,
  `${HRADY}hrady_seznam_komplet4.htm`,
]
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type,x-hradnik-geocode-key,x-hradnik-sync-key',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json',
}
const json = (x: any, s = 200) => new Response(JSON.stringify(x), { status: s, headers: CORS })

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

function slug(v = '') {
  return norm(v).replace(/\s+/g, '_')
}

function variants(name = '') {
  const n = norm(name)
  const a = [n]
  if (n.includes(' - ')) for (const p of n.split(' - ')) a.push(p.trim())
  if (n.includes(' u ')) a.push(n.split(' u ')[0].trim())
  return [...new Set(a.filter(x => x.length >= 4))]
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

function objectUrl(url = '') {
  if (!url) return false
  return /hrady-zriceniny\.cz\/(?!hrady_seznam_)(?:hrad|zamek|zricenina|tvrz|objekt|tisk)_/i.test(url)
}

async function get(url: string, ms = 18000) {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), ms)
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Hradnik/1.0 (+https://hradnik.vercel.app)',
        Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
      },
      signal: c.signal,
    })
    if (!r.ok) return null
    return await r.text()
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

function extractHrefs(raw: string, base: string) {
  const out: string[] = []
  for (const m of raw.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const u = abs(base, m[1])
    if (objectUrl(u) && !out.includes(u)) out.push(u)
  }
  return out
}

function parseList(html: string, pageUrl: string) {
  const out: any[] = []
  for (const m of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rawRow = m[1]
    const cells: string[] = []
    for (const c of rawRow.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)) cells.push(clean(c[1]))
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
    const hrefs = extractHrefs(rawRow, pageUrl)
    out.push({ name, character, district, region, url: hrefs[0] || '' })
  }
  return out
}

async function sourceIndex() {
  const all: any[] = []
  const fetched = await Promise.all(PAGES.map(async page => ({ page, html: await get(page, 30000) })))
  for (const x of fetched) if (x.html) all.push(...parseList(x.html, x.page))
  const byKey = new Map<string, any[]>()
  const byName = new Map<string, any[]>()
  for (const x of all) {
    if (!x.url) continue
    const nk = norm(x.name)
    const key = `${nk}|${norm(x.district)}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key)!.push(x)
    if (!byName.has(nk)) byName.set(nk, [])
    byName.get(nk)!.push(x)
  }
  return { byKey, byName, records: all.length }
}

function validGps(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= 48 && latitude <= 52 && longitude >= 11 && longitude <= 20
}

function gpsFromHtml(rawHtml: string) {
  const raw = rawHtml
  const text = clean(rawHtml)
  const patterns: Array<[RegExp, (m: RegExpMatchArray) => [number, number]]> = [
    [/GPS:[\s\S]{0,1000}?\|\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/i, m => [Number(m[1]), Number(m[2])]],
    [/GPS[^\d-]{0,100}?(-?\d{1,3}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)/i, m => [Number(m[1]), Number(m[2])]],
    [/\bN\s*(-?\d{1,3}(?:\.\d+)?)\s*[° ]+E\s*(-?\d{1,3}(?:\.\d+)?)/i, m => [Number(m[1]), Number(m[2])]],
    [/\b(-?\d{1,3}(?:\.\d+)?)\s*°?\s*N\s*[,; ]+\s*(-?\d{1,3}(?:\.\d+)?)\s*°?\s*E\b/i, m => [Number(m[1]), Number(m[2])]],
    [/data-lat(?:itude)?\s*=\s*["'](-?\d{1,3}(?:\.\d+)?)["'][\s\S]{0,250}?data-(?:lon|lng|longitude)\s*=\s*["'](-?\d{1,3}(?:\.\d+)?)["']/i, m => [Number(m[1]), Number(m[2])]],
    [/\b(?:lat|latitude)\s*[:=]\s*(-?\d{1,3}(?:\.\d+)?)[,;\s]+(?:lon|lng|longitude)\s*[:=]\s*(-?\d{1,3}(?:\.\d+)?)/i, m => [Number(m[1]), Number(m[2])]],
  ]
  for (const [rx, make] of patterns) {
    const m = raw.match(rx) || text.match(rx)
    if (!m) continue
    const [latitude, longitude] = make(m)
    if (validGps(latitude, longitude)) return { latitude, longitude }
  }
  const mapy = raw.match(/[?&#]y=(-?\d{1,3}(?:\.\d+)?)[^#\s"']*[&#]x=(-?\d{1,3}(?:\.\d+)?)/i) || raw.match(/[?&#]x=(-?\d{1,3}(?:\.\d+)?)[^#\s"']*[&#]y=(-?\d{1,3}(?:\.\d+)?)/i)
  if (mapy) {
    const first = Number(mapy[1]), second = Number(mapy[2])
    if (validGps(first, second)) return { latitude: first, longitude: second }
    if (validGps(second, first)) return { latitude: second, longitude: first }
  }
  return null
}

function header(html: string) {
  const t = clean(html).slice(0, 1800)
  return { district: t.match(/Okres:\s*([^\n]{2,100})/i)?.[1]?.trim() || '', text: t }
}

function prefixes(kind: string) {
  const k = norm(kind)
  if (k.includes('zricen')) return ['zricenina', 'hrad', 'zamek', 'tvrz']
  if (k.includes('zamek')) return ['zamek', 'hrad', 'tvrz']
  if (k.includes('tvrz')) return ['tvrz', 'hrad', 'zamek']
  if (k.includes('klaster')) return ['klaster', 'komenda', 'hrad', 'zamek']
  return ['hrad', 'zricenina', 'zamek', 'tvrz', 'objekt']
}

async function findHrady(p: any, index: Awaited<ReturnType<typeof sourceIndex>>) {
  const urls: string[] = []
  const add = (u: string) => { if (u && !urls.includes(u)) urls.push(u) }
  if (p.source_url && objectUrl(p.source_url)) add(p.source_url)
  const exactKey = `${norm(p.name)}|${norm(p.district || '')}`
  for (const x of index.byKey.get(exactKey) || []) add(x.url)
  const sameName = index.byName.get(norm(p.name)) || []
  if (sameName.length === 1) add(sameName[0].url)
  for (const v of variants(p.name)) for (const pre of prefixes(p.kind || '')) add(`${HRADY}${pre}_${slug(v)}.htm`)
  for (const url of urls.slice(0, 18)) {
    const html = await get(url, 16000)
    if (!html) continue
    const h = header(html)
    const wanted = norm(p.name)
    const base = variants(p.name)[1] || wanted
    const lead = norm(h.text)
    const district = norm(p.district || '')
    if (!(lead.includes(wanted) || lead.includes(base))) continue
    if (district && h.district && !norm(h.district).includes(district) && !district.includes(norm(h.district))) continue
    const gps = gpsFromHtml(html)
    if (gps) return { ...gps, source: 'hrady_zriceniny', source_label: 'Hrady-zříceniny.cz', source_url: url, confidence: .995, matched_via: 'source_index_or_page' }
  }
  return null
}

function score(p: any, r: any, e: any) {
  const label = norm(r?.label || e?.labels?.cs?.value || '')
  const wanted = norm(p.name)
  const desc = norm(e?.descriptions?.cs?.value || e?.descriptions?.en?.value || '')
  let s = 0
  if (label === wanted) s = 100
  else if (label && wanted.includes(label)) s = 82
  else if (label && label.includes(wanted)) s = 82
  for (const v of variants(p.name)) if (v.length > 4 && label === v) s = Math.max(s, 90)
  if (/hrad|zamek|zricen|tvrz|pevnost|hradisko|palac|castle|ruin|fort|manor/i.test(label + ' ' + desc)) s += 16
  return Math.min(s, 100)
}

async function wikidataOne(p: any) {
  try {
    const q = [p.name, p.district].filter(Boolean).join(' ')
    const h = await get('https://www.wikidata.org/w/api.php?action=wbsearchentities&search=' + encodeURIComponent(q) + '&language=cs&uselang=cs&format=json&limit=8', 22000)
    if (!h) return null
    const j = JSON.parse(h)
    let best: any = null, bs = 0
    for (const r of j.search || []) {
      const id = r.id
      if (!id) continue
      const eh = await get(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`, 22000)
      if (!eh) continue
      let e: any
      try { e = JSON.parse(eh).entities?.[id] } catch { continue }
      const c = e?.claims?.P625?.[0]?.mainsnak?.datavalue?.value
      const lat = Number(c?.latitude), lon = Number(c?.longitude)
      if (!validGps(lat, lon)) continue
      const s = score(p, r, e)
      if (s > bs) {
        bs = s
        best = { latitude: lat, longitude: lon, wikidata_id: id, source: 'wikidata', source_label: 'Wikidata', source_url: `https://www.wikidata.org/wiki/${id}`, confidence: s >= 95 ? .97 : s >= 85 ? .93 : .88, matched_via: 'wikidata_search' }
      }
    }
    return bs >= 85 ? best : null
  } catch { return null }
}

async function nominatim(p: any) {
  for (const q0 of [p.name, ...variants(p.name).slice(1)]) {
    const q = [q0, p.district, 'Česko'].filter(Boolean).join(', ')
    const h = await get('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=cz&q=' + encodeURIComponent(q), 22000)
    if (!h) continue
    try {
      for (const x of JSON.parse(h)) {
        const lat = Number(x.lat), lon = Number(x.lon), display = norm(x.display_name || ''), typ = String(x.type || '') + ' ' + String(x.class || '')
        if (!validGps(lat, lon)) continue
        const exact = display.includes(norm(p.name)) || display.includes(norm(variants(p.name)[1] || p.name))
        const hist = /castle|ruins|fort|manor|palace|monastery|abbey|hrad|zricen|tvrz|zamek/i.test(typ + ' ' + display)
        if (exact && hist) return { latitude: lat, longitude: lon, source: 'osm', source_label: 'OpenStreetMap / Nominatim', source_url: 'https://www.openstreetmap.org/', confidence: .9, matched_via: 'nominatim_exact' }
      }
    } catch {}
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
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ ok: true, service: 'hradnik-geocode', version: 8 })
  if (!(await keyOk(req))) return json({ error: 'Unauthorized' }, 401)
  try {
    const body = await req.json().catch(() => ({}))
    const limit = Math.min(25, Math.max(1, Number(body.limit) || 15))
    const index = await sourceIndex()
    const { data: places, error } = await db.from('hradnik_places').select('id,name,kind,character,municipality,district,region,latitude,longitude,source_url,wikidata_id').eq('is_visible', true).eq('is_current', true).or('latitude.is.null,longitude.is.null').order('id').limit(limit)
    if (error) throw error
    let updated = 0, unresolved = 0, sourceErrors = 0
    const results: any[] = []
    for (const p of places || []) {
      let gps = await findHrady(p, index)
      if (!gps) gps = await wikidataOne(p)
      if (!gps) gps = await nominatim(p)
      if (!gps) { unresolved++; results.push({ id: p.id, name: p.name, status: 'unresolved' }); continue }
      const now = new Date().toISOString()
      const { error: ue } = await db.from('hradnik_places').update({ latitude: gps.latitude, longitude: gps.longitude, wikidata_id: gps.wikidata_id || p.wikidata_id || null, source_url: gps.source_url || p.source_url, last_verified_at: now, updated_at: now }).eq('id', p.id)
      if (ue) { results.push({ id: p.id, name: p.name, status: 'error', error: ue.message }); continue }
      const { error: se } = await db.from('hradnik_place_sources').upsert({ place_id: p.id, source_key: gps.source, external_id: `${p.id}:gps`, source_url: gps.source_url || null, source_label: gps.source_label, fetched_at: now, confidence: gps.confidence, raw_data: { latitude: gps.latitude, longitude: gps.longitude, matched_name: p.name, role: 'geocoding', matched_via: gps.matched_via }, is_active: true }, { onConflict: 'source_key,external_id' })
      if (se) { sourceErrors++; results.push({ id: p.id, name: p.name, status: 'updated-source-error', latitude: gps.latitude, longitude: gps.longitude, source: gps.source, error: se.message }); continue }
      updated++; results.push({ id: p.id, name: p.name, status: 'updated', latitude: gps.latitude, longitude: gps.longitude, source: gps.source, matched_via: gps.matched_via })
    }
    return json({ ok: true, version: 8, source_records: index.records, requested: limit, processed: places?.length || 0, updated, unresolved, sourceErrors, results })
  } catch (e) { console.error(e); return json({ error: String(e) }, 500) }
})
