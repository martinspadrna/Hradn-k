import { test, expect } from '@playwright/test'

const tabs = ['Mapa', 'Seznam', 'Oblíbené', 'Vyhledávání', 'Kategorie', 'O aplikaci']
const types = ['Vše', 'Hrad', 'Zámek', 'Zřícenina', 'Tvrz', 'Klášter', 'Opevněné místo']
const preservation = ['current', 'ruin', 'preserved', 'extinct', 'uncertain', 'all']
const mapStates = ['all', 'none', 'want', 'visited', 'favorite']
const samplePlaces = [
  { id: 1, name: 'Hrad Test', kind: 'Hrad', character: 'dochovaný hrad', district: 'Trutnov', region: 'Královéhradecký', municipality: 'Hostinné', latitude: 50.54, longitude: 15.72, description: 'Dochovaný hrad', official_url: null, ticket_url: null, opening_hours: null, ticket_prices: null, photo_urls: [], source_url: null, source_updated_at: null, last_verified_at: null },
  { id: 2, name: 'Zřícenina Test', kind: 'Zřícenina', character: 'zřícenina', district: 'Jičín', region: 'Královéhradecký', municipality: 'Testov', latitude: 50.44, longitude: 15.35, description: 'Zřícenina hradu', official_url: null, ticket_url: null, opening_hours: null, ticket_prices: null, photo_urls: [], source_url: null, source_updated_at: null, last_verified_at: null },
  { id: 3, name: 'Zámek Test', kind: 'Zámek', character: 'zaniklý', district: 'Náchod', region: 'Královéhradecký', municipality: 'Testov', latitude: 50.41, longitude: 16.16, description: 'Zaniklý objekt', official_url: null, ticket_url: null, opening_hours: null, ticket_prices: null, photo_urls: [], source_url: null, source_updated_at: null, last_verified_at: null },
  { id: 4, name: 'Tvrz Test', kind: 'Tvrz', character: 'domnělá tvrz', district: 'Hradec Králové', region: 'Královéhradecký', municipality: 'Testov', latitude: 50.20, longitude: 15.83, description: 'Domnělé terénní pozůstatky', official_url: null, ticket_url: null, opening_hours: null, ticket_prices: null, photo_urls: [], source_url: null, source_updated_at: null, last_verified_at: null },
  { id: 5, name: 'Klášter Test', kind: 'Klášter', character: 'dochovaný klášter', district: 'Liberec', region: 'Liberecký', municipality: 'Testov', latitude: 50.77, longitude: 15.05, description: 'Dochovaný klášter', official_url: null, ticket_url: null, opening_hours: null, ticket_prices: null, photo_urls: [], source_url: null, source_updated_at: null, last_verified_at: null }
]

async function prepareVisualSession(page) {
  await page.addInitScript(() => {
    localStorage.setItem('hradnik_session', 'visual-regression-session')
    localStorage.setItem('hradnik_user', JSON.stringify({ username: 'visual-test' }))
  })
  await page.route('**/rest/v1/hradnik_places*', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(samplePlaces) }))
  await page.route('**/functions/v1/hradnik-auth', async route => {
    let body = {}
    try { body = route.request().postDataJSON() || {} } catch {}
    if (body.action === 'session') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'visual-test', username: 'visual-test' } }) })
    if (body.action === 'state_list') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: [{ place_id: 1, status: 'visited', favorite: true, rating: 5, visited_on: '2026-08-01', note: 'Testovací návštěva' }] }) })
    if (body.action === 'state_upsert') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: { place_id: body.place_id, status: body.status || 'none', favorite: !!body.favorite, rating: body.rating || 0, visited_on: body.visited_on || null, note: body.note || '' } }) })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: {} }) })
  })
}

async function prepareLoggedOutSession(page) {
  await page.addInitScript(() => { localStorage.removeItem('hradnik_session'); localStorage.removeItem('hradnik_user') })
  await page.route('**/functions/v1/hradnik-auth', async route => {
    let body = {}
    try { body = route.request().postDataJSON() || {} } catch {}
    if (body.action === 'session') return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'No active session' }) })
    return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }) })
  })
}

async function assertNoPageErrors(page) {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  return errors
}

async function gotoLoggedIn(page) {
  await prepareVisualSession(page)
  await page.goto('/')
  await expect(page.locator('#app')).toBeVisible()
  await expect(page.locator('.redesign-nav button')).toHaveCount(6)
}

async function captureAllTabs(page, testInfo, suffix) {
  await gotoLoggedIn(page)
  const nav = page.locator('.redesign-nav button')
  for (let i = 0; i < tabs.length; i++) {
    await nav.nth(i).click()
    await page.waitForTimeout(i === 0 ? 900 : 350)
    await expect(page.locator('#app')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`${suffix}-${String(i + 1).padStart(2, '0')}-${tabs[i].toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`), fullPage: true })
  }
}

test.describe('Hradník visual smoke tests', () => {
  test('desktop captures every tab', async ({ page }, testInfo) => { await captureAllTabs(page, testInfo, 'hradnik-desktop') })
  test('iPhone captures every tab', async ({ page }, testInfo) => { await captureAllTabs(page, testInfo, 'hradnik-iphone') })
})

test.describe('Hradník exhaustive interaction tests', () => {
  test('logged-out state shows auth and no app', async ({ page }) => {
    const errors = await assertNoPageErrors(page)
    await prepareLoggedOutSession(page)
    await page.goto('/')
    await expect(page.locator('.auth')).toBeVisible()
    await expect(page.locator('.redesign-nav')).toHaveCount(0)
    expect(await page.locator('.auth button:visible').count()).toBeGreaterThan(0)
    expect(errors).toEqual([])
  })

  test('every main navigation button opens its intended screen', async ({ page }) => {
    const errors = await assertNoPageErrors(page)
    await gotoLoggedIn(page)
    const nav = page.locator('.redesign-nav button')
    const expected = ['Mapa památek', 'Historická místa', 'Naše místa', 'Historická místa', 'Naše návštěvy', 'Naše sbírka']
    for (let i = 0; i < 6; i++) {
      await nav.nth(i).click()
      await expect(page.locator('#content h1')).toHaveText(expected[i])
    }
    await nav.nth(3).click()
    await expect(page.locator('#search')).toBeFocused()
    expect(errors).toEqual([])
  })

  test('catalog exercises search, every type chip and every preservation filter', async ({ page }) => {
    const errors = await assertNoPageErrors(page)
    await gotoLoggedIn(page)
    const nav = page.locator('.redesign-nav button')
    await nav.nth(1).click()
    await expect(page.locator('#search')).toBeVisible()
    await page.locator('#preservation').selectOption('all')
    await page.locator('#search').fill('test')
    await expect(page.locator('#list .place')).toHaveCount(5)
    await page.locator('#search').fill('hrad')
    await expect(page.locator('#list .place')).toHaveCount(2)
    await page.locator('#search').fill('nic-takového')
    await expect(page.locator('.empty')).toBeVisible()
    for (const type of types) {
      await nav.nth(1).click()
      await page.locator('#typeChips button').filter({ hasText: type }).click()
      await expect(page.locator('#list')).toBeVisible()
    }
    for (const value of preservation) {
      await nav.nth(1).click()
      await page.locator('#preservation').selectOption(value)
      await expect(page.locator('#list')).toBeVisible()
    }
    expect(errors).toEqual([])
  })

  test('mine buttons, quick actions and detail actions work', async ({ page }) => {
    const errors = await assertNoPageErrors(page)
    await gotoLoggedIn(page)
    const nav = page.locator('.redesign-nav button')
    await nav.nth(1).click()
    const first = page.locator('.place').first()
    await expect(first).toBeVisible()
    if (await page.locator('.quick').first().isVisible()) {
      await first.locator('.want').click()
      await first.locator('.visit').click()
    }
    await first.locator('.placeMain').click()
    await expect(page.locator('.overlay .sheet')).toBeVisible()
    for (const selector of ['#closeDetail', '#want', '#visit', '#fav']) {
      const button = page.locator(selector)
      if (await button.count()) await expect(button).toBeVisible()
    }
    await page.locator('#closeDetail').click()
    await nav.nth(2).click()
    for (const id of ['#mw', '#mv', '#mf']) {
      await page.locator(id).click()
      await expect(page.locator('#mineList')).toBeVisible()
    }
    expect(errors).toEqual([])
  })

  test('map exercises every type, preservation and state option', async ({ page }) => {
    const errors = await assertNoPageErrors(page)
    await gotoLoggedIn(page)
    const nav = page.locator('.redesign-nav button')
    await nav.nth(0).click()
    await expect(page.locator('#map')).toBeVisible()
    const mapTypeButtons = page.locator('#mapTypes button')
    if (await mapTypeButtons.first().isVisible()) {
      for (const type of types) {
        await mapTypeButtons.filter({ hasText: type }).click()
        await expect(page.locator('#map')).toBeVisible()
      }
      for (const value of preservation) {
        await page.locator('#mapPreservation').selectOption(value)
        await expect(page.locator('#map')).toBeVisible()
      }
      for (const value of mapStates) {
        await page.locator('#mapState').selectOption(value)
        await expect(page.locator('#map')).toBeVisible()
      }
    }
    expect(errors).toEqual([])
  })

  test('hamburger menu exercises every item, close paths and all settings switches', async ({ page }) => {
    const errors = await assertNoPageErrors(page)
    await gotoLoggedIn(page)
    const trigger = page.locator('.redesign-menu-trigger')
    await expect(trigger).toBeVisible()
    for (const action of ['account', 'settings', 'mapsettings', 'help', 'about']) {
      await trigger.click()
      await expect(page.locator('.redesign-drawer.open')).toBeVisible()
      await page.locator(`[data-menu="${action}"]`).click()
      await expect(page.locator('.redesign-panel.open')).toBeVisible()
      await page.locator('.redesign-panel-back').click()
      await expect(page.locator('.redesign-panel.open')).toHaveCount(0)
    }
    await trigger.click()
    await page.locator('.redesign-drawer-close').click()
    await expect(page.locator('.redesign-drawer.open')).toHaveCount(0)
    await trigger.click()
    await page.locator('.redesign-drawer-backdrop').click({ position: { x: 5, y: 5 } })
    await expect(page.locator('.redesign-drawer.open')).toHaveCount(0)
    await trigger.click()
    await page.locator('[data-menu="settings"]').click()
    for (const input of await page.locator('[data-setting]').all()) await input.click()
    await expect(page.locator('[data-setting="confirmVisit"]')).toBeVisible()
    await expect(page.locator('[data-setting="autoDetail"]')).toBeVisible()
    await expect(page.locator('[data-setting="animations"]')).toBeVisible()
    await page.locator('.redesign-panel-back').click()
    expect(errors).toEqual([])
  })

  test('header search and mobile controls respond', async ({ page }) => {
    const errors = await assertNoPageErrors(page)
    await gotoLoggedIn(page)
    const global = page.locator('.globalSearch')
    if (await global.isVisible()) {
      await global.fill('Hrad Test')
      await global.press('Enter')
      await expect(page.locator('#search')).toHaveValue('Hrad Test')
    }
    const mobileSearch = page.locator('.mobileHeaderSearch')
    if (await mobileSearch.isVisible()) {
      await mobileSearch.click()
      await expect(page.locator('#search')).toBeFocused()
    }
    const mobileMenu = page.locator('.mobileHeaderMenu')
    if (await mobileMenu.isVisible()) await mobileMenu.click()
    expect(errors).toEqual([])
  })
})
