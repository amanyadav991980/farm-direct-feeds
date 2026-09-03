import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// Market roles. v1: farmers, buyers and platform admins (logistics partners
// are an architecture hook for a later version).
export const ROLES = {
  BUYER: "buyer",
  FARMER: "farmer",
  ADMIN: "admin",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.BUYER),
  v.literal(ROLES.FARMER),
  v.literal(ROLES.ADMIN),
);
export type Role = Infer<typeof roleValidator>;

// Order lifecycle states used across orders + order timelines.
export const ORDER_STATUSES = [
  "placed",
  "confirmed",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;
export const orderStatusValidator = v.union(
  ...ORDER_STATUSES.map((s) => v.literal(s)),
);
export type OrderStatus = Infer<typeof orderStatusValidator>;

export const PAYMENT_METHODS = ["demo_upi", "demo_card", "cod"] as const;
export const paymentMethodValidator = v.union(
  ...PAYMENT_METHODS.map((s) => v.literal(s)),
);

export const CATEGORIES = [
  "Vegetables",
  "Fruits",
  "Grains",
  "Pulses",
  "Oilseeds",
  "Other",
] as const;
export const categoryValidator = v.union(
  ...CATEGORIES.map((c) => v.literal(c)),
);
export type Category = Infer<typeof categoryValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // Identity + profile for every signed-in user (buyers, farmers, admins).
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // Profile (set during onboarding)
      phone: v.optional(v.string()),
      addressLine: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      pincode: v.optional(v.string()),
      onboardedAt: v.optional(v.number()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Crop catalogue — every crop the marketplace recognises. Farmers list
    // against these, availability views are built from them.
    crops: defineTable({
      name: v.string(),
      slug: v.string(),
      category: categoryValidator,
      subcategory: v.string(),
      emoji: v.string(),
      tint: v.number(), // index into the client-side crop-art palette
      unit: v.string(), // e.g. "kg", "quintal", "dozen", "bunch"
      marketPrice: v.number(), // demo market price in ₹ per unit
      shelfLifeDays: v.number(),
      description: v.string(),
      organicDefault: v.boolean(),
    })
      .index("by_slug", ["slug"])
      .index("by_category", ["category"]),

    // Seller identity. Demo marketplace farmers have no linked user; real
    // farmers get one farmer row when they complete onboarding.
    farmers: defineTable({
      userId: v.optional(v.id("users")),
      name: v.string(),
      farmName: v.string(),
      village: v.string(),
      district: v.string(),
      state: v.string(),
      phone: v.optional(v.string()),
      bio: v.optional(v.string()),
      yearsFarming: v.number(),
      verified: v.boolean(),
      isDemo: v.boolean(),
      ratingAvg: v.number(),
      ratingCount: v.number(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_verified", ["verified"])
      .index("by_district", ["district"]),

    // Live listings — each row is one crop one farmer is selling now.
    products: defineTable({
      farmerId: v.id("farmers"),
      cropId: v.optional(v.id("crops")),
      name: v.string(),
      emoji: v.string(),
      tint: v.number(),
      category: categoryValidator,
      subcategory: v.string(),
      unit: v.string(),
      marketPrice: v.number(), // market price in ₹ per unit (demo source)
      grade: v.string(),
      organic: v.boolean(),
      description: v.string(),
      imageUrl: v.optional(v.string()),
      // inventory
      stockQty: v.number(),
      initialStock: v.number(),
      minOrderQty: v.number(),
      harvestDate: v.number(),
      shelfLifeDays: v.number(),
      soldQty: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_farmer", ["farmerId"])
      .index("by_crop", ["cropId"])
      .index("by_category", ["category"])
      .index("by_farmer_active", ["farmerId", "isActive"]),

    cartItems: defineTable({
      userId: v.id("users"),
      productId: v.id("products"),
      quantity: v.number(),
      addedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_product", ["userId", "productId"]),

    wishlistItems: defineTable({
      userId: v.id("users"),
      productId: v.id("products"),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_product", ["userId", "productId"]),

    // One order row per farmer — checkout splits a mixed-farmer cart into one
    // order per seller, which is how each farmer fulfils "their" orders.
    orders: defineTable({
      number: v.string(),
      buyerId: v.optional(v.id("users")),
      buyerName: v.string(),
      buyerPhone: v.optional(v.string()),
      buyerAddress: v.object({
        line: v.string(),
        city: v.string(),
        state: v.string(),
        pincode: v.string(),
      }),
      farmerId: v.id("farmers"),
      items: v.array(
        v.object({
          productId: v.id("products"),
          name: v.string(),
          emoji: v.string(),
          unit: v.string(),
          qty: v.number(),
          marketPrice: v.number(),
          unitPrice: v.number(), // discounted selling price per unit
          total: v.number(),
        }),
      ),
      // financials
      marketSubtotal: v.number(),
      discountAmount: v.number(), // market discount applied
      discountedSubtotal: v.number(),
      couponCode: v.optional(v.string()),
      couponDiscount: v.number(),
      deliveryFee: v.number(),
      platformFee: v.number(),
      total: v.number(),
      status: orderStatusValidator,
      timeline: v.array(
        v.object({
          status: v.string(),
          label: v.string(),
          at: v.number(),
        }),
      ),
      paymentMethod: paymentMethodValidator,
      paymentStatus: v.string(), // paid | pending | refunded
      paymentRef: v.optional(v.string()),
      isDemo: v.boolean(),
      buyerNote: v.optional(v.string()),
      deliveredAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_buyer", ["buyerId"])
      .index("by_farmer", ["farmerId"])
      .index("by_farmer_status", ["farmerId", "status"])
      .index("by_status", ["status"])
      .index("by_buyer_created", ["buyerId", "createdAt"]),

    coupons: defineTable({
      code: v.string(),
      title: v.string(),
      type: v.union(v.literal("percent"), v.literal("fixed")),
      value: v.number(), // percent (e.g. 10) or fixed ₹ amount
      minOrderValue: v.number(),
      maxDiscount: v.number(),
      categoryRestriction: v.optional(categoryValidator),
      productRestrictions: v.optional(v.array(v.id("products"))),
      farmerRestrictions: v.optional(v.array(v.id("farmers"))),
      newBuyerOnly: v.boolean(), // only first-ever orders
      startDate: v.number(),
      expiryDate: v.number(),
      usageLimit: v.optional(v.number()),
      perUserLimit: v.optional(v.number()),
      isActive: v.boolean(),
      usageCount: v.number(),
      description: v.string(),
      createdAt: v.number(),
    })
      .index("by_code", ["code"])
      .index("by_active", ["isActive"])
      .index("by_created", ["createdAt"]),

    reviews: defineTable({
      orderId: v.id("orders"),
      productId: v.optional(v.id("products")),
      farmerId: v.id("farmers"),
      buyerId: v.optional(v.id("users")),
      reviewerName: v.string(),
      rating: v.number(), // 1..5
      comment: v.string(),
      createdAt: v.number(),
    })
      .index("by_order", ["orderId"])
      .index("by_farmer", ["farmerId"])
      .index("by_product", ["productId"]),

    notifications: defineTable({
      userId: v.id("users"),
      kind: v.string(), // order_status | order_placed | review | inquiry | low_stock | system
      title: v.string(),
      body: v.string(),
      link: v.optional(v.string()),
      read: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_read", ["userId", "read"]),

    inquiries: defineTable({
      farmerId: v.id("farmers"),
      productId: v.optional(v.id("products")),
      buyerId: v.optional(v.id("users")),
      buyerName: v.string(),
      message: v.string(),
      handled: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_farmer", ["farmerId"])
      .index("by_buyer", ["buyerId"]),

    // Singleton platform configuration document ("platform").
    settings: defineTable({
      key: v.string(),
      marketDiscountPercent: v.number(),
      platformFeePercent: v.number(),
      deliveryFee: v.number(),
      marketMode: v.union(v.literal("demo"), v.literal("live")),
      marketSourceLabel: v.string(),
      marketSourceUrl: v.optional(v.string()),
      marketLastSync: v.optional(v.number()),
      seededAt: v.optional(v.number()),
    }).index("by_key", ["key"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
