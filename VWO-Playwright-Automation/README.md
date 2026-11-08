# VWO-Playwright-Automation

Playwright + TypeScript + Page Object Model framework for `https://app.wingify.com/#/login`, with Allure reporting.
All UI locators are **XPath only**, relative, scoped to `//form[@id="js-login-form"]`, and checked for uniqueness at runtime.

## Commands

| Purpose | Command |
|---|---|
| Install dependencies | `npm install` |
| Install browsers | `npm run install:browsers` |
| Type-check | `npm run typecheck` |
| Run all tests (3 browsers) | `npm test` |
| Valid-login tests only | `npm run test:valid` |
| Invalid-login tests only | `npm run test:invalid` |
| One browser | `npm run test:chromium` (or `npx playwright test --project=firefox`) |
| Headed | `npm run test:headed` |
| Debug | `npm run test:debug` |
| Allure results | written automatically to `allure-results/` on every run |
| Generate Allure HTML | `npm run allure:generate` (needs Java; output in `allure-report/`) |
| Open Allure report | `npm run allure:open` |
| Generate + open | `npm run report` |
| Clear old results | `npm run allure:clean` |

## Credentials
Copy `.env.example` to `.env` and set `VWO_USERNAME` / `VWO_PASSWORD`. Without them, TC-V15, TC-V16 and TC-I02 are **skipped** ("requires test data"). No credentials are invented.

## Verified vs. not verified (inspected live 2026-11-08)

Verified and asserted:
- Title `Login - Wingify`, HTTPS, controls (email, password, visibility toggle, Remember Me, Sign in, Forgot Password, Google / SSO / Passkey buttons, free-trial, privacy, terms).
- Every submit case (empty/empty, empty email, empty password, malformed email, unknown credentials) -> `POST /login` returns 401 and the banner `#js-notification-box-msg` shows *"Your email, password, IP address or location did not match"*. No client-side blocking exists.
- Forgot Password -> `#/forgot-password`, separate form, Back returns.
- Submit button gets class `is-in-action` while the request is pending.
- Password masked (`type=password`); toggle switches to `text` and back.

Not verified / not automated:
- **The PRD document was not attached/available in the workspace**; scenarios come from the prompt's PRD summary plus the live DOM. Please supply it for traceability mapping.
- Successful login and dashboard content (no test credentials; dashboard selectors never inspected). TC-V15/16 only assert leaving `#/login` with no error banner. 2FA/reCAPTCHA/SSO-enforced accounts will not pass.
- Inline validation on blur (TC-I11, `test.fixme`): no inline message became visible in the live app.
- Light/Dark mode (TC-V13, `test.fixme`): no such control on the login page.
- Rate limiting, MFA, SSO flow, session lifetime, backend encryption/GDPR: not provable via this UI suite. A reCAPTCHA appeared in one manual session after two consecutive failures; keep negative runs infrequent.
- TC-V11 and TC-V14 stub the `/login` response with a 401 so no real credential is sent; they validate UI behaviour only.
