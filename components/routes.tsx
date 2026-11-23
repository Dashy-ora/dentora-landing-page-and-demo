import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { DemoPage } from "./DemoPage";
import { LandingPage } from "./LandingPage";
import { NotFoundView } from "./NotFoundView";
import { SiteChrome } from "./SiteChrome";
import { getDemo, getPage } from "@/lib/data";
import { slugFromSegments } from "@/lib/paths";
import { buildMetadata, noIndexMetadata } from "@/lib/seo";
import type { Lang } from "@/lib/types";

type Params = Promise<{ slug?: string[] }>;

export function landingRoute(lang: Lang) {
  return {
    async generateMetadata({ params }: { params: Params }): Promise<Metadata> {
      const slug = slugFromSegments((await params).slug);
      if (slug === null) return noIndexMetadata(lang);
      await connection(); // content is request-time: nothing is read from the backend while the build prerenders
      const page = await getPage(lang, slug);
      if (page.status !== "ok") return noIndexMetadata(lang);
      return buildMetadata({ lang, slug, title: slug === "home" ? null : page.data.title, description: page.data.description, shareImage: page.data.share_image });
    },
    Page({ params }: { params: Params }) {
      return (
        <Suspense fallback={null}>
          <LandingPage lang={lang} params={params} />
        </Suspense>
      );
    },
  };
}

export function demoRoute(lang: Lang) {
  return {
    async generateMetadata(): Promise<Metadata> {
      await connection();
      const [page, demo] = await Promise.all([getPage(lang, "demo"), getDemo()]);
      if (page.status === "ok") return buildMetadata({ lang, slug: "demo", title: page.data.title, description: page.data.description, shareImage: page.data.share_image });
      if (demo.status === "ok") return buildMetadata({ lang, slug: "demo", title: demo.data.clinic.name[lang], description: demo.data.welcome[lang] });
      return noIndexMetadata(lang);
    },
    Page() {
      return (
        <Suspense fallback={null}>
          <DemoPage lang={lang} />
        </Suspense>
      );
    },
  };
}

export function NotFoundPage({ lang }: { lang: Lang }) {
  return (
    <Suspense fallback={null}>
      <SiteChrome lang={lang} slug="home">
        <NotFoundView lang={lang} />
      </SiteChrome>
    </Suspense>
  );
}
