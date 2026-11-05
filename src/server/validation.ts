import { z } from "zod";
import { nightsBetween } from "./core";
import { roomCategories, type RatePlanCode, type RoomSlug } from "./demo-store";

const validStay = (value: { checkIn: string; checkOut: string }) => {
  try {
    nightsBetween(value.checkIn, value.checkOut);
    return true;
  } catch {
    return false;
  }
};

export const staySearchSchema = z
  .object({
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    adults: z.coerce.number().int().min(1).max(12),
    children: z.coerce.number().int().min(0).max(10).default(0),
    promoCode: z.string().trim().max(32).optional(),
  })
  .refine(validStay, {
    message: "Check-out must follow check-in.",
    path: ["checkOut"],
  });

export const holdSchema = z
  .object({
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    adults: z.number().int().min(1).max(12),
    children: z.number().int().min(0).max(10),
    categorySlug: z.enum(
      roomCategories.map((item) => item.slug) as [RoomSlug, ...RoomSlug[]],
    ),
    ratePlanCode: z.enum(["FLEX", "NONREF"] satisfies [
      RatePlanCode,
      RatePlanCode,
    ]),
    guestName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().min(7).max(30),
    foreignNational: z.boolean(),
    consentAccepted: z.literal(true),
    idempotencyKey: z.string().trim().min(8).max(100),
    promoCode: z.string().trim().max(32).optional(),
  })
  .refine(validStay, {
    message: "Check-out must follow check-in.",
    path: ["checkOut"],
  });

export const eventEnquirySchema = z
  .object({
    source: z
      .enum(["WEB_FORM", "EMAIL", "WHATSAPP", "PHONE", "SOCIAL"])
      .default("WEB_FORM"),
    rawText: z.string().trim().min(10).max(5000),
    name: z.string().trim().max(100).optional(),
    email: z.string().trim().email().max(200).optional(),
    phone: z.string().trim().max(30).optional(),
    consentAccepted: z.boolean().optional().default(false),
  })
  .refine((value) => value.source !== "WEB_FORM" || value.consentAccepted, {
    message: "Guest consent is required for web enquiries.",
    path: ["consentAccepted"],
  });

export const updateDaySchema = z.object({
  categorySlug: z.enum(
    roomCategories.map((item) => item.slug) as [RoomSlug, ...RoomSlug[]],
  ),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  allotment: z.number().int().min(0).max(100).optional(),
  blackout: z.boolean().optional(),
  flexRatePaise: z.number().int().min(0).optional(),
  nonrefRatePaise: z.number().int().min(0).optional(),
});

export const promoCreateSchema = z.object({
  code: z.string().trim().min(3).max(24),
  kind: z.enum(["PERCENT", "FLAT"]),
  value: z.number().int().min(1).max(100_000_000),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minimumNights: z.number().int().min(1).max(30),
});

export const promoStatusSchema = z.object({
  code: z.string().trim().min(3).max(24),
  active: z.boolean(),
});
