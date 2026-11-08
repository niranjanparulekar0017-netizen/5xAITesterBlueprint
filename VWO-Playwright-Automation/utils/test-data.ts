import * as dotenv from 'dotenv';

dotenv.config({ quiet: true });

/**
 * Credentials come exclusively from environment variables (.env). Nothing is hardcoded.
 */
export const credentials = {
  username: process.env.VWO_USERNAME?.trim() ?? '',
  password: process.env.VWO_PASSWORD ?? '',
};

export const hasValidCredentials: boolean = credentials.username !== '' && credentials.password !== '';

export const SKIP_REASON_NO_CREDENTIALS =
  'Requires test data: set VWO_USERNAME and VWO_PASSWORD in .env (no credentials are invented by this framework).';

/**
 * Strings VERIFIED against the live application (observed 2026-11-08).
 * Every one of the submit scenarios below returned HTTP 401 from POST /login and rendered this
 * single banner in #js-notification-box-msg: empty/empty, empty email, empty password,
 * malformed email, unknown email + wrong password.
 */
export const VERIFIED = {
  pageTitle: /Login - Wingify/,
  authErrorMessage: 'Your email, password, IP address or location did not match',
  loginHashRoute: /#\/login$/,
  forgotPasswordHashRoute: /#\/forgot-password$/,
  freeTrialUrl: /wingify\.com\/free-trial/,
} as const;

/**
 * Non-existent, clearly synthetic inputs for negative tests. The example.com domain is reserved
 * (RFC 2606) so these can never belong to a real account. A per-run suffix avoids reuse.
 */
const runId = Date.now().toString(36);

export const invalidData = {
  unknownEmail: `qa.nouser.${runId}@example.com`,
  malformedEmail: 'not-an-email-address',
  wrongPassword: `Wrong#Pass-${runId}`,
  anyPassword: 'Any#Password1',
} as const;

export const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
} as const;
