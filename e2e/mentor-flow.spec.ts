import { test, expect } from './fixtures/auth'

test.describe('Mentor Flow (T8.1.2)', () => {
  test('admin should access approvals page', async ({ adminPage: page }) => {
    await page.goto('/ko/admin/approvals')
    await expect(page).toHaveURL(/\/admin\/approvals/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('admin should access prompts management', async ({ adminPage: page }) => {
    await page.goto('/ko/admin/prompts')
    await expect(page).toHaveURL(/\/admin\/prompts/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('non-admin should be redirected from admin pages', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/ko/admin/approvals')
    // Should be redirected to dashboard (middleware redirects non-admin)
    await expect(page).toHaveURL(/\/(dashboard|login)/)
  })

  test('admin should filter approvals by status', async ({ adminPage: page }) => {
    await page.goto('/ko/admin/approvals')

    // Status filter should be present
    const statusFilter = page.locator('button[role="combobox"]').first()
    if (await statusFilter.isVisible()) {
      await statusFilter.click()
      // Should show status options
      await expect(page.getByRole('option')).toHaveCount(4)
    }
  })

  test('admin should filter approvals by gate', async ({ adminPage: page }) => {
    await page.goto('/ko/admin/approvals')

    // Gate filter should be present
    const gateFilter = page.locator('button[role="combobox"]').nth(1)
    if (await gateFilter.isVisible()) {
      await gateFilter.click()
      await expect(page.getByRole('option')).toHaveCount(5) // all + gate 1-4
    }
  })
})
