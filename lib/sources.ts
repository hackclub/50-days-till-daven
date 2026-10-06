// "How did you hear about Haven?" is free text, so it's bucketed server-side and the raw answer
// never leaves the server.
export const SOURCES = [
  "Friends & family",
  "Instagram",
  "Slack",
  "Hack Club",
  "School",
  "Other socials",
  "Other",
] as const;
export type Source = (typeof SOURCES)[number];

const RULES: [Source, RegExp][] = [
  ["Instagram", /\b(insta|instagram|ig)\b/],
  ["Slack", /\bslack\b/],
  ["Other socials", /\b(tiktok|youtube|yt|reddit|discord|twitter|x\.com|linkedin|facebook|whatsapp|telegram|threads|snapchat|social)\b/],
  ["Friends & family", /\b(friends?|friendz|frnds?|frend|freinds?|amig[oa]s?|ami|amie|brother|sister|sibling|cousin|mom|dad|mother|father|parent|family|familiar|organi[sz]er|someone|peer|mentor|word of mouth|told me|invited|asked me)\b|朋友/],
  ["Hack Club", /\b(hack ?club|hackclub|hacklcub|hcb|website|scrapbook|arcade|campfire|summer of making|high seas|daydream|jumpstart)\b/],
  ["School", /\b(school|scgool|teacher|class|classmates?|club|college|professor|principal|counsel+or|university|uni|escuela|colegio|universidad|uam)\b/],
];

export function categorizeSource(text: unknown): Source | null {
  if (typeof text !== "string" || !text.trim()) return null;
  const t = text.toLowerCase();
  for (const [source, re] of RULES) if (re.test(t)) return source;
  return "Other";
}
