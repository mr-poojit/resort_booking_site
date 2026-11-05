import { describe, expect, it } from "vitest";
import {
  calculatePrice,
  classifyEnquiry,
  formatRupees,
  nightsBetween,
  parseDateOnly,
} from "../src/server/core";

describe("date and money helpers", () => {
  it("returns date-only nights without including check-out", () => {
    expect(nightsBetween("2027-11-14", "2027-11-16")).toEqual([
      "2027-11-14",
      "2027-11-15",
    ]);
  });

  it("rejects invalid dates and stays", () => {
    expect(() => parseDateOnly("2027-02-29")).toThrow();
    expect(() => nightsBetween("2027-11-16", "2027-11-14")).toThrow();
  });

  it("formats Indian rupees from integer paise", () => {
    expect(formatRupees(67_500_000)).toBe("₹6,75,000");
    expect(formatRupees(6_750_025)).toBe("₹67,500.25");
  });
});

describe("GST and promotion calculation", () => {
  it("selects GST slabs from each pre-promo nightly tariff", () => {
    const price = calculatePrice([
      { date: "2027-01-01", tariffPaise: 750_000 },
      { date: "2027-01-02", tariffPaise: 750_100 },
    ]);

    expect(price.nights.map((night) => night.taxRateBps)).toEqual([500, 1800]);
    expect(price.nights.map((night) => night.gstPaise)).toEqual([
      37_500, 135_018,
    ]);
  });

  it("applies discounts before GST and never makes room charges negative", () => {
    const price = calculatePrice(
      [
        { date: "2027-01-01", tariffPaise: 100_000 },
        { date: "2027-01-02", tariffPaise: 50_000 },
      ],
      { kind: "FLAT", value: 200_000 },
    );

    expect(price.discountPaise).toBe(150_000);
    expect(price.gstPaise).toBe(0);
    expect(price.totalPaise).toBe(0);
  });
});

describe("enquiry classification", () => {
  it("routes the brief's sample enquiries", () => {
    expect(
      classifyEnquiry(
        "Venue for my sister's wedding in Feb 2027, about 250 guests, 2 nights",
      ).category,
    ).toBe("WEDDING");
    expect(
      classifyEnquiry("Is a villa free 14-16 Nov for 2 adults and a child?")
        .category,
    ).toBe("ROOM_BOOKING");
    expect(
      classifyEnquiry(
        "Team of 45 wants a January offsite with a conference hall",
      ).category,
    ).toBe("CORPORATE_OFFSITE");
  });

  it("always sends complaint keywords to the complaint alert path", () => {
    const result = classifyEnquiry(
      "We need a room, but the bathroom was dirty and we want a refund.",
    );
    expect(result.category).toBe("COMPLAINT");
    expect(result.complaintAlert).toBe(true);
  });

  it("leaves ambiguous enquiries unsorted", () => {
    expect(
      classifyEnquiry("Can you help me plan something next month?").unsorted,
    ).toBe(true);
  });
});
