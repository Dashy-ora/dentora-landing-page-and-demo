import type { Demo, FormDefinition, FormField, FormKey, Lang, Navigation, Offer, OffersData, Plan, Pricing } from "@/lib/types";
import { defaultPages } from "./pages";
import { ALL_MODULES, DEFAULT_CONTACT, ModuleNames, sayFor, uuid } from "./shared";

const DAY = 86_400_000;

export function defaultNavigation(lang: Lang): Navigation {
  const say = sayFor(lang);
  const pages = defaultPages(lang).map((page) => ({ page, link: { slug: page.slug, title: page.title } }));
  return {
    language: lang,
    header: pages.filter(({ page }) => page.in_header).map(({ link }) => link),
    footer: pages.filter(({ page }) => page.in_footer).map(({ link }) => link),
    pages: pages.map(({ link }) => link),
    contact: { ...DEFAULT_CONTACT, address: say("مدينة نصر، القاهرة", "Nasr City, Cairo") },
    social: [{ network: "facebook", url: "https://www.facebook.com/dentora.example" }],
  };
}

const STANDARD = ["configuration", "patients", "clinical", "treatment_plans", "scheduling", "billing", "insurance", "booking", "reports", "multi_branch", "crm", "communications", "consent"];
const BASIC = ["configuration", "patients", "clinical", "treatment_plans", "scheduling", "billing", "reports"];
const TRIAL = ["configuration", "patients", "clinical", "treatment_plans", "scheduling", "billing", "insurance", "reports"];

export const DEFAULT_PLAN_IDS = { trial: uuid(20, 1), basic: uuid(20, 2), standard: uuid(20, 3), full: uuid(20, 4) };
export const DEFAULT_OFFER_ID = uuid(30, 1);

/** The one default offer: it started a week ago and ends in 180 days, so it is live whenever the site is served. */
export function defaultOffer(lang: Lang, now: number): Offer {
  const say = sayFor(lang);
  return {
    id: DEFAULT_OFFER_ID,
    title: say("عرض الإطلاق: خصم 20% على السنة الأولى", "Launch offer: 20% off the first year"),
    description: say("خصم على الصيانة السنوية للسنة الأولى.", "Discount on the yearly maintenance of the first year."),
    badge: say("لفترة محدودة", "Limited"),
    discount: { kind: "percent", value: 20 },
    promo_code: "LAUNCH20",
    applies_to: { plan_ids: [DEFAULT_PLAN_IDS.standard, DEFAULT_PLAN_IDS.full], modules: [] },
    starts_at: new Date(now - 7 * DAY).toISOString(),
    ends_at: new Date(now + 180 * DAY).toISOString(),
    placements: ["strip", "pricing_cards"],
    button: { label: say("ابدأ تجربة مجانية", "Start a free trial"), action: "start_trial" },
    status: "live",
  };
}

export function defaultOffers(lang: Lang, now: number): OffersData {
  return { language: lang, timezone: "Africa/Cairo", offers: [defaultOffer(lang, now)] };
}

type PlanSeed = { key: keyof typeof DEFAULT_PLAN_IDS; modules: string[]; month: number; year: number; setup: number; branches: number; dentists: number; staff: number; storage: number; highlighted: boolean; offer: boolean };

const PLAN_SEEDS: PlanSeed[] = [
  { key: "trial", modules: TRIAL, month: 0, year: 0, setup: 0, branches: 1, dentists: 1, staff: 3, storage: 2, highlighted: false, offer: false },
  { key: "basic", modules: BASIC, month: 120000, year: 1200000, setup: 250000, branches: 1, dentists: 2, staff: 5, storage: 5, highlighted: false, offer: false },
  { key: "standard", modules: STANDARD, month: 250000, year: 2500000, setup: 500000, branches: 2, dentists: 6, staff: 15, storage: 20, highlighted: true, offer: true },
  { key: "full", modules: ALL_MODULES, month: 450000, year: 4500000, setup: 1000000, branches: 5, dentists: 20, staff: 50, storage: 50, highlighted: false, offer: true },
];

function plan(seed: PlanSeed, lang: Lang): Plan {
  const say = sayFor(lang);
  const names = { trial: say("دنتورا تجربة (30 يومًا)", "Dentora Trial (30 days)"), basic: say("دنتورا الأساسية", "Dentora Basic"), standard: say("دنتورا القياسية", "Dentora Standard"), full: say("دنتورا الكاملة", "Dentora Full") };
  const taglines = { trial: say("جرّب دنتورا لمدة 30 يومًا", "Try Dentora for 30 days"), basic: say("لعيادة بكرسي واحد", "For a single-chair clinic"), standard: say("الأكثر اختيارا", "Most clinics choose this"), full: say("كل الوحدات", "Every module") };
  const bullets = [
    seed.branches === 1 ? say("فرع واحد", "One branch") : say(`حتى ${seed.branches} فروع`, `Up to ${seed.branches} branches`),
    say(`حتى ${seed.dentists} أطباء و${seed.staff} موظفين`, `Up to ${seed.dentists} dentists and ${seed.staff} staff`),
    say(`مساحة تخزين ${seed.storage} جيجابايت`, `${seed.storage} GB of storage`),
  ];
  return {
    id: DEFAULT_PLAN_IDS[seed.key],
    name: names[seed.key],
    tagline: taglines[seed.key],
    bullets,
    highlighted: seed.highlighted,
    price_minor: seed.month,
    currency: "EGP",
    interval: seed.month === 0 ? null : "month",
    setup_fee_minor: seed.setup === 0 ? null : seed.setup,
    maintenance: seed.month === 0 ? null : { month: seed.month, year: seed.year },
    modules: seed.modules.map((key) => ({ key, name: ModuleNames[key][lang] })),
    offer_ids: seed.offer ? [DEFAULT_OFFER_ID] : [],
  };
}

export function defaultPricing(lang: Lang, now: number): Pricing {
  return { language: lang, currency: "EGP", plans: PLAN_SEEDS.map((seed) => plan(seed, lang)), offers: [defaultOffer(lang, now)] };
}

export function defaultDemo(): Demo {
  return {
    enabled: true,
    modules: ALL_MODULES,
    clinic: { name: { ar: "عيادة نايل سمايل التجريبية", en: "Nile Smile Demo" }, logo_url: null },
    welcome: { ar: "مرحبا بك في النسخة التجريبية من دنتورا. كل البيانات هنا تجريبية.", en: "Welcome to the Dentora demo. Everything here is sample data." },
    trial: { url: "/contact", label: { ar: "ابدأ تجربة حقيقية", en: "Start a real trial" } },
  };
}

type FieldSeed = [key: string, type: FormField["type"], required: boolean, max: number, ar: string, en: string];
const NAME: FieldSeed = ["name", "text", true, 120, "الاسم", "Your name"];
const CLINIC: FieldSeed = ["clinic_name", "text", true, 160, "اسم العيادة", "Clinic name"];
const PHONE = (required: boolean): FieldSeed => ["phone", "phone", required, 20, "رقم الموبايل", "Mobile number"];
const EMAIL = (required: boolean): FieldSeed => ["email", "email", required, 254, "البريد الإلكتروني", "Email"];
const MESSAGE = (required: boolean): FieldSeed => ["message", "textarea", required, 2000, "رسالتك", "Message"];

const FORMS: Record<FormKey, { ar: string; en: string; fields: FieldSeed[] }> = {
  demo_request: { ar: "اطلب عرضا توضيحيا", en: "Request a demo", fields: [NAME, CLINIC, EMAIL(false), PHONE(true), ["branches", "number", false, 500, "عدد الفروع", "Number of branches"], MESSAGE(false)] },
  contact: { ar: "تواصل معنا", en: "Contact us", fields: [NAME, EMAIL(true), PHONE(false), MESSAGE(true)] },
  trial_interest: { ar: "ابدأ تجربة", en: "Start a trial", fields: [NAME, CLINIC, PHONE(true), ["city", "text", false, 80, "المدينة", "City"]] },
};

export function defaultForm(lang: Lang, key: FormKey): FormDefinition {
  const say = sayFor(lang);
  const form = FORMS[key];
  return {
    language: lang,
    key,
    title: say(form.ar, form.en),
    intro: null,
    fields: form.fields.map(([fieldKey, type, required, max, ar, en]) => ({ key: fieldKey, type, required, max, label: say(ar, en), placeholder: null })),
    thank_you: say("شكرا لك. سيتواصل معك فريقنا قريبا.", "Thank you. Our team will contact you soon."),
    honeypot_field: "company_website",
  };
}
