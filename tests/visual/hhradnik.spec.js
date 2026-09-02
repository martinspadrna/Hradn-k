import { test, expect } from '@playwright/test'

const tabs = ['Mapa', 'Seznam', 'Oblíbené', 'Vyhledávání', 'Kategorie', 'O aplikaci']

async function captureAllTabs(page, testInfo, suffix) {
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
