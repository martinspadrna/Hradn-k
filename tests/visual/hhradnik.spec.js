import { test, expect } from '@playwright/test'

test.describe('Hradník visual smoke tests', () => {
  test('desktop renders the main application shell', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Hradník/i)
    await expect(page.locator('#app')).toBeVisible()
    await expect(page.locator('body')).toHaveScreenshot('hradnik-desktop.png', { fullPage: true })
  })

  test('iPhone renders the mobile application shell', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Hradník/i)
    await expect(page.locator('#app')).toBeVisible()
    await expect(page.locator('body')).toHaveScreenshot('hradnik-iphone.png', { fullPage: true })
  })
})
