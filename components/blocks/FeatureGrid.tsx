import { Icon } from "../Icon";
import { Section } from "../ui";
import type { FeatureGridBlock } from "@/lib/types";

export function FeatureGrid({ block }: { block: FeatureGridBlock }) {
  return (
    <Section heading={block.heading}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-block="feature_grid">
        {block.items.map((item, index) => (
          <li key={index} className="dt-tile">
            <span className="dt-mark-ring dt-mark-ring-sm mb-2">
              <Icon name={item.icon} />
            </span>
            <h3 className="text-title font-semibold text-fg">{item.title}</h3>
            <p className="text-fg-secondary">{item.text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
