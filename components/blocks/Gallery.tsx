import { CmsImage, Section } from "../ui";
import type { GalleryBlock } from "@/lib/types";

export function Gallery({ block }: { block: GalleryBlock }) {
  return (
    <Section heading={block.heading}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-block="gallery">
        {block.items.map((item, index) => (
          <li key={index}>
            <figure>
              <CmsImage image={item.image} className="h-auto w-full rounded-tile border border-line" />
              {item.caption ? <figcaption className="mt-2 text-caption text-fg-secondary">{item.caption}</figcaption> : null}
            </figure>
          </li>
        ))}
      </ul>
    </Section>
  );
}
