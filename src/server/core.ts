export type RateNight = {
  date: string;
  tariffPaise: number;
};

export type PricedNight = RateNight & {
  discountPaise: number;
  gstPaise: number;
  totalPaise: number;
  taxRateBps: number;
};

export type Promo =
  { kind: "PERCENT"; value: number } | { kind: "FLAT"; value: number };

export type EnquiryCategory =
  "ROOM_BOOKING" | "WEDDING" | "CORPORATE_OFFSITE" | "COMPLAINT" | "UNSURE";

export type EnquiryClassification = {
  category: EnquiryCategory;
  confidence: number;
  complaintAlert: boolean;
  unsorted: boolean;
  checkCategory: boolean;
};

const DAY_MS = 86_400_000;
const COMPLAINT_TERMS = [
  "refund",
  "unhappy",
  "disappointed",
  "dirty",
  "rude",
  "not working",
  "legal",
  "consumer court",
  "bad review",
];

export function parseDateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Use a date in YYYY-MM-DD format.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("That calendar date is not valid.");
  }

  return date;
}

export function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function nightsBetween(checkIn: string, checkOut: string): string[] {
  const start = parseDateOnly(checkIn).getTime();
  const end = parseDateOnly(checkOut).getTime();

  if (end <= start) {
    throw new Error("Check-out must be after check-in.");
  }

  const nights: string[] = [];
  for (let timestamp = start; timestamp < end; timestamp += DAY_MS) {
    nights.push(dateOnly(new Date(timestamp)));
  }

  if (nights.length > 30) {
    throw new Error("A stay cannot be longer than 30 nights.");
  }

  return nights;
}

export function formatRupees(amountPaise: number): string {
  if (!Number.isSafeInteger(amountPaise)) {
    throw new Error("Money must be an integer number of paise.");
  }

  const rupees = Math.floor(Math.abs(amountPaise) / 100);
  const paise = Math.abs(amountPaise) % 100;
  const grouped = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(rupees);
  const sign = amountPaise < 0 ? "-" : "";
  return `${sign}₹${grouped}${paise ? `.${String(paise).padStart(2, "0")}` : ""}`;
}

export function calculatePrice(
  rates: RateNight[],
  promo: Promo | null = null,
  thresholdPaise = 750_000,
  atOrBelowRateBps = 500,
  aboveRateBps = 1_800,
): {
  nights: PricedNight[];
  subtotalPaise: number;
  discountPaise: number;
  gstPaise: number;
  totalPaise: number;
} {
  if (rates.length === 0) {
    throw new Error("A price requires at least one night.");
  }

  const subtotalPaise = rates.reduce(
    (sum, night) => sum + night.tariffPaise,
    0,
  );
  const requestedFlatDiscount = promo?.kind === "FLAT" ? promo.value : 0;
  const promoIsValid =
    promo === null ||
    (Number.isSafeInteger(promo.value) &&
      promo.value >= 0 &&
      (promo.kind !== "PERCENT" || promo.value <= 100));

  if (!promoIsValid) {
    throw new Error("Promo value is not valid.");
  }

  let flatDiscountRemaining = Math.min(requestedFlatDiscount, subtotalPaise);
  const nights = rates.map((night) => {
    if (!Number.isSafeInteger(night.tariffPaise) || night.tariffPaise < 0) {
      throw new Error(
        "Nightly tariff must be a non-negative integer number of paise.",
      );
    }

    const taxRateBps =
      night.tariffPaise <= thresholdPaise ? atOrBelowRateBps : aboveRateBps;
    let discountPaise = 0;

    if (promo?.kind === "PERCENT") {
      discountPaise = Math.round((night.tariffPaise * promo.value) / 100);
    } else if (promo?.kind === "FLAT") {
      discountPaise = Math.min(night.tariffPaise, flatDiscountRemaining);
      flatDiscountRemaining -= discountPaise;
    }

    const taxablePaise = night.tariffPaise - discountPaise;
    const gstPaise = Math.round((taxablePaise * taxRateBps) / 10_000);

    return {
      ...night,
      discountPaise,
      gstPaise,
      totalPaise: taxablePaise + gstPaise,
      taxRateBps,
    };
  });

  const discountPaise = nights.reduce(
    (sum, night) => sum + night.discountPaise,
    0,
  );
  const gstPaise = nights.reduce((sum, night) => sum + night.gstPaise, 0);

  return {
    nights,
    subtotalPaise,
    discountPaise,
    gstPaise,
    totalPaise: subtotalPaise - discountPaise + gstPaise,
  };
}

export function classifyEnquiry(text: string): EnquiryClassification {
  const normalized = text.toLowerCase();
  const complaintAlert = COMPLAINT_TERMS.some((term) =>
    normalized.includes(term),
  );
  const eventSpace = /\b(?:conference|meeting)\s+room\b/.test(normalized);
  const lodgingContext =
    /\b(villa|stay|adults?|check.?in|availability|accommodation)\b/.test(
      normalized,
    );
  const roomScore = score(normalized, [
    "room",
    "villa",
    "stay",
    "adults",
    "check in",
    "availability",
  ]);
  const structuredEvent = normalized.match(
    /event type:\s*(wedding|corporate off.?site)/,
  )?.[1];
  const scores: Array<[EnquiryCategory, number]> = [
    [
      "WEDDING",
      structuredEvent?.includes("wedding")
        ? 1
        : score(normalized, [
            "wedding",
            "marriage",
            "married",
            "bride",
            "groom",
            "sister's wedding",
          ]),
    ],
    [
      "CORPORATE_OFFSITE",
      structuredEvent?.startsWith("corporate")
        ? 1
        : score(normalized, [
            "offsite",
            "off-site",
            "team",
            "conference",
            "corporate",
            "workshop",
            "meeting",
            "retreat",
            "company",
          ]),
    ],
    [
      "ROOM_BOOKING",
      structuredEvent ? 0 : eventSpace && !lodgingContext ? 0 : roomScore,
    ],
    ["COMPLAINT", score(normalized, COMPLAINT_TERMS)],
  ];
  scores.sort((left, right) => right[1] - left[1]);

  if (complaintAlert) {
    return {
      category: "COMPLAINT",
      confidence: Math.max(
        scores.find(([category]) => category === "COMPLAINT")?.[1] ?? 0,
        0.3,
      ),
      complaintAlert: true,
      unsorted: false,
      checkCategory: false,
    };
  }

  const [first, second] = scores;
  if (first[1] === 0 || first[1] < 0.5 || second[1] >= 0.4) {
    return {
      category: "UNSURE",
      confidence: first[1],
      complaintAlert: false,
      unsorted: true,
      checkCategory: false,
    };
  }

  return {
    category: first[0],
    confidence: structuredEvent ? 0.98 : first[1] >= 1 ? 0.9 : 0.72,
    complaintAlert: false,
    unsorted: false,
    checkCategory: first[1] < 0.8,
  };
}

function score(text: string, terms: string[]): number {
  const matches = terms.filter((term) => text.includes(term)).length;
  return Math.min(1, matches * 0.55);
}
