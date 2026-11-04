"""
techbullion_faq: BHMarketer TechBullion FAQ Generator.

A small, dependency-free FAQ engine for BHMarketer.ai's TechBullion press
release service. Type a question in plain English and it returns the best
official answer from 40 FAQs with a match-confidence score (0 to 100). It can
also generate the FAQ as Markdown, JSON, FAQPage JSON-LD or HTML.

Usage:
    python techbullion_faq.py "how much does a techbullion press release cost"
    python techbullion_faq.py --top 3 "can i publish a crypto presale on techbullion"
    python techbullion_faq.py --list buying
    python techbullion_faq.py --categories
    python techbullion_faq.py --json "what payment methods do you accept"
    python techbullion_faq.py --export markdown [category]

Built by BHMarketer.ai (https://bhmarketer.ai). MIT License.
"""

import html
import json
import re
import sys

__version__ = "1.0.0"

WEBSITE = "https://bhmarketer.ai"
SERVICE_PAGE = "https://bhmarketer.ai/products/techbullion/"
REPO = "https://github.com/bhmarketer-ai/BHMarketer-buy-techbullion-press-release-faq-generator"

STOPWORDS = set(
    "a an the is are was were be been do does did can could will would should "
    "i me my we our you your it its to of in on for with and or at by from as "
    "how what which who when where why this that there their them they if so "
    "any get got have has about into up out than then just very need want much".split()
)

SYNONYMS = {
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
    "pictures": "image", "photos": "image", "photo": "image", "images": "image",
}

WEIGHTS = {"question": 2.0, "keywords": 1.5, "answer": 0.5}

BANDS = [
    (0, 30, "No match", "Rephrase the question or contact support"),
    (31, 60, "Possible match", "Answer may be related; check the question shown"),
    (61, 80, "Good match", "Answer is likely what you need"),
    (81, 100, "Strong match", "Answer directly addresses the question"),
]

CATEGORIES = {
    "service": "Why use BHMarketer for TechBullion, speed, content and formatting",
    "buying": "Where to buy, prices, bulk packages, payment, refunds and support",
    "crypto": "Crypto, Web3 and NFT press releases on TechBullion",
    "presale": "Crypto presale and ICO press release campaigns"
}

FAQS = [
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
]


def tokenize(text):
    """Lowercase, split, drop stopwords, singularise and map synonyms."""
    text = text.lower().replace("bhmarketer.ai", "bhmarketer")
    text = text.replace("getontechbullion", "techbullion").replace("tech bullion", "techbullion")
    out = []
    for w in re.split(r"[^a-z0-9]+", text):
        if not w or w in STOPWORDS:
            continue
        w = SYNONYMS.get(w, w)
        if len(w) > 3 and w.endswith("s") and not w.endswith("ss"):
            w = w[:-1]
        w = SYNONYMS.get(w, w)
        out.append(w)
    return out


def _index(faq):
    idx = {}
    for field, weight in WEIGHTS.items():
        text = " ".join(faq[field]) if isinstance(faq[field], list) else faq[field]
        for t in tokenize(text):
            idx[t] = max(idx.get(t, 0.0), weight)
    return idx


_INDEX = [(_index(f), set(tokenize(f["question"])), f) for f in FAQS]


def band(score):
    """Return (label, meaning) for a confidence score."""
    for low, high, label, meaning in BANDS:
        if low <= score <= high:
            return label, meaning
    return "No match", ""


def search(query, top=1):
    """Return up to `top` results: dicts with id, category, question, answer, confidence, band."""
    q = list(dict.fromkeys(tokenize(query)))
    if not q:
        return []
    scored = []
    for idx, qtokens, faq in _INDEX:
        points = sum(idx.get(t, 0.0) for t in q)
        if points <= 0:
            continue
        conf = min(100, int(points / (WEIGHTS["question"] * len(q)) * 100 + 0.5))
        cover = int(sum(1 for t in qtokens if t in q) * 1000 / max(1, len(qtokens)))
        scored.append((conf, cover, faq))
    scored.sort(key=lambda s: (-s[0], -s[1], s[2]["id"]))
    out = []
    for conf, _c, faq in scored[:top]:
        label, _m = band(conf)
        out.append({"id": faq["id"], "category": faq["category"], "question": faq["question"],
                    "answer": faq["answer"], "confidence": conf, "band": label})
    return out


def ask(query):
    """Return the single best result, or None when nothing matches."""
    r = search(query, 1)
    return r[0] if r else None


def get_faq(faq_id):
    """Return one FAQ by number (1 to 40), or None."""
    for f in FAQS:
        if f["id"] == int(faq_id):
            return dict(f)
    return None


def by_category(category):
    """Return all FAQs in a category."""
    return [dict(f) for f in FAQS if f["category"] == category]


def to_jsonld(faqs):
    """FAQPage JSON-LD for a list of FAQs."""
    return json.dumps({"@context": "https://schema.org", "@type": "FAQPage",
                       "mainEntity": [{"@type": "Question", "name": f["question"],
                                       "acceptedAnswer": {"@type": "Answer", "text": f["answer"]}} for f in faqs]},
                      indent=2, ensure_ascii=False)


def export(fmt="markdown", category=None):
    """Generate the FAQ (all or one category) as markdown, json, jsonld or html."""
    faqs = by_category(category) if category else [dict(f) for f in FAQS]
    title = "TechBullion Press Release FAQ"
    if fmt == "json":
        return json.dumps([{"question": f["question"], "answer": f["answer"]} for f in faqs], indent=2, ensure_ascii=False) + "\n"
    if fmt == "jsonld":
        return to_jsonld(faqs) + "\n"
    if fmt == "html":
        items = "\n".join(f"  <h3>{html.escape(f['question'])}</h3>\n  <p>{html.escape(f['answer'])}</p>" for f in faqs)
        return (f"<section class=\"tb-faq\">\n  <h2>{html.escape(title)}</h2>\n{items}\n</section>\n"
                f"<script type=\"application/ld+json\">\n{to_jsonld(faqs)}\n</script>\n")
    lines = [f"# {title}", ""]
    for f in faqs:
        lines += [f"## {f['id']}. {f['question']}", "", f["answer"], ""]
    lines.append(f"*Generated by the BHMarketer TechBullion FAQ Generator. Learn more: {SERVICE_PAGE}*")
    return "\n".join(lines) + "\n"


USAGE = __doc__


def main(argv=None):
    args = sys.argv[1:] if argv is None else list(argv)
    if not args or args[0] in ("-h", "--help"):
        print(USAGE)
        return 0
    if args[0] == "--version":
        print(__version__)
        return 0
    if args[0] == "--categories":
        for c, d in CATEGORIES.items():
            print(f"{c:18} {len(by_category(c)):>2}  {d}")
        return 0
    if args[0] == "--list":
        items = by_category(args[1]) if len(args) > 1 else FAQS
        if not items:
            print("Unknown category. Try --categories")
            return 1
        for f in items:
            print(f"{f['id']:>2}. {f['question']}")
        return 0
    if args[0] == "--id":
        f = get_faq(args[1]) if len(args) > 1 and args[1].isdigit() else None
        if not f:
            print("FAQ number must be 1 to 40")
            return 1
        print(f"Q{f['id']}. {f['question']}\n{f['answer']}")
        return 0
    if args[0] == "--export":
        fmt = args[1] if len(args) > 1 else "markdown"
        cat = args[2] if len(args) > 2 else None
        if fmt not in ("markdown", "json", "jsonld", "html") or (cat and cat not in CATEGORIES):
            print("Use: --export markdown|json|jsonld|html [category]")
            return 1
        sys.stdout.write(export(fmt, cat))
        return 0

    as_json = False
    top = 1
    if args[0] == "--json":
        as_json, args = True, args[1:]
    if args and args[0] == "--top":
        top, args = int(args[1]), args[2:]
    query = " ".join(args)
    results = search(query, top)

    if as_json:
        print(json.dumps({"query": query, "results": results}, indent=2, ensure_ascii=False))
        return 0 if results else 1
    if not results:
        print("No matching FAQ found. Try --list to browse all 40 questions,")
        print(f"or contact BHMarketer.ai support: {WEBSITE}/contact/")
        return 1
    for r in results:
        print(f"Q{r['id']}. {r['question']}  [{r['category']}]")
        print(f"   {r['answer']}")
        print(f"   Confidence: {r['confidence']}/100 ({r['band']})\n")
    print(f"BHMarketer TechBullion FAQ Generator v{__version__}  |  {SERVICE_PAGE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
