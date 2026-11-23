import { demoRoute } from "@/components/routes";

const route = demoRoute("en");
export const generateMetadata = route.generateMetadata;
export default route.Page;
