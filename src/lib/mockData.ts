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
      `"POV: You just discovered the secret to ${niche} that ${audience} don't want you to know."`,
      `"I'm about to save you months of wasted effort in ${niche}."`,
      `"Nobody in the ${niche} space is talking about this."`,
      `"If you're a ${audience.split(",")[0].trim()} watching this — pay attention."`,
      `"The biggest lie in ${niche}? Let me show you."`,
      `"3 seconds. That's all I need to change how you think about ${niche}."`,
      `"This is exactly why most people fail at ${niche}."`,
      `"Unpopular opinion: Most ${niche} advice is wrong. Here's why."`,
    ],
    scripts: [
      {
        title: `The ${niche} Hack Nobody Talks About`,
        content: `HOOK: "You've been doing ${niche} completely wrong — and I can prove it in 60 seconds."\n\nSETUP: "I've spent the last 2 years deep in ${niche}, testing everything. And the one thing that actually moved the needle? It's not what any guru tells you."\n\nCONTENT: "Here's what ${audience} need to understand: [Core insight about ${niche}]. Most people skip this because it seems too simple. But simplicity is the strategy."\n\nPROOF: "When I applied this, [specific result]. And I'm not the only one — the top creators in ${niche} all do this quietly."\n\nCTA: "Follow for more ${niche} breakdowns that actually work. Save this before it gets buried."\n\n[${platform} optimization: Keep cuts fast, use text overlays for key points, trending audio underneath]`,
      },
      {
        title: `Beginner vs Pro ${niche} Mistakes`,
        content: `HOOK: "The difference between a beginner and a pro in ${niche}? It's not talent — it's these 3 mistakes."\n\nMISTAKE 1: "Beginners [common mistake]. Pros [better approach]. This alone changes everything."\n\nMISTAKE 2: "Beginners chase trends. Pros build systems. If you're a ${audience.split(",")[0].trim()}, stop scrolling and listen."\n\nMISTAKE 3: "Beginners give up after week 2. Pros know the real results come at week 8. Consistency beats intensity every time."\n\nCTA: "Which mistake hit home? Drop a comment. And follow — I post ${niche} breakdowns every day."\n\n[${platform} format: Split-screen or alternating cuts work great for comparison content]`,
      },
      {
        title: `How I Would Start ${niche} From Zero`,
        content: `HOOK: "If I had to start ${niche} from absolute zero today, here's exactly what I'd do — step by step."\n\nSTEP 1 — FOUNDATION: "First, I'd ignore all the noise. I'd pick ONE sub-topic within ${niche} and go deep. Most ${audience} try to cover everything. That's why they fail."\n\nSTEP 2 — CONTENT SYSTEM: "I'd batch-create 30 pieces of content in one weekend. Here's my formula: [Hook + Value + CTA]. That's it. Don't overthink it."\n\nSTEP 3 — DISTRIBUTION: "On ${platform}, I'd post [frequency] times per [period]. Consistency > perfection. The algorithm rewards showing up."\n\nSTEP 4 — MONETIZE: "Once I hit [milestone], I'd launch a simple [product/service]. Not a course. Not a community. Something that solves one problem for ${audience}."\n\nCTA: "Save this roadmap. Share it with someone who needs to hear this. And follow for part 2 next week."\n\n[${platform} note: Use numbered captions, clean transitions, and end with a strong CTA screen]`,
      },
    ],
    captions: [
      `Stop guessing. Start building a real ${niche} system. 🔥\n\nI broke down the exact framework that ${audience} can use to go from zero to consistent content.\n\nSave this. Share this. Then go execute.\n\n#${niche.replace(/\s+/g, "")} #ContentCreator #${platform}`,
      `The difference between someone who "wants to do ${niche}" and someone who actually does? A system.\n\nHere's the system I wish I had when I started 👇\n\n#${niche.replace(/\s+/g, "")} #CreatorEconomy #GrowOn${platform}`,
      `Nobody talks about this side of ${niche}.\n\nThe part where you feel stuck, confused, and like nothing is working.\n\nBut here's the truth: if you're still showing up, you're already ahead of 90% of ${audience}.\n\nKeep going. The algorithm will catch up.\n\n#${niche.replace(/\s+/g, "")} #Motivation #${platform}Creator`,
    ],
    hashtags: [
      niche.replace(/\s+/g, ""),
      `${niche.replace(/\s+/g, "")}Tips`,
      `${platform}Growth`,
      "ContentCreator",
      "CreatorEconomy",
      "ViralContent",
      `${platform}Strategy`,
      "ContentStrategy",
      "GrowYourBrand",
      "CreatorTips",
      `${audience.split(",")[0].trim().replace(/\s+/g, "")}`,
      "SocialMediaMarketing",
    ],
    branding: {
      names: [
        `${niche.split(" ")[0]}Flow`,
        `The ${niche.split(" ")[0]} Lab`,
        `${niche.split(" ")[0]}Insider`,
        `Untapped ${niche.split(" ")[0]}`,
        `${niche.split(" ")[0]} Decoded`,
      ],
      styleDirection: `Clean, modern aesthetic with bold typography. Primary palette: deep blacks with electric accent colors (cyan or neon green). Use high-contrast text overlays, minimalist thumbnails, and consistent branding marks. For ${platform}, lean into fast-paced edits with kinetic text. The vibe should feel authoritative but approachable — like a friend who genuinely knows their stuff in ${niche}. Target demographic (${audience}) responds best to authenticity over polish.`,
    },
  };
}
