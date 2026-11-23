/** Light shape checks on what the API sends. A body that fails one is treated like an outage, so the last good copy or the built-in defaults take over. */
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const list = (value: unknown, key: string) => isObject(value) && Array.isArray(value[key]);

export type Guard = (value: unknown) => boolean;

export const isPageData: Guard = (v) => isObject(v) && typeof v.slug === "string" && typeof v.title === "string" && list(v, "blocks");
export const isNavigation: Guard = (v) => isObject(v) && list(v, "header") && list(v, "footer") && list(v, "pages") && isObject(v.contact) && list(v, "social");
export const isPricing: Guard = (v) => list(v, "plans") && list(v, "offers");
export const isOffersData: Guard = (v) => list(v, "offers");
export const isDemo: Guard = (v) => isObject(v) && typeof v.enabled === "boolean" && list(v, "modules") && isObject(v.clinic) && isObject(v.welcome) && isObject(v.trial);
export const isFormDefinition: Guard = (v) => isObject(v) && typeof v.key === "string" && list(v, "fields") && typeof v.thank_you === "string";
