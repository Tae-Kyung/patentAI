import { test, expect } from './fixtures/auth'

test.describe('User Flow (T8.1.1)', () => {
  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/ko/dashboard')
    await expect(page).toHaveURL(/\/ko\/login/)
  })

  test('should show dashboard after login', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('should create a new project', async ({ authenticatedPage: page }) => {
    // Mock AI endpoints
    await page.route('**/api/projects/*/idea/expand', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: 'data: {"type":"complete","data":"{}"}\n\n',
      })
    )

    await page.goto('/ko/projects')
    await page.getByRole('button', { name: /새 프로젝트|new project/i }).click()
    await page.getByLabel(/프로젝트 이름|project name/i).fill('E2E 테스트 프로젝트')
    await page.getByRole('button', { name: /생성|create/i }).click()

    // Should redirect to project detail page
    await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+/)
  })

  test('should navigate between project stages', async ({ authenticatedPage: page }) => {
    await page.goto('/ko/projects')

    // Click first project if exists
    const projectCard = page.locator('a[href*="/projects/"]').first()
    if (await projectCard.isVisible()) {
      await projectCard.click()
      await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+/)

      // Verify tabs are visible
      await expect(page.getByRole('tab', { name: /아이디어|idea/i })).toBeVisible()
    }
  })

  test('should display idea input stage correctly', async ({ authenticatedPage: page }) => {
    await page.goto('/ko/projects')

    const projectCard = page.locator('a[href*="/projects/"]').first()
    if (await projectCard.isVisible()) {
      await projectCard.click()

      // Idea tab should be active by default for new projects
      const ideaTab = page.getByRole('tab', { name: /아이디어|idea/i })
      await expect(ideaTab).toBeVisible()
    }
  })
})
