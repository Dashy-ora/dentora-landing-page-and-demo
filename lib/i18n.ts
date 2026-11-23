import type { Lang } from "./types";

/** Fixed interface wording (the CMS owns page content; this is only the site chrome, form messages and states). */
type Dictionary = typeof ar;

const ar = {
  siteName: "دينتورا",
  skipToContent: "تخطَّ إلى المحتوى",
  menu: "القائمة",
  closeMenu: "إغلاق القائمة",
  switchLanguage: "English",
  switchLanguageLabel: "التبديل إلى الإنجليزية",
  theme: "المظهر",
  themeLight: "فاتح",
  themeDark: "داكن",
  themeSystem: "تلقائي",
  startTrial: "ابدأ تجربتك",
  openDemo: "افتح العرض التجريبي",
  footerLinks: "روابط",
  footerContact: "تواصل معنا",
  footerRights: "جميع الحقوق محفوظة.",
  email: "البريد الإلكتروني",
  phone: "الهاتف",
  whatsapp: "واتساب",
  address: "العنوان",
  followUs: "تابعنا",
  social: {
    facebook: "فيسبوك", instagram: "إنستغرام", linkedin: "لينكدإن", x: "إكس", youtube: "يوتيوب", tiktok: "تيك توك",
  } as Record<string, string>,
  mostPopular: "الأكثر طلبًا",
  perMonth: "شهريًا",
  perYear: "سنويًا",
  setupFee: "رسوم التأسيس",
  priceOnRequest: "السعر عند الطلب",
  includedModules: "يشمل",
  choosePlan: "ابدأ بهذه الباقة",
  promoCode: "كود الخصم",
  validUntil: "ساري حتى",
  limitedOffer: "عرض لفترة محدودة",
  off: "خصم",
  noPlans: "ستظهر الباقات هنا قريبًا.",
  noOffers: "لا توجد عروض حاليًا.",
  featuresMore: "اعرف المزيد",
  modulesGroup: "مجموعة",
  form: {
    submit: "إرسال",
    sending: "جارٍ الإرسال...",
    required: "هذا الحقل مطلوب.",
    invalid: "يرجى مراجعة هذا الحقل.",
    summary: "يرجى مراجعة الحقول المظلّلة ثم المحاولة مرة أخرى.",
    rateLimited: "يرجى المحاولة مرة أخرى بعد بضع دقائق.",
    error: "تعذّر إرسال الطلب الآن. ما كتبته محفوظ، يرجى المحاولة مرة أخرى بعد قليل.",
    thanks: "شكرًا لك",
    unavailable: "النموذج غير متاح حاليًا.",
  },
  backSoon: {
    title: "سنعود قريبًا",
    text: "الموقع قيد التحديث حاليًا. يرجى العودة بعد قليل.",
  },
  notFound: {
    title: "الصفحة غير موجودة",
    text: "الرابط الذي فتحته غير صحيح أو لم يعد متاحًا.",
    home: "العودة إلى الرئيسية",
  },
  demo: {
    title: "جرّب دينتورا بنفسك",
    intro: "عيادة تجريبية بالكامل ببيانات وهمية، ما تفعله فيها يبقى في متصفحك ويُمسح عند إعادة التحميل.",
    open: "افتح العرض التجريبي",
    sampleNote: "بيانات تجريبية فقط",
    unavailableTitle: "ابدأ تجربتك مع دينتورا",
    unavailableText: "العرض التجريبي غير متاح حاليًا. يمكنك البدء بتجربة حقيقية لعيادتك، أو ترك بياناتك ونتواصل معك.",
    trial: "ابدأ تجربتك",
  },
};

const en: Dictionary = {
  siteName: "Dentora",
  skipToContent: "Skip to content",
  menu: "Menu",
  closeMenu: "Close menu",
  switchLanguage: "العربية",
  switchLanguageLabel: "Switch to Arabic",
  theme: "Theme",
  themeLight: "Light",
  themeDark: "Dark",
  themeSystem: "Auto",
  startTrial: "Start your trial",
  openDemo: "Open the demo",
  footerLinks: "Links",
  footerContact: "Contact us",
  footerRights: "All rights reserved.",
  email: "Email",
  phone: "Phone",
  whatsapp: "WhatsApp",
  address: "Address",
  followUs: "Follow us",
  social: {
    facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", x: "X", youtube: "YouTube", tiktok: "TikTok",
  },
  mostPopular: "Most popular",
  perMonth: "per month",
  perYear: "per year",
  setupFee: "Setup fee",
  priceOnRequest: "Price on request",
  includedModules: "Includes",
  choosePlan: "Start with this plan",
  promoCode: "Promo code",
  validUntil: "Valid until",
  limitedOffer: "Limited-time offer",
  off: "off",
  noPlans: "Plans will appear here soon.",
  noOffers: "There are no offers right now.",
  featuresMore: "Learn more",
  modulesGroup: "Group",
  form: {
    submit: "Send",
    sending: "Sending...",
    required: "This field is required.",
    invalid: "Please check this field.",
    summary: "Please check the highlighted fields and try again.",
    rateLimited: "Please try again in a few minutes.",
    error: "We could not send your request right now. What you wrote is kept, please try again shortly.",
    thanks: "Thank you",
    unavailable: "This form is not available right now.",
  },
  backSoon: {
    title: "We will be back soon",
    text: "The site is being updated. Please check back in a little while.",
  },
  notFound: {
    title: "Page not found",
    text: "The link you opened is wrong or no longer available.",
    home: "Back to the home page",
  },
  demo: {
    title: "Try Dentora yourself",
    intro: "A complete sample clinic with made-up data. Whatever you do stays in your browser and is cleared when you reload.",
    open: "Open the demo",
    sampleNote: "Sample data only",
    unavailableTitle: "Start your Dentora trial",
    unavailableText: "The demo is not available right now. You can start a real trial for your clinic, or leave your details and we will get in touch.",
    trial: "Start your trial",
  },
};

const dictionaries: Record<Lang, Dictionary> = { ar, en };

export function t(lang: Lang): Dictionary {
  return dictionaries[lang];
}

export function direction(lang: Lang): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}

/** Western digits in both languages (the kit's rule), Arabic or English wording. */
function locale(lang: Lang): string {
  return lang === "ar" ? "ar-EG-u-nu-latn" : "en-US";
}

export function formatMoney(minor: number, currency: string, lang: Lang): string {
  const amount = minor / 100;
  return new Intl.NumberFormat(locale(lang), {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), { dateStyle: "long", timeZone: "Africa/Cairo" }).format(new Date(iso));
}

export function formatNumber(value: number, lang: Lang): string {
  return new Intl.NumberFormat(locale(lang)).format(value);
}
