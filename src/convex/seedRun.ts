// Deterministic demo-world generator. Pure module (no Convex registrations),
// shared by the admin reseed action and the first-load bootstrap action.
// Splitting it from the registered actions keeps the generated api types
// acyclic.
import { CROP_CATALOG } from "./catalog";
import { roundInr } from "./marketplace";
import { slugToCrop, type FarmerSeed, type ProductSeed, type OrderSeed } from "./seedHelpers";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// deterministic PRNG so a reseed reproduces the same demo world
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260817);
const rand = (min: number, max: number) =>
  Math.floor(rng() * (max - min + 1)) + min;
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

const FIRST = [
  "Rajesh", "Sunita", "Amar", "Kavita", "Ramesh", "Geeta", "Suresh",
  "Priya", "Mahesh", "Lakshmi", "Vijay", "Anita", "Dinesh", "Rekha",
  "Gopal", "Meena", "Harish", "Savitri", "Naresh", "Pooja", "Bhupinder",
  "Manpreet", "Ranjit", "Jasbir", "Devendra", "Kamla", "Rakesh", "Sharda",
  "Om Prakash", "Usha", "Krishna", "Padma", "Subhash", "Vimala",
  "Narayan", "Shakuntala", "Prakash", "Mangala", "Balwant", "Sarita",
  "Iqbal", "Farida", "Murugan", "Meenakshi", "Appa Rao", "Saroja",
  "Basavaraj", "Renuka", "Thangavel", "Pushpa", "Lakhan", "Ramdevi",
  "Shivraj", "Kaushalya", "Jagdish", "Sita Devi", "Virendra", "Champa",
  "Tilak", "Radha", "Niranjan", "Sudha", "Eknath", "Yashoda", "Prem",
  "Vidya", "Arjun", "Nalini", "Gurmeet", "Harpreet", "Dilip", "Asha",
  "Sanjay", "Maya", "Fakir", "Zainab", "Pankaj", "Lata", "Shyam",
  "Gauri", "Bhola", "Devki", "Kanhaiya", "Sumitra", "Mohan", "Chanda",
  "Siddharth", "Roopa", "Vasant", "Anjali", "Kishore", "Bharati",
];

const LAST = [
  "Kumar", "Devi", "Patel", "Sharma", "Singh", "Reddy", "Naidu", "Yadav",
  "Gupta", "Verma", "Meena", "Bairwa", "Jatav", "Koli", "Chaudhary",
  "Gill", "Sandhu", "Kaur", "Brar", "Pawar", "Patil", "Jadhav",
  "More", "Gawande", "Kadam", "Sawant", "Nayak", "Mishra", "Tiwari",
  "Pandey", "Srivastava", "Das", "Sarkar", "Ghosh", "Halder", "Mahato",
  "Paswan", "Sahani", "Rajbhar", "Kushwaha", "Maurya", "Lodhi",
  "Kachhwaha", "Gurjar", "Meghwal", "Prajapati", "Sahu", "Chandra",
  "Rai", "Thakur", "Marandi", "Kujur", "Oraon", "Soren", "Bhagat",
  "Rathod", "Chavda", "Solanki", "Vaghela", "Gohil", "Vyas", "Trivedi",
  "Joshi", "Bhat", "Rao", "Shetty", "Hegde", "Nair", "Menon", "Panicker",
];

const REGIONS: { state: string; districts: string[] }[] = [
  { state: "Uttar Pradesh", districts: ["Mirzapur", "Varanasi", "Kanpur Nagar", "Lucknow", "Agra", "Mathura", "Gorakhpur", "Basti"] },
  { state: "Punjab", districts: ["Ludhiana", "Amritsar", "Patiala", "Sangrur", "Bathinda"] },
  { state: "Haryana", districts: ["Karnal", "Hisar", "Kaithal", "Sirsa", "Kurukshetra"] },
  { state: "Maharashtra", districts: ["Nashik", "Nagpur", "Sangli", "Satara", "Pune", "Solapur", "Aurangabad"] },
  { state: "Karnataka", districts: ["Belagavi", "Mysuru", "Davanagere", "Bagalkot", "Haveri"] },
  { state: "Tamil Nadu", districts: ["Virudhunagar", "Theni", "Salem", "Erode", "Tiruchirappalli"] },
  { state: "Andhra Pradesh", districts: ["Guntur", "Chittoor", "Kurnool", "Krishna"] },
  { state: "Telangana", districts: ["Warangal", "Nizamabad", "Khammam", "Medak"] },
  { state: "Rajasthan", districts: ["Jaipur", "Kota", "Bharatpur", "Sri Ganganagar", "Alwar"] },
  { state: "Madhya Pradesh", districts: ["Indore", "Ujjain", "Sehore", "Dewas"] },
  { state: "Gujarat", districts: ["Rajkot", "Anand", "Junagadh", "Bhavnagar", "Banaskantha"] },
  { state: "Bihar", districts: ["Muzaffarpur", "Samastipur", "Vaishali", "Nalanda"] },
  { state: "West Bengal", districts: ["Bardhaman", "Nadia", "Hooghly", "Birbhum"] },
  { state: "Odisha", districts: ["Cuttack", "Bargarh", "Balasore"] },
  { state: "Chhattisgarh", districts: ["Raipur", "Bilaspur", "Durg"] },
  { state: "Uttarakhand", districts: ["Haridwar", "Udham Singh Nagar", "Dehradun"] },
  { state: "Himachal Pradesh", districts: ["Shimla", "Kullu", "Mandi", "Solan"] },
  { state: "Kerala", districts: ["Palakkad", "Wayanad", "Thrissur", "Idukki"] },
  { state: "Assam", districts: ["Nagaon", "Jorhat", "Dibrugarh"] },
  { state: "Jammu & Kashmir", districts: ["Srinagar", "Anantnag", "Baramulla"] },
];

const VILLAGES = [
  "Bhagwanpur", "Ramnagar Kalan", "Kisanwadi", "Devlapur", "Sitapur Khurd",
  "Barwala", "Shahjahanpur", "Rasulpur", "Malihabad", "Padampur",
  "Neemgaon", "Sunder Nagar", "Bishanpura", "Karahiya", "Mohanpura",
  "Chandrapur Khurd", "Dhanora", "Pipalgaon", "Wadgaon", "Kale",
  "Bhendala", "Hulikatti", "Basavanahalli", "Keregodu", "Thimmanahalli",
  "Melur", "Kovilpatti", "Veerapandi", "Ottanchathiram", "Nadupatti",
  "Chintalapudi", "Peddapalli", "Mallavolu", "Ramayapatnam", "Bikkavolu",
  "Thimmapur", "Manchippa", "Pochampally", "Yellandu", "Kothagudem",
  "Chomu", "Sanganer", "Malpura", "Sadulpur", "Bayana", "Bijawar",
  "Khategaon", "Ghatabillod", "Kamli", "Godhra", "Dhandhuka",
  "Savarkundla", "Talaja", "Vadgam", "Belsar", "Motipur", "Saraiya",
  "Hathua", "Silao", "Kalna", "Mongalkote", "Memari", "Rampurhat",
  "Barapali", "Sohela", "Attabira", "Saraipali", "Kurud", "Dhamtari",
  "Bhagwanpur Khurd", "Jhabrera", "Laksar", "Sultanpur", "Nagli",
  "Kothi", "Jangal", "Chachyot", "Gagret", "Bhadrota", "Kottayi",
  "Kallad", "Vythiri", "Mananthavady", "Adimali", "Idukki",
  "Dhing", "Jagiroad", "Titabor", "Sapekhati", "Chrar-e-Sharief",
];

const CROP_POOL: Record<string, string[]> = {
  north: [
    "wheat", "wheat", "rice", "paddy", "maize", "bajra", "jowar", "barley",
    "mustard", "chickpea", "lentils", "potato", "potato", "tomato", "tomato",
    "onion", "onion", "carrot", "cauliflower", "cauliflower", "cabbage",
    "garlic", "peas", "spinach", "coriander", "green-chilli", "ragi", "green-gram",
  ],
  west: [
    "wheat", "bajra", "jowar", "groundnut", "groundnut", "soybean", "sesame",
    "mustard", "cotton", "cotton", "turmeric", "red-chilli-dry", "onion", "onion",
    "tomato", "potato", "garlic", "coriander-seeds", "chickpea", "green-gram",
  ],
  south: [
    "tomato", "tomato", "brinjal", "okra", "green-chilli", "capsicum", "onion",
    "potato", "carrot", "french-beans", "rice", "paddy", "maize",
    "chickpea", "pigeon-pea", "green-gram", "black-gram", "groundnut", "sunflower",
    "mango", "banana", "papaya", "guava", "grapes", "turmeric", "ginger", "lemon",
  ],
  east: [
    "rice", "paddy", "rice", "wheat", "maize", "lentils",
    "chickpea", "potato", "potato", "tomato", "brinjal", "okra", "bottle-gourd",
    "pumpkin", "radish", "green-gram", "black-gram", "ginger", "turmeric", "banana",
  ],
  hill: [
    "apple", "apple", "peas", "peas", "cauliflower", "cabbage", "potato", "potato",
    "broccoli", "capsicum", "garlic", "ginger", "french-beans",
    "sweet-corn", "carrot", "spinach", "green-gram",
  ],
  fruit: [
    "mango", "mango", "banana", "banana", "orange", "pomegranate", "grapes",
    "papaya", "guava", "watermelon", "muskmelon", "lemon", "apple",
  ],
};

function regionPool(state: string): string[] {
  if (["Himachal Pradesh", "Uttarakhand", "Jammu & Kashmir"].includes(state)) {
    return CROP_POOL.hill;
  }
  if (["Maharashtra", "Karnataka", "Tamil Nadu", "Andhra Pradesh", "Telangana", "Kerala"].includes(state)) {
    return [...CROP_POOL.south, ...CROP_POOL.fruit];
  }
  if (["Gujarat", "Rajasthan"].includes(state)) return CROP_POOL.west;
  if (["Bihar", "West Bengal", "Odisha", "Assam", "Chhattisgarh"].includes(state)) {
    return [...CROP_POOL.east, ...CROP_POOL.north];
  }
  return CROP_POOL.north;
}

const GRADES = ["Grade A", "Grade A", "Grade B", "Premium", "Premium"];
const FARM_NAMES = ["Kisan Greens", "Fresh Bigha", "Hariyali", "Annapurna", "Sona Fields", "Sugandh"];
const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

const BUYERS = [
  { name: "Deepa Sharma", city: "Gurugram", state: "Haryana", pin: "122001" },
  { name: "Arjun Mehta", city: "New Delhi", state: "Delhi", pin: "110001" },
  { name: "Annapurna Foods Pvt Ltd", city: "Lucknow", state: "Uttar Pradesh", pin: "226001" },
  { name: "Hotel Sai Palace", city: "Nashik", state: "Maharashtra", pin: "422001" },
  { name: "Sharma Kirana Store", city: "Jaipur", state: "Rajasthan", pin: "302001" },
  { name: "GreenLeaf Supermart", city: "Bengaluru", state: "Karnataka", pin: "560001" },
  { name: "Priya Restaurant", city: "Mysuru", state: "Karnataka", pin: "570001" },
  { name: "Village Fresh Retail", city: "Amritsar", state: "Punjab", pin: "143001" },
  { name: "Anand & Sons Traders", city: "Indore", state: "Madhya Pradesh", pin: "452001" },
  { name: "Kaveri Mess", city: "Coimbatore", state: "Tamil Nadu", pin: "641001" },
  { name: "Meena Wholesale", city: "Ahmedabad", state: "Gujarat", pin: "380001" },
  { name: "Organic Basket Store", city: "Kochi", state: "Kerala", pin: "682001" },
];

const REVIEW_COMMENTS = [
  "Very fresh harvest, packed properly. Will order again.",
  "Great quality and honest weights. The farmer delivered on time.",
  "Fresher than the mandi and cheaper than my old vendor.",
  "Consistent quality across the season. Reliable farmer.",
  "Vegetables arrived crisp and clean. Good packaging.",
  "Fair price for this grade. Recommended for bulk buying.",
  "Excellent communication and timely delivery.",
  "Produce was as described — genuinely farm fresh.",
];

export type SeedSummary = {
  ok: boolean;
  crops: number;
  farmers: number;
  products: number;
  orders: number;
  coupons: number;
};

export async function runSeed(ctx: ActionCtx): Promise<SeedSummary> {
  await ctx.runMutation(internal.seedHelpers.wipeAll, {});

  // ── settings + crops
  const inserted = await ctx.runMutation(
    internal.seedHelpers.insertCropsAndSettings,
    {
      crops: CROP_CATALOG,
      settings: {
        key: "platform",
        marketDiscountPercent: 10,
        platformFeePercent: 1,
        deliveryFee: 150,
        marketMode: "demo",
        marketSourceLabel: "Demo mandi price index (not live)",
        marketSourceUrl: undefined,
        seededAt: NOW,
      },
    },
  );
  for (const c of inserted) void c;

  // ── farmer + product seed payloads
  const farmerSeeds: FarmerSeed[] = [];
  const productSeeds: ProductSeed[][] = [];
  const rajeshSignatures = new Map<
    string,
    { stock: number; sold: number; harvest: number }
  >([
    ["tomato", { stock: 1500, sold: 500, harvest: NOW - DAY }],
    ["potato", { stock: 3000, sold: 760, harvest: NOW - DAY }],
    ["onion", { stock: 250, sold: 1250, harvest: NOW - 2 * DAY }],
    ["wheat", { stock: 0, sold: 820, harvest: NOW - 40 * DAY }],
    ["carrot", { stock: 0, sold: 410, harvest: NOW + 12 * DAY }],
    ["cauliflower", { stock: 800, sold: 240, harvest: NOW - DAY }],
  ]);

  const minStock = (c: (typeof CROP_CATALOG)[number]) =>
    c.unit === "quintal" ? 15 : c.unit === "dozen" ? 60 : c.unit === "bunch" ? 120 : 320;
  const maxStock = (c: (typeof CROP_CATALOG)[number]) =>
    c.unit === "quintal" ? 130 : c.unit === "dozen" ? 900 : c.unit === "bunch" ? 900 : 4200;
  const harvestDate = (status: "fresh" | "aged" | "upcoming" | "out") => {
    switch (status) {
      case "fresh":
        return NOW - rand(0, 1) * DAY;
      case "aged":
        return NOW - rand(3, 9) * DAY;
      case "upcoming":
        return NOW + rand(8, 40) * DAY;
      case "out":
        return NOW - rand(15, 60) * DAY;
    }
  };

  for (let f = 0; f < 100; f++) {
    const isRajesh = f === 0;
    const regionRow = isRajesh ? null : pick(REGIONS);
    const state = isRajesh ? "Uttar Pradesh" : regionRow!.state;
    const district = isRajesh ? "Mirzapur" : pick(regionRow!.districts);
    const firstName = FIRST[(f * 7) % FIRST.length];
    const lastName = LAST[(f * 13) % LAST.length];
    const name = `${firstName} ${lastName}`;
    const verified = f === 0 || f === 1 || rng() < 0.82;
    const pool = regionPool(state);
    const count = f === 0 ? 6 : f === 1 ? 4 : rand(4, 11);
    const chosen = new Set<string>();
    if (f === 0) {
      ["tomato", "potato", "onion", "wheat", "carrot", "cauliflower"].forEach(
        (s) => chosen.add(s),
      );
    } else {
      for (let i = 0; i < count * 2 && chosen.size < count; i++)
        chosen.add(pick(pool));
    }
    const slugs = [...chosen]
      .filter((s) => slugToCrop.has(s))
      .slice(0, count);

    farmerSeeds.push({
      name,
      farmName: `${firstName} ${FARM_NAMES[(f + f) % FARM_NAMES.length]} Farm`,
      village: VILLAGES[(f * 5) % VILLAGES.length],
      district,
      state,
      bio: `Farming for ${5 + ((f * 11) % 28)} years in ${district}. Selling fresh harvest straight from the field — no middlemen, honest weights.`,
      yearsFarming: 5 + ((f * 11) % 28),
      verified,
    });

    const list: ProductSeed[] = [];
    for (const slug of slugs) {
      const crop = slugToCrop.get(slug)!;
      let marketPrice = crop.marketPrice * (0.88 + rng() * 0.28);
      if (crop.unit === "quintal")
        marketPrice = Math.round(marketPrice / 10) * 10;
      marketPrice = Math.max(1, Math.round(marketPrice));

      let stock: number;
      let sold: number;
      let harvest: number;
      if (f === 0 && rajeshSignatures.has(slug)) {
        const sig = rajeshSignatures.get(slug)!;
        stock = sig.stock;
        sold = sig.sold;
        harvest = sig.harvest;
      } else {
        const roll = rng();
        if (roll < 0.055) {
          stock = 0;
          harvest = rng() < 0.5 ? harvestDate("upcoming") : harvestDate("out");
        } else if (roll < 0.13) {
          stock = rand(8, Math.max(10, Math.floor(minStock(crop) * 0.6)));
          harvest = harvestDate("fresh");
        } else {
          stock =
            minStock(crop) +
            rand(0, Math.floor((maxStock(crop) - minStock(crop)) * rng()));
          harvest = harvestDate(rng() < 0.82 ? "fresh" : "aged");
        }
        sold =
          roll < 0.13
            ? Math.floor(stock * (2 + rng() * 6))
            : Math.floor(stock * (0.05 + rng() * 0.35));
        if (sold > stock * 8) sold = Math.floor(stock * 8);
      }
      list.push({
        cropSlug: slug,
        marketPrice,
        grade: pick(GRADES),
        organic:
          (crop.organicDefault && rng() < 0.85) ||
          (!crop.organicDefault && rng() < 0.1),
        description: `${crop.description} Supplied farm-gate with transparent weights and no middlemen.`,
        stockQty: stock,
        initialStock: stock + sold,
        minOrderQty:
          crop.unit === "quintal"
            ? 1
            : crop.unit === "dozen"
              ? 5
              : crop.unit === "bunch"
                ? 10
                : 5,
        harvestDate: harvest,
        soldQty: sold,
        createdAt: NOW - rand(1, 90) * DAY,
      });
    }
    productSeeds.push(list);
  }

  // insert farmers + products in batches
  const listingRefs: {
    farmerId: Id<"farmers">;
    productId: Id<"products">;
    name: string;
    emoji: string;
    unit: string;
    marketPrice: number;
    minOrderQty: number;
  }[] = [];
  const farmerIds: Id<"farmers">[] = [];
  const productListByFarmer = new Map<Id<"farmers">, Id<"products">[]>();
  const BATCH = 10;
  for (let start = 0; start < farmerSeeds.length; start += BATCH) {
    const res: {
      farmerId: Id<"farmers">;
      productIds: Id<"products">[];
    }[] = await ctx.runMutation(internal.seedHelpers.insertFarmerBatch, {
      farmers: farmerSeeds.slice(start, start + BATCH),
      products: productSeeds.slice(start, start + BATCH),
    });
    for (let i = 0; i < res.length; i++) {
      const farmerId = res[i].farmerId;
      farmerIds.push(farmerId);
      productListByFarmer.set(farmerId, res[i].productIds);
      const slugs = productSeeds[start + i].map((p) => p.cropSlug);
      res[i].productIds.forEach((pid, k) => {
        const crop = slugToCrop.get(slugs[k])!;
        const spec = productSeeds[start + i][k];
        listingRefs.push({
          farmerId,
          productId: pid,
          name: crop.name,
          emoji: crop.emoji,
          unit: crop.unit,
          marketPrice: spec.marketPrice,
          minOrderQty: spec.minOrderQty,
        });
      });
    }
  }

  // ── historical orders
  const discountPct = 10;
  const feePct = 0.01;
  const deliveryFee = 150;
  const ORDER_COUNT = 175;
  const orderSeeds: OrderSeed[] = [];
  for (let i = 0; i < ORDER_COUNT; i++) {
    const fi = rand(0, farmerIds.length - 1);
    const farmerId = farmerIds[fi];
    const refs = productListByFarmer.get(farmerId) ?? [];
    const pool = refs.map(
      (pid) => listingRefs.find((r) => r.productId === pid)!,
    );
    if (pool.length === 0) continue;
    const buyer = pick(BUYERS);
    const ageDays = rand(0, 160);
    const createdAt = NOW - ageDays * DAY - rand(0, 20) * 60 * 1000;

    const nItems = Math.min(pool.length, rand(1, 3));
    const shuffled = [...pool].sort(() => rng() - 0.5);
    const items = shuffled.slice(0, nItems).map((p) => {
      const qty =
        p.unit === "quintal"
          ? rand(1, 12)
          : p.unit === "dozen"
            ? rand(3, 20)
            : p.unit === "bunch"
              ? rand(5, 40)
              : rand(5, 120);
      const unitPrice = roundInr(p.marketPrice * (1 - discountPct / 100));
      return {
        productId: p.productId,
        name: p.name,
        emoji: p.emoji,
        unit: p.unit,
        qty,
        marketPrice: p.marketPrice,
        unitPrice,
        total: unitPrice * qty,
      };
    });
    const marketSubtotal = items.reduce(
      (s, it) => s + it.marketPrice * it.qty,
      0,
    );
    const discountedSubtotal = roundInr(
      items.reduce((s, it) => s + it.total, 0),
    );
    const platformFee = roundInr(discountedSubtotal * feePct);
    const total = discountedSubtotal + platformFee + deliveryFee;

    let status: string;
    const roll = rng();
    if (ageDays > 12) {
      status = roll < 0.05 ? "cancelled" : "delivered";
    } else if (ageDays > 6) {
      status =
        roll < 0.1
          ? "cancelled"
          : roll < 0.2
            ? "out_for_delivery"
            : roll < 0.3
              ? "confirmed"
              : "delivered";
    } else {
      status =
        roll < 0.1
          ? "cancelled"
          : roll < 0.3
            ? "confirmed"
            : roll < 0.55
              ? "placed"
              : "delivered";
    }
    const timeline = [{ status: "placed", label: "Order placed", at: createdAt }];
    const deliveredAt =
      status === "delivered" ? createdAt + rand(1, 3) * DAY : undefined;
    if (status === "confirmed") {
      timeline.push({
        status: "confirmed",
        label: "Farmer confirmed the order",
        at: createdAt + 3 * 60 * 60 * 1000,
      });
    } else if (status === "out_for_delivery") {
      timeline.push(
        {
          status: "confirmed",
          label: "Farmer confirmed the order",
          at: createdAt + 3 * 60 * 60 * 1000,
        },
        {
          status: "out_for_delivery",
          label: "Order is out for delivery",
          at: createdAt + DAY,
        },
      );
    } else if (status === "delivered") {
      timeline.push(
        {
          status: "confirmed",
          label: "Farmer confirmed the order",
          at: createdAt + 3 * 60 * 60 * 1000,
        },
        {
          status: "out_for_delivery",
          label: "Order is out for delivery",
          at: createdAt + DAY,
        },
        {
          status: "delivered",
          label: "Order delivered",
          at: deliveredAt ?? createdAt + 2 * DAY,
        },
      );
    } else if (status === "cancelled") {
      timeline.push({
        status: "cancelled",
        label: "Order cancelled",
        at: createdAt + rand(2, 8) * 60 * 60 * 1000,
      });
    }

    const payRoll = rng();
    const paymentMethod =
      payRoll < 0.45 ? "cod" : payRoll < 0.75 ? "demo_upi" : "demo_card";
    const paymentStatus =
      status === "cancelled"
        ? "refunded"
        : status !== "placed" &&
            status !== "confirmed" &&
            paymentMethod !== "cod"
          ? "paid"
          : "pending";

    orderSeeds.push({
      number: `FD-HIS-${1000 + i}`,
      buyerName: buyer.name,
      city: buyer.city,
      state: buyer.state,
      pin: buyer.pin,
      farmerId,
      items,
      marketSubtotal,
      discountAmount: roundInr(marketSubtotal - discountedSubtotal),
      discountedSubtotal,
      platformFee,
      deliveryFee,
      total,
      status,
      timeline,
      paymentMethod,
      paymentStatus,
      deliveredAt,
      createdAt,
      review:
        status === "delivered" && rng() < 0.35
          ? {
              rating: rng() < 0.1 ? 3 : rng() < 0.3 ? 4 : 5,
              comment: pick(REVIEW_COMMENTS),
              reviewerName: buyer.name,
              createdAt: (deliveredAt ?? createdAt) + rand(1, 2) * DAY,
            }
          : undefined,
    });
  }

  const ratingAgg = new Map<
    Id<"farmers">,
    { sum: number; count: number }
  >();
  const mergeRatings = (
    list: { farmerId: Id<"farmers">; sum: number; count: number }[],
  ) => {
    for (const r of list) {
      const cur = ratingAgg.get(r.farmerId) ?? { sum: 0, count: 0 };
      cur.sum += r.sum;
      cur.count += r.count;
      ratingAgg.set(r.farmerId, cur);
    }
  };
  for (let start = 0; start < orderSeeds.length; start += 25) {
    const res = await ctx.runMutation(internal.seedHelpers.insertOrdersBatch, {
      orders: orderSeeds.slice(start, start + 25),
    });
    mergeRatings(res);
  }
  // Rajesh's existing customer base
  if (farmerIds[0]) {
    const cur = ratingAgg.get(farmerIds[0]) ?? { sum: 0, count: 0 };
    cur.sum += 38 * 4.8;
    cur.count += 38;
    ratingAgg.set(farmerIds[0], cur);
  }

  // ── coupons
  const future = NOW + 200 * DAY;
  await ctx.runMutation(internal.seedHelpers.insertCoupons, {
    coupons: [
      {
        code: "FARM10",
        title: "Farmer direct 10% off",
        description: "10% off your whole basket — no minimum.",
        type: "percent",
        value: 10,
        minOrderValue: 0,
        maxDiscount: 200,
        newBuyerOnly: false,
        startDate: NOW - 60 * DAY,
        expiryDate: future,
        usageLimit: undefined,
        perUserLimit: 3,
        isActive: true,
        usageCount: 42,
        createdAt: NOW - 40 * DAY,
      },
      {
        code: "WELCOME100",
        title: "Welcome ₹100 off",
        description: "Flat ₹100 off on orders above ₹1,000.",
        type: "fixed",
        value: 100,
        minOrderValue: 1000,
        maxDiscount: 100,
        newBuyerOnly: false,
        startDate: NOW - 60 * DAY,
        expiryDate: future,
        usageLimit: undefined,
        perUserLimit: 2,
        isActive: true,
        usageCount: 87,
        createdAt: NOW - 40 * DAY,
      },
      {
        code: "FRESH5",
        title: "Fresh vegetables 5% off",
        description: "5% off fresh vegetables from verified farms.",
        type: "percent",
        value: 5,
        minOrderValue: 200,
        maxDiscount: 150,
        categoryRestriction: "Vegetables",
        newBuyerOnly: false,
        startDate: NOW - 60 * DAY,
        expiryDate: future,
        usageLimit: undefined,
        perUserLimit: 3,
        isActive: true,
        usageCount: 63,
        createdAt: NOW - 40 * DAY,
      },
      {
        code: "FIRSTORDER",
        title: "First order 15% off",
        description: "15% off (max ₹250) for your very first order.",
        type: "percent",
        value: 15,
        minOrderValue: 300,
        maxDiscount: 250,
        newBuyerOnly: true,
        startDate: NOW - 60 * DAY,
        expiryDate: future,
        usageLimit: undefined,
        perUserLimit: 1,
        isActive: true,
        usageCount: 31,
        createdAt: NOW - 40 * DAY,
      },
    ],
  });

  await ctx.runMutation(internal.seedHelpers.applyRatings, {
    ratings: [...ratingAgg.entries()].map(([farmerId, r]) => ({
      farmerId,
      sum: r.sum,
      count: r.count,
    })),
  });

  return {
    ok: true,
    crops: CROP_CATALOG.length,
    farmers: farmerIds.length,
    products: listingRefs.length,
    orders: orderSeeds.length,
    coupons: 4,
  };
}
