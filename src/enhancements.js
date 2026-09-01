import './mobile.css'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cgshssdjgzzuprlwnabl.supabase.co'
const SUPABASE_KEY = 'sb_publishable_v7jeuZC-MNUEO5nfE5xcUQ_Pu9pT-X_'
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const photoCache = new Map()
const lookupPromises = new Map()
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
    if (!photoCache.has(key)) photoCache.set(key, { ...row, photo, source: 'stored' })
  }
}

async function searchCommons(title) {
  const key = normalize(title)
  if (!key) return null
  if (lookupPromises.has(key)) return lookupPromises.get(key)
  const promise = (async () => {
    const queries = [
      `${title} hrad Česko`,
      `${title} zámek Česko`,
      `${title} zřícenina Česko`,
      title,
    ]
    for (const q of queries) {
      try {
        const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1400&format=json&origin=*`
        const response = await fetch(url)
        if (!response.ok) continue
        const json = await response.json()
        const pages = Object.values(json?.query?.pages || {})
        for (const page of pages) {
          const info = page?.imageinfo?.[0]
          const imageUrl = info?.thumburl || info?.url
          if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) continue
          const meta = info.extmetadata || {}
          const license = String(meta.LicenseShortName?.value || meta.License?.value || '').replace(/<[^>]+>/g, '').trim()
          const artist = String(meta.Artist?.value || '').replace(/<[^>]+>/g, '').trim()
          const result = {
            photo: imageUrl.replace(/^http:/, 'https:'),
            photo_credit: artist,
            photo_license: license,
            photo_source_url: info.descriptionurl || `https://commons.wikimedia.org/?curid=${page.pageid}`,
            source: 'commons',
          }
          const pageTitle = String(page.title || '').toLocaleLowerCase('cs-CZ')
          if (pageTitle.includes(key.split(' ')[0])) {
            photoCache.set(key, result)
            return result
          }
          if (!photoCache.has(key)) photoCache.set(key, result)
        }
        const found = photoCache.get(key)
        if (found) return found
      } catch {
        // Continue to the next search phrase.
      }
    }
    photoCache.set(key, null)
    return null
  })()
  lookupPromises.set(key, promise)
  return promise
}

function getNameFromCard(card) {
  return card.querySelector('.placeCopy b')?.textContent?.replace('⭐', '').trim() || ''
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
  const key = normalize(title)
  const stored = photoCache.get(key)
  if (stored) {
    renderPhoto(sheet, title, stored)
    return
  }
  if (stored === null) return
  const found = await searchCommons(title)
  if (found && sheet.isConnected) renderPhoto(sheet, title, found)
}

async function enhance() {
  await loadPhotos()
  document.querySelectorAll('.sheet').forEach((sheet) => { void addDetailPhoto(sheet) })
}

const observer = new MutationObserver(() => {
  document.querySelectorAll('.sheet').forEach((sheet) => { void addDetailPhoto(sheet) })
})
observer.observe(document.body, { childList: true, subtree: true })

window.addEventListener('DOMContentLoaded', () => { void enhance() })
setTimeout(() => { void enhance() }, 800)
setTimeout(() => { void enhance() }, 2500)

const cardObserver = new MutationObserver(() => {
  document.querySelectorAll('.place').forEach((card) => {
    const title = getNameFromCard(card)
    if (title) card.dataset.hradnikName = normalize(title)
  })
})
cardObserver.observe(document.body, { childList: true, subtree: true })
