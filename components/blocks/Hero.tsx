import { LogoMark } from "../Logo";
import { ButtonRow, CmsImage } from "../ui";
import type { HeroBlock } from "@/lib/types";
import type { BlockContext } from "./context";

export function Hero({ block, ctx }: { block: HeroBlock; ctx: BlockContext }) {
  return (
    <section className="px-4 pt-6 md:px-6 md:pt-10" data-block="hero">
      <div className="dt-hero mx-auto max-w-6xl !p-8 md:!p-14">
        <LogoMark className="dt-watermark" size={320} />
        <div className={`grid items-center gap-8 ${block.image ? "md:grid-cols-2" : ""}`}>
          <div>
            <h1 className="text-display font-bold text-white">{block.heading}</h1>
            {block.text ? <p className="mt-4 max-w-2xl landing-lead text-white/90">{block.text}</p> : null}
            <ButtonRow buttons={block.buttons} lang={ctx.lang} trialUrl={ctx.trialUrl} demoApp={ctx.demoApp ?? true} onBrand />
          </div>
          {block.image ? <CmsImage image={block.image} priority className="h-auto w-full rounded-tile border border-white/20 bg-surface object-cover" /> : null}
        </div>
      </div>
    </section>
  );
}
