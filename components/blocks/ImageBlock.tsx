import { CmsImage, Section } from "../ui";
import type { ImageBlock as Block } from "@/lib/types";

export function ImageBlock({ block }: { block: Block }) {
  if (!block.image) return null;
  return (
    <Section>
      <figure data-block="image">
        <CmsImage image={block.image} className="h-auto w-full rounded-card border border-line" />
        {block.caption ? <figcaption className="mt-3 text-center text-caption text-fg-secondary">{block.caption}</figcaption> : null}
      </figure>
    </Section>
  );
}
