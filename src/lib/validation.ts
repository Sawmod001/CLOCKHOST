import { z } from "zod";

// ─── Feature sub-schemas ──────────────────────────────────────────────────────

const VenueFeaturesSchema = z
  .object({
    birthday: z
      .object({
        cakeAllowed: z.boolean().optional(),
        decorationOptions: z.array(z.string()).optional(),
        partyFavorsProvided: z.boolean().optional(),
        kidFriendly: z.boolean().optional(),
      })
      .optional(),
    exclusiveSpace: z
      .object({
        privacyLevel: z.enum(["semi_private", "fully_private", "vip"]).optional(),
        cateringOptions: z.array(z.string()).optional(),
        inHouseCatering: z.boolean().optional(),
        maxGuests: z.number().int().min(1).optional(),
      })
      .optional(),
    karaoke: z
      .object({
        microphoneCount: z.number().int().min(1).optional(),
        songGenres: z.array(z.string()).optional(),
        privateRoom: z.boolean().optional(),
        hasStage: z.boolean().optional(),
        soundSystem: z.string().optional(),
      })
      .optional(),
    groupNight: z
      .object({
        gameTypes: z.array(z.string()).optional(),
        hasPoolTable: z.boolean().optional(),
        hasVideoGames: z.boolean().optional(),
        hasBoardGames: z.boolean().optional(),
        maxGroupSize: z.number().int().min(1).optional(),
        hasBar: z.boolean().optional(),
      })
      .optional(),
  })
  .strict();

const HousingFeaturesSchema = z
  .object({
    housing: z
      .object({
        propertyType: z
          .enum(["apartment", "house", "duplex", "room", "shortlet"])
          .optional(),
        bedrooms: z.number().int().min(0).optional(),
        bathrooms: z.number().int().min(0).optional(),
        hasWifi: z.boolean().optional(),
        hasParking: z.boolean().optional(),
        hasAC: z.boolean().optional(),
        furnished: z.boolean().optional(),
        petFriendly: z.boolean().optional(),
      })
      .optional(),
  })
  .strict();

const HousingDetailsSchema = z
  .object({
    nightlyRateKobo: z.number().int().min(100),
    weeklyRateKobo: z.number().int().min(0).optional(),
    monthlyRateKobo: z.number().int().min(0).optional(),
    cleaningFeeKobo: z.number().int().min(0).optional(),
    minStayNights: z.number().int().min(1).max(365).optional().default(1),
    maxStayNights: z.number().int().min(1).max(365).optional(),
    leaseDurationMonths: z.number().int().min(1).max(60).optional(),
    checkInTime: z.string().optional().default("14:00"),
    checkOutTime: z.string().optional().default("11:00"),
    maxGuests: z.number().int().min(1).max(50).optional().default(2),
    selfCheckIn: z.boolean().optional().default(false),
    allowsPets: z.boolean().optional().default(false),
    allowsSmoking: z.boolean().optional().default(false),
    allowsParties: z.boolean().optional().default(false),
    houseRules: z.string().max(1_000).optional(),
    viewingFeeKobo: z.number().int().min(0).optional(),
    viewingDurationMinutes: z.number().int().min(15).max(180).optional().default(30),
  })
  .strict();

// ─── Shared sub-schemas ───────────────────────────────────────────────────────

const LocationSchema = z.object({
  state: z.string().min(2),
  cityArea: z.string().min(2),
  address: z.string().min(5),
  coordinates: z
    .object({
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
    })
    .optional(),
});

const PricingSchema = z.object({
  baseRatePerHour: z.number().int().min(1).optional(),
  inspectionTransportFee: z.number().int().optional(),
  commissionRatePercent: z.number().min(0).max(50).optional(),
  exclusiveFlatFeeKobo: z.number().int().min(0).optional(),
  multiGuestDiscountTiers: z
    .array(
      z.object({ minGuests: z.number().int().min(2), percent: z.number().min(0).max(50) })
    )
    .optional(),
  hourlyDiscountTiers: z
    .array(
      z.object({ minHours: z.number().int().min(1), percent: z.number().min(0).max(50) })
    )
    .optional(),
  venueSpendThresholdKobo: z.number().int().min(0).optional(),
  venueSpendDiscountPercent: z.number().min(0).max(50).optional(),
});

const OperationalRulesSchema = z.object({
  maxCapacity: z.number().int().min(1).max(10_000),
  setupTimeMinutes: z.number().int().min(0).max(240).optional().default(0),
  cleanupTimeMinutes: z.number().int().min(0).max(240).optional().default(0),
  isByobAllowed: z.boolean().optional().default(false),
  cancellationPolicy: z.enum(["flexible", "moderate", "strict"]),
});

const AddOnSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  priceInKobo: z.number().int().min(0),
  isRequired: z.boolean(),
});

const StructuredDescriptionSchema = z.object({
  highlights: z.array(z.string()).optional(),
  houseRules: z.array(z.string()).optional(),
  idealFor: z.array(z.string()).optional(),
  gettingAround: z.string().optional(),
});

// ─── Exported Zod schemas ─────────────────────────────────────────────────────

export const ListingCreateSchema = z
  .object({
    vertical: z.enum(["venue", "housing", "outdoor_space"]),
    subVertical: z.array(z.string()).optional(),
    bookingType: z.enum(["capacity", "exclusive", "viewing"]),
    title: z.string().min(3).max(100),
    description: z.string().min(20).max(2_000),
    location: LocationSchema,
    pricing: PricingSchema,
    housingDetails: HousingDetailsSchema.optional(),
    operationalRules: OperationalRulesSchema,
    features: z.union([VenueFeaturesSchema, HousingFeaturesSchema]).optional(),
    addOns: z.array(AddOnSchema).optional(),
    media: z.array(z.string()).max(15).optional(),
    structuredDescription: StructuredDescriptionSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.vertical === "housing") return !!data.housingDetails?.nightlyRateKobo;
      return !!data.pricing?.baseRatePerHour;
    },
    { message: "Housing requires nightlyRateKobo; venues require baseRatePerHour" }
  );

export const ListingUpdateSchema = z.object({
  vertical: z.enum(["venue", "housing", "outdoor_space"]).optional(),
  subVertical: z.array(z.string()).optional(),
  bookingType: z.enum(["capacity", "exclusive"]).optional(),
  title: z.string().min(3).max(100).optional(),
  description: z.string().min(20).max(2_000).optional(),
  location: LocationSchema.optional(),
  pricing: PricingSchema.optional(),
  housingDetails: HousingDetailsSchema.partial().optional(),
  operationalRules: OperationalRulesSchema.partial().optional(),
  features: z.union([VenueFeaturesSchema, HousingFeaturesSchema]).optional(),
  addOns: z.array(AddOnSchema).optional(),
  media: z.array(z.string()).max(15).optional(),
  structuredDescription: StructuredDescriptionSchema.optional(),
  status: z.enum(["draft", "submitted", "under_review"]).optional(),
});

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  schema.optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v));

export const ListingFilterSchema = z.object({
  vertical: emptyToUndefined(z.enum(["venue", "housing", "outdoor_space"])),
  subVertical: emptyToUndefined(z.string()),
  cityArea: emptyToUndefined(z.string()),
  bookingType: emptyToUndefined(z.enum(["capacity", "exclusive"])),
  status: emptyToUndefined(
    z.enum(["draft", "submitted", "under_review", "active", "suspended", "rejected"])
  ),
  providerProfileId: emptyToUndefined(z.string()),
  keyword: emptyToUndefined(z.string().min(1).max(100)),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: emptyToUndefined(z.string()),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radiusKm: z.number().min(0.1).max(100).default(50),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type ListingCreateInput = z.infer<typeof ListingCreateSchema>;
export type ListingUpdateInput = z.infer<typeof ListingUpdateSchema>;
export type ListingFilterInput = z.infer<typeof ListingFilterSchema>;

// ─── Validation helpers ───────────────────────────────────────────────────────

export function validateListingCreate(data: unknown) {
  return ListingCreateSchema.safeParse(data);
}

export function validateListingUpdate(data: unknown) {
  return ListingUpdateSchema.safeParse(data);
}

export function validateListingFilter(data: unknown) {
  return ListingFilterSchema.safeParse(data);
}
