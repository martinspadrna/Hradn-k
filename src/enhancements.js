import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cgshssdjgzzuprlwnabl.supabase.co'
const SUPABASE_KEY = 'sb_publishable_v7jeuZC-MNUEO5nfE5xcUQ_Pu9pT-X_'
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const photoCache = new Map()
let placesLoaded = false

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

async function loadPhotos() {
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
    if (!photoCache.has(key)) photoCache.set(key, { ...row, photo })
  }
}

function getNameFromCard(card) {
  return card.querySelector('.placeCopy b')?.textContent?.replace('⭐', '').trim() || ''
}

function addDetailPhoto(sheet) {
  const title = sheet.querySelector('h1')?.textContent?.trim()
  if (!title || sheet.querySelector('.detailPhoto')) return
  const hit = photoCache.get(normalize(title))
  if (!hit) return
  const img = document.createElement('img')
  img.className = 'detailPhoto'
  img.src = hit.photo
  img.alt = `${title} – fotografie`
  img.loading = 'eager'
  img.decoding = 'async'
  img.referrerPolicy = 'no-referrer'
  img.onerror = () => img.remove()
  const icon = sheet.querySelector('.bigIcon')
  if (icon) {
    icon.replaceWith(img)
  } else {
    sheet.prepend(img)
  }
  if (hit.photo_credit || hit.photo_license) {
    const p = document.createElement('div')
    p.className = 'photoCredit'
    const parts = []
    if (hit.photo_credit) parts.push(`Foto: ${hit.photo_credit}`)
    if (hit.photo_license) parts.push(hit.photo_license)
    if (hit.photo_source_url) parts.push(`<a href="${hit.photo_source_url}" target="_blank" rel="noreferrer">zdroj</a>`)
    p.innerHTML = parts.join(' · ')
    img.after(p)
  }
}

async function enhance() {
  await loadPhotos()
  document.querySelectorAll('.sheet').forEach(addDetailPhoto)
}

const observer = new MutationObserver(() => {
  document.querySelectorAll('.sheet').forEach(addDetailPhoto)
})
observer.observe(document.body, { childList: true, subtree: true })

window.addEventListener('DOMContentLoaded', enhance)
setTimeout(enhance, 800)
setTimeout(enhance, 2500)

// Make long place names easier to scan on small screens without changing the app logic.
const cardObserver = new MutationObserver(() => {
  document.querySelectorAll('.place').forEach((card) => {
    const title = getNameFromCard(card)
    if (title) card.dataset.hradnikName = normalize(title)
  })
})
cardObserver.observe(document.body, { childList: true, subtree: true })
