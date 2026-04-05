import { test as base, type Page } from '@playwright/test'

interface AuthFixtures {
  authenticatedPage: Page
  adminPage: Page
}

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/ko/login')
  await page.getByLabel(/이메일|email/i).fill(email)
  await page.getByLabel(/비밀번호|password/i).fill(password)
  await page.getByRole('button', { name: /로그인|login/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 10000 })
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await loginAs(
      page,
      process.env.TEST_USER_EMAIL || 'test@example.com',
      process.env.TEST_USER_PASSWORD || 'testpassword123'
    )
    await use(page)
  },
  adminPage: async ({ page }, use) => {
    await loginAs(
      page,
      process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
      process.env.TEST_ADMIN_PASSWORD || 'adminpassword123'
    )
    await use(page)
  },
})

export { expect } from '@playwright/test'
