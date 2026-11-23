import { LogoMark } from "../Logo";
import { ButtonRow } from "../ui";
import type { CtaBlock } from "@/lib/types";
import type { BlockContext } from "./context";

export function Cta({ block, ctx }: { block: CtaBlock; ctx: BlockContext }) {
  return (
    <section className="px-4 py-10 md:px-6 md:py-14" data-block="cta">
      <div className="dt-hero dt-hero-navy mx-auto max-w-4xl text-center !p-8 md:!p-12">
        <LogoMark className="dt-watermark" size={240} />
        <h2 className="text-page-title font-bold text-white">{block.heading}</h2>
        {block.text ? <p className="mx-auto mt-3 max-w-2xl landing-lead text-white/90">{block.text}</p> : null}
        <div className="flex justify-center">
          <ButtonRow buttons={block.buttons} lang={ctx.lang} trialUrl={ctx.trialUrl} demoApp={ctx.demoApp ?? true} onBrand />
        </div>
      </div>
    </section>
  );
}
