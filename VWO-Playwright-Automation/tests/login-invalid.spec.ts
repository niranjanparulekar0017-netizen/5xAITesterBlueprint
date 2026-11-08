import * as allure from 'allure-js-commons';
import { test, expect } from '../fixtures/test-fixtures';
import { credentials, hasValidCredentials, invalidData, SKIP_REASON_NO_CREDENTIALS, VERIFIED } from '../utils/test-data';

interface NegativeCase {
  id: string;
  title: string;
  email?: string;
  password?: string;
  /** Needs a real account so that ONLY the password is wrong. */
  needsValidUser?: boolean;
}

/**
 * Each case was run against the live app (2026-11-08): all produced HTTP 401 from POST /login and
 * the banner text in VERIFIED.authErrorMessage. The app performs no client-side blocking, so the
 * "empty field" and "malformed email" cases are server-rejected too.
 *
 * NOTE: these tests send real (invalid) requests. The app may add a reCAPTCHA or rate-limit after
 * repeated failures from one IP, which can make later cases fail for reasons unrelated to the
 * feature; keep runs infrequent and serial (workers: 1 in playwright.config.ts).
 */
const NEGATIVE_CASES: NegativeCase[] = [
  { id: 'TC-I01', title: 'invalid (unknown) email with a password', email: invalidData.unknownEmail, password: invalidData.wrongPassword },
  { id: 'TC-I02', title: 'valid email with wrong password (invalid password only)', email: credentials.username, password: invalidData.wrongPassword, needsValidUser: true },
  { id: 'TC-I03', title: 'both email and password invalid', email: invalidData.unknownEmail, password: invalidData.wrongPassword },
  { id: 'TC-I04', title: 'empty email with a password', password: invalidData.anyPassword },
  { id: 'TC-I05', title: 'empty password with an email', email: invalidData.unknownEmail },
  { id: 'TC-I06', title: 'both fields empty' },
  { id: 'TC-I07', title: 'malformed email format', email: invalidData.malformedEmail, password: invalidData.anyPassword },
];

test.describe('VWO Login - negative scenarios', () => {
  test.beforeEach(async ({ loginPage }) => {
    await allure.epic('VWO Login');
    await allure.feature('Negative scenarios');
    await loginPage.goto();
  });

  for (const c of NEGATIVE_CASES) {
    test(`${c.id} rejects login: ${c.title}`, async ({ page, loginPage }) => {
      test.skip(!!c.needsValidUser && !hasValidCredentials, SKIP_REASON_NO_CREDENTIALS);
      await allure.description(`Submits: email=${c.email ? `"${c.email}"` : '<empty>'}, password=${c.password ? '<provided>' : '<empty>'}. Expects the verified auth error banner and no access to the authenticated app.`);

      const loginResponse = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/login');
      await loginPage.submitWith(c.email, c.password);

      await test.step('server rejects the attempt', async () => {
        expect((await loginResponse).status()).toBe(401);
      });
      await test.step('auth error message is displayed', async () => {
        await expect(loginPage.errorBanner).toHaveText(VERIFIED.authErrorMessage);
      });
      await test.step('user stays on the login route (no dashboard access)', async () => {
        await expect(page).toHaveURL(VERIFIED.loginHashRoute);
        await expect(loginPage.loginButton).toBeVisible();
      });
    });
  }

  test('TC-I08 password stays masked after a failed attempt', async ({ loginPage }) => {
    await loginPage.submitWith(invalidData.unknownEmail, invalidData.wrongPassword);
    await expect(loginPage.errorBanner).toBeVisible();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  });

  test('TC-I09 password is masked while typing', async ({ loginPage }) => {
    await loginPage.enterPassword(invalidData.wrongPassword);
    expect(await loginPage.getPasswordFieldType()).toBe('password');
  });

  test('TC-I10 no authentication error is shown before any submit', async ({ loginPage }) => {
    await loginPage.enterEmail(invalidData.malformedEmail);
    await expect(loginPage.errorBanner).toBeHidden();
  });

  test.fixme('TC-I11 inline field validation on blur',
    // Observed 2026-11-08: leaving the email field with a malformed value, or leaving fields empty,
    // did NOT make the "Invalid email" / "Required field" spans visible; validation message
    // appeared only as the server-side banner after submit. Revisit if the PRD behaviour ships.
    async ({ loginPage }) => {
      await loginPage.enterEmail(invalidData.malformedEmail);
      await loginPage.passwordInput.focus();
      await expect(loginPage.inlineEmailError).toBeVisible();
    });
});
