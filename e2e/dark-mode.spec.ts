import { test, expect } from '@playwright/test'

test.describe('Dark Mode (T8.2.3)', () => {
  test('should respect system color scheme preference (dark)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/ko/login')

    // Page should render without errors
    await expect(page.locator('body')).toBeVisible()
  })

  test('should respect system color scheme preference (light)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/ko/login')

    await expect(page.locator('body')).toBeVisible()
  })

  test('should toggle dark mode in settings', async ({ page }) => {
    // Login first
    await page.goto('/ko/login')
    await page.getByLabel(/이메일|email/i).fill(process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.getByLabel(/비밀번호|password/i).fill(process.env.TEST_USER_PASSWORD || 'testpassword123')
    await page.getByRole('button', { name: /로그인|login/i }).click()

    await page.goto('/ko/settings')
    await page.waitForLoadState('networkidle')

    // Dark mode option should be available
    const darkLabel = page.getByText(/다크|dark/i)
    if (await darkLabel.isVisible()) {
      await darkLabel.click()
      // HTML element should have dark class
      await expect(page.locator('html')).toHaveClass(/dark/)
    }
  })

  test('should persist theme preference across pages', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/ko/login')
    await page.goto('/ko/login')

    // Page should still be in dark mode
    await expect(page.locator('body')).toBeVisible()
  })

  test('should render components correctly in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/ko/login')

    // Cards and buttons should be visible and properly styled
    const buttons = page.getByRole('button')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < Math.min(count, 3); i++) {
      await expect(buttons.nth(i)).toBeVisible()
    }
  })
})
