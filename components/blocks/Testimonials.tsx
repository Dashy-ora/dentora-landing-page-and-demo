import { CmsImage, Section } from "../ui";
import type { TestimonialsBlock } from "@/lib/types";

export function Testimonials({ block }: { block: TestimonialsBlock }) {
  return (
    <Section heading={block.heading}>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-block="testimonials">
        {block.items.map((item, index) => (
          <li key={index} className="dt-card flex flex-col gap-4">
            <blockquote className="landing-lead text-fg">{item.quote}</blockquote>
            <div className="mt-auto flex items-center gap-3">
              {item.image ? <CmsImage image={item.image} className="h-10 w-10 rounded-full object-cover" /> : <span className="dt-avatar dt-avatar-soft h-10 w-10" aria-hidden="true">{item.name.slice(0, 1)}</span>}
              <div>
                <p className="font-semibold text-fg">{item.name}</p>
                {item.role ? <p className="text-caption text-fg-secondary">{item.role}</p> : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
