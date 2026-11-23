import { FormView } from "./FormView";
import { getForm } from "@/lib/data";
import type { FormKey, Lang } from "@/lib/types";

/** A published form by key. When it is not published (or the backend has no copy) nothing is shown for it. */
export async function FormSection({ lang, form, anchor }: { lang: Lang; form: FormKey; anchor: string }) {
  const definition = await getForm(lang, form);
  if (definition.status !== "ok") return null;
  return <FormView definition={definition.data} lang={lang} id={anchor} />;
}
