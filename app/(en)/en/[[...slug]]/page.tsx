import { landingRoute } from "@/components/routes";

const route = landingRoute("en");
export const generateMetadata = route.generateMetadata;
export default route.Page;
