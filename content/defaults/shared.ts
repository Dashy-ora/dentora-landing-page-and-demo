import type { Lang, PublicImage } from "@/lib/types";

/**
 * Built-in default content (LANDING-03). Everything here follows the backend's local seed drafts (W61 `LocalWebsiteDataset`), so the
 * site looks like the dashboard's starting point when no API is reachable. Shapes are the public API's, typed with `lib/types`.
 */

/** Picks the Arabic or English wording. */
export type Say = (ar: string, en: string) => string;
export const sayFor = (lang: Lang): Say => (ar, en) => (lang === "ar" ? ar : en);

/** Deterministic UUID-shaped ids, so a default block or offer keeps one identity across requests. */
export const uuid = (kind: number, n: number): string => `d0000000-${String(kind).padStart(4, "0")}-4000-8000-${String(n).padStart(12, "0")}`;

/** Local illustrations in `public/defaults/` (never the backend). */
export function localImage(name: "hero-clinic" | "schedule" | "records" | "billing", alt: string): NonNullable<PublicImage> {
  return { url: `/defaults/${name}.svg`, mime: "image/svg+xml", width: 800, height: 600, alt };
}

export const ModuleGroups: Record<string, string[]> = {
  "patient-care": ["patients", "clinical", "treatment_plans", "imaging", "laboratories", "consent"],
  "front-desk": ["scheduling", "booking", "patient_portal", "communications", "inbox"],
  finance: ["billing", "insurance", "treasury", "general_ledger", "integrations"],
  growth: ["crm", "leads", "cms", "loyalty", "feedback"],
  operations: ["configuration", "multi_branch", "inventory", "attendance", "collaboration", "compensation", "migration", "offline"],
  reports: ["reports", "advanced_reports"],
};

export const GroupNames: Record<string, { ar: string; en: string }> = {
  "patient-care": { ar: "رعاية المرضى", en: "Patient care" },
  "front-desk": { ar: "الاستقبال والمواعيد", en: "Front desk and scheduling" },
  finance: { ar: "الفواتير والمالية", en: "Billing and finance" },
  growth: { ar: "النمو والتسويق", en: "Growth and marketing" },
  operations: { ar: "التشغيل والإدارة", en: "Operations" },
  reports: { ar: "التقارير والتحليلات", en: "Reports and insights" },
};

export const ModuleNames: Record<string, { ar: string; en: string }> = {
  configuration: { ar: "إعدادات العيادة", en: "Clinic setup" },
  patients: { ar: "ملفات المرضى", en: "Patient records" },
  clinical: { ar: "السجل السريري", en: "Clinical records" },
  treatment_plans: { ar: "خطط العلاج", en: "Treatment plans" },
  scheduling: { ar: "المواعيد", en: "Appointments" },
  billing: { ar: "الفواتير والمدفوعات", en: "Billing and payments" },
  insurance: { ar: "التأمين والمطالبات", en: "Insurance and claims" },
  crm: { ar: "المتابعات وعلاقات المرضى", en: "Follow-ups and patient relations" },
  cms: { ar: "موقع العيادة", en: "Clinic website" },
  booking: { ar: "الحجز الإلكتروني", en: "Online booking" },
  patient_portal: { ar: "بوابة المرضى", en: "Patient portal" },
  laboratories: { ar: "المعامل والتحويلات", en: "Labs and referrals" },
  inventory: { ar: "المخزون والمشتريات", en: "Inventory and purchasing" },
  compensation: { ar: "الرواتب والعمولات", en: "Payroll and commission" },
  reports: { ar: "التقارير", en: "Reports" },
  multi_branch: { ar: "تعدد الفروع", en: "Multiple branches" },
  leads: { ar: "العملاء المحتملون", en: "Leads" },
  communications: { ar: "الرسائل والحملات", en: "Messages and campaigns" },
  inbox: { ar: "صندوق الرسائل", en: "Shared inbox" },
  treasury: { ar: "الخزينة والبنوك", en: "Cash and bank" },
  attendance: { ar: "الحضور والإجازات", en: "Attendance and leave" },
  collaboration: { ar: "المهام والمحادثات", en: "Tasks and team chat" },
  consent: { ar: "النماذج والموافقات", en: "Forms and consents" },
  feedback: { ar: "آراء المرضى", en: "Patient feedback" },
  loyalty: { ar: "برنامج الولاء", en: "Loyalty program" },
  migration: { ar: "نقل البيانات", en: "Data import" },
  offline: { ar: "العمل دون اتصال", en: "Offline mode" },
  imaging: { ar: "الأشعة والصور", en: "Imaging" },
  integrations: { ar: "التكاملات الضريبية والتأمينية", en: "Tax and insurer integrations" },
  general_ledger: { ar: "دفتر الأستاذ العام", en: "General ledger" },
  advanced_reports: { ar: "التقارير المتقدمة", en: "Advanced reports" },
};

export const ALL_MODULES = Object.keys(ModuleNames);

/** The slugs of every default page, in menu order. */
export const PAGE_SLUGS: string[] = ["home", "pricing", "features", ...Object.keys(ModuleGroups).map((g) => `features/${g}`), "contact", "demo", "about", "terms", "privacy"];

/** Fictional contact details, the same as the backend's local seed. */
export const DEFAULT_CONTACT = { email: "hello@dentora.example", phone: "+20 100 000 0900", whatsapp: "+20 100 000 0900" };
