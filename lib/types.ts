// Public site contract (backend W61, OpenAPI 0.62.0, tag "Public site"). Texts arrive already localised to one string.

export type Lang = "ar" | "en";
export const LANGS: readonly Lang[] = ["ar", "en"];

export type PublicImage = { url: string; mime: string; width: number; height: number; alt: string | null } | null;

export type Button = { label: string; action: string };

export type BlockType =
  | "hero" | "text" | "image" | "image_text" | "feature_grid" | "modules" | "plans" | "offers"
  | "gallery" | "stats" | "testimonials" | "faq" | "logos" | "cta";

export type HeroBlock = { id: string; type: "hero"; heading: string; text: string | null; image: PublicImage; buttons: Button[] };
export type TextBlock = { id: string; type: "text"; heading: string | null; paragraphs: string[] };
export type ImageBlock = { id: string; type: "image"; image: PublicImage; caption: string | null };
export type ImageTextBlock = { id: string; type: "image_text"; image: PublicImage; heading: string | null; text: string; image_side: "start" | "end" };
export type FeatureGridBlock = { id: string; type: "feature_grid"; heading: string | null; items: { icon: string; title: string; text: string }[] };
export type ModulesBlock = { id: string; type: "modules"; heading: string | null; items: { module: string; group: string; title: string | null; text: string | null }[] };
export type PlansBlock = { id: string; type: "plans"; heading: string | null };
export type OffersBlock = { id: string; type: "offers"; heading: string | null };
export type GalleryBlock = { id: string; type: "gallery"; heading: string | null; items: { image: PublicImage; caption: string | null }[] };
export type StatsBlock = { id: string; type: "stats"; heading: string | null; items: { value: string; label: string }[] };
export type TestimonialsBlock = { id: string; type: "testimonials"; heading: string | null; items: { quote: string; name: string; role: string | null; image: PublicImage }[] };
export type FaqBlock = { id: string; type: "faq"; heading: string | null; items: { question: string; answer: string }[] };
export type LogosBlock = { id: string; type: "logos"; heading: string | null; items: { image: PublicImage; name: string }[] };
export type CtaBlock = { id: string; type: "cta"; heading: string; text: string | null; buttons: Button[] };

export type Block =
  | HeroBlock | TextBlock | ImageBlock | ImageTextBlock | FeatureGridBlock | ModulesBlock | PlansBlock | OffersBlock
  | GalleryBlock | StatsBlock | TestimonialsBlock | FaqBlock | LogosBlock | CtaBlock;

export type PageData = {
  language: Lang;
  slug: string;
  title: string;
  description: string | null;
  share_image: PublicImage;
  in_header: boolean;
  in_footer: boolean;
  blocks: Block[];
};

export type NavLink = { slug: string; title: string };
export type Navigation = {
  language: Lang;
  header: NavLink[];
  footer: NavLink[];
  pages: NavLink[];
  contact: { email: string | null; phone: string | null; whatsapp: string | null; address: string | null };
  social: { network: string; url: string }[];
};

export type Offer = {
  id: string;
  title: string;
  description?: string | null;
  badge?: string | null;
  discount?: { kind: "percent" | "amount_egp"; value: number };
  promo_code?: string | null;
  applies_to: { plan_ids: string[]; modules: string[] };
  starts_at: string;
  ends_at: string;
  placements: ("strip" | "pricing_cards" | "top_banner")[];
  button?: Button | null;
  status: "scheduled" | "live" | "ended";
};

export type Plan = {
  id: string;
  name: string;
  tagline: string | null;
  bullets: string[];
  highlighted: boolean;
  price_minor: number | null;
  currency: string;
  interval: string | null;
  setup_fee_minor: number | null;
  maintenance: Record<string, unknown> | null;
  modules: { key: string; name: string }[];
  offer_ids: string[];
};
export type Pricing = { language: Lang; currency: "EGP"; plans: Plan[]; offers: Offer[] };
export type OffersData = { language: Lang; timezone: string; offers: Offer[] };

export type Demo = {
  enabled: boolean;
  modules: string[];
  clinic: { name: { ar: string; en: string }; logo_url: string | null };
  welcome: { ar: string; en: string };
  trial: { url: string; label: { ar: string; en: string } };
};

export type FormKey = "demo_request" | "contact" | "trial_interest";
export type FormFieldType = "text" | "email" | "phone" | "number" | "textarea";
export type FormField = { key: string; type: FormFieldType; required: boolean; max: number; label: string; placeholder: string | null };
export type FormDefinition = {
  language: Lang;
  key: FormKey;
  title: string;
  intro: string | null;
  fields: FormField[];
  thank_you: string;
  honeypot_field: "company_website";
};

/** Which backend area a read belongs to; the area is the cache tag the signed refresh call revalidates. */
export type Area = "landing" | "demo" | "offers" | "forms";
export const AREAS: readonly Area[] = ["landing", "demo", "offers", "forms"];
