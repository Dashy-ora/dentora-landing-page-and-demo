import { DEMO_APP_PATH, pagePath } from "./paths";
import type { Lang } from "./types";

export type ResolvedAction = { href: string; external: boolean };

/**
 * Button actions from the contract: start_trial -> PORTAL_TRIAL_URL, book_demo -> the demo request form,
 * open_demo -> /demo/app, contact -> the contact page, page:<slug> -> /<slug> (/en/<slug>), url:<https> -> that URL.
 * Anything else resolves to null and the button is not rendered.
 */
export function resolveAction(action: string, lang: Lang, trialUrl: string): ResolvedAction | null {
  switch (action) {
    case "start_trial":
      return { href: trialUrl, external: /^https?:\/\//i.test(trialUrl) };
    case "book_demo":
      return { href: `${pagePath("contact", lang)}#demo-request`, external: false };
    case "open_demo":
      return { href: DEMO_APP_PATH, external: false };
    case "contact":
      return { href: pagePath("contact", lang), external: false };
  }
  if (action.startsWith("page:")) {
    const slug = action.slice(5);
    return /^[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(slug) ? { href: pagePath(slug, lang), external: false } : null;
  }
  if (action.startsWith("url:https://")) {
    const url = action.slice(4);
    try {
      return new URL(url).protocol === "https:" ? { href: url, external: true } : null;
    } catch {
      return null;
    }
  }
  return null;
}
