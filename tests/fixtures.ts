import type { Block, FormDefinition, Offer, Plan, Pricing } from "@/lib/types";

export const NOW = Date.parse("2026-12-10T12:00:00Z");

export const image = (name = "a") => ({ url: `https://cdn.example/${name}.png`, mime: "image/png", width: 800, height: 600, alt: `alt ${name}` });

export function offer(over: Partial<Offer> = {}): Offer {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Winter offer",
    description: "Save on the yearly plan",
    badge: "Winter",
    discount: { kind: "percent", value: 20 },
    promo_code: "WINTER20",
    applies_to: { plan_ids: [], modules: [] },
    starts_at: "2026-12-01T00:00:00Z",
    ends_at: "2026-12-31T00:00:00Z",
    placements: ["strip", "pricing_cards", "top_banner"],
    button: { label: "Book a demo", action: "book_demo" },
    status: "live",
    ...over,
  };
}

export function plan(over: Partial<Plan> = {}): Plan {
  return {
    id: "00000000-0000-4000-8000-0000000000a1",
    name: "Growth",
    tagline: "For busy clinics",
    bullets: ["Unlimited patients", "Two branches"],
    highlighted: true,
    price_minor: 150000,
    currency: "EGP",
    interval: "month",
    setup_fee_minor: 50000,
    maintenance: null,
    modules: [{ key: "patients", name: "Patient records" }],
    offer_ids: ["00000000-0000-4000-8000-000000000001"],
    ...over,
  };
}

export function pricing(over: Partial<Pricing> = {}): Pricing {
  return { language: "en", currency: "EGP", plans: [plan()], offers: [offer()], ...over };
}

const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const blocks: Record<string, Block> = {
  hero: { id: id(1), type: "hero", heading: "Run your clinic", text: "All in one", image: image("hero"), buttons: [{ label: "Start", action: "start_trial" }, { label: "Demo", action: "open_demo" }] },
  text: { id: id(2), type: "text", heading: "About us", paragraphs: ["First paragraph", "Second paragraph"] },
  image: { id: id(3), type: "image", image: image("pic"), caption: "A caption" },
  image_text: { id: id(4), type: "image_text", image: image("it"), heading: "Side by side", text: "Beside text", image_side: "start" },
  feature_grid: { id: id(5), type: "feature_grid", heading: "Features", items: [{ icon: "calendar", title: "Booking", text: "Online booking" }, { icon: "unknown-icon", title: "Reports", text: "Clear reports" }] },
  modules: { id: id(6), type: "modules", heading: "Modules", items: [{ module: "billing", group: "finance", title: "Billing and payments", text: "Invoices" }] },
  plans: { id: id(7), type: "plans", heading: "Plans" },
  offers: { id: id(8), type: "offers", heading: "Offers" },
  gallery: { id: id(9), type: "gallery", heading: "Screens", items: [{ image: image("g1"), caption: "One" }, { image: image("g2"), caption: null }] },
  stats: { id: id(10), type: "stats", heading: "Numbers", items: [{ value: "120+", label: "Clinics" }] },
  testimonials: { id: id(11), type: "testimonials", heading: "Words", items: [{ quote: "Great", name: "Dr. Mona", role: "Owner", image: null }] },
  faq: { id: id(12), type: "faq", heading: "Questions", items: [{ question: "Is it secure?", answer: "Yes" }] },
  logos: { id: id(13), type: "logos", heading: "Trusted", items: [{ image: image("l1"), name: "Nile Smile" }, { image: null, name: "No logo clinic" }] },
  cta: { id: id(14), type: "cta", heading: "Ready?", text: "Start today", buttons: [{ label: "Contact", action: "contact" }] },
};

export const form: FormDefinition = {
  language: "en",
  key: "contact",
  title: "Contact us",
  intro: "We reply soon",
  fields: [
    { key: "name", type: "text", required: true, max: 120, label: "Name", placeholder: null },
    { key: "email", type: "email", required: false, max: 254, label: "Email", placeholder: "you@clinic.com" },
    { key: "phone", type: "phone", required: false, max: 20, label: "Phone", placeholder: null },
    { key: "branches", type: "number", required: false, max: 500, label: "Branches", placeholder: null },
    { key: "message", type: "textarea", required: false, max: 2000, label: "Message", placeholder: null },
  ],
  thank_you: "Thanks, we will call you.",
  honeypot_field: "company_website",
};
