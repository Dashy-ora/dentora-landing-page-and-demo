import { CmsImage, Section } from "../ui";
import type { LogosBlock } from "@/lib/types";

export function Logos({ block }: { block: LogosBlock }) {
  return (
    <Section heading={block.heading}>
      <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6" data-block="logos">
        {block.items.map((item, index) => (
          <li key={index} className="flex h-14 items-center">
            {item.image ? <CmsImage image={{ ...item.image, alt: item.image.alt ?? item.name }} className="max-h-14 w-auto object-contain" /> : <span className="text-fg-secondary">{item.name}</span>}
          </li>
        ))}
      </ul>
    </Section>
  );
}
