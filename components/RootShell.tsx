import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { direction } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

// Pre-paint theme (no flash): same key and rule as the clinic portal. Language and direction are fixed per route group.
const THEME_SCRIPT = `(function(){var r=document.documentElement,p='system';try{p=localStorage.getItem('dentora.theme')||'system'}catch(e){}if(p!=='light'&&p!=='dark')p='system';var d=p==='dark';try{d=d||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches)}catch(e){}r.dataset.theme=p;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light'})();`;

/** Each language is its own route group with its own root layout, so <html lang dir> is correct on first byte. */
export function RootShell({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <html lang={lang} dir={direction(lang)} data-theme="system" suppressHydrationWarning>
      <body className="min-h-screen bg-page font-sans text-fg">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}

export const shellMetadata: Metadata = {
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }], apple: "/brand/apple-touch-icon.png" },
};
export const shellViewport: Viewport = { themeColor: "#15334a" };
