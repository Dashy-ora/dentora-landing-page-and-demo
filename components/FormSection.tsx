import { FormView } from "./FormView";
import { DEFAULT_CONTACT } from "@/content/defaults";
import { getForm, getNavigation } from "@/lib/data";
import type { FormKey, Lang } from "@/lib/types";

/** A form by key: the published definition, or the built-in default. The contact details are what the visitor sees if sending is not possible. */
export async function FormSection({ lang, form, anchor }: { lang: Lang; form: FormKey; anchor: string }) {
  const [definition, navigation] = await Promise.all([getForm(lang, form), getNavigation(lang)]);
  if (definition.status !== "ok") return null;
  const contact = navigation.status === "ok" ? navigation.data.contact : DEFAULT_CONTACT;
  return <FormView definition={definition.data} lang={lang} id={anchor} contact={{ phone: contact.phone ?? DEFAULT_CONTACT.phone, email: contact.email ?? DEFAULT_CONTACT.email }} />;
}
