import { test, expect } from '@playwright/test'

const samplePlaces = [
  { id: 1, name: 'Hrad Test', kind: 'Hrad', character: 'dochovaný hrad', district: 'Trutnov', region: 'Královéhradecký', municipality: 'Hostinné', latitude: 50.54, longitude: 15.72, description: 'Dochovaný hrad', official_url: null, ticket_url: null, opening_hours: null, ticket_prices: null, photo_urls: [] },
  { id: 2, name: 'Zřícenina Test', kind: 'Zřícenina', character: 'zřícenina', district: 'Jičín', region: 'Královéhradecký', municipality: 'Testov', latitude: 50.44, longitude: 15.35, description: 'Zřícenina hradu', official_url: null, ticket_url: null, opening_hours: null, ticket_prices: null, photo_urls: [] },
  { id: 3, name: 'Zámek Test', kind: 'Zámek', character: 'zaniklý', district: 'Náchod', region: 'Královéhradecký', municipality: 'Testov', latitude: 50.41, longitude: 16.16, description: 'Zaniklý objekt', official_url: null, ticket_url: null, opening_hours: { po: '9:00–17:00' }, ticket_prices: { adult: 180 }, photo_urls: [] },
  { id: 4, name: 'Tvrz Test', kind: 'Tvrz', character: 'domnělá tvrz', district: 'Hradec Králové', region: 'Královéhradecký', municipality: 'Testov', latitude: 50.20, longitude: 15.83, description: 'Domnělé terénní pozůstatky', official_url: null, ticket_url: null, opening_hours: null, ticket_prices: null, photo_urls: [] },
  { id: 5, name: 'Klášter Test', kind: 'Klášter', character: 'dochovaný klášter', district: 'Liberec', region: 'Liberecký', municipality: 'Testov', latitude: 50.77, longitude: 15.05, description: 'Dochovaný klášter', official_url: null, ticket_url: null, opening_hours: null, ticket_prices: null, photo_urls: [] }
]

async function mockBackend(page, loggedIn = true) {
  await page.addInitScript(loggedIn => {
    if (loggedIn) localStorage.setItem('hradnik_session', 'visual-regression-session')
    else localStorage.removeItem('hradnik_session')
  }, loggedIn)

  await page.route('**/rest/v1/hradnik_places*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'content-range': '0-4/5' },
    body: JSON.stringify(samplePlaces)
  }))

  await page.route('**/functions/v1/hradnik-auth', route => {
    let body = {}
    try { body = route.request().postDataJSON() || {} } catch {}
    if (!loggedIn) return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }) })
    if (body.action === 'me') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'visual-test', username: 'visual-test' } }) })
    if (body.action === 'state_list') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: [{ place_id: 1, status: 'visited', favorite: true, rating: 5, visited_on: '2026-08-01', note: 'Testovací návštěva' }] }) })
    if (body.action === 'state_upsert') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: { place_id: body.place_id, status: body.status || 'none', favorite: !!body.favorite } }) })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
  })
}

async function openApp(page, loggedIn = true) {
  await mockBackend(page, loggedIn)
  await page.goto('/')
  const nav = page.locator('.redesign-sidebar .redesign-nav > button')
  await expect(nav).toHaveCount(6, { timeout: 15000 })
  await expect(page.locator('.redesign-sidebar')).toBeVisible()
  await expect(page.locator('header')).toBeVisible()
  return nav
}

async function waitDestination(page, index) {
  if (index === 0) await expect(page.locator('#map')).toBeVisible({ timeout: 10000 })
  if (index === 1) await expect(page.locator('#search')).toBeVisible()
  if (index === 2) await expect(page.locator('#mineList')).toBeVisible()
  if (index === 3) await expect(page.locator('#search')).toBeFocused()
  if (index === 4) await expect(page.locator('.reference-category-page')).toBeVisible()
  if (index === 5) await expect(page.locator('.reference-about-page')).toBeVisible()
}

async function closeMapDetailIfOpen(page) {
  const close = page.locator('.overlay .close')
  if (await close.isVisible().catch(() => false)) {
    await close.click()
    await expect(page.locator('.overlay')).toHaveCount(0)
  }
}

test('captures all six reference destinations', async ({ page }, testInfo) => {
  const nav = await openApp(page)
  const labels = ['mapa','seznam','oblibene','vyhledavani','kategorie','o-aplikaci']

  for (let i = 0; i < 5; i++) {
    await nav.nth(i).click()
    await waitDestination(page, i)
    await page.waitForTimeout(i === 0 ? 900 : 220)
    await page.screenshot({
      path: testInfo.outputPath(`hradnik-${testInfo.project.name}-${String(i + 1).padStart(2, '0')}-${labels[i]}.png`),
      fullPage: true
    })
  }

  if (testInfo.project.name === 'desktop') {
    await nav.nth(5).click()
  } else {
    await page.locator('.mobileHeaderMenu').click()
    await expect(page.locator('.reference-mobile-drawer')).toHaveClass(/open/)
    await page.locator('[data-ref-mobile="about"]').click()
  }
  await waitDestination(page, 5)
  await page.waitForTimeout(220)
  await page.screenshot({
    path: testInfo.outputPath(`hradnik-${testInfo.project.name}-06-${labels[5]}.png`),
    fullPage: true
  })
})

test('desktop/mobile shell matches the reference structure', async ({ page }) => {
  const nav = await openApp(page)
  await expect(nav.nth(0)).toContainText('Mapa')
  await expect(nav.nth(1)).toContainText('Seznam')
  await expect(nav.nth(2)).toContainText('Oblíbené')
  await expect(nav.nth(3)).toContainText('Vyhledávání')
  await expect(nav.nth(4)).toContainText(/Kategorie|Více/)

  if (test.info().project.name === 'desktop') {
    const sidebarBox = await page.locator('.redesign-sidebar').boundingBox()
    expect(sidebarBox?.width).toBeGreaterThan(180)
    expect(sidebarBox?.width).toBeLessThan(205)
    await expect(page.locator('.globalSearch')).toBeVisible()
    await expect(page.locator('.reference-favorites-button')).toBeVisible()
    await expect(page.locator('.reference-settings-button')).toBeVisible()
  } else {
    await expect(page.locator('.mobileHeaderMenu')).toBeVisible()
    await expect(page.locator('.mobileHeaderSearch')).toBeVisible()
    await expect(nav.nth(5)).toBeHidden()
  }
})

test('search, categories and favorites route to useful screens', async ({ page }) => {
  const nav = await openApp(page)
  await nav.nth(3).click()
  await expect(page.locator('#search')).toBeFocused()
  await page.locator('#search').fill('Hrad Test')
  await expect(page.locator('#list .place')).toHaveCount(1)

  await nav.nth(4).click()
  await expect(page.locator('.reference-category-card')).toHaveCount(6)
  await page.locator('.reference-category-card').filter({ hasText: 'Zřícenina' }).click()
  await expect(page.locator('#list')).toBeVisible()

  const currentNav = page.locator('.redesign-sidebar .redesign-nav > button')
  await currentNav.nth(2).click()
  await expect(page.locator('#mineList')).toBeVisible()
})

test('map, list detail and settings remain interactive', async ({ page }) => {
  let nav = await openApp(page)
  await nav.nth(0).click()
  await expect(page.locator('#map')).toBeVisible()
  await page.waitForTimeout(500)
  await closeMapDetailIfOpen(page)

  const mapTypes = page.locator('#mapTypes button')
  if (await mapTypes.count()) {
    await page.locator('.reference-filter-button').click()
    const ruinFilter = mapTypes.filter({ hasText: 'Zřícenina' })
    await expect(ruinFilter).toBeVisible()
    await ruinFilter.click()
    await expect(page.locator('#map')).toBeVisible()
  }

  nav = page.locator('.redesign-sidebar .redesign-nav > button')
  await nav.nth(1).click()
  await expect(page.locator('.place').first()).toBeVisible()
  await page.locator('.placeMain').first().click()
  await expect(page.locator('.overlay .sheet')).toBeVisible()
  await page.locator('.overlay .close').click()
  await expect(page.locator('.overlay')).toHaveCount(0)

  if (test.info().project.name === 'desktop') {
    await page.locator('.reference-settings-button').click()
  } else {
    await page.locator('.mobileHeaderMenu').click()
    await page.locator('[data-ref-mobile="settings"]').click()
  }
  await expect(page.locator('.reference-settings-panel')).toBeVisible()
  await expect(page.locator('.reference-check-update')).toBeVisible()
  await page.locator('.reference-settings-close').click()
})

test('PWA update bridge is installed and guest mode still boots', async ({ page }) => {
  await openApp(page, false)
  const bridge = await page.evaluate(() => ({
    check: typeof window.hradnikPwaCheck,
    apply: typeof window.hradnikPwaApply,
    available: typeof window.hradnikPwaUpdateAvailable
  }))
  expect(bridge.check).toBe('function')
  expect(bridge.apply).toBe('function')
  expect(bridge.available).toBe('boolean')
})
