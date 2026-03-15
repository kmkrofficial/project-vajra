import { test, expect, type Page } from "@playwright/test";

// ─── Expected translations for verification ─────────────────────────────────

const TRANSLATIONS = {
  en: {
    heroTitle: "Stop losing money on",
    welcomeBack: "Welcome back",
    signIn: "Sign In",
    createAccount: "Create an account",
  },
  hi: {
    heroTitle: "पैसे खोना बंद करें",
    welcomeBack: "फिर से स्वागत है",
    signIn: "साइन इन",
    createAccount: "खाता बनाएं",
  },
  kn: {
    heroTitle: "ಹಣ ಕಳೆದುಕೊಳ್ಳುವುದನ್ನು ನಿಲ್ಲಿಸಿ",
    welcomeBack: "ಮತ್ತೆ ಸ್ವಾಗತ",
    signIn: "ಸೈನ್ ಇನ್",
  },
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Click the language switcher and select a locale by its native display name. */
async function switchLanguage(page: Page, languageName: string) {
  await page.getByTestId("language-switcher").first().click();
  await page.getByRole("menuitem", { name: languageName }).click();
  // Wait for navigation to settle
  await page.waitForLoadState("networkidle");
}

// ─── Public Pages: Language Switching ───────────────────────────────────────

test.describe("i18n — Public Pages", () => {
  test("landing page renders in English by default (no URL prefix)", async ({
    page,
  }) => {
    await page.goto("/");

    // Should have no locale prefix in URL
    await expect(page).toHaveURL(/^http:\/\/[^/]+\/$/);

    // Hero title in English
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      TRANSLATIONS.en.heroTitle
    );

    // Language switcher should be visible
    await expect(page.getByTestId("language-switcher")).toBeVisible();
  });

  test("switching to Hindi on landing page changes URL and content", async ({
    page,
  }) => {
    await page.goto("/");

    await switchLanguage(page, "हिन्दी");

    // URL should now have /hi/ prefix
    await expect(page).toHaveURL(/\/hi\/?$/);

    // Hero title should be in Hindi
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      TRANSLATIONS.hi.heroTitle
    );
  });

  test("switching to Kannada on landing page changes URL and content", async ({
    page,
  }) => {
    await page.goto("/");

    await switchLanguage(page, "ಕನ್ನಡ");

    // URL should have /kn/ prefix
    await expect(page).toHaveURL(/\/kn\/?$/);

    // Hero title should be in Kannada
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      TRANSLATIONS.kn.heroTitle
    );
  });

  test("navigating directly to /hi shows Hindi content", async ({ page }) => {
    await page.goto("/hi");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      TRANSLATIONS.hi.heroTitle
    );
  });

  test("navigating directly to /kn shows Kannada content", async ({ page }) => {
    await page.goto("/kn");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      TRANSLATIONS.kn.heroTitle
    );
  });

  test("switching back to English removes locale prefix", async ({ page }) => {
    // Start on Hindi landing page
    await page.goto("/hi");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      TRANSLATIONS.hi.heroTitle
    );

    // Switch back to English
    await switchLanguage(page, "English");

    // URL should NOT have a locale prefix
    await expect(page).toHaveURL(/^http:\/\/[^/]+\/$/);

    // Content should be in English again
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      TRANSLATIONS.en.heroTitle
    );
  });
});

// ─── Auth Pages: Language Switching ─────────────────────────────────────────

test.describe("i18n — Auth Pages", () => {
  test("login page renders in English by default", async ({ page }) => {
    await page.goto("/login");

    // CardTitle renders as a <div data-slot="card-title">, not a heading
    await expect(
      page.locator("[data-slot='card-title']", { hasText: TRANSLATIONS.en.welcomeBack })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: TRANSLATIONS.en.signIn })
    ).toBeVisible();
  });

  test("/hi/login shows Hindi login page", async ({ page }) => {
    await page.goto("/hi/login");

    await expect(
      page.locator("[data-slot='card-title']", { hasText: TRANSLATIONS.hi.welcomeBack })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: TRANSLATIONS.hi.signIn })
    ).toBeVisible();
  });

  test("/kn/login shows Kannada login page", async ({ page }) => {
    await page.goto("/kn/login");

    await expect(
      page.locator("[data-slot='card-title']", { hasText: TRANSLATIONS.kn.welcomeBack })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: TRANSLATIONS.kn.signIn })
    ).toBeVisible();
  });

  test("language switcher on auth page changes locale", async ({ page }) => {
    await page.goto("/login");

    // Should see English by default
    await expect(
      page.locator("[data-slot='card-title']", { hasText: TRANSLATIONS.en.welcomeBack })
    ).toBeVisible();

    // Switch to Hindi via language switcher
    await switchLanguage(page, "हिन्दी");

    // URL should now have /hi/login
    await expect(page).toHaveURL(/\/hi\/login/);

    // Content should be in Hindi
    await expect(
      page.locator("[data-slot='card-title']", { hasText: TRANSLATIONS.hi.welcomeBack })
    ).toBeVisible();
  });

  test("signup page renders in Hindi at /hi/signup", async ({ page }) => {
    await page.goto("/hi/signup");

    await expect(
      page.locator("[data-slot='card-title']", { hasText: TRANSLATIONS.hi.createAccount })
    ).toBeVisible();
  });
});

// ─── Authenticated Pages: i18n ──────────────────────────────────────────────
// NOTE: Authenticated i18n tests (dashboard sidebar translations, app-level
// locale switching, kiosk in Hindi) are deferred. The dashboard RSC currently
// renders an empty body during Playwright E2E — a pre-existing issue that also
// affects navigation.spec.ts tests. Once the streaming RSC / workspace-cookie
// race is fixed, add tests here for:
//   - Sidebar labels translated in Hindi/Kannada after locale switch
//   - Locale prefix persists across app navigation
//   - Kiosk page respects locale
//   - Switching back to English removes prefix in-app

// ─── All Locales: Landing Page Smoke Tests ──────────────────────────────────

test.describe("i18n — All Locales Smoke", () => {
  const LOCALE_CONFIGS = [
    { code: "hi", name: "Hindi", heroSnippet: "पैसे खोना बंद करें" },
    { code: "kn", name: "Kannada", heroSnippet: "ಹಣ ಕಳೆದುಕೊಳ್ಳುವುದನ್ನು ನಿಲ್ಲಿಸಿ" },
    { code: "ta", name: "Tamil", heroSnippet: "பணம் இழப்பதை நிறுத்துங்கள்" },
    { code: "te", name: "Telugu", heroSnippet: "డబ్బు కోల్పోవడం ఆపండి" },
    { code: "ml", name: "Malayalam", heroSnippet: "പണം നഷ്ടമാകുന്നത് നിർത്തൂ" },
  ] as const;

  for (const { code, name, heroSnippet } of LOCALE_CONFIGS) {
    test(`/${code} landing page renders ${name} content`, async ({ page }) => {
      await page.goto(`/${code}`);

      // Hero title should contain the locale-specific text
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        heroSnippet
      );

      // Language switcher should still be present
      await expect(page.getByTestId("language-switcher")).toBeVisible();
    });
  }
});

// ─── URL Prefix Behavior ────────────────────────────────────────────────────

test.describe("i18n — URL Prefix Behavior", () => {
  test("English (default locale) has no URL prefix", async ({ page }) => {
    await page.goto("/");
    // Should NOT redirect to /en/
    await expect(page).toHaveURL(/^http:\/\/[^/]+\/$/);
  });

  test("/en/ is handled gracefully (as-needed prefix mode)", async ({ page }) => {
    const response = await page.goto("/en");
    // With localePrefix "as-needed", /en may 404 or redirect to /
    // Either way, the server should not crash (status < 500)
    expect(response?.status()).toBeLessThan(500);
  });

  test("non-default locales have URL prefix", async ({ page }) => {
    await page.goto("/hi");
    await expect(page).toHaveURL(/\/hi/);

    await page.goto("/kn/login");
    await expect(page).toHaveURL(/\/kn\/login/);
  });

  test("invalid locale falls back gracefully", async ({ page }) => {
    // Navigating to a non-existent locale should not crash
    const response = await page.goto("/xx");
    // Should get a 404 or redirect to default locale
    expect(response?.status()).toBeLessThan(500);
  });
});
