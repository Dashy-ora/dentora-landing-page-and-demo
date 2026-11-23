import { NotFoundPage } from "@/components/routes";
import { noIndexMetadata } from "@/lib/seo";

// Only reached through the proxy, which answers it with status 404.
export const generateMetadata = () => noIndexMetadata("ar");

export default function PageNotFound() {
  return <NotFoundPage lang="ar" />;
}
