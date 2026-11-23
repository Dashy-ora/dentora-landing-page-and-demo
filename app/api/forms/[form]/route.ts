import { proxyForm } from "@/lib/form-proxy";

// Same-origin proxy to the backend's public form intake (the backend sends no CORS headers). See lib/form-proxy.ts.
export async function POST(request: Request, context: { params: Promise<{ form: string }> }) {
  const { form } = await context.params;
  return proxyForm(request, form);
}
