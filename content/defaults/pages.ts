import type { Block, Button, Lang, PageData } from "@/lib/types";
import { GroupNames, ModuleGroups, ModuleNames, PAGE_SLUGS, localImage, sayFor, uuid, type Say } from "./shared";

const button = (label: string, action: string): Button => ({ label, action });

type Spec = { title: string; description: string; header: boolean; footer: boolean; blocks: Block[] };

function moduleItems(keys: string[], lang: Lang) {
  return keys.map((module) => ({
    module,
    group: Object.entries(ModuleGroups).find(([, modules]) => modules.includes(module))?.[0] ?? "operations",
    title: ModuleNames[module]?.[lang] ?? module,
    text: null,
  }));
}

function specs(lang: Lang, say: Say): Record<string, Spec> {
  const trial = button(say("ابدأ تجربة مجانية", "Start a free trial"), "start_trial");
  const demo = button(say("جرّب النسخة التجريبية", "Try the demo"), "open_demo");
  const contact = button(say("تواصل معنا", "Talk to us"), "contact");
  const bid = (page: number) => (n: number) => uuid(page, n);
  const home = bid(1), pricing = bid(2), features = bid(3), contactIds = bid(4), demoIds = bid(5), about = bid(6), terms = bid(7), privacy = bid(8);

  const result: Record<string, Spec> = {
    home: {
      title: say("نظام دنتورا لإدارة العيادات", "Dentora clinic software"),
      description: say("أدر عيادة الأسنان من مكان واحد.", "Run your dental clinic from one place."),
      header: true,
      footer: false,
      blocks: [
        { id: home(1), type: "hero", heading: say("عيادتك بالكامل في نظام واحد", "Your whole dental clinic in one system"), text: say("المواعيد والسجلات والفواتير والتقارير لكل الفروع.", "Appointments, records, billing and reports for every branch."), image: localImage("hero-clinic", say("لوحة تحكم عيادة دنتورا", "The Dentora clinic dashboard")), buttons: [trial, demo] },
        { id: home(2), type: "feature_grid", heading: say("مصمم لعيادات مصر", "Built for Egyptian clinics"), items: [
          { icon: "calendar", title: say("مواعيد ذكية", "Smart scheduling"), text: say("الكراسي والأطباء والتذكيرات في تقويم واحد.", "Chairs, dentists and reminders in one calendar.") },
          { icon: "file-medical", title: say("سجلات سريرية", "Clinical records"), text: say("المخططات والخطط والملاحظات الموقعة.", "Charts, plans and signed notes.") },
          { icon: "wallet", title: say("فواتير بالجنيه المصري", "Billing in EGP"), text: say("عروض الأسعار والفواتير والعربون والتقسيط.", "Quotes, invoices, deposits and installments.") },
        ] },
        { id: home(3), type: "image_text", image: localImage("schedule", say("تقويم المواعيد", "The appointment calendar")), heading: say("يوم عمل منظم", "An organised working day"), text: say("شاهد كل المواعيد والكراسي والأطباء في شاشة واحدة، وقلّل المواعيد الضائعة.", "See every appointment, chair and dentist on one screen, and lose fewer bookings."), image_side: "start" },
        { id: home(4), type: "image_text", image: localImage("records", say("ملف مريض مع مخطط الأسنان", "A patient file with the tooth chart")), heading: say("سجل المريض في مكان واحد", "Each patient in one place"), text: say("التاريخ المرضي والمخططات والخطط والملاحظات الموقعة بين يديك أثناء الكشف.", "History, charts, plans and signed notes are at hand during the visit."), image_side: "end" },
        { id: home(5), type: "plans", heading: say("باقات لكل عيادة", "Plans for every clinic") },
        { id: home(6), type: "offers", heading: null },
        { id: home(7), type: "cta", heading: say("شاهد دنتورا ببيانات تجريبية", "See Dentora with sample data"), text: null, buttons: [demo] },
      ],
    },
    pricing: {
      title: say("الأسعار", "Pricing"),
      description: say("الباقات والأسعار بالجنيه المصري.", "Plans and prices in Egyptian pounds."),
      header: true,
      footer: false,
      blocks: [
        { id: pricing(1), type: "plans", heading: say("اختر باقتك", "Choose your plan") },
        { id: pricing(2), type: "faq", heading: say("أسئلة شائعة", "Questions"), items: [
          { question: say("هل يمكنني تغيير الباقة لاحقا؟", "Can I change plans later?"), answer: say("نعم، ينقلك فريقنا إلى باقة أخرى عند الطلب.", "Yes, our team moves you to another plan when you ask.") },
        ] },
      ],
    },
    features: {
      title: say("المزايا", "Features"),
      description: say("كل وحدات دنتورا.", "Every Dentora module."),
      header: true,
      footer: false,
      blocks: [
        { id: features(1), type: "modules", heading: say("كل ما تحتاجه عيادتك", "Everything your clinic needs"), items: moduleItems(["scheduling", "clinical", "billing", "insurance", "inventory", "reports"], lang) },
        { id: features(2), type: "image_text", image: localImage("billing", say("فاتورة مع بنود وإجمالي", "An invoice with lines and a total")), heading: say("فواتير واضحة بالجنيه المصري", "Clear invoices in EGP"), text: say("من عرض السعر إلى الفاتورة والتحصيل في خطوات قليلة.", "From quote to invoice to payment in a few steps."), image_side: "start" },
      ],
    },
    contact: {
      title: say("تواصل معنا", "Contact us"),
      description: say("اطلب عرضا أو مكالمة.", "Ask for a demo or a call back."),
      header: true,
      footer: true,
      blocks: [
        { id: contactIds(1), type: "text", heading: say("نرد خلال يوم عمل واحد", "We reply within one working day"), paragraphs: [say("أرسل النموذج وسيتواصل معك فريقنا.", "Send the form and our team will contact you.")] },
      ],
    },
    demo: {
      title: say("جرّب النسخة التجريبية", "Try the demo"),
      description: say("بوابة العيادة ببيانات تجريبية في متصفحك.", "The clinic portal with sample data, in your browser."),
      header: true,
      footer: false,
      blocks: [
        { id: demoIds(1), type: "hero", heading: say("استكشف عيادة نايل سمايل التجريبية", "Explore Nile Smile Demo"), text: say("لا يتم حفظ أي تغيير.", "Nothing you change is saved."), image: null, buttons: [demo, trial] },
      ],
    },
    about: {
      title: say("عن دنتورا", "About Dentora"),
      description: say("من نحن.", "Who we are."),
      header: false,
      footer: true,
      blocks: [
        { id: about(1), type: "text", heading: null, paragraphs: [say("دنتورا نظام لإدارة عيادات الأسنان مصمم لمصر.", "Dentora is clinic management software made for dental clinics in Egypt.")] },
        { id: about(2), type: "cta", heading: say("لديك أسئلة؟", "Questions?"), text: null, buttons: [contact] },
      ],
    },
    terms: placeholderPage(terms(1), say("شروط الاستخدام", "Terms of use"), say("الشروط", "terms of use"), "الشروط", say),
    privacy: placeholderPage(privacy(1), say("الخصوصية", "Privacy"), say("سياسة الخصوصية", "privacy"), "سياسة الخصوصية", say),
  };

  Object.entries(ModuleGroups).forEach(([group, keys], index) => {
    const name = GroupNames[group][lang];
    result[`features/${group}`] = {
      title: name,
      description: say(`${name} في دنتورا.`, `${name} in Dentora.`),
      header: false,
      footer: false,
      blocks: [{ id: uuid(9, index + 1), type: "modules", heading: name, items: moduleItems(keys, lang) }],
    };
  });
  return result;
}

function placeholderPage(id: string, title: string, nameEn: string, nameAr: string, say: Say): Spec {
  return {
    title,
    description: say("نص مؤقت حتى نشر النص المراجع.", "Placeholder until the reviewed text is published."),
    header: false,
    footer: true,
    blocks: [{ id, type: "text", heading: null, paragraphs: [say(`نص مؤقت: سيُنشر هنا نص ${nameAr} بعد مراجعته.`, `Placeholder: the reviewed ${nameEn.toLowerCase()} text will be published here.`)] }],
  };
}

/** A default page by slug, or null when the slug is not one of the fixed pages. */
export function defaultPage(lang: Lang, slug: string): PageData | null {
  const spec = specs(lang, sayFor(lang))[slug];
  if (!spec) return null;
  return { language: lang, slug, title: spec.title, description: spec.description, share_image: null, in_header: spec.header, in_footer: spec.footer, blocks: spec.blocks };
}

export function defaultPages(lang: Lang): PageData[] {
  const all = specs(lang, sayFor(lang));
  return PAGE_SLUGS.map((slug) => ({ language: lang, slug, title: all[slug].title, description: all[slug].description, share_image: null, in_header: all[slug].header, in_footer: all[slug].footer, blocks: all[slug].blocks }));
}
