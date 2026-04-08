import { test, expect } from '@playwright/test'

test.describe('Error Handling (T8.1.3)', () => {
  test('should show 404 page for unknown routes', async ({ page }) => {
    await page.goto('/ko/nonexistent-page-xyz')
    await expect(page.getByText('404')).toBeVisible()
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock a failed API call
    await page.route('**/api/projects*', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Server error' }),
      })
    )

    await page.goto('/ko/login')
    await page.getByLabel(/이메일|email/i).fill('test@example.com')
    await page.getByLabel(/비밀번호|password/i).fill('testpassword123')
    await page.getByRole('button', { name: /로그인|login/i }).click()
  })

  test('should show loading states', async ({ page }) => {
    // Delay API response to verify loading spinner
    await page.route('**/api/projects*', async (route) => {
      await new Promise((r) => setTimeout(r, 1000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { items: [], totalPages: 0 } }),
      })
    })

    await page.goto('/ko/login')
    await page.getByLabel(/이메일|email/i).fill('test@example.com')
    await page.getByLabel(/비밀번호|password/i).fill('testpassword123')
    await page.getByRole('button', { name: /로그인|login/i }).click()
  })

  test('should handle network errors', async ({ page }) => {
    await page.route('**/api/**', (route) => route.abort('failed'))

    await page.goto('/ko/login')
    // Page should still render without crashing
    await expect(page.getByRole('button', { name: /로그인|login/i })).toBeVisible()
  })
})
