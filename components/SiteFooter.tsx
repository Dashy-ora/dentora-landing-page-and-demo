import { LogoMark } from "./Logo";
import { SiteLink } from "./ui";
import { t } from "@/lib/i18n";
import { pagePath } from "@/lib/paths";
import type { Lang, Navigation } from "@/lib/types";

const muted = "text-[color:var(--dt-sidebar-text)]";

export function SiteFooter({ lang, navigation }: { lang: Lang; navigation: Navigation }) {
  const s = t(lang);
  const { contact, social } = navigation;
  const hasContact = contact.email || contact.phone || contact.whatsapp || contact.address;
  const safeSocial = social.filter((item) => /^https:\/\//.test(item.url));
  return (
    <footer className="mt-auto bg-sidebar text-white" data-site-footer>
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-3 md:px-6">
        <div>
          <div className="flex items-center gap-2">
            <LogoMark size={26} />
            <span className="text-title font-bold">{s.siteName}</span>
          </div>
        </div>
        {navigation.footer.length > 0 ? (
          <nav aria-label={s.footerLinks}>
            <p className="dt-section-label !text-[color:var(--dt-sidebar-text)]">{s.footerLinks}</p>
            <ul className="mt-3 space-y-2">
              {navigation.footer.map((link) => (
                <li key={link.slug}>
                  <SiteLink href={pagePath(link.slug, lang)} className="!text-white hover:underline">{link.title}</SiteLink>
                </li>
              ))}
            </ul>
          </nav>
        ) : <div />}
        {hasContact || safeSocial.length > 0 ? (
          <div>
            <p className="dt-section-label !text-[color:var(--dt-sidebar-text)]">{s.footerContact}</p>
            <ul className="mt-3 space-y-2 [overflow-wrap:anywhere]">
              {contact.email ? <li><span className={muted}>{s.email}: </span><a className="!text-white hover:underline" dir="ltr" href={`mailto:${contact.email}`}>{contact.email}</a></li> : null}
              {contact.phone ? <li><span className={muted}>{s.phone}: </span><a className="!text-white hover:underline" dir="ltr" href={`tel:${contact.phone.replace(/\s+/g, "")}`}>{contact.phone}</a></li> : null}
              {contact.whatsapp ? <li><span className={muted}>{s.whatsapp}: </span><a className="!text-white hover:underline" dir="ltr" href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`} rel="noopener noreferrer" target="_blank">{contact.whatsapp}</a></li> : null}
              {contact.address ? <li><span className={muted}>{s.address}: </span>{contact.address}</li> : null}
            </ul>
            {safeSocial.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-3" aria-label={s.followUs}>
                {safeSocial.map((item) => (
                  <li key={item.network}>
                    <a href={item.url} className="!text-white hover:underline" target="_blank" rel="noopener noreferrer">{s.social[item.network] ?? item.network}</a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-caption">
        <span className={muted}>© {s.siteName}. {s.footerRights}</span>
      </div>
    </footer>
  );
}
