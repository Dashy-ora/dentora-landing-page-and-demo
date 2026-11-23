import { Section } from "../ui";
import type { TextBlock } from "@/lib/types";

export function Text({ block }: { block: TextBlock }) {
  return (
    <Section heading={block.heading} narrow>
      <div className="landing-prose space-y-4 landing-lead text-fg-secondary" data-block="text">
        {block.paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>
    </Section>
  );
}
