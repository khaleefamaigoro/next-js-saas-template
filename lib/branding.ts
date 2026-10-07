/** Platform and vendor brand assets. Safe to import from client components. */

export const COMPANY_NAME = "hr-pal";

export const COMPANY_PHONE = "";
export const COMPANY_PHONE_TEL = "";
export const COMPANY_EMAIL = "support@example.com";

export const COMPANY_LOGO = {
  /** Circular mark — compact spots, sidebars, fallbacks */
  icon: "/globe.svg",
  /** Wordmark lockup for dark backgrounds (white, transparent) */
  banner: "/globe.svg",
  /** Wordmark lockup with a filled background — use on light surfaces */
  bannerImage: "/globe.svg",
  favicon: "/globe.svg",
} as const;

export const STORE_ICONS = {
  appStore: "/globe.svg",
  playStore: "/globe.svg",
} as const;

export const POWERED_BY_NAME = "";

/** Set to a logo URL when the mark is ready. */
export const POWERED_BY_LOGO_URL: string | null = null;
