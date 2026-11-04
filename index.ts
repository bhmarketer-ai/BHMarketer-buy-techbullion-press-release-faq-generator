#!/usr/bin/env node
/**
 * @bhmarketer-ai/techbullion-faq-generator
 * BHMarketer TechBullion FAQ Generator: library and CLI.
 *
 * Type a question in plain English and get the best official answer from 40
 * TechBullion press release FAQs, with a match-confidence score (0 to 100).
 * It can also generate the FAQ as Markdown, JSON, FAQPage JSON-LD or HTML.
 *
 *   tb-faq "how much does a techbullion press release cost"
 *   tb-faq --top 3 "can i publish a crypto presale on techbullion"
 *   tb-faq --list buying
 *   tb-faq --export jsonld
 *
 * Built by BHMarketer.ai (https://bhmarketer.ai). MIT License.
 */

export const VERSION = "1.0.0";
export const WEBSITE = "https://bhmarketer.ai";
export const SERVICE_PAGE = "https://bhmarketer.ai/products/techbullion/";
export const REPO = "https://github.com/bhmarketer-ai/BHMarketer-buy-techbullion-press-release-faq-generator";

export interface FAQ {
  id: number;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
}

export interface Result {
  id: number;
  category: string;
  question: string;
  answer: string;
  confidence: number;
  band: string;
}

export type ExportFormat = "markdown" | "json" | "jsonld" | "html";

const STOPWORDS = new Set(
  ("a an the is are was were be been do does did can could will would should " +
    "i me my we our you your it its to of in on for with and or at by from as " +
    "how what which who when where why this that there their them they if so " +
    "any get got have has about into up out than then just very need want much").split(" ")
);

const SYNONYMS: Record<string, string> = {
  "cost": "price", "costs": "price", "pricing": "price", "prices": "price",
  "backlink": "link", "backlinks": "link", "hyperlink": "link", "follow": "dofollow",
  "charge": "fee", "charges": "fee", "fees": "fee",
  "remove": "removal", "removed": "removal", "removing": "removal",
  "takedown": "removal", "delete": "removal", "deleted": "removal",
  "chatgpt": "ai", "llm": "ai", "gemini": "ai", "perplexity": "ai", "geo": "ai",
  "web3": "crypto", "blockchain": "crypto", "token": "crypto", "tokens": "crypto",
  "pr": "press", "release": "press", "releases": "press",
  "refunds": "refund", "pay": "payment", "paying": "payment",
  "long": "time", "quick": "fast", "quickly": "fast", "faster": "fast",
  "article": "article", "articles": "article", "post": "article",
  "ranking": "rank", "rankings": "rank", "ranked": "rank",
  "visitors": "traffic", "visits": "traffic",
  "mistake": "error", "mistakes": "error", "typo": "error", "typos": "error",
  "contact": "support", "whatsapp": "support",
  "cancel": "refund", "money": "refund",
  "use": "benefit", "using": "benefit", "benefits": "benefit", "advantage": "benefit", "advantages": "benefit",
  "pictures": "image", "photos": "image", "photo": "image", "images": "image"
};

const WEIGHTS = { question: 2.0, keywords: 1.5, answer: 0.5 };

export const BANDS: [number, number, string, string][] = [
  [0, 30, "No match", "Rephrase the question or contact support"],
  [31, 60, "Possible match", "Answer may be related; check the question shown"],
  [61, 80, "Good match", "Answer is likely what you need"],
  [81, 100, "Strong match", "Answer directly addresses the question"],
];

export const CATEGORIES: Record<string, string> = {
  "service": "Why use BHMarketer for TechBullion, speed, content and formatting",
  "buying": "Where to buy, prices, bulk packages, payment, refunds and support",
  "crypto": "Crypto, Web3 and NFT press releases on TechBullion",
  "presale": "Crypto presale and ICO press release campaigns"
};

export const FAQS: FAQ[] = [
  {"id": 1, "category": "service", "question": "What are the benefits of using BHMarketer for a TechBullion press release?", "answer": "BHMarketer handles the full process: quality content, fast editorial approval, Google indexing support and up to two authoritative do-follow backlinks in your TechBullion article.", "keywords": ["benefits", "why", "choose", "advantages", "bhmarketer"]},
  {"id": 2, "category": "service", "question": "How fast does a TechBullion press release go live through BHMarketer?", "answer": "Most TechBullion press releases distributed through BHMarketer go live and begin indexing in Google within 24 to 72 business hours after editorial approval.", "keywords": ["fast", "time", "turnaround", "live", "days", "hours", "delivery"]},
  {"id": 3, "category": "service", "question": "Does BHMarketer provide live links for TechBullion publications?", "answer": "Yes. BHMarketer delivers the live article URL as soon as your press release is published on TechBullion, so you can check it straight away.", "keywords": ["live", "links", "proof", "url", "report", "confirmation"]},
  {"id": 4, "category": "service", "question": "Is content writing included when I order a TechBullion post from BHMarketer?", "answer": "You can submit your own ready draft for distribution, or choose a premium tier that includes professional SEO content writing.", "keywords": ["content", "writing", "writer", "write", "written", "draft", "copywriting"]},
  {"id": 5, "category": "service", "question": "Will a TechBullion press release by BHMarketer help my brand's online reputation?", "answer": "Yes. TechBullion is a trusted business and technology site, so an article there tends to rank well in Google and strengthens your brand's search presence.", "keywords": ["reputation", "brand", "orm", "presence", "visibility"]},
  {"id": 6, "category": "service", "question": "Can I add images to my TechBullion press release with BHMarketer?", "answer": "Yes. BHMarketer supports high-resolution graphics, logo images and screenshots inside your TechBullion article.", "keywords": ["images", "image", "logo", "graphics", "screenshots", "photos"]},
  {"id": 7, "category": "service", "question": "What formatting rules apply to a TechBullion press release via BHMarketer?", "answer": "Articles should ideally be 500 to 1,000 words, use clear subheadings and include keywords naturally, with up to two do-follow anchor texts.", "keywords": ["formatting", "rules", "word", "count", "length", "subheadings", "anchor"]},
  {"id": 8, "category": "service", "question": "Does BHMarketer check if my TechBullion submission meets editorial guidelines?", "answer": "Yes. BHMarketer's SEO team pre-checks every draft so it matches TechBullion's editorial layout and gets approved quickly.", "keywords": ["editorial", "guidelines", "check", "review", "compliance"]},
  {"id": 9, "category": "service", "question": "Do the links in a BHMarketer TechBullion post stay active?", "answer": "Your published press release and its do-follow links stay live on TechBullion under the publisher's standard archive policy, with no recurring fee.", "keywords": ["links", "stay", "active", "remain", "online", "dofollow"]},
  {"id": 10, "category": "service", "question": "How does BHMarketer make sure a TechBullion press release gets indexed?", "answer": "BHMarketer uses sitemap pings and optional AI schema formatting to help search engines crawl and index the live post quickly.", "keywords": ["index", "indexing", "google", "crawl", "sitemap", "schema"]},
  {"id": 11, "category": "buying", "question": "Where can I buy a TechBullion press release package from BHMarketer?", "answer": "Order directly on the BHMarketer TechBullion page (https://bhmarketer.ai/products/techbullion/) or through the Get on TechBullion hub (https://getontechbullion.com/). BHMarketer also takes orders through its verified service threads on the BlackHatWorld marketplace.", "keywords": ["where", "buy", "order", "purchase", "checkout", "link"]},
  {"id": 12, "category": "buying", "question": "What is the typical price range to buy a TechBullion press release from BHMarketer?", "answer": "TechBullion packages usually range from around $40 to $90 per post, depending on whether you provide the content or add writing and schema optimization. Check the order page for the current price.", "keywords": ["price", "cost", "pricing", "range", "how", "much", "fee"]},
  {"id": 13, "category": "buying", "question": "Can I buy bulk TechBullion press release placements from BHMarketer?", "answer": "Yes. BHMarketer offers wholesale and bulk packages from around $150 to over $500 for agencies running link-building campaigns for several clients.", "keywords": ["bulk", "wholesale", "agency", "multiple", "discount", "packages"]},
  {"id": 14, "category": "buying", "question": "What payment methods are accepted when I buy from BHMarketer?", "answer": "BHMarketer accepts card payments, PayPal and several popular cryptocurrencies, so international clients can pay easily.", "keywords": ["payment", "methods", "card", "paypal", "crypto", "pay"]},
  {"id": 15, "category": "buying", "question": "Does BHMarketer offer a reseller dashboard for buying TechBullion press releases?", "answer": "Yes. Agencies can use BHMarketer's white-label tracking system to place and monitor client orders in bulk.", "keywords": ["reseller", "dashboard", "white", "label", "agency", "tracking"]},
  {"id": 16, "category": "buying", "question": "Is it safe to buy TechBullion links through BHMarketer for Google SEO?", "answer": "BHMarketer places your content on genuine, high-authority TechBullion news pages in relevant sections. Google asks that paid links be marked as sponsored, so keep anchor text natural and treat the post as brand visibility and referral traffic as well as SEO.", "keywords": ["safe", "google", "seo", "risk", "penalty", "links"]},
  {"id": 17, "category": "buying", "question": "Can I get a refund if my post cannot be published on TechBullion?", "answer": "Yes. If your draft fails TechBullion's editorial review, BHMarketer gives you a full order credit or swaps the order to another top-tier site.", "keywords": ["refund", "rejected", "fail", "cannot", "publish", "credit"]},
  {"id": 18, "category": "buying", "question": "How can I contact BHMarketer support after buying a TechBullion package?", "answer": "Message the support desk on Telegram at @indianmojojo (https://t.me/indianmojojo), on WhatsApp at +1 917 795 8348, or email mojo@wewinconsultants.com.", "keywords": ["contact", "support", "help", "telegram", "whatsapp", "email", "reach"]},
  {"id": 19, "category": "buying", "question": "Do I need an account to buy services from BHMarketer.ai?", "answer": "No. You can check out as a guest. A free account lets you track your full distribution history.", "keywords": ["account", "guest", "signup", "register", "login"]},
  {"id": 20, "category": "buying", "question": "Can I target specific locations when buying a TechBullion post?", "answer": "TechBullion has a global readership, but you can write your article to target search traffic from specific countries or local regions.", "keywords": ["geo", "location", "local", "country", "region", "target"]},
  {"id": 21, "category": "crypto", "question": "Are crypto-related articles allowed on TechBullion through BHMarketer?", "answer": "Yes. BHMarketer has a direct editorial path on TechBullion that accepts blockchain, Web3, DeFi and cryptocurrency news.", "keywords": ["crypto", "allowed", "accepted", "blockchain", "web3", "defi"]},
  {"id": 22, "category": "crypto", "question": "What are the rules for publishing a TechBullion crypto press release?", "answer": "Content must cover educational updates, tech breakthroughs or genuine company events. Misleading hype and unverified financial claims are not allowed.", "keywords": ["crypto", "rules", "guidelines", "hype", "claims", "requirements"]},
  {"id": 23, "category": "crypto", "question": "Can I include smart contract addresses in a TechBullion crypto post?", "answer": "Yes. Verified smart contract details, token symbols and GitHub repository links can be formatted cleanly into your release for transparency.", "keywords": ["smart", "contract", "address", "token", "symbol", "github"]},
  {"id": 24, "category": "crypto", "question": "Does BHMarketer accept crypto payments for TechBullion crypto press releases?", "answer": "Yes. BHMarketer accepts major cryptocurrencies such as Bitcoin (BTC), Ethereum (ETH) and USDT for all orders.", "keywords": ["crypto", "payment", "bitcoin", "btc", "ethereum", "eth", "usdt"]},
  {"id": 25, "category": "crypto", "question": "Will a crypto press release on TechBullion boost my token's search ranking?", "answer": "It can help. A backlink from an authoritative site like TechBullion adds relevance and authority that can help your official project domain rank for targeted crypto phrases.", "keywords": ["token", "ranking", "rank", "search", "seo", "boost"]},
  {"id": 26, "category": "crypto", "question": "Can I publish NFT project news on TechBullion via BHMarketer?", "answer": "Yes. Digital art drops, Web3 gaming milestones and utility NFT announcements are all supported.", "keywords": ["nft", "art", "drop", "gaming", "web3", "utility"]},
  {"id": 27, "category": "crypto", "question": "Does a TechBullion crypto post get labeled as an advertisement?", "answer": "Any labels follow TechBullion's own editorial rules, which BHMarketer does not control. BHMarketer places your post in the most relevant business or fintech category.", "keywords": ["sponsored", "ad", "advertisement", "label", "marked"]},
  {"id": 28, "category": "crypto", "question": "Can I link to a crypto exchange from my TechBullion press release?", "answer": "Yes. You can link to the centralized or decentralized exchanges where your project's token trades.", "keywords": ["exchange", "link", "trading", "platform", "dex", "cex"]},
  {"id": 29, "category": "crypto", "question": "What makes TechBullion a good choice for crypto marketing campaigns?", "answer": "TechBullion has a large business, fintech and technology readership, which puts your project in front of active Web3 readers and investors.", "keywords": ["crypto", "marketing", "campaign", "why", "techbullion", "audience", "readers"]},
  {"id": 30, "category": "crypto", "question": "How long does a crypto article stay live on TechBullion via BHMarketer?", "answer": "Crypto posts published through BHMarketer stay in TechBullion's archive under the publisher's standard policy, with no recurring fee.", "keywords": ["crypto", "article", "stay", "live", "online", "archive", "remain"]},
  {"id": 31, "category": "presale", "question": "Can I launch a crypto presale campaign on TechBullion using BHMarketer?", "answer": "Yes. BHMarketer specializes in media coverage that announces token presales, ICO milestones and seed round launches.", "keywords": ["presale", "launch", "campaign", "ico", "seed", "round"]},
  {"id": 32, "category": "presale", "question": "Are special warnings required for a TechBullion crypto presale press release?", "answer": "Yes. Include a clear financial risk disclaimer at the end of the article. It is standard practice and builds reader trust.", "keywords": ["warning", "disclaimer", "risk", "financial", "compliance"]},
  {"id": 33, "category": "presale", "question": "Can my TechBullion presale press release link directly to a token buying page?", "answer": "Yes. Your do-follow links can point straight to your secure presale landing page or dashboard.", "keywords": ["presale", "link", "buying", "page", "landing", "dashboard"]},
  {"id": 34, "category": "presale", "question": "How does BHMarketer optimize a presale press release for maximum visibility?", "answer": "BHMarketer uses keyword-focused headings, optional AI FAQ sections and strong authority links to win search impressions quickly.", "keywords": ["optimize", "visibility", "impressions", "headings", "faq"]},
  {"id": 35, "category": "presale", "question": "Can I promote a meme token presale on TechBullion through BHMarketer?", "answer": "Yes. Meme tokens are welcome as long as the content meets basic compliance standards and clearly explains the project's risks.", "keywords": ["meme", "token", "coin", "memecoin"]},
  {"id": 36, "category": "presale", "question": "Is a smart contract audit required for a TechBullion presale press release?", "answer": "It is not mandatory, but mentioning a completed security audit increases editorial trust and reader conversions.", "keywords": ["audit", "smart", "contract", "security", "required"]},
  {"id": 37, "category": "presale", "question": "How early should I order a TechBullion presale press release before launch?", "answer": "Book with BHMarketer about 3 to 5 days before your presale launch so the article goes live on time.", "keywords": ["early", "order", "book", "before", "launch", "schedule", "timing"]},
  {"id": 38, "category": "presale", "question": "Can I run multiple presale updates on TechBullion with BHMarketer?", "answer": "Yes. You can schedule a series of articles for milestones such as Phase 1 sold out or final round closing to keep momentum going.", "keywords": ["multiple", "sequential", "updates", "series", "phase", "round"]},
  {"id": 39, "category": "presale", "question": "Does BHMarketer offer multi-site packages for crypto presale marketing?", "answer": "Yes. You can bundle your TechBullion release with distribution on other top crypto and fintech news sites for wider launch exposure.", "keywords": ["multi", "site", "bundle", "package", "networks", "outlets"]},
  {"id": 40, "category": "presale", "question": "Can I update the links in my TechBullion presale post after the presale ends?", "answer": "Changes after publication depend on TechBullion's editorial queue. Contact support on Telegram at @indianmojojo to request an adjustment.", "keywords": ["update", "change", "edit", "links", "after", "presale", "ends"]},
];

/** Lowercase, split, drop stopwords, singularise and map synonyms. */
export function tokenize(text: string): string[] {
  const t = text
    .toLowerCase()
    .split("bhmarketer.ai").join("bhmarketer")
    .split("getontechbullion").join("techbullion")
    .split("tech bullion").join("techbullion");
  const out: string[] = [];
  for (let w of t.split(/[^a-z0-9]+/)) {
    if (!w || STOPWORDS.has(w)) continue;
    w = SYNONYMS[w] ?? w;
    if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
    w = SYNONYMS[w] ?? w;
    out.push(w);
  }
  return out;
}

function buildIndex(faq: FAQ): Map<string, number> {
  const idx = new Map<string, number>();
  const fields: [string, number][] = [
    [faq.question, WEIGHTS.question],
    [faq.keywords.join(" "), WEIGHTS.keywords],
    [faq.answer, WEIGHTS.answer],
  ];
  for (const [text, weight] of fields) {
    for (const tok of tokenize(text)) idx.set(tok, Math.max(idx.get(tok) ?? 0, weight));
  }
  return idx;
}

const INDEX = FAQS.map((f) => ({ idx: buildIndex(f), qtokens: new Set(tokenize(f.question)), faq: f }));

/** Return [label, meaning] for a confidence score. */
export function band(score: number): [string, string] {
  for (const [low, high, label, meaning] of BANDS) {
    if (score >= low && score <= high) return [label, meaning];
  }
  return ["No match", ""];
}

/** Return up to `top` results, best first. */
export function search(query: string, top = 1): Result[] {
  const q = Array.from(new Set(tokenize(query)));
  if (q.length === 0) return [];
  const scored: { conf: number; cover: number; faq: FAQ }[] = [];
  for (const { idx, qtokens, faq } of INDEX) {
    let points = 0;
    for (const t of q) points += idx.get(t) ?? 0;
    if (points <= 0) continue;
    const conf = Math.min(100, Math.floor((points / (WEIGHTS.question * q.length)) * 100 + 0.5));
    let hit = 0;
    for (const t of qtokens) if (q.includes(t)) hit++;
    const cover = Math.floor((hit * 1000) / Math.max(1, qtokens.size));
    scored.push({ conf, cover, faq });
  }
  scored.sort((a, b) => b.conf - a.conf || b.cover - a.cover || a.faq.id - b.faq.id);
  return scored.slice(0, top).map(({ conf, faq }) => ({
    id: faq.id, category: faq.category, question: faq.question,
    answer: faq.answer, confidence: conf, band: band(conf)[0],
  }));
}

/** Return the single best result, or null when nothing matches. */
export function ask(query: string): Result | null {
  const r = search(query, 1);
  return r.length ? r[0] : null;
}

/** Return one FAQ by number (1 to 40), or null. */
export function getFaq(id: number): FAQ | null {
  return FAQS.find((f) => f.id === id) ?? null;
}

/** Return all FAQs in a category. */
export function byCategory(category: string): FAQ[] {
  return FAQS.filter((f) => f.category === category);
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

/** FAQPage JSON-LD for a list of FAQs. */
export function toJsonLd(faqs: FAQ[]): string {
  return JSON.stringify({
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question", name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  }, null, 2);
}

/** Generate the FAQ (all or one category) as markdown, json, jsonld or html. */
export function exportFaq(format: ExportFormat = "markdown", category?: string): string {
  const faqs = category ? byCategory(category) : FAQS;
  const title = "TechBullion Press Release FAQ";
  if (format === "json") {
    return JSON.stringify(faqs.map((f) => ({ question: f.question, answer: f.answer })), null, 2) + "\n";
  }
  if (format === "jsonld") return toJsonLd(faqs) + "\n";
  if (format === "html") {
    const items = faqs.map((f) => `  <h3>${esc(f.question)}</h3>\n  <p>${esc(f.answer)}</p>`).join("\n");
    return `<section class="tb-faq">\n  <h2>${esc(title)}</h2>\n${items}\n</section>\n` +
      `<script type="application/ld+json">\n${toJsonLd(faqs)}\n</script>\n`;
  }
  const lines = [`# ${title}`, ""];
  for (const f of faqs) lines.push(`## ${f.id}. ${f.question}`, "", f.answer, "");
  lines.push(`*Generated by the BHMarketer TechBullion FAQ Generator. Learn more: ${SERVICE_PAGE}*`);
  return lines.join("\n") + "\n";
}

const USAGE = `BHMarketer TechBullion FAQ Generator v${VERSION}

Usage:
  tb-faq "how much does a techbullion press release cost"
  tb-faq --top 3 "can i publish a crypto presale on techbullion"
  tb-faq --json "what payment methods do you accept"
  tb-faq --list [category]
  tb-faq --id 12
  tb-faq --categories
  tb-faq --export markdown|json|jsonld|html [category]
  tb-faq --version`;

export function main(argv: string[] = process.argv.slice(2)): number {
  let args = [...argv];
  const print = (s: string) => console.log(s);
  if (!args.length || args[0] === "-h" || args[0] === "--help") { print(USAGE); return 0; }
  if (args[0] === "--version") { print(VERSION); return 0; }
  if (args[0] === "--categories") {
    for (const [c, d] of Object.entries(CATEGORIES)) {
      print(`${c.padEnd(18)} ${String(byCategory(c).length).padStart(2)}  ${d}`);
    }
    return 0;
  }
  if (args[0] === "--list") {
    const items = args.length > 1 ? byCategory(args[1]) : FAQS;
    if (!items.length) { print("Unknown category. Try --categories"); return 1; }
    for (const f of items) print(`${String(f.id).padStart(2)}. ${f.question}`);
    return 0;
  }
  if (args[0] === "--id") {
    const f = args.length > 1 && /^\d+$/.test(args[1]) ? getFaq(parseInt(args[1], 10)) : null;
    if (!f) { print("FAQ number must be 1 to 40"); return 1; }
    print(`Q${f.id}. ${f.question}\n${f.answer}`);
    return 0;
  }
  if (args[0] === "--export") {
    const fmt = (args[1] ?? "markdown") as ExportFormat;
    const cat = args[2];
    if (!["markdown", "json", "jsonld", "html"].includes(fmt) || (cat && !(cat in CATEGORIES))) {
      print("Use: --export markdown|json|jsonld|html [category]");
      return 1;
    }
    process.stdout.write(exportFaq(fmt, cat));
    return 0;
  }

  let asJson = false;
  let top = 1;
  if (args[0] === "--json") { asJson = true; args = args.slice(1); }
  if (args[0] === "--top") { top = parseInt(args[1], 10); args = args.slice(2); }
  const query = args.join(" ");
  const results = search(query, top);

  if (asJson) {
    print(JSON.stringify({ query, results }, null, 2));
    return results.length ? 0 : 1;
  }
  if (!results.length) {
    print("No matching FAQ found. Try --list to browse all 40 questions,");
    print(`or contact BHMarketer.ai support: ${WEBSITE}/contact/`);
    return 1;
  }
  for (const r of results) {
    print(`Q${r.id}. ${r.question}  [${r.category}]`);
    print(`   ${r.answer}`);
    print(`   Confidence: ${r.confidence}/100 (${r.band})\n`);
  }
  print(`BHMarketer TechBullion FAQ Generator v${VERSION}  |  ${SERVICE_PAGE}`);
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}
