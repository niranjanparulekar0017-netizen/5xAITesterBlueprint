import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

interface Fixtures {
  /** A LoginPage bound to a fresh, isolated browser context/page (not yet navigated). */
  loginPage: LoginPage;
  /** Collects console errors, page errors and failed requests; attached to the report on failure. */
  diagnostics: string[];
}

export const test = base.extend<Fixtures>({
  diagnostics: async ({ page }, use, testInfo) => {
    const log: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') log.push(`[console.error] ${m.text()}`); });
    page.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
    page.on('requestfailed', (r) => log.push(`[requestfailed] ${r.method()} ${r.url()} - ${r.failure()?.errorText ?? 'unknown'}`));
    page.on('response', (r) => { if (r.status() >= 400) log.push(`[http ${r.status()}] ${r.request().method()} ${r.url()}`); });

    await use(log);

    // Runs even when the test failed, so diagnostics are never lost (original error is untouched).
    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('failure-diagnostics.txt', {
        body: [`URL: ${page.url()}`, `Status: ${testInfo.status}`, '', ...log].join('\n'),
        contentType: 'text/plain',
      });
    }
  },

  loginPage: async ({ page, diagnostics }, use) => {
    void diagnostics; // ensure listeners are registered for every test using loginPage
    await use(new LoginPage(page));
  },
});

export { expect };
