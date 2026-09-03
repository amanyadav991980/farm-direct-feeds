// Farm Direct Assistant — knowledge engine.
//
// Answers questions from farmers and buyers instantly, on-device and without
// sending anything to a server. The engine matches the question against
// curated intents about the marketplace (listing, buying, payments, delivery,
// coupons, orders, reviews, insights…), plus practical crop growing tips and
// a little Hindi/Hinglish tolerance for Indian growers. Anything it cannot
// answer clearly routes to the human support team (see lib/support.ts).
//
// This is the "AI-ready" tier that works offline: a live LLM (e.g. Gemini)
// can be layered over it later without changing the page contract below.

import { CROP_IMAGE_URLS } from "./crop-images";
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, SUPPORT_WHATSAPP_HREF } from "./support";

export type AssistantReply = {
  /** Answer text. Supports **bold** markers and "• "-prefixed bullet lines. */
  text: string;
  /** Suggested follow-up questions the user can tap. */
  chips: string[];
};

type Intent = {
  id: string;
  /** Any of these word/phrase hits count towards the match score. */
  keywords: string[];
  text: string;
  chips?: string[];
  /** Optional Hindi closer, shown when the user wrote in Devanagari. */
  hi?: string;
};

const DEVANAGARI = /[\u0900-\u097F]/;

function normalize(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─────────────────────────────── Intents ───────────────────────────────

const INTENTS: Intent[] = [
  {
    id: "sell",
    keywords: [
      "sell", "selling", "bech", "bechne", "sale karna", "list my", "list a crop",
      "list my crop", "new listing", "add a crop", "add crop", "start selling",
      "become a seller", "seller account", "how do i list", "list produce",
      "post my harvest", "farm produce sell", "apni upaj", "upaj bechna",
      "बेच", "बिक्री", "बेचना", "बेचनी",
    ],
    text: "Selling on Farm Direct takes about five minutes.\n• Create an account and choose the **farmer** role in onboarding.\n• Set up your farm profile — name, village, district and state.\n• Open **Listings → List a crop**, pick a crop from the 60-crop catalogue, set your price per unit, available stock and the harvest date.\n• Your listing goes live on the Fresh Market immediately and you can edit price or stock any time from your farmer dashboard.\nBuyers order directly — you confirm, pack and dispatch from the Orders tab, and earnings settle per delivered order.",
    chips: [
      "What does it cost to sell?",
      "How do I price my produce?",
      "How do orders and delivery work for farmers?",
    ],
    hi: "आप पाँच मिनट में बेचना शुरू कर सकते हैं — किसान प्रोफ़ाइल बनाकर अपनी फ़सल सूचीबद्ध करें, और ऑर्डर आते ही उन्हें पैक कर भेज दें।",
  },
  {
    id: "costToSell",
    keywords: [
      "commission", "platform fee", "fee for farmers", "sell cost", "charge farmers",
      "kitne %", "kitna percent", "kya fee", "cost to sell", "does it cost",
      "money do farmers", "how much do farmers", "deduct", "seller charges",
    ],
    text: "Selling is almost free.\n• Farm Direct keeps a small **platform fee of 1%** on the value of each delivered order — this keeps the market running.\n• You set your own price; what the buyer pays is yours minus that 1%.\n• There are no listing fees, no monthly charges and no hidden deductions — the full breakdown is visible on every order in your farmer dashboard.",
    chips: [
      "How do I start selling my harvest?",
      "When do I get paid for an order?",
      "How do I price my produce?",
    ],
    hi: "बेचने पर सिर्फ़ 1% प्लेटफ़ॉर्म शुल्क लगता है — लिस्टिंग या कोई और छिपा ख़र्च नहीं।",
  },
  {
    id: "payout",
    keywords: [
      "payment receive", "get paid", "when paid", "when do i get", "payout",
      "earnings", "money come", "payment kab", "paise kab", "payment aayega",
      "settlement", "delivered order paid", "my money",
    ],
    text: "Farmer earnings are settled per **delivered** order.\n• When an order reaches **delivered**, the sale value is credited to your farm account.\n• Your dashboard shows settled earnings, orders awaiting dispatch and orders on the road.\n• Every order page shows the item total, the 1% platform fee and the exact amount you earn, so you always know what you will receive.",
    chips: [
      "What does it cost to sell?",
      "How does the order status flow work?",
      "How do I price my produce?",
    ],
    hi: "जब ऑर्डर डिलीवर होता है, उसी हिसाब से आपकी कमाई आपके खाते में जुड़ती है — हर ऑर्डर पर पूरा हिसाब साफ़ दिखता है।",
  },
  {
    id: "pricing",
    keywords: [
      "price my", "pricing", "rate my", "kitne me bechu", "price recommend",
      "suggest price", "market price", "mandi rate", "mandi bhav", "kya rate",
      "best price", "price kya rakhu", "rate kya",
    ],
    text: "Farm Direct publishes a transparent **market price** for every crop in the catalogue.\n• When you list, the platform suggests the day's market-linked price as a starting point — you are free to set your own.\n• Your farmer **Insights** tab compares your price against the platform average for the same crop and flags when you are priced noticeably above the market.\n• Price with freshness: same-day harvest lots can hold a small premium; for grains and staples, buyers compare across farms, so stay close to market.",
    chips: [
      "What does it cost to sell?",
      "Where do I see demand forecasts?",
      "How do I start selling my harvest?",
    ],
    hi: "हर फ़सल का बाज़ार भाव सूचीबद्ध रहता है — लिस्टिंग के समय उसी के आधार पर कीमत तय करें, और Insights में दूसरे किसानों से अपनी तुलना देखें।",
  },
  {
    id: "forecast",
    keywords: [
      "forecast", "demand", "predict", "insights", "ai suggest", "future price",
      "trend", "kya demand", "demand kab", "recommendation", "smart price",
    ],
    text: "The farmer **Insights** workspace is the AI-ready planning centre.\n• A **7-day demand forecast** per crop is built from real order history, so you can see which produce is trending.\n• **Price recommendations** compare your listing against platform averages and the day's market price.\n• A **30-day sales chart** shows your farm's order and revenue pattern.\nToday these run on a transparent rules engine that is fully demo-ready; the same layer is designed to plug into a live AI model later.",
    chips: [
      "How do I price my produce?",
      "How do I start selling my harvest?",
      "What does it cost to sell?",
    ],
    hi: "Insights में 7 दिन की माँग का अनुमान, कीमत सुझाव और 30 दिन की बिक्री चार्ट मिलता है — यही AI-तैयार इंजन है।",
  },
  {
    id: "stock",
    keywords: [
      "stock", "inventory", "restock", "low stock", "out of stock", "update stock",
      "units left", "sold out", "stock add", "replenish", "available quantity",
    ],
    text: "Stock management is a tap away.\n• Open **Listings** in your farmer dashboard — each crop shows its current stock and a stock bar.\n• Use **Restock** to add units instantly, or edit the listing to set an exact quantity.\n• Listings that run low are flagged in **Stock watch** on your overview, and out-of-stock crops drop off buyer search results automatically.\nStock also decreases automatically on every confirmed order, so what buyers see is always live.",
    chips: [
      "How do I list a new crop?",
      "What happens when an order is placed?",
      "How do I manage my listings?",
    ],
    hi: "लिस्टिंग में एक क्लिक से स्टॉक जोड़ें; ऑर्डर कन्फ़र्म होते ही स्टॉक अपने-आप घटता है।",
  },
  {
    id: "orderFlow",
    keywords: [
      "order status", "status flow", "order journey", "placed means", "confirmed means",
      "out for delivery", "order process", "how does an order", "lifecycle", "steps of an order",
    ],
    text: "Every order follows one clear journey:\n• **Placed** — you paid and the farm received your order.\n• **Confirmed** — the farmer accepted and is packing your produce.\n• **Out for delivery** — your crate has left the farm.\n• **Delivered** — order complete; you can review the farm.\nYou can follow the same timeline on the order page, and both buyer and farmer get notifications at every step.",
    chips: [
      "Where do I track my order?",
      "Can I cancel an order?",
      "How does delivery work?",
    ],
  },
  {
    id: "track",
    keywords: [
      "track", "where is my order", "order kab aayega", "kab milega", "delivery status",
      "status of my order", "order update", "kahan pahuncha", "when will it arrive",
      "how long", "delivery time", "kab tak", "ऑर्डर कहाँ", "कहाँ है", "ऑर्डर कब",
    ],
    text: "You can follow your order live.\n• Open **Orders** in your dashboard (or the order link in your notification/email) and you'll see a visual timeline: placed → confirmed → out for delivery → delivered, with timestamps.\n• Every status change also creates an in-app notification.\n• Most produce is packed and dispatched the same day; grains and long-shelf-life lots may take a day or two depending on the farm.",
    chips: [
      "How does delivery work?",
      "Can I cancel an order?",
      "What happens if my produce arrives damaged?",
    ],
    hi: "ऑर्डर पेज पर टाइमलाइन से पता चलता है कि आपका ऑर्डर किस स्टेज पर है — और हर बदलाव पर नोटिफ़िकेशन मिलता है।",
  },
  {
    id: "cancel",
    keywords: [
      "cancel", "cancellation", "refund", "return", "change my order", "undo order",
      "vapas", "cancel kar", "paise wapas", "money back", "order wapas",
      "रद्द", "कैंसल", "वापसी", "पैसे वापस",
    ],
    text: "Cancellation is allowed while the farm is still preparing your order.\n• **Before the farm confirms** (status *placed*): you can cancel yourself from the order page — payment is refunded and stock is returned to the farm.\n• **After confirmation**: only the farmer or platform can cancel (for example if the lot can't be fulfilled) — reach out and the team will help.\n• Once an order is **out for delivery**, it can't be cancelled; if something is wrong on arrival, contact support and we will make it right.",
    chips: [
      "How do I contact support?",
      "How long does a refund take?",
      "What happens if my produce arrives damaged?",
    ],
    hi: "ऑर्डर कन्फ़र्म होने से पहले आप ख़ुद कैंसल कर सकते हैं, पैसे वापस मिल जाते हैं। उसके बाद सपोर्ट टीम मदद करती है।",
  },
  {
    id: "refundTime",
    keywords: ["refund take", "refund time", "refund kab", "money back when", "how long refund"],
    text: "Refunds for cancelled orders are processed back to the same payment method you used — UPI, card or wallet. In this demo marketplace the refund is applied instantly on cancellation; a live deployment would typically take 3–7 working days depending on the bank.",
    chips: ["Can I cancel an order?", "How do I contact support?", "What payment methods are accepted?"],
  },
  {
    id: "delivery",
    keywords: [
      "delivery charge", "delivery fee", "delivery cost", "shipping", "transport charge",
      "who delivers", "how does delivery", "courier", "logistics", "delivery partner",
      "delivery kaise", "delivery time", "same day", "डिलीवरी", "कूरियर",
    ],
    text: "Delivery is simple and transparent.\n• A flat **₹150 delivery fee** is charged per order (demo pricing) and shown clearly at checkout before you pay.\n• Each farm packs your produce after confirmation and dispatches it as one crate — one order per farm, so your basket from different farms arrives as separate deliveries with separate tracking.\n• Fresh produce is prioritised: same-day harvests are packed and dispatched the same day wherever possible.\nFarmers confirm, pack and dispatch from their dashboard; you follow the journey on the order timeline.",
    chips: ["Where do I track my order?", "What does the delivery fee cover?", "Can I order from many farms at once?"],
    hi: "हर ऑर्डर पर ₹150 फ़्लैट डिलीवरी शुल्क (डेमो) — चेकआउट पर पहले से साफ़ दिखता है।",
  },
  {
    id: "buy",
    keywords: [
      "buy", "purchase", "how do i order", "place an order", "order produce", "buy fresh",
      "buy vegetables", "buy fruits", "how to buy", "buy from farm", "order karna",
      "khareedna", "order karne", "add to order",
    ],
    text: "Buying is a four-step flow:\n• Browse the **Fresh Market**, filter by category (vegetables, fruits, grains, pulses, oilseeds) or search a crop.\n• Open a listing and **add to basket** — you'll see the farm, freshness and per-unit price.\n• In checkout, choose quantity per farm, apply a coupon if you have one, pick **UPI, card or cash on delivery** (demo) and place your order.\n• Track it from **Orders** — every farm you ordered from ships its own crate.",
    chips: [
      "What payment methods are accepted?",
      "Do you have any coupons?",
      "How does delivery work?",
    ],
    hi: "फ्रेश मार्केट से फ़सल चुनें, बास्केट में डालें, चेकआउट करें और ऑर्डर ट्रैक करें।",
  },
  {
    id: "cart",
    keywords: ["cart", "basket", "remove item", "change quantity", "my basket", "cart empty"],
    text: "Your basket holds items from different farms side by side.\n• Open the **basket** from the header basket icon.\n• Use the +/− controls to adjust quantity; stock is clamped to what the farm actually has.\n• At checkout each farm becomes its own order with its own delivery and tracking, so you always know which crate is which.",
    chips: ["How do I check out?", "What payment methods are accepted?", "How does delivery work?"],
  },
  {
    id: "checkout",
    keywords: [
      "checkout", "place order", "confirm order", "minimum order", "min qty",
      "address", "pin code", "pincode", "delivery address", "order summary",
      "how do i pay", "make payment",
    ],
    text: "Checkout is step-by-step and fully transparent.\n• Each listing has a **minimum order quantity** (shown on the product page) — your basket lets you order more, never less.\n• Add your delivery address with a valid 6-digit PIN code.\n• A live quote shows item totals, any coupon discount, the delivery fee and the 1% platform fee per farm before you confirm.\n• Choose a payment method and place the order — one order per farm, each with its own number and tracking.",
    chips: [
      "What payment methods are accepted?",
      "How do I get a coupon?",
      "Where do I track my order?",
    ],
    hi: "चेकआउट पर हर फ़ार्म का अलग ऑर्डर बनता है, और पूरा हिसाब — कूपन, डिलीवरी और शुल्क — भुगतान से पहले साफ़ दिखता है।",
  },
  {
    id: "payment",
    keywords: [
      "pay", "payment", "upi", "gpay", "phonepe", "credit card", "debit card", "netbanking",
      "net banking", "cod", "cash on delivery", "pay later", "payment safe", "secure payment",
      "bhugtan", "payment kaise", "भुगतान", "पेमेंट", "पैसे कैसे दें",
    ],
    text: "Farm Direct supports the payment methods Indian shoppers expect:\n• **UPI** (GPay, PhonePe, Paytm and others)\n• **Card** — credit and debit\n• **Net banking**\n• **Cash on delivery** where available\n• In this demo marketplace all payments run through a **mock gateway** — no real money moves and you can try every method freely. The payment architecture is Razorpay-ready (UPI, cards, net banking) so a live gateway can be switched on without changing the checkout flow.",
    chips: [
      "How do I check out?",
      "Do you have any coupons?",
      "Is this demo really free?",
    ],
    hi: "UPI, कार्ड, नेट बैंकिंग और COD — सभी तरीके डेमो में उपलब्ध हैं; असली पैसा नहीं लगता।",
  },
  {
    id: "coupons",
    keywords: [
      "coupon", "coupons", "promo", "promo code", "discount code", "offer code",
      "voucher", "discount", "code apply", "offers", "kitna discount", "discount kaise",
      "कूपन", "छूट", "ऑफ़र कोड",
    ],
    text: "Coupons are checked on the server at checkout — no guesswork.\n• Live offers appear on your buyer dashboard and the landing page (e.g. **WELCOME10**).\n• Type the code in the coupon box at checkout; it is validated against its rules — percentage or fixed amount, minimum order value, usage limit and expiry.\n• A valid coupon applies instantly to your quote; an invalid one tells you why. Each farm's order is discounted separately.",
    chips: ["What payment methods are accepted?", "How do I check out?", "What happens if a coupon doesn't work?"],
    hi: "चेकआउट पर कूपन कोड डालें — सही होने पर छूट तुरंत हिसाब में दिख जाती है।",
  },
  {
    id: "reviews",
    keywords: [
      "review", "rating", "rate the farm", "stars", "feedback", "give rating",
      "rate order", "farm good", "review kaise",
    ],
    text: "Reviews keep farms honest.\n• Once an order is **delivered**, the buyer can rate it from 1 to 5 stars with a short comment.\n• The rating appears on the farm's public page and feeds the farm's overall score shown across the market.\n• One delivered order = one review, so scores reflect real purchases, not noise.",
    chips: ["What happens if my produce arrives damaged?", "How do I contact support?", "How do I track my order?"],
    hi: "डिलीवरी के बाद आप फ़ार्म को 1–5 स्टार और कमेंट दे सकते हैं।",
  },
  {
    id: "messages",
    keywords: [
      "message the farm", "ask a farm", "contact farm", "enquiry", "inquiry", "bulk enquiry",
      "ask farmer", "question about crop", "message farmer", "farm reply",
    ],
    text: "You can talk to a farm before you buy.\n• On any farm's public page, use **Ask a question** to send an enquiry — restaurants and bulk buyers use this for volume quotes.\n• Farmers reply from their **Inquiries** tab; the conversation appears under **Messages** in your buyer dashboard.\n• Enquiries are real records: farmers see who is asking, what they want, and can mark an enquiry handled once they've responded.",
    chips: ["Can I buy in bulk as a business?", "How does delivery work?", "How do I find farms near me?"],
    hi: "किसी भी फ़ार्म के पेज से सवाल भेजें — किसान अपने Inquiries में जवाब देता है।",
  },
  {
    id: "bulk",
    keywords: [
      "bulk", "wholesale", "restaurant", "retailer", "business buyer", "bulk buyer",
      "large order", "procure", "processor", "fpo", "cooperative", "contract",
      "volume pricing", "bulk discount", "quantity discount", "trade",
    ],
    text: "Farm Direct is built for bulk buyers too — retailers, restaurants, wholesalers and processors.\n• Bulk buyers can message farms directly for volume quotes before ordering.\n• Listings show available stock, so you can see at a glance whether a farm can fill a larger lot.\n• You can combine produce from several farms; each farm ships its own crate with its own invoice-level detail.\nFor recurring monthly supply (mandi-style lots, grains, pulses, oilseeds), message the farm and agree terms — the farm confirms capacity from its stock board.",
    chips: [
      "How do I message a farm?",
      "How does delivery work?",
      "How do payments work for businesses?",
    ],
    hi: "थोक खरीदार फ़ार्म से सीधे संपर्क कर मात्रा और दर तय कर सकते हैं।",
  },
  {
    id: "notifications",
    keywords: ["notification", "notify", "alert", "updates", "order alert", "bell"],
    text: "Notifications keep you in the loop without refreshing.\n• Every order event — placed, confirmed, out for delivery, delivered, cancelled — creates an in-app notification.\n• The bell icon in the header shows your unread count; the **Notifications** page lists everything with one-tap navigation to the order or message.\n• Unread notifications are marked read as you open them.",
    chips: ["Where do I track my order?", "How do reviews work?", "How do I update my profile?"],
    hi: "ऑर्डर की हर गतिविधि पर नोटिफ़िकेशन मिलता है — बेल आइकन से पढ़ें।",
  },
  {
    id: "quality",
    keywords: [
      "damaged", "rotten", "bad produce", "not fresh", "quality", "spoiled",
      "complaint", "issue with order", "wrong item", "missing item", "kharab",
      "quality kharab", "not good", "unhappy", "dikhat", "problem with order",
      "खराब", "समस्या", "शिकायत", "सड़ा",
    ],
    text: "We stand behind what farms ship.\n• If produce arrives damaged, spoiled or not as listed, contact support right away with your order number and a photo.\n• For orders still in progress, message the farm from your **Messages** tab — most issues (a missing item, a size mix-up) are settled directly.\n• Delivered orders can't be cancelled, but the team will review your complaint and make it right.\nReach the team at **" + SUPPORT_EMAIL + "** or **" + SUPPORT_PHONE_DISPLAY + "**.",
    chips: ["How do I contact support?", "Can I cancel an order?", "How do reviews work?"],
    hi: "खराब या क्षतिग्रस्त उपज मिले तो ऑर्डर नंबर के साथ तुरंत सपोर्ट से संपर्क करें — हम इसे ठीक करते हैं।",
  },
  {
    id: "accounts",
    keywords: [
      "sign up", "signup", "register", "create account", "login", "log in", "otp",
      "verify", "account", "join", "become a buyer", "become a farmer", "new here",
      "kya karna hoga", "kaise join", "start", "first time",
    ],
    text: "Getting started takes under a minute.\n• On the **Sign in** page, enter your email and use the one-time code sent to you — no passwords to remember.\n• After the code is verified, onboarding asks you to pick a role: **Buyer** (add a delivery address) or **Farmer** (add your farm: village, district, state and farming history).\n• You can demo instantly with **Continue as guest** — the guest session can explore the buyer experience, the farmer workspace or even the platform operator view.\nOne account, one role at a time; you can switch between the buyer and farmer experiences from onboarding.",
    chips: ["What can I do as a buyer?", "What can I do as a farmer?", "Is this a real marketplace?"],
    hi: "ईमेल पर एक बार का कोड भेजकर खाता बनता है — बिना पासवर्ड। Guest के रूप में भी पूरा डेमो देख सकते हैं।",
  },
  {
    id: "settings",
    keywords: [
      "settings", "edit profile", "update profile", "change name", "edit farm",
      "farm profile", "change phone", "my details", "update details",
      "profile photo", "change my address", "update my address", "edit my address",
      "change my delivery", "change delivery address", "update delivery address",
      "delivery address", "new delivery address", "my address", "पता बदलना", "प्रोफ़ाइल",
    ],
    text: "Your details live in **Settings** (the account menu in the header).\n• Buyers can update their name, email and delivery address.\n• Farmers can edit the farm profile — farm name, village, district, state and years of experience — which is what buyers see on your public farm page.\n• Profile changes apply across the market instantly.",
    chips: ["How do I choose my role?", "How do notifications work?", "How do I contact support?"],
    hi: "Settings से अपना पता, प्रोफ़ाइल और फ़ार्म की जानकारी कभी भी बदल सकते हैं।",
  },
  {
    id: "security",
    keywords: ["safe", "secure", "privacy", "data", "trust", "scam", "fraud", "trustworthy"],
    text: "Safety first, always.\n• Every farm listing on Farm Direct belongs to a registered grower with a public farm page and real ratings.\n• Payments in the demo are simulated — in production the gateway is Razorpay-ready (UPI, cards, net banking) with industry-standard encryption.\n• Prices are market-linked and shown per unit on every listing, and the fee breakdown appears before you pay, so there are no surprises.\n• If anything ever feels off — a price that looks too good, a farm asking for off-platform payment — stop and contact support.",
    chips: ["How do I contact support?", "What payment methods are accepted?", "Is this a real marketplace?"],
    hi: "हर फ़ार्म की पब्लिक प्रोफ़ाइल और रेटिंग होती है; कीमत और शुल्क पहले से साफ़ दिखते हैं।",
  },
  {
    id: "demo",
    keywords: ["demo", "test account", "sample data", "guest", "fake", "example data", "is this real", "real or fake", "trial"],
    text: "Yes — this is a **working demo**, and everything you do is real within it.\n• The marketplace runs on a live database: 100+ demo farms, 60 crops and seeded orders are real records you can query.\n• Sign in with any email (one-time code) or **Continue as guest** to try the full buyer or farmer flow — listing, orders, coupons, delivery and reviews all actually run.\n• Payments are simulated: no real money moves, so feel free to experiment.\nThe only difference from production is that demo data powers the charts — your new orders and reviews are 100% real records on top of it.",
    chips: ["How do I start?", "Can I try the farmer side too?", "What payment methods are accepted?"],
    hi: "यह पूरी तरह चलने वाला डेमो है — लिस्टिंग, ऑर्डर और रिव्यू सब असली डेटाबेस पर होते हैं, सिर्फ़ भुगतान सिम्युलेटेड है।",
  },
  {
    id: "admin",
    keywords: ["admin", "operator", "platform operator", "manage platform", "admin panel", "run the platform"],
    text: "The platform operator view is part of the demo.\n• Sign in, pick **Platform Operator** on the onboarding screen, and you get the admin command centre: platform revenue, order chart, top produce, farmer rankings and coupon management.\n• It's the same database every role sees — orders placed by buyers show up here instantly.\nIn this demo, the operator role is available through the guest/continue flow; a production build would gate it behind real staff credentials.",
    chips: ["How do I start?", "Is this a real marketplace?", "How do I contact support?"],
    hi: "प्लेटफ़ॉर्म ऑपरेटर व्यू डेमो में गेस्ट के रूप में चुना जा सकता है — पूरा एडमिन पैनल खुलता है।",
  },
  {
    id: "freshness",
    keywords: ["fresh", "harvest", "how fresh", "same day", "shelf life", "stored how long", "age of produce", "freshness"],
    text: "Freshness is the whole point.\n• Listings carry their **harvest date**; anything harvested within 24 hours is flagged **Fresh today** on the market.\n• The catalogue also tracks each crop's **shelf life** (e.g. spinach 3 days, onion 30), and farms price and stock accordingly.\n• Produce is packed by the farm on the day of dispatch — from field to doorstep in about a day for local orders.",
    chips: ["How does delivery work?", "How do I buy?", "What happens if my produce arrives damaged?"],
  },
  {
    id: "support",
    keywords: [
      "contact", "phone number", "email address", "support", "helpdesk", "customer care",
      "talk to", "human", "real person", "call you", "your number", "your email", "reach you",
    ],
    text: "The Farm Direct team is always one tap away — reach out for any support, any time:\n• **Email:** " + SUPPORT_EMAIL + "\n• **Call / WhatsApp:** " + SUPPORT_PHONE_DISPLAY + "\n• **WhatsApp:** open a chat directly from this page\nTell us your order number if you have one, and we'll take it from there.",
    chips: ["What should I do if my produce arrives damaged?", "Can I cancel an order?", "How do I get a refund?"],
    hi: "किसी भी समस्या के लिए ईमेल करें या फ़ोन/व्हाट्सऐप करें — हम जल्दी मदद करते हैं।",
  },
  {
    id: "greeting",
    keywords: ["hi", "hello", "hey", "namaste", "namaskar", "pranam", "salaam", "hola", "good morning", "good evening", "kaise ho", "kem cho", "नमस्ते", "नमस्कार", "प्रणाम"],
    text: "Namaste! 🙏 I'm the Farm Direct assistant.\nI can help you buy fresh produce, sell your harvest, understand orders and delivery, apply coupons, and more.\nTry one of the questions below, or just ask in your own words — Hindi and English both work.",
    chips: ["How do I start selling my harvest?", "How do I buy fresh produce?", "How does delivery work?"],
    hi: "नमस्ते! मैं Farm Direct असिस्टेंट हूँ — खरीदारी, बिक्री, ऑर्डर या डिलीवरी से जुड़ा कोई भी सवाल पूछिए।",
  },
  {
    id: "thanks",
    keywords: ["thanks", "thank you", "thanku", "thx", "shukriya", "dhanyavad", "great help", "nice", "शुक्रिया", "धन्यवाद"],
    text: "You're most welcome! 🌱 If another question comes up — about your orders, listings or anything on the farm — I'm right here. And for anything beyond that, the team is one call or email away.",
    chips: ["How do I contact support?", "How do I start selling my harvest?", "How do I buy fresh produce?"],
    hi: "आपका स्वागत है! और कोई सवाल हो तो बेझिझक पूछिए।",
  },
  {
    id: "capabilities",
    keywords: [
      "what can you do", "help", "options", "topics", "what do you know", "sawal",
      "doubt", "assist", "suggest something", "guide", "how can you help",
      "kya kar sakte ho", "help me",
    ],
    text: "Here's what I can help with — just pick a topic or ask in your own words:\n• **Buying** — the fresh market, basket, checkout, coupons, payment methods and offers.\n• **Orders & delivery** — tracking, order status, delivery fees, cancellation and refunds.\n• **Selling** — becoming a farmer, listing crops, stock, pricing, earnings and the insights forecasts.\n• **Business buying** — bulk enquiries, wholesalers, restaurants and repeat supply.\n• **Everything else** — reviews, notifications, accounts and platform safety.\nIf I can't answer something, the human support team is one tap away.",
    chips: [
      "How do I start selling my harvest?",
      "How do I buy fresh produce?",
      "Where do I track my order?",
      "How do I contact support?",
    ],
    hi: "खरीदारी, बिक्री, ऑर्डर, डिलीवरी, कूपन — किसी भी विषय पर पूछें।",
  },
];

// ──────────────────────── Crop growing tips ────────────────────────────

/** Quick practical pointers for commonly grown catalogue crops. Keys are the
 *  simplified crop token, e.g. "tomato" from "Tomato". */
const CROP_TIPS: Record<string, string> = {
  tomato:
    "• Give plants full sun and stake them as they grow — tomatoes ripen best on the vine.\n• Water at the base consistently; uneven watering causes blossom-end rot.\n• Harvest at full colour and handle gently — ripe fruit bruises easily on the way to market.\n• Store at room temperature, never in the fridge, until fully ripe.",
  potato:
    "• Plant certified disease-free seed pieces in loose, well-drained soil.\n• Hill soil around the stems as plants grow to keep tubers covered and green-free.\n• Stop watering when the tops start to yellow — it hardens the skins for storage.\n• Cure harvested potatoes in shade for a week before bagging; keep them dark, cool and dry.",
  onion:
    "• Choose short-day varieties suited to your region; firm, well-drained beds prevent rot.\n• Stop watering once the tops fall over, then lift bulbs and cure them in the open shade.\n• Cure thoroughly (7–10 days) — well-cured onions store for months.\n• Never store onions with potatoes: moisture from potatoes makes them sprout.",
  carrot:
    "• Sow directly into loose, stone-free soil — carrots hate transplanting.\n• Thin seedlings early so roots have room; crowd them and you get forks and twists.\n• Water evenly; a sudden soak after dry soil splits roots.\n• Harvest when shoulders push above the soil line, ideally in the cool of the morning.",
  cauliflower:
    "• Grow in rich, well-drained soil and keep moisture steady — stress makes small heads.\n• When the curd is walnut-sized, tie the outer leaves over it to keep it snow-white.\n• Harvest before the curd loosens or starts to rice (separate into grains).\n• Heads stay fresh in the field longer in cool weather — cut close to dispatch.",
  cabbage:
    "• Firm up soil well before planting; loose beds grow loose, leafy heads.\n• Feed steadily and water evenly to stop the heads splitting after rain.\n• Harvest when heads are solid and heavy for their size — squeeze-test them.\n• Cut with a sharp knife and keep the wrapper leaves on for market life.",
  okra: "• Soak seed overnight and sow when the soil is warm — okra loves heat.\n• Pick pods young, every 1–2 days; left pods get fibrous and slow the plant down.\n• Harvest in the early morning and keep pods dry — moisture ruins them fast.",
  brinjal: "• Stake tall varieties early; brinjal fruits pull branches down.\n• Harvest with a sharp knife, keeping a short stem — fruit without stems spoils quickly.\n• Pick continuously for higher yields; shiny skin means tender fruit.",
  chilli: "• Start in a nursery and transplant after 4–5 true leaves; they want warm nights.\n• Pick green chillies regularly to keep the plant flowering.\n• For dry red chillies, let pods ripen fully on the plant, then sun-dry on clean mats.",
  spinach: "• Cut leaves with a knife rather than pulling the roots — the plant regrows for repeat harvests.\n• Harvest in the morning when leaves are crisp and store loosely packed.\n• Leafy greens lose water fast: pack and dispatch the same day for market.",
  mango: "• Harvest in the early morning using a pole with a basket — never let fruit drop.\n• Leave a short stem and let latex drain before packing to avoid sap burn.\n• Ripen in ventilated crates with dry straw or paper; check daily for over-ripening.",
  banana: "• Cut bunches only when the fruit has plumped fully — early cutting gives thin, starchy fingers.\n• De-handle and grade by size before packing; pad the crown to avoid bruising.\n• Store hanging, never stacked, in a cool ventilated room.",
  papaya: "• Harvest at colour break (first yellow streaks) — fruit ripens well off the tree.\n• Cut with a knife and lay fruit on its side; standing them on the base bruises the flesh.\n• Clean latex off the skin before packing.",
  pomegranate: "• Stop watering a few weeks before harvest — it concentrates sugar and prevents cracking.\n• Pick only fully coloured fruit; immature fruit never sweetens after harvest.\n• Clip the stem short and pack crown-side up to protect the rind.",
  wheat: "• Time sowing to your region's season — wheat wants cool weather during grain fill.\n• Harvest at full maturity (12–14% moisture) to avoid shrivelled grain.\n• Sun-dry on clean tarps and winnow for weed seeds before bagging.",
  rice: "• Keep paddy fields evenly flooded through tillering, then drain for harvest.\n• Harvest at 20–25% moisture and thresh immediately.\n• Dry paddy to about 14% moisture before storage — damp grain heats and spoils.",
  maize: "• Plant in blocks, not single rows, for good pollination.\n• Harvest cobs when husks are dry and kernels are hard and dented.\n• Shell and sun-dry to below 14% moisture before storing in clean bags.",
  groundnut: "• Lift plants when 70% of pods show dark veining on the shell.\n• Cure pods in the field or on racks for a week before shelling.\n• Dry to below 9% moisture — groundnut mould (aflatoxin) loves damp storage.",
  mustard: "• Broadcast or line-sow after the monsoon, when soil moisture is right.\n• Harvest when pods turn yellow-brown but before they shatter and drop seed.\n• Sun-dry bundles well and thresh on clean sheets to keep the seed clean.",
  sugarcane: "• Plant setts with good bud health and keep the crop weed-free early on.\n• Irrigate at critical stages — tillering, grand growth and maturity.\n• Cut close to the ground at harvest and deliver fresh-cut; sugar content falls the longer cane stands after maturity.",
  turmeric: "• Plant disease-free rhizome fingers after the rains set in.\n• Harvest when the lower leaves yellow — usually 7–9 months.\n• Boil, cure and dry fingers well; cured fingers store for a year without loss.",
  coriander: "• Sow in cool weather and keep beds moist until germination — coriander bolts in heat.\n• For leaf, cut young plants before flowering; for seed, let them flower fully.\n• Dry seed heads on sheets and thresh gently to protect the seed.",
};

const AGRI_HINTS = [
  "grow", "growing", "plant", "planting", "seed", "sowing", "sow", "fertilizer",
  "manure", "pest", "insect", "disease", "irrigation", "water the", "harvest",
  "storage", "store it", "store them", "season", "crop", "farming", "kheti",
  "yield", "care", "how to cultivate", "kaise ugaye", "ugana", "tip", "tips",
  "advisory", "spacing", "variety", "soil",
  "उगा", "बोना", "बुवाई", "खेती", "फसल", "सिंचाई", "कीट", "बीमारी",
  "उर्वरक", "खाद", "भंडारण", "तुड़ाई", "कटाई", "देखभाल", "सलाह", "पौध", "बीज",
];

/** Devanagari crop names → simplified English tokens (e.g. "आम" → "mango"). */
const CROP_NAMES_DEV: Record<string, string> = {
  "टमाटर": "tomato",
  "टोमैटो": "tomato",
  "आलू": "potato",
  "प्याज़": "onion",
  "प्याज": "onion",
  "गाजर": "carrot",
  "फूलगोभी": "cauliflower",
  "पत्तागोभी": "cabbage",
  "बैंगन": "brinjal",
  "भिंडी": "okra",
  "मिर्च": "chilli",
  "पालक": "spinach",
  "आम": "mango",
  "केला": "banana",
  "सेब": "apple",
  "संतरा": "orange",
  "अमरूद": "guava",
  "पपीता": "papaya",
  "अनार": "pomegranate",
  "तरबूज": "watermelon",
  "अंगूर": "grapes",
  "नींबू": "lemon",
  "गेहूं": "wheat",
  "गेहूँ": "wheat",
  "चावल": "rice",
  "धान": "rice",
  "मक्का": "maize",
  "जौ": "barley",
  "बाजरा": "bajra",
  "ज्वार": "jowar",
  "रागी": "ragi",
  "मूंग": "green-gram",
  "चना": "chickpea",
  "मसूर": "lentils",
  "सरसों": "mustard",
  "मूंगफली": "groundnut",
  "तिल": "sesame",
  "सूरजमुखी": "sunflower",
  "हल्दी": "turmeric",
  "धनिया": "coriander",
  "लहसुन": "garlic",
  "अदरक": "ginger",
  "गन्ना": "sugarcane",
  "कपास": "cotton",
  "कद्दू": "pumpkin",
  "खीरा": "cucumber",
  "लौकी": "bottle-gourd",
  "करेला": "bitter-gourd",
  "तोरई": "ridge-gourd",
  "मटर": "green-peas",
  "शिमला मिर्च": "capsicum",
};

/** Normalise a crop token into a catalogue token (e.g. "green-gram" → "moong"). */
const TOKEN_ALIASES: Record<string, string> = {
  "chilli": "chilli",
  "green-gram": "moong",
  "bottle-gourd": "bottle-gourd",
  "bitter-gourd": "bitter-gourd",
  "ridge-gourd": "ridge-gourd",
  "coriander": "coriander",
  "sesame": "sesame",
  "groundnut": "groundnut",
  "lentils": "lentils",
  "chickpea": "chickpea",
};

function cropToken(q: string): string | null {
  const found: string[] = [];
  for (const key of Object.keys(CROP_IMAGE_URLS)) {
    const token = key.split(" (")[0].toLowerCase();
    if (token.length >= 3 && q.includes(token)) found.push(token);
  }
  // Devanagari aliases (e.g. "आम की खेती कैसे करें").
  for (const [dev, token] of Object.entries(CROP_NAMES_DEV)) {
    if (q.includes(dev)) found.push(TOKEN_ALIASES[token] ?? token);
  }
  if (found.length === 0) return null;
  // Prefer the longest token — "green chilli" over "chilli", for example.
  found.sort((a, b) => b.length - a.length);
  return found[0];
}

function titleCase(token: string): string {
  return token.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ────────────────────────────── Public API ─────────────────────────────

const FALLBACK: AssistantReply = {
  text:
    "I'm not sure I caught that one — could you rephrase it in a line or two? For example: *“How do I sell my harvest?”*, *“Where is my order?”*, or *“How do coupons work?”*.\nIf you'd rather talk to a person, the Farm Direct team is one tap away:\n• **Email:** " + SUPPORT_EMAIL + "\n• **Call / WhatsApp:** " + SUPPORT_PHONE_DISPLAY + "\n• **WhatsApp:** open the chat from the contact card",
  chips: [
    "How do I start selling my harvest?",
    "Where do I track my order?",
    "How do I contact support?",
    "What can you help with?",
  ],
};

export function askAssistant(question: string): AssistantReply {
  const q = normalize(question);
  if (!q) {
    return {
      text: "Go ahead — ask me anything about buying, selling or your orders on Farm Direct.",
      chips: ["What can you help with?", "How do I buy fresh produce?", "How do I start selling my harvest?"],
    };
  }

  const usesHindi = DEVANAGARI.test(q);
  const wordCount = q.split(" ").length;

  // Short greetings/thanks should only win when the message is basically just
  // the greeting, otherwise "hi, how do i sell" would short-circuit.
  const shortOnly = new Set(["greeting", "thanks"]);

  let best: { intent: Intent; score: number } | null = null;
  for (const intent of INTENTS) {
    if (shortOnly.has(intent.id) && wordCount > 4) continue;
    let score = 0;
    for (const kw of intent.keywords) {
      if (q.includes(kw)) score += kw.includes(" ") ? 2 : 1;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { intent, score };
    }
  }

  let reply: AssistantReply;
  if (best) {
    reply = { text: best.intent.text, chips: best.intent.chips ?? [] };
    if (usesHindi && best.intent.hi) {
      reply.text += "\n\n" + best.intent.hi;
    }
    return reply;
  }

  // No marketplace intent matched — is this a crop/agronomy question?
  const token = cropToken(q);
  const agContext = AGRI_HINTS.some((h) => q.includes(h));
  if (token && (agContext || q === token)) {
    const tips = CROP_TIPS[token];
    const name = titleCase(token);
    const body = tips
      ? tips
      : "• Start with soil and water basics — healthy soil, steady moisture and early weed control.\n• Scout the crop weekly for pests and diseases; early action beats any cure.\n• Harvest at the right maturity and move produce to shade quickly — field heat shortens shelf life.";
    return {
      text:
        "Here's practical guidance for growing **" + name + "**:\n" +
        body +
        "\n\nFor variety-level advice for your district — sowing windows, pest cycles and support schemes — the Farm Direct team can point you to the right local extension help: " +
        SUPPORT_PHONE_DISPLAY +
        " or " +
        SUPPORT_EMAIL +
        ".",
      chips: [
        "How do I start selling my harvest?",
        "What does it cost to sell?",
        "Where do I see demand forecasts?",
        "How do I contact support?",
      ],
    };
  }

  return FALLBACK;
}

/** Starter chips shown when the page opens, tailored to the signed-in role. */
export function starterChips(role?: string | null): string[] {
  switch (role) {
    case "farmer":
      return [
        "How do I start selling my harvest?",
        "How do I price my produce?",
        "When do I get paid for an order?",
        "What is the demand forecast telling me?",
      ];
    case "buyer":
      return [
        "How do I buy fresh produce?",
        "Do you have any coupons?",
        "Where do I track my order?",
        "Can I cancel an order?",
      ];
    case "admin":
      return [
        "What can I manage as platform operator?",
        "How do coupons work?",
        "Is this a real marketplace?",
      ];
    default:
      return [
        "How do I start selling my harvest?",
        "How do I buy fresh produce?",
        "How does delivery work?",
        "How do I contact support?",
      ];
  }
}
