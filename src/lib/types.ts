export interface ContentSystem {
  niche: string;
  audience: string;
  platform: string;
  ideas: string[];
  hooks: string[];
  scripts: { title: string; content: string }[];
  longFormScripts: { title: string; content: string }[];
  captions: string[];
  hashtags: string[];
  branding: {
    names: string[];
    styleDirection: string;
    logoConcept: string;
    bannerConcept: string;
    logoUrl?: string;
    bannerUrl?: string;
  };
}
