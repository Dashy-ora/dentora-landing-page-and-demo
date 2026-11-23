"use client";

import { useRef, useState, type FormEvent } from "react";
import { runSubmit, type FieldErrors, type FieldValues } from "@/lib/forms";
import { t } from "@/lib/i18n";
import type { FormDefinition, FormField, Lang } from "@/lib/types";

type Status = "idle" | "sending" | "success" | "rate_limited" | "error";

function inputProps(field: FormField) {
  switch (field.type) {
    case "email": return { type: "email", inputMode: "email" as const, autoComplete: "email", dir: "ltr" as const };
    case "phone": return { type: "tel", inputMode: "tel" as const, autoComplete: "tel", dir: "ltr" as const };
    case "number": return { type: "text", inputMode: "numeric" as const, dir: "ltr" as const };
    default: return { type: "text" };
  }
}

/** Renders a published form definition. Client rules mirror the server; the typed values survive every error. */
export function FormView({ definition, lang, id }: { definition: FormDefinition; lang: Lang; id?: string }) {
  const s = t(lang).form;
  const [values, setValues] = useState<FieldValues>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const honeypot = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    const result = await runSubmit({ definition, values, lang, honeypot: honeypot.current?.value ?? "" });
    setValues(result.values);
    setErrors(result.errors);
    setStatus(result.status);
    const first = definition.fields.find((field) => result.errors[field.key]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first.key}"]`)?.focus();
  }

  if (status === "success") {
    return (
      <div id={id} className="dt-card" role="status" data-form-state="success">
        <div className="dt-mark-ring mb-3">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 className="dt-card-title">{s.thanks}</h3>
        <p className="mt-2 text-fg-secondary">{definition.thank_you}</p>
      </div>
    );
  }

  const hasFieldErrors = Object.keys(errors).length > 0;
  return (
    <form id={id} ref={formRef} onSubmit={onSubmit} noValidate className="dt-card space-y-4" data-form={definition.key}>
      <div>
        <h3 className="dt-card-title">{definition.title}</h3>
        {definition.intro ? <p className="mt-1 text-fg-secondary">{definition.intro}</p> : null}
      </div>

      {hasFieldErrors ? <div className="dt-alert dt-alert-error" role="alert">{s.summary}</div> : null}
      {status === "rate_limited" ? <div className="dt-alert dt-alert-warning" role="alert" data-form-state="rate_limited">{s.rateLimited}</div> : null}
      {status === "error" ? <div className="dt-alert dt-alert-error" role="alert" data-form-state="error">{s.error}</div> : null}

      {definition.fields.map((field) => {
        const error = errors[field.key];
        const fieldId = `${definition.key}-${field.key}`;
        const common = {
          id: fieldId,
          name: field.key,
          value: values[field.key] ?? "",
          required: field.required,
          placeholder: field.placeholder ?? undefined,
          "aria-invalid": error ? (true as const) : undefined,
          "aria-describedby": error ? `${fieldId}-error` : undefined,
          className: "dt-input",
          onChange: (event: { target: { value: string } }) => setValues((current) => ({ ...current, [field.key]: event.target.value })),
        };
        return (
          <div key={field.key}>
            <label htmlFor={fieldId} className="dt-label">
              {field.label}
              {field.required ? <span aria-hidden="true"> *</span> : null}
            </label>
            {field.type === "textarea" ? <textarea {...common} rows={4} maxLength={field.max} /> : <input {...common} {...inputProps(field)} />}
            {error ? (
              <p id={`${fieldId}-error`} className="dt-error-text">
                {error === "required" ? s.required : s.invalid}
              </p>
            ) : null}
          </div>
        );
      })}

      {/* Honeypot (contract: company_website): hidden from people and assistive tech; bots fill it and the backend drops the request. */}
      <div aria-hidden="true" style={{ position: "absolute", insetInlineStart: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Website
          <input ref={honeypot} type="text" name={definition.honeypot_field} tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <button type="submit" className="dt-btn dt-btn-primary dt-btn-lg" aria-busy={status === "sending"} disabled={status === "sending"}>
        {status === "sending" ? s.sending : s.submit}
      </button>
    </form>
  );
}
