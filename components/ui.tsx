import Link from "next/link";
import type { ReactNode } from "react";
import { mediaUrl } from "@/lib/config";
import { resolveAction } from "@/lib/actions";
import type { Button, Lang, PublicImage } from "@/lib/types";

/** Internal links soft-navigate; external ones open normally with a safe rel. */
export function SiteLink({ href, external, className, children, ...rest }: { href: string; external?: boolean; className?: string; children: ReactNode } & Record<string, unknown>) {
  if (external) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  // The demo build is a separate static app: a normal navigation, not a client transition.
  if (href.startsWith("/demo/app")) {
    return (
      <a href={href} className={className} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  );
}

export type ButtonVariant = "primary" | "tonal" | "outline";

export function ButtonLink({ button, lang, trialUrl, variant = "primary" }: { button: Button; lang: Lang; trialUrl: string; variant?: ButtonVariant }) {
  const target = resolveAction(button.action, lang, trialUrl);
  if (!target) return null;
  return (
    <SiteLink href={target.href} external={target.external} className={`dt-btn dt-btn-lg dt-btn-${variant}`}>
      {button.label}
    </SiteLink>
  );
}

export function ButtonRow({ buttons, lang, trialUrl, onBrand = false }: { buttons: Button[]; lang: Lang; trialUrl: string; onBrand?: boolean }) {
  if (buttons.length === 0) return null;
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {buttons.map((button, index) => (
        <ButtonLink key={`${button.action}-${index}`} button={button} lang={lang} trialUrl={trialUrl} variant={index === 0 ? (onBrand ? "tonal" : "primary") : "outline"} />
      ))}
    </div>
  );
}

/** Backend media. A plain img: the files are content-addressed and already re-encoded by the backend. */
export function CmsImage({ image, className = "", priority = false }: { image: PublicImage | undefined; className?: string; priority?: boolean }) {
  if (!image) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mediaUrl(image.url)}
      alt={image.alt ?? ""}
      width={image.width}
      height={image.height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}

export function Section({ heading, children, id, narrow = false }: { heading?: string | null; children: ReactNode; id?: string; narrow?: boolean }) {
  return (
    <section id={id} className="py-10 md:py-14">
      <div className={`mx-auto w-full px-4 md:px-6 ${narrow ? "max-w-3xl" : "max-w-6xl"}`}>
        {heading ? <h2 className="mb-8 text-page-title font-bold text-fg-strong dt-page-title">{heading}</h2> : null}
        {children}
      </div>
    </section>
  );
}
