import { Cta } from "./Cta";
import { FeatureGrid } from "./FeatureGrid";
import { Faq } from "./Faq";
import { Gallery } from "./Gallery";
import { Hero } from "./Hero";
import { ImageBlock } from "./ImageBlock";
import { ImageText } from "./ImageText";
import { Logos } from "./Logos";
import { Modules } from "./Modules";
import { Offers } from "./Offers";
import { Plans } from "./Plans";
import { Stats } from "./Stats";
import { Testimonials } from "./Testimonials";
import { Text } from "./Text";
import type { Block } from "@/lib/types";
import type { BlockContext } from "./context";

export type { BlockContext } from "./context";

/** One component per block type from the contract. A type this build does not know is skipped, never an error page. */
export function BlockView({ block, ctx }: { block: Block; ctx: BlockContext }) {
  switch (block.type) {
    case "hero": return <Hero block={block} ctx={ctx} />;
    case "text": return <Text block={block} />;
    case "image": return <ImageBlock block={block} />;
    case "image_text": return <ImageText block={block} />;
    case "feature_grid": return <FeatureGrid block={block} />;
    case "modules": return <Modules block={block} />;
    case "plans": return <Plans block={block} ctx={ctx} />;
    case "offers": return <Offers block={block} ctx={ctx} />;
    case "gallery": return <Gallery block={block} />;
    case "stats": return <Stats block={block} />;
    case "testimonials": return <Testimonials block={block} />;
    case "faq": return <Faq block={block} />;
    case "logos": return <Logos block={block} />;
    case "cta": return <Cta block={block} ctx={ctx} />;
    default: return null;
  }
}

export function Blocks({ blocks, ctx }: { blocks: Block[]; ctx: BlockContext }) {
  return (
    <>
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} ctx={ctx} />
      ))}
    </>
  );
}

export const needsPricing = (blocks: Block[]) => blocks.some((block) => block.type === "plans");
export const needsOffers = (blocks: Block[]) => blocks.some((block) => block.type === "offers");
