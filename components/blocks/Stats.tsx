import { Section } from "../ui";
import type { StatsBlock } from "@/lib/types";

export function Stats({ block }: { block: StatsBlock }) {
  return (
    <Section heading={block.heading}>
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-block="stats">
        {block.items.map((item, index) => (
          <div key={index} className="dt-tile dt-highlight text-center">
            <dd className="text-display font-bold">{item.value}</dd>
            <dt className="mt-1 text-fg-secondary">{item.label}</dt>
          </div>
        ))}
      </dl>
    </Section>
  );
}
