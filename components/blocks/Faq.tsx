import { Section } from "../ui";
import type { FaqBlock } from "@/lib/types";

/** Native disclosure elements: no client JavaScript, keyboard accessible by default. */
export function Faq({ block }: { block: FaqBlock }) {
  return (
    <Section heading={block.heading} narrow>
      <div className="space-y-3" data-block="faq">
        {block.items.map((item, index) => (
          <details key={index} className="dt-card !py-4">
            <summary className="font-semibold text-fg">{item.question}</summary>
            <p className="mt-3 whitespace-pre-line text-fg-secondary">{item.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
