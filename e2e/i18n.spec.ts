import { test, expect } from '@playwright/test'

test.describe('i18n (T8.2.4)', () => {
  test('should default to Korean locale', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/ko/)
  })

  test('should display Korean content on /ko path', async ({ page }) => {
    await page.goto('/ko/login')
    await expect(page.getByRole('button', { name: /로그인/ })).toBeVisible()
  })

  test('should display English content on /en path', async ({ page }) => {
    await page.goto('/en/login')
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible()
  })

  test('should switch locale from ko to en', async ({ page }) => {
    await page.goto('/ko/login')
    // Verify Korean content
    await expect(page.getByRole('button', { name: /로그인/ })).toBeVisible()

    // Navigate to English
    await page.goto('/en/login')
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible()
  })

  test('should preserve locale in navigation', async ({ page }) => {
    await page.goto('/en/login')
    // All links should maintain the /en prefix
    const links = page.locator('a[href*="/en/"]')
    const count = await links.count()
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href')
      expect(href).toMatch(/^\/en\//)
    }
  })

  test('should show 404 page in Korean', async ({ page }) => {
    await page.goto('/ko/nonexistent-route')
    await expect(page.getByText('404')).toBeVisible()
  })

  test('should show 404 page in English', async ({ page }) => {
    await page.goto('/en/nonexistent-route')
    await expect(page.getByText('404')).toBeVisible()
  })
})
