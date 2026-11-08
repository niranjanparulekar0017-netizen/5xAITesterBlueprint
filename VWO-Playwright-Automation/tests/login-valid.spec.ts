import * as allure from 'allure-js-commons';
import { test, expect } from '../fixtures/test-fixtures';
import {
  credentials,
  hasValidCredentials,
  SKIP_REASON_NO_CREDENTIALS,
  VERIFIED,
  VIEWPORTS,
} from '../utils/test-data';

test.describe('VWO Login - positive scenarios', () => {
  test.beforeEach(async ({ loginPage }) => {
    await allure.epic('VWO Login');
    await allure.feature('Positive scenarios');
    await loginPage.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Context/page lifecycle is owned by Playwright (fresh context per test); only log outcome.
    testInfo.annotations.push({ type: 'final-url', description: page.url() });
  });

  test.describe('page load and visibility', () => {
    test('TC-V01 navigates to the login page over HTTPS', async ({ page }) => {
      await allure.description('Verifies the login route loads, is served over HTTPS and has the expected title.');
      await expect(page).toHaveURL(VERIFIED.loginHashRoute);
      expect(new URL(page.url()).protocol, 'Login page must be served over HTTPS').toBe('https:');
      await expect(page).toHaveTitle(VERIFIED.pageTitle);
    });

    test('TC-V02 shows all login controls', async ({ loginPage }) => {
      await allure.description('Verifies the email, password, Remember Me, Sign in, Forgot Password, alternate sign-in options and legal links are visible.');
      for (const [name, locator] of Object.entries({
        emailInput: loginPage.emailInput,
        passwordInput: loginPage.passwordInput,
        rememberMeLabel: loginPage.rememberMeLabel,
        loginButton: loginPage.loginButton,
        forgotPasswordButton: loginPage.forgotPasswordButton,
        googleSignInButton: loginPage.googleSignInButton,
        ssoSignInButton: loginPage.ssoSignInButton,
        passkeySignInButton: loginPage.passkeySignInButton,
        freeTrialLink: loginPage.freeTrialLink,
        privacyPolicyLink: loginPage.privacyPolicyLink,
        termsLink: loginPage.termsLink,
      })) {
        await test.step(`${name} is unique and visible`, async () => {
          await loginPage.unique(locator, name);
          await expect(locator, name).toBeVisible();
        });
      }
    });

    test('TC-V03 shows no authentication error on first load', async ({ loginPage }) => {
      await expect(loginPage.errorBanner).toBeHidden();
    });
  });

  test.describe('field behaviour', () => {
    test('TC-V04 email field accepts input', async ({ loginPage }) => {
      await expect(loginPage.emailInput).toBeEditable();
      await loginPage.enterEmail('someone@example.com');
      await expect(loginPage.emailInput).toHaveValue('someone@example.com');
    });

    test('TC-V05 password field accepts input and masks it', async ({ loginPage }) => {
      await loginPage.enterPassword('Masked#123');
      await expect(loginPage.passwordInput).toHaveValue('Masked#123');
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    });

    test('TC-V06 password visibility toggle reveals and re-masks the password', async ({ loginPage }) => {
      await loginPage.enterPassword('Masked#123');
      await loginPage.togglePasswordVisibility();
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');
      await loginPage.togglePasswordVisibility();
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    });

    test('TC-V07 Remember Me is unchecked by default and can be toggled', async ({ loginPage }) => {
      await expect(loginPage.rememberMeCheckbox).not.toBeChecked();
      await loginPage.setRememberMe(true);
      await expect(loginPage.rememberMeCheckbox).toBeChecked();
      await loginPage.setRememberMe(false);
      await expect(loginPage.rememberMeCheckbox).not.toBeChecked();
    });
  });

  test.describe('navigation links', () => {
    test('TC-V08 Forgot Password opens the reset form and Back returns to login', async ({ page, loginPage }) => {
      await loginPage.clickForgotPassword();
      await expect(page).toHaveURL(VERIFIED.forgotPasswordHashRoute);
      await expect(loginPage.forgotPasswordForm).toBeVisible();
      await expect(loginPage.loginForm).toBeHidden();

      await loginPage.clickForgotPasswordBack();
      await expect(loginPage.loginForm).toBeVisible();
      await expect(page).toHaveURL(VERIFIED.loginHashRoute);
    });

    test('TC-V09 Free trial link opens the Wingify free-trial page in a new tab', async ({ page, loginPage }) => {
      await expect(loginPage.freeTrialLink).toHaveAttribute('target', '_blank');
      const popupPromise = page.waitForEvent('popup');
      await loginPage.freeTrialLink.click();
      const popup = await popupPromise;
      await expect(popup).toHaveURL(VERIFIED.freeTrialUrl);
    });
  });

  test.describe('keyboard and responsive', () => {
    test('TC-V10 Tab order follows email > password > visibility toggle > forgot > sign in', async ({ page, loginPage }) => {
      await loginPage.emailInput.focus();
      await expect(loginPage.emailInput).toBeFocused();
      for (const next of [
        loginPage.passwordInput,
        loginPage.passwordVisibilityToggle,
        loginPage.forgotPasswordButton,
        loginPage.loginButton,
      ]) {
        await page.keyboard.press('Tab');
        await expect(next).toBeFocused();
      }
    });

    test('TC-V11 Enter key in the password field submits the form', async ({ page, loginPage }) => {
      // Intercept the auth call so no real credentials are submitted; asserts only that Enter triggers it.
      const loginRequest = page.waitForRequest((r) => r.method() === 'POST' && new URL(r.url()).pathname === '/login');
      await page.route((url) => url.pathname === '/login', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
      await loginPage.enterEmail('keyboard@example.com');
      await loginPage.enterPassword('Keyboard#123');
      await loginPage.passwordInput.press('Enter');
      await loginRequest;
    });

    for (const [name, viewport] of Object.entries({ mobile: VIEWPORTS.mobile, tablet: VIEWPORTS.tablet, desktop: VIEWPORTS.desktop })) {
      test(`TC-V12 login form is usable and inside the viewport at ${name} size`, async ({ page, loginPage }) => {
        await page.setViewportSize(viewport);
        for (const locator of [loginPage.emailInput, loginPage.passwordInput, loginPage.loginButton]) {
          await expect(locator).toBeVisible();
          const box = await locator.boundingBox();
          expect(box, 'element must have a layout box').not.toBeNull();
          expect(box!.x).toBeGreaterThanOrEqual(0);
          expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
        }
      });
    }

    test.fixme('TC-V13 Light/Dark mode option',
      // Inspected 2026-11-08: no Light/Dark control exists on the login page DOM
      // (the only theme-related markup is loader images). Cannot be automated until the UI adds one.
      async () => { /* intentionally empty */ });
  });

  test.describe('loading state', () => {
    test('TC-V14 Sign in button shows an in-progress state while authentication is pending', async ({ page, loginPage }) => {
      await allure.description('The app adds class "is-in-action" to the submit button during the POST /login request. The request is held by a route handler (not a fixed sleep) so the state is observable deterministically; it is then answered with a stubbed 401 so no real credential is submitted.');
      let release!: () => void;
      const gate = new Promise<void>((resolve) => { release = resolve; });
      await page.route((url) => url.pathname === '/login', async (route) => {
        await gate;
        await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
      });

      await loginPage.login('loading@example.com', 'Loading#123');
      await expect(loginPage.loginButtonInProgress).toBeVisible();
      release();
      await expect(loginPage.loginButtonInProgress).toBeHidden();
    });
  });

  test.describe('successful authentication (requires test data)', () => {
    test.skip(!hasValidCredentials, SKIP_REASON_NO_CREDENTIALS);

    test('TC-V15 valid credentials lead away from the login route to the authenticated app', async ({ page, loginPage }) => {
      await allure.description('Requires VWO_USERNAME/VWO_PASSWORD. Only the verifiable outcome is asserted: the app leaves #/login and no auth error is shown. Dashboard content selectors have not been inspected (no credentials were available), so none are asserted. Accounts with 2FA, reCAPTCHA or SSO enforcement will not pass.');
      await loginPage.login(credentials.username, credentials.password);
      await expect(page).not.toHaveURL(VERIFIED.loginHashRoute, { timeout: 30_000 });
      await expect(loginPage.errorBanner).toBeHidden();
    });

    test('TC-V16 valid login with Remember Me selected succeeds', async ({ page, loginPage }) => {
      await loginPage.login(credentials.username, credentials.password, true);
      await expect(page).not.toHaveURL(VERIFIED.loginHashRoute, { timeout: 30_000 });
    });
  });
});
