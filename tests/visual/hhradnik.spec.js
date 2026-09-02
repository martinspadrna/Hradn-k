import { test, expect } from '@playwright/test'

const tabs = ['Mapa', 'Seznam', 'Oblíbené', 'Vyhledávání', 'Kategorie', 'O aplikaci']

async function prepareVisualSession(page) {
  await page.addInitScript(() => {
    localStorage.setItem('hradnik_session', 'visual-regression-session')
    localStorage.setItem('hradnik_user', JSON.stringify({ username: 'visual-test' }))
  })

  await page.route('**/functions/v1/hradnik-auth', async route => {
    const request = route.request()
    let body = {}
    try { body = request.postDataJSON() || {} } catch {}

    if (body.action === 'session') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'visual-test', username: 'visual-test' } }) })
    }
    if (body.action === 'state_list') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: [] }) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: {} }) })
  })
}

async function prepareLoggedOutSession(page) {
  await page.addInitScript(() => {
    localStorage.removeItem('hradnik_session')
    localStorage.removeItem('hradnik_user')
  })
  await page.route('**/functions/v1/hradnik-auth', async route => {
    let body = {}
    try { body = route.request().postDataJSON() || {} } catch {}
    if (body.action === 'session') {
      return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'No active session' }) })
    }
    return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }) })
  })
}

async function assertNoPageErrors(page) {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  return errors
}

async function captureAllTabs(page, testInfo, suffix) {
  await prepareVisualSession(page)
  await page.goto('/')
  await expect(page).toHaveTitle(/Hradník/i)
  await expect(page.locator('#app')).toBeVisible()

  const nav = page.locator('.redesign-nav button')
  await expect(nav).toHaveCount(6)

  for (let i = 0; i < tabs.length; i++) {
    await nav.nth(i).click()
    await page.waitForTimeout(i === 0 ? 900 : 350)
    await expect(page.locator('#app')).toBeVisible()
    await page.screenshot({
      path: testInfo.outputPath(`${suffix}-${String(i + 1).padStart(2, '0')}-${tabs[i].toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`),
      fullPage: true
    })
  }
}

test.describe('Hradník visual smoke tests', () => {
  test('desktop captures every tab', async ({ page }, testInfo) => {
    await captureAllTabs(page, testInfo, 'hradnik-desktop')
  })

  test('iPhone captures every tab', async ({ page }, testInfo) => {
    await captureAllTabs(page, testInfo, 'hradnik-iphone')
  })
})

test.describe('Hradník auth and interaction smoke tests', () => {
  test('logged-out auth screen renders correctly', async ({ page }, testInfo) => {
    await prepareLoggedOutSession(page)
    const errors = await assertNoPageErrors(page)
    await page.goto('/')
    await expect(page).toHaveTitle(/Hradník/i)
    await expect(page.locator('#app')).toBeVisible()
    await expect(page.locator('.auth')).toBeVisible()
    await expect(page.locator('.auth button')).toHaveCountGreaterThan(0)
    await expect(page.locator('.auth button:visible')).toHaveCountGreaterThan(0)
    await page.screenshot({ path: testInfo.outputPath('hradnik-auth-logged-out.png'), fullPage: true })
    expect(errors).toEqual([])
  })

  test('main controls respond without JavaScript errors', async ({ page }) => {
    await prepareVisualSession(page)
    const errors = await assertNoPageErrors(page)
    await page.goto('/')
    await expect(page.locator('.redesign-nav button')).toHaveCount(6)

    const nav = page.locator('.redesign-nav button')
    for (let i = 0; i < 6; i++) {
      await nav.nth(i).click()
      await expect(page.locator('#app')).toBeVisible()
    }

    await nav.nth(1).click()
    await expect(page.locator('#content h1')).toHaveText('Historická místa')
    await page.locator('#search').fill('hrad')
    await expect(page.locator('#list')).toBeVisible()
    await page.locator('#preservation').selectOption('all')
    await expect(page.locator('#list')).toBeVisible()

    await nav.nth(2).click()
    await page.locator('#mw').click()
    await page.locator('#mv').click()
    await page.locator('#mf').click()
    await expect(page.locator('#mineList')).toBeVisible()

    await nav.nth(0).click()
    await expect(page.locator('#map')).toBeVisible()
    await page.locator('#mapPreservation').selectOption('all')
    await page.locator('#mapState').selectOption('none')
    await expect(page.locator('#map')).toBeVisible()

    expect(errors).toEqual([])
  })
})
