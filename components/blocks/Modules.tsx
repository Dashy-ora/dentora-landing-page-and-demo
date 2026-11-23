import { Icon } from "../Icon";
import { Section } from "../ui";
import type { ModulesBlock } from "@/lib/types";

/** Module names and texts arrive from the backend in words; module keys and group codes are never shown. */
export function Modules({ block }: { block: ModulesBlock }) {
  return (
    <Section heading={block.heading}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-block="modules">
        {block.items.map((item, index) => (
          <li key={`${item.module}-${index}`} className="dt-card">
            <div className="flex items-start gap-3">
              <span className="dt-mark-ring dt-mark-ring-sm">
                <Icon name="check" />
              </span>
              <div>
                <h3 className="font-semibold text-fg">{item.title ?? ""}</h3>
                {item.text ? <p className="mt-1 text-fg-secondary">{item.text}</p> : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
