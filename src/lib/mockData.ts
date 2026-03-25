import type { ContentSystem } from "./types";

export function generateMockSystem(niche: string, audience: string, platform: string): ContentSystem {
  return {
    niche, audience, platform,
    ideas: [
      `"The ${niche} hack nobody talks about" — Contrarian take that sparks debate`,
      `"I tried ${niche} for 30 days — here's what happened" — Transformation journey`,
      `"Stop doing THIS if you care about ${niche}" — Pattern interrupt opener`,
      `"${niche} tier list" — Ranking format drives comments and shares`,
      `"Beginner vs Pro ${niche} mistakes" — Side-by-side comparison`,
      `"The truth about ${niche} in 2025" — Authority-building explainer`,
      `"${niche} red flags you're ignoring" — Warning-style listicle`,
      `"How I would start ${niche} from zero" — Roadmap content`,
      `"Things I wish I knew before starting ${niche}" — Relatable storytelling`,
      `"${niche} myths that are costing you" — Myth-busting format`,
    ],
    hooks: [
      `"You've been doing ${niche} completely wrong — let me prove it in 60 seconds."`,
      `"This one ${niche} tip made me rethink everything..."`,
      `"POV: You just discovered the secret to ${niche}."`,
    ],
    scripts: [
      {
        title: `The ${niche} Hack Nobody Talks About`,
        content: `HOOK: "You've been doing ${niche} completely wrong."\n\nSETUP: Short setup.\n\nCONTENT: Core content.\n\nCTA: "Follow for more."`,
      },
    ],
    longFormScripts: [
      {
        title: `The Complete ${niche} Guide for ${audience}`,
        content: `INTRO: Welcome and hook.\n\nSECTION 1: Foundation.\n\nSECTION 2: Strategy.\n\nSECTION 3: Advanced tips.\n\nOUTRO: CTA and wrap-up.`,
      },
    ],
    captions: [
      `Stop guessing. Start building a real ${niche} system. 🔥`,
    ],
    hashtags: [
      niche.replace(/\s+/g, ""),
      "ContentCreator",
      "ViralContent",
    ],
    branding: {
      names: [
        `${niche.split(" ")[0]}Flow`,
        `The ${niche.split(" ")[0]} Lab`,
      ],
      styleDirection: `Clean, modern aesthetic with bold typography for ${niche}.`,
      logoConcept: `Minimalist icon representing ${niche} with bold accent colors.`,
      bannerConcept: `Wide banner with gradient background and brand name in modern sans-serif.`,
    },
  };
}
