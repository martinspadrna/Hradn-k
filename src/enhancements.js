import './mobile.css'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cgshssdjgzzuprlwnabl.supabase.co'
const SUPABASE_KEY = 'sb_publishable_v7jeuZC-MNUEO5nfE5xcUQ_Pu9pT-X_'
const db = createClient(SUPABASE_URL, SUPABASE_KEY)
const PHOTO_URL = `${SUPABASE_URL}/functions/v1/hradnik-photo`

const photoCache = new Map()
const lookupPromises = new Map()
let placesLoaded = false
let allPlaces = []

function normalize(value = '') {
  return String(value)
    .toLocaleLowerCase('cs-CZ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/^(hrad|zamek|tvrz|klaster|pevnost|zricenina)\s+/i, '')
    .replace(/\s+(hrad|zamek|tvrz|klaster|pevnost|zricenina)$/i, '')
    .trim()
}

function firstPhoto(row) {
  const urls = Array.isArray(row?.photo_urls) ? row.photo_urls : []
  const url = urls.find((x) => typeof x === 'string' && /^https?:\/\//i.test(x))
  return url ? url.replace(/^http:/, 'https:') : ''
}

async function loadPhotoRows() {
  if (placesLoaded) return
  placesLoaded = true
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('hradnik_places')
      .select('id,name,photo_urls,photo_credit,photo_license,photo_source_url')
      .eq('is_visible', true)
      .eq('is_current', true)
      .range(from, from + 999)
    if (error) return
    rows.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  for (const row of rows) {
    const photo = firstPhoto(row)
    if (!photo) continue
    const key = normalize(row.name)
    if (!photoCache.has(key)) photoCache.set(key, { ...row, photo, source: 'stored' })
  }
}

async function findPhoto(title) {
  const key = normalize(title)
  if (!key) return null
  const cached = photoCache.get(key)
  if (cached) return cached
  if (cached === null) return null
  if (lookupPromises.has(key)) return lookupPromises.get(key)
  const promise = (async () => {
    try {
      const response = await fetch(PHOTO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: title }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.url) {
        photoCache.set(key, null)
        return null
      }
      const result = {
        photo: String(data.url).replace(/^http:/, 'https:'),
        photo_credit: data.credit || '',
        photo_license: data.license || '',
        photo_source_url: data.source_url || '',
        source: 'wikimedia',
      }
      photoCache.set(key, result)
      return result
    } catch {
      photoCache.set(key, null)
      return null
    }
  })()
  lookupPromises.set(key, promise)
  return promise
}

function renderPhoto(sheet, title, hit) {
  if (!hit || sheet.querySelector('.detailPhoto')) return
  const img = document.createElement('img')
  img.className = 'detailPhoto'
  img.src = hit.photo
  img.alt = `${title} – fotografie`
  img.loading = 'eager'
  img.decoding = 'async'
  img.referrerPolicy = 'no-referrer'
  img.onerror = () => img.remove()
  const icon = sheet.querySelector('.bigIcon')
  if (icon) icon.replaceWith(img)
  else sheet.prepend(img)

  if (hit.photo_credit || hit.photo_license || hit.photo_source_url) {
    const p = document.createElement('div')
    p.className = 'photoCredit'
    if (hit.photo_credit) p.append(`Foto: ${hit.photo_credit}`)
    if (hit.photo_license) {
      if (p.textContent) p.append(` · ${hit.photo_license}`)
      else p.append(hit.photo_license)
    }
    if (hit.photo_source_url) {
      const a = document.createElement('a')
      a.href = hit.photo_source_url
      a.target = '_blank'
      a.rel = 'noreferrer'
      a.textContent = 'zdroj'
      p.append(' · ')
      p.appendChild(a)
    }
    img.after(p)
  }
}

async function addDetailPhoto(sheet) {
  const title = sheet.querySelector('h1')?.textContent?.trim()
  if (!title || sheet.querySelector('.detailPhoto')) return
  await loadPhotoRows()
  const key = normalize(title)
  const stored = photoCache.get(key)
  if (stored) {
    renderPhoto(sheet, title, stored)
    return
  }
  const found = await findPhoto(title)
  if (found && sheet.isConnected) renderPhoto(sheet, title, found)
}

function renderResultPhoto(card, title, hit) {
  if (!hit || card.querySelector('.placePhoto')) return
  const photo = document.createElement('img')
  photo.className = 'placePhoto'
  photo.src = hit.photo
  photo.alt = `${title} – fotografie`
  photo.loading = 'lazy'
  photo.decoding = 'async'
  photo.referrerPolicy = 'no-referrer'
  photo.onerror = () => photo.remove()
  card.querySelector('.placeMain')?.prepend(photo)
}

async function addResultPhoto(card) {
  const title = card.querySelector('.placeCopy b')?.textContent?.replace('★', '').trim()
  if (!title || card.querySelector('.placePhoto')) return
  await loadPhotoRows()
  const stored = photoCache.get(normalize(title))
  if (stored) return renderResultPhoto(card, title, stored)
  const found = await findPhoto(title)
  if (found && card.isConnected) renderResultPhoto(card, title, found)
}

function hydrateResultPhotos() {
  // A bounded lazy pass keeps a broad catalog view fast while giving searches
  // and the visible first results the useful visual recognition users expect.
  document.querySelectorAll('#list .place, #mineList .place, #diaryList .place')
    .forEach((card, index) => { if (index < 16) void addResultPhoto(card) })
}

function haversineKm(aLat, aLon, bLat, bLon) {
  const R = 6371
  const toRad = x => x * Math.PI / 180
  const dLat = toRad(bLat - aLat)
  const dLon = toRad(bLon - aLon)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

async function loadPlacesForNearby() {
  if (allPlaces.length) return allPlaces
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('hradnik_places')
      .select('id,name,kind,district,region,latitude,longitude')
      .eq('is_visible', true)
      .eq('is_current', true)
      .range(from, from + 999)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  allPlaces = rows
  return rows
}

function createNearbyUi() {
  if (document.querySelector('#nearbyControl') || !document.querySelector('.hero')) return
  const panel = document.createElement('section')
  panel.className = 'card nearbyPanel'
  panel.id = 'nearbyControl'
  panel.innerHTML = `<div class="nearbyRow"><div><p class="eyebrow">VÝLET</p><h2>📍 Co máme poblíž?</h2><p class="muted">Najdi nejbližší hrady, zámky a zříceniny podle aktuální polohy.</p></div><button id="nearbyButton" class="primary nearbyButton">Najít v okolí</button></div>`
  document.querySelector('.hero')?.after(panel)
  panel.querySelector('#nearbyButton').addEventListener('click', openNearby)
}

async function openNearby() {
  const button = document.querySelector('#nearbyButton')
  if (button) { button.disabled = true; button.textContent = 'Zjišťuji polohu…' }
  if (!navigator.geolocation) {
    showNearbyMessage('Tento prohlížeč nepodporuje zjištění polohy.')
    if (button) { button.disabled = false; button.textContent = 'Najít v okolí' }
    return
  }
  navigator.geolocation.getCurrentPosition(async position => {
    try {
      const places = await loadPlacesForNearby()
      const lat = position.coords.latitude
      const lon = position.coords.longitude
      const ranked = places
        .filter(p => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)))
        .map(p => ({ ...p, distance: haversineKm(lat, lon, Number(p.latitude), Number(p.longitude)) }))
        .sort((a, b) => a.distance - b.distance)
      renderNearbyModal(ranked)
    } catch (e) {
      showNearbyMessage(`Nepodařilo se načíst místa: ${e.message}`)
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Najít v okolí' }
    }
  }, error => {
    showNearbyMessage(error.code === 1 ? 'Poloha nebyla povolena. Povol ji pro Hradník v nastavení prohlížeče.' : 'Poloha se nepodařila zjistit.')
    if (button) { button.disabled = false; button.textContent = 'Najít v okolí' }
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 })
}

function showNearbyMessage(message) {
  const box = document.createElement('div')
  box.className = 'nearbyToast'
  box.textContent = message
  document.body.appendChild(box)
  setTimeout(() => box.remove(), 5000)
}

function renderNearbyModal(ranked) {
  document.querySelector('#nearbyModal')?.remove()
  const modal = document.createElement('div')
  modal.className = 'overlay'
  modal.id = 'nearbyModal'
  modal.innerHTML = `<div class="sheet nearbySheet"><div class="nearbyHeader"><div><p class="eyebrow">V OKOLÍ</p><h1>Nejbližší památky</h1></div><button id="nearbyClose" class="close">✕</button></div><div class="nearbyControls"><label>Dosah<select id="nearbyRadius"><option value="10">10 km</option><option value="25">25 km</option><option value="50" selected>50 km</option><option value="100">100 km</option></select></label></div><div id="nearbyList" class="list"></div></div>`
  document.body.appendChild(modal)

  const update = () => {
    const radius = Number(document.querySelector('#nearbyRadius').value)
    const list = document.querySelector('#nearbyList')
    const items = ranked.filter(p => p.distance <= radius)
    list.innerHTML = items.slice(0, 40).map(p => `<button class="nearbyPlace" data-name="${escapeHtml(p.name)}"><span class="nearbyIcon">${iconFor(p.kind)}</span><span><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.kind || 'Historické místo')} · ${p.distance.toFixed(1).replace('.',',')} km</small></span></button>`).join('') || '<div class="empty">V tomto dosahu nic nenalezeno.</div>'
    list.querySelectorAll('[data-name]').forEach(btn => btn.addEventListener('click', () => {
      const title = btn.dataset.name
      modal.remove()
      const match = [...document.querySelectorAll('.place')].find(card => normalize(getNameFromCard(card)) === normalize(title))
      match?.querySelector('.placeMain')?.click()
    }))
  }

  document.querySelector('#nearbyClose').onclick = () => modal.remove()
  document.querySelector('#nearbyRadius').onchange = update
  update()
}

function getNameFromCard(card) {
  return card.querySelector('.placeCopy b')?.textContent?.replace('⭐', '').trim() || ''
}

function iconFor(kind) {
  return ({Zřícenina:'🧱',Tvrz:'🛡️',Klášter:'⛪',Zámek:'🏯','Opevněné místo':'🏛️'}[kind] || '🏰')
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
}

const observer = new MutationObserver(() => {
  createNearbyUi()
  document.querySelectorAll('.sheet').forEach(sheet => { void addDetailPhoto(sheet) })
  hydrateResultPhotos()
})
observer.observe(document.body, { childList: true, subtree: true })

window.addEventListener('DOMContentLoaded', () => {
  void loadPhotoRows()
  createNearbyUi()
  hydrateResultPhotos()
  setTimeout(createNearbyUi, 600)
  setTimeout(() => document.querySelectorAll('.sheet').forEach(sheet => { void addDetailPhoto(sheet) }), 800)
})

setTimeout(createNearbyUi, 1000)
