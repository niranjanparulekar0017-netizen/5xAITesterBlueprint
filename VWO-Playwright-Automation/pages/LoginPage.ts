import { expect, Locator, Page } from '@playwright/test';

/**
 * Error type that preserves the original error (`cause`) and adds page diagnostics.
 */
export class LoginPageError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(cause instanceof Error ? `${message}\n  caused by: ${cause.message}` : message);
    this.name = 'LoginPageError';
    if (cause instanceof Error && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Page Object for https://app.wingify.com/#/login
 *
 * Locator policy: XPath only, relative, scoped to the login form (//form[@id="js-login-form"]).
 * Every expression below was verified against the live DOM (2026-11-08). The page also contains
 * hidden forms (password reset, forgot password, SSO) with duplicate-looking inputs, so all
 * login locators are scoped to the login form to stay unique. Uniqueness is enforced at runtime
 * by {@link LoginPage.unique} before any interaction.
 *
 * Assertions live in the spec files; this class only exposes locators and actions.
 */
export class LoginPage {
  private static readonly LOGIN_FORM = '//form[@id="js-login-form"]';

  readonly page: Page;

  readonly loginForm: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordVisibilityToggle: Locator;
  /** The native checkbox is visually hidden; the associated <label> is the clickable control. */
  readonly rememberMeCheckbox: Locator;
  readonly rememberMeLabel: Locator;
  readonly forgotPasswordButton: Locator;
  readonly loginButton: Locator;
  readonly loginButtonInProgress: Locator;
  readonly googleSignInButton: Locator;
  readonly ssoSignInButton: Locator;
  readonly passkeySignInButton: Locator;
  readonly freeTrialLink: Locator;
  readonly privacyPolicyLink: Locator;
  readonly termsLink: Locator;
  readonly errorBanner: Locator;
  readonly inlineEmailError: Locator;
  readonly inlineRequiredError: Locator;

  readonly forgotPasswordForm: Locator;
  readonly forgotPasswordBackButton: Locator;

  constructor(page: Page) {
    this.page = page;
    const form = LoginPage.LOGIN_FORM;

    this.loginForm = page.locator(form);
    this.emailInput = page.locator(`${form}//input[@id="login-username"]`);
    this.passwordInput = page.locator(`${form}//input[@id="login-password"]`);
    this.passwordVisibilityToggle = page.locator(`${form}//button[@aria-label="Toggle password visibility"]`);
    this.rememberMeCheckbox = page.locator(`${form}//input[@id="checkbox-remember"]`);
    this.rememberMeLabel = page.locator(`${form}//label[@for="checkbox-remember"]`);
    this.forgotPasswordButton = page.locator(`${form}//button[@onclick="login.gotoForgotPasswordView()"]`);
    this.loginButton = page.locator(`${form}//button[@id="js-login-btn"]`);
    // The app adds the class "is-in-action" to the submit button while the request is pending.
    this.loginButtonInProgress = page.locator(`${form}//button[@id="js-login-btn"][contains(@class,"is-in-action")]`);
    this.googleSignInButton = page.locator(`${form}//button[@id="js-google-signin-btn"]`);
    this.ssoSignInButton = page.locator(`${form}//button[@onclick="login.goToSSOView()"]`);
    this.passkeySignInButton = page.locator(`${form}//button[@onclick="login.loginUsingPasskey()"]`);
    this.freeTrialLink = page.locator(`//a[@target="_blank"][contains(@href,"wingify.com/free-trial")][.//span[normalize-space()="Start a FREE TRIAL"]]`);
    this.privacyPolicyLink = page.locator(`${form}//a[contains(@href,"wingify.com/privacy-policy")]`);
    this.termsLink = page.locator(`${form}//a[contains(@href,"wingify.com/terms")]`);

    // Authentication failure banner. It lives OUTSIDE the form, so it is scoped by its own id.
    this.errorBanner = page.locator('//div[@id="js-notification-box-msg"]');
    // Inline validation spans inside the login form (present in DOM; hidden unless triggered).
    this.inlineEmailError = page.locator(`${form}//span[@class="invalid-reason"][normalize-space()="Invalid email"]`);
    this.inlineRequiredError = page.locator(`${form}//span[@data-qa="input-validation-error"]`);

    this.forgotPasswordForm = page.locator('//form[@id="js-forgot-password-form"]');
    this.forgotPasswordBackButton = page.locator('//form[@id="js-forgot-password-form"]//button[@onclick="login.gotoLoginView()"]');
  }

  // ---------------------------------------------------------------- infrastructure

  /**
   * Fails fast with a diagnostic message unless the locator resolves to exactly one element.
   * Playwright retries the count assertion until the expect timeout elapses.
   */
  async unique(locator: Locator, name: string): Promise<Locator> {
    try {
      await expect(locator, `Locator "${name}" must match exactly one element`).toHaveCount(1);
      return locator;
    } catch (error) {
      throw new LoginPageError(`Locator uniqueness check failed for "${name}" (page: ${this.page.url()})`, error);
    }
  }

  private async run<T>(description: string, action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      throw new LoginPageError(`${description} failed (page: ${this.page.url()})`, error);
    }
  }

  // ---------------------------------------------------------------- navigation

  async goto(): Promise<void> {
    await this.run('Navigation to login page', async () => {
      const response = await this.page.goto('/', { waitUntil: 'domcontentloaded' });
      if (response && !response.ok()) {
        throw new Error(`Unexpected HTTP status ${response.status()} for ${response.url()}`);
      }
      // The SPA renders the form after bootstrap; wait for the actionable submit button.
      await expect(this.loginButton).toBeVisible();
    });
  }

  // ---------------------------------------------------------------- actions

  async enterEmail(email: string): Promise<void> {
    await this.run('Enter email', async () => {
      await (await this.unique(this.emailInput, 'emailInput')).fill(email);
    });
  }

  async enterPassword(password: string): Promise<void> {
    await this.run('Enter password', async () => {
      await (await this.unique(this.passwordInput, 'passwordInput')).fill(password);
    });
  }

  async clearEmail(): Promise<void> {
    await this.run('Clear email', async () => (await this.unique(this.emailInput, 'emailInput')).clear());
  }

  async setRememberMe(checked: boolean): Promise<void> {
    await this.run(`Set Remember Me to ${checked}`, async () => {
      await this.unique(this.rememberMeCheckbox, 'rememberMeCheckbox');
      const label = await this.unique(this.rememberMeLabel, 'rememberMeLabel');
      if ((await this.rememberMeCheckbox.isChecked()) !== checked) {
        await label.click();
      }
    });
  }

  async togglePasswordVisibility(): Promise<void> {
    await this.run('Toggle password visibility', async () => {
      await (await this.unique(this.passwordVisibilityToggle, 'passwordVisibilityToggle')).click();
    });
  }

  async clickLogin(): Promise<void> {
    await this.run('Click Sign in', async () => {
      await (await this.unique(this.loginButton, 'loginButton')).click();
    });
  }

  async clickForgotPassword(): Promise<void> {
    await this.run('Click Forgot Password', async () => {
      await (await this.unique(this.forgotPasswordButton, 'forgotPasswordButton')).click();
    });
  }

  async clickForgotPasswordBack(): Promise<void> {
    await this.run('Click Back on forgot-password form', async () => {
      await (await this.unique(this.forgotPasswordBackButton, 'forgotPasswordBackButton')).click();
    });
  }

  async login(email: string, password: string, rememberMe = false): Promise<void> {
    await this.enterEmail(email);
    await this.enterPassword(password);
    if (rememberMe) {
      await this.setRememberMe(true);
    }
    await this.clickLogin();
  }

  /** Submit with whichever fields are provided; undefined/empty leaves the field untouched. */
  async submitWith(email?: string, password?: string): Promise<void> {
    if (email) await this.enterEmail(email);
    if (password) await this.enterPassword(password);
    await this.clickLogin();
  }

  // ---------------------------------------------------------------- reads

  async getPasswordFieldType(): Promise<string | null> {
    return this.run('Read password field type', async () =>
      (await this.unique(this.passwordInput, 'passwordInput')).getAttribute('type'));
  }

  /** Waits for the authentication error banner and returns its trimmed text. */
  async getAuthErrorMessage(): Promise<string> {
    return this.run('Read authentication error message', async () => {
      await expect(this.errorBanner).toBeVisible();
      return ((await this.errorBanner.textContent()) ?? '').trim();
    });
  }
}
