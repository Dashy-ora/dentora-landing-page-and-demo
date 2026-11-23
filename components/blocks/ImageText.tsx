import { CmsImage, Section } from "../ui";
import type { ImageTextBlock } from "@/lib/types";

export function ImageText({ block }: { block: ImageTextBlock }) {
  // "start" puts the image on the inline-start side: left in English, right in Arabic (logical order, no per-language code).
  const imageFirst = block.image_side === "start";
  return (
    <Section>
      <div className="grid items-center gap-8 md:grid-cols-2" data-block="image_text" data-image-side={block.image_side}>
        <div className={imageFirst ? "md:order-1" : "md:order-2"}>
          <CmsImage image={block.image} className="h-auto w-full rounded-card border border-line" />
        </div>
        <div className={imageFirst ? "md:order-2" : "md:order-1"}>
          {block.heading ? <h2 className="mb-4 text-page-title font-bold text-fg-strong">{block.heading}</h2> : null}
          <p className="whitespace-pre-line landing-lead text-fg-secondary">{block.text}</p>
        </div>
      </div>
    </Section>
  );
}
