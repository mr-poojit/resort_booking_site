"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatRupees } from "@/server/core";
import { Stepper } from "./ui";

type SearchValues = {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  category?: string;
  plan?: string;
};

type Price = {
  subtotalPaise: number;
  discountPaise: number;
  gstPaise: number;
  totalPaise: number;
  nights: Array<{
    date: string;
    tariffPaise: number;
    gstPaise: number;
    totalPaise: number;
  }>;
};

type AvailabilityCategory = {
  slug: string;
  name: string;
  description: string;
  totalUnits: number;
  maxGuests: number;
  imagePath: string;
  available: boolean;
  freeUnits: number;
  soldOutReason: string | null;
  plans: Array<{
    code: string;
    name: string;
    description: string;
    price: Price;
  }>;
};

function searchString(search: SearchValues): string {
  const params = new URLSearchParams({
    checkIn: search.checkIn,
    checkOut: search.checkOut,
    adults: String(search.adults),
    children: String(search.children),
  });
  return params.toString();
}

export function StaySearchForm({
  initial,
}: {
  initial?: Partial<SearchValues>;
}) {
  return (
    <form
      action="/stays"
      className="border-line grid gap-3 border-y py-5 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_0.8fr_0.8fr_auto] lg:items-end"
    >
      <label className="block text-sm font-medium">
        Check-in
        <input
          className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3 text-sm"
          type="date"
          name="checkIn"
          min={initial?.checkIn}
          defaultValue={initial?.checkIn ?? ""}
          required
        />
      </label>
      <label className="block text-sm font-medium">
        Check-out
        <input
          className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3 text-sm"
          type="date"
          name="checkOut"
          min={initial?.checkIn}
          defaultValue={initial?.checkOut ?? ""}
          required
        />
      </label>
      <label className="block text-sm font-medium">
        Adults
        <input
          className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3 text-sm"
          type="number"
          name="adults"
          min={1}
          max={12}
          defaultValue={initial?.adults ?? 2}
          required
        />
      </label>
      <label className="block text-sm font-medium">
        Children
        <input
          className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3 text-sm"
          type="number"
          name="children"
          min={0}
          max={10}
          defaultValue={initial?.children ?? 0}
        />
      </label>
      <button
        className="bg-estate-green min-h-11 rounded-sm px-6 text-sm font-medium text-white transition-colors hover:bg-[#243c2e]"
        type="submit"
      >
        Check availability
      </button>
    </form>
  );
}

export function AvailabilityResults({
  search,
  onlyCategory,
}: {
  search: SearchValues;
  onlyCategory?: string;
}) {
  const [categories, setCategories] = useState<AvailabilityCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams({
      checkIn: search.checkIn,
      checkOut: search.checkOut,
      adults: String(search.adults),
      children: String(search.children),
    });
    fetch(`/api/availability?${params}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? "Availability could not be loaded.");
        setCategories(data.categories);
      })
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Availability could not be loaded.",
        ),
      )
      .finally(() => setLoading(false));
  }, [search.adults, search.checkIn, search.checkOut, search.children]);

  if (loading)
    return (
      <p className="border-line text-muted-green border-t py-8 text-sm">
        Checking dates and prices…
      </p>
    );
  if (error)
    return (
      <p role="alert" className="border-copper border-l-2 py-3 pl-4 text-sm">
        {error}
      </p>
    );
  const visible = onlyCategory
    ? categories.filter((category) => category.slug === onlyCategory)
    : categories;

  return (
    <div className="divide-line border-line divide-y border-t">
      {visible.map((category) => (
        <article
          key={category.slug}
          className="grid gap-5 py-7 sm:grid-cols-[minmax(180px,0.8fr)_1.2fr] lg:grid-cols-[260px_1fr] lg:gap-8"
        >
          <Link
            href={`/stays/${category.slug}?${searchString(search)}`}
            className="relative block aspect-[1.35] overflow-hidden rounded-sm bg-[#dfe5dc]"
          >
            <Image
              src={category.imagePath}
              alt={`${category.name} illustrative placeholder`}
              fill
              loading="eager"
              sizes="(max-width: 640px) 100vw, 260px"
              className="object-cover"
            />
          </Link>
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-estate-green font-serif text-2xl">
                {category.name}
              </h2>
              <span className="text-muted-green text-xs">
                Sleeps up to {category.maxGuests}
              </span>
            </div>
            <p className="text-foreground/70 mt-2 text-sm leading-6">
              {category.description}
            </p>
            <p className="text-muted-green mt-2 text-xs">
              {category.available
                ? `${category.freeUnits} website ${category.freeUnits === 1 ? "unit" : "units"} available`
                : category.soldOutReason}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {category.plans.map((plan) => (
                <div
                  key={plan.code}
                  className="border-line bg-soft-white flex items-center justify-between gap-3 border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{plan.name}</p>
                    <p className="text-muted-green mt-1 max-w-48 text-xs leading-5">
                      {plan.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-estate-green text-sm font-semibold whitespace-nowrap">
                      {formatRupees(plan.price.totalPaise)}
                    </p>
                    <p className="text-muted-green text-[11px]">
                      total, incl. GST
                    </p>
                    {category.available && (
                      <Link
                        className="border-copper text-estate-green mt-2 inline-flex min-h-9 items-center border-b px-1 text-xs font-medium"
                        href={`/book?${searchString({ ...search, category: category.slug, plan: plan.code })}`}
                      >
                        Choose rate
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {!category.available && (
              <p className="text-muted-green mt-3 text-xs leading-5">
                Try nearby dates or another stay category.
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function BookingFlow({ initial }: { initial: SearchValues }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState({
    ...initial,
    category: initial.category ?? "estate-room",
    plan: initial.plan ?? "FLEX",
  });
  const [categories, setCategories] = useState<AvailabilityCategory[]>([]);
  const [hold, setHold] = useState<{
    id: string;
    expiresAt: string;
    price: Price;
    status: string;
  } | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [guest, setGuest] = useState({
    guestName: "",
    email: "",
    phone: "",
    foreignNational: false,
    consentAccepted: false,
  });
  const holdKey = useRef<string | null>(null);
  const selected = categories.find(
    (category) => category.slug === search.category,
  );
  const selectedPlan = selected?.plans.find(
    (plan) => plan.code === search.plan,
  );

  useEffect(() => {
    const params = new URLSearchParams({
      checkIn: search.checkIn,
      checkOut: search.checkOut,
      adults: String(search.adults),
      children: String(search.children),
    });
    fetch(`/api/availability?${params}`)
      .then((response) => response.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => setError("Could not load current rates. Please try again."));
  }, [search.adults, search.checkIn, search.checkOut, search.children]);

  useEffect(() => {
    if (!hold) return;
    const update = () =>
      setRemaining(
        Math.max(
          0,
          Math.floor((Date.parse(hold.expiresAt) - Date.now()) / 1000),
        ),
      );
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [hold]);

  async function createHold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      holdKey.current ??= crypto.randomUUID();
      const response = await fetch("/api/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...search,
          categorySlug: search.category,
          ratePlanCode: search.plan,
          ...guest,
          idempotencyKey: holdKey.current,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(
          data.error ??
            "We could not hold those dates. Please check availability again.",
        );
        return;
      }
      setHold(data.hold);
      setStep(2);
    } catch {
      setError("We could not reach the booking service. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function pay(outcome: "success" | "failure" | "pending") {
    if (!hold) return;
    if (paying) return;
    setPaying(true);
    setError("");
    setPaymentMessage("");
    try {
      const response = await fetch("/api/payments/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdId: hold.id, outcome }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Payment could not be processed.");
        return;
      }
      if (data.booking?.status === "PAID") {
        router.push(`/confirmation/${data.booking.ref}`);
      } else if (data.booking?.status === "REFUNDED_LATE") {
        router.push(`/confirmation/${data.booking.ref}?late=1`);
      } else if (data.paymentStatus === "FAILED") {
        setPaymentMessage(
          "The test payment failed. Your hold is still active; try again or choose another outcome.",
        );
      } else {
        setPaymentMessage(
          "Payment is pending in the test gateway. Complete it here when ready; the 15-minute hold remains active.",
        );
      }
    } catch {
      setError(
        "We could not reach the payment service. Your hold remains active while time is left.",
      );
    } finally {
      setPaying(false);
    }
  }

  const currentPrice = hold?.price ?? selectedPlan?.price;
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <section>
        <Stepper steps={["Stay", "Details", "Pay"]} currentStep={step} />
        {error && (
          <p
            role="alert"
            className="border-copper mt-6 border-l-2 py-2 pl-4 text-sm"
          >
            {error}
          </p>
        )}
        {step === 0 && (
          <form
            className="mt-8 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              setStep(1);
            }}
          >
            <div>
              <p className="text-muted-green text-xs tracking-[0.14em] uppercase">
                Step 1
              </p>
              <h1 className="text-estate-green mt-2 font-serif text-3xl">
                Choose your stay
              </h1>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Check-in
                <input
                  className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3"
                  type="date"
                  value={search.checkIn}
                  onChange={(event) =>
                    setSearch({ ...search, checkIn: event.target.value })
                  }
                  required
                />
              </label>
              <label className="text-sm font-medium">
                Check-out
                <input
                  className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3"
                  type="date"
                  value={search.checkOut}
                  onChange={(event) =>
                    setSearch({ ...search, checkOut: event.target.value })
                  }
                  required
                />
              </label>
              <label className="text-sm font-medium">
                Adults
                <input
                  className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3"
                  type="number"
                  min={1}
                  max={12}
                  value={search.adults}
                  onChange={(event) =>
                    setSearch({ ...search, adults: Number(event.target.value) })
                  }
                />
              </label>
              <label className="text-sm font-medium">
                Children
                <input
                  className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3"
                  type="number"
                  min={0}
                  max={10}
                  value={search.children}
                  onChange={(event) =>
                    setSearch({
                      ...search,
                      children: Number(event.target.value),
                    })
                  }
                />
              </label>
            </div>
            <label className="block text-sm font-medium">
              Stay category
              <select
                className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3"
                value={search.category}
                onChange={(event) =>
                  setSearch({ ...search, category: event.target.value })
                }
              >
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Rate plan
              <select
                className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3"
                value={search.plan}
                onChange={(event) =>
                  setSearch({ ...search, plan: event.target.value })
                }
              >
                <option value="FLEX">Flexible</option>
                <option value="NONREF">Non-refundable</option>
              </select>
            </label>
            <button
              type="submit"
              className="bg-estate-green min-h-12 rounded-sm px-6 text-sm font-medium text-white"
            >
              Continue to guest details
            </button>
          </form>
        )}
        {step === 1 && (
          <form className="mt-8 space-y-5" onSubmit={createHold}>
            <div>
              <p className="text-muted-green text-xs tracking-[0.14em] uppercase">
                Step 2
              </p>
              <h1 className="text-estate-green mt-2 font-serif text-3xl">
                Guest details
              </h1>
              <p className="text-foreground/70 mt-2 text-sm leading-6">
                Your price is recalculated and the room is held for 15 minutes
                when you continue.
              </p>
            </div>
            <label className="block text-sm font-medium">
              Full name
              <input
                className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3"
                autoComplete="name"
                value={guest.guestName}
                onChange={(event) =>
                  setGuest({ ...guest, guestName: event.target.value })
                }
                required
                minLength={2}
                maxLength={100}
              />
            </label>
            <label className="block text-sm font-medium">
              Email
              <input
                className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3"
                type="email"
                autoComplete="email"
                value={guest.email}
                onChange={(event) =>
                  setGuest({ ...guest, email: event.target.value })
                }
                required
                maxLength={200}
              />
            </label>
            <label className="block text-sm font-medium">
              Phone
              <input
                className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3"
                type="tel"
                autoComplete="tel"
                value={guest.phone}
                onChange={(event) =>
                  setGuest({ ...guest, phone: event.target.value })
                }
                required
                minLength={7}
                maxLength={30}
              />
            </label>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={guest.foreignNational}
                onChange={(event) =>
                  setGuest({ ...guest, foreignNational: event.target.checked })
                }
              />{" "}
              I am a foreign national
            </label>
            <p className="text-muted-green text-xs leading-5">
              Passport details are collected at check-in for Form C, not online.
            </p>
            <label className="flex items-start gap-3 text-sm leading-6">
              <input
                className="mt-1"
                type="checkbox"
                checked={guest.consentAccepted}
                onChange={(event) =>
                  setGuest({ ...guest, consentAccepted: event.target.checked })
                }
                required
              />{" "}
              I agree to the{" "}
              <Link className="underline" href="/privacy" target="_blank">
                privacy notice
              </Link>{" "}
              and booking terms.
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                disabled={submitting}
                className="bg-estate-green min-h-12 rounded-sm px-6 text-sm font-medium text-white disabled:opacity-50"
                type="submit"
              >
                {submitting ? "Holding…" : "Hold room and continue"}
              </button>
              <button
                className="text-estate-green min-h-12 px-4 text-sm underline"
                type="button"
                onClick={() => setStep(0)}
              >
                Back to stay
              </button>
            </div>
          </form>
        )}
        {step === 2 && hold && (
          <div className="mt-8 space-y-5">
            <div>
              <p className="text-muted-green text-xs tracking-[0.14em] uppercase">
                Step 3
              </p>
              <h1 className="text-estate-green mt-2 font-serif text-3xl">
                Test payment
              </h1>
              <p className="text-foreground/70 mt-2 text-sm leading-6">
                No card details are collected. Choose a test outcome below.
              </p>
            </div>
            <div className="border-line flex items-center justify-between border-y py-3 text-sm">
              <span>Time left on your hold</span>
              <strong
                className={
                  remaining < 120 ? "text-copper" : "text-estate-green"
                }
              >
                {Math.floor(remaining / 60)}:
                {String(remaining % 60).padStart(2, "0")}
              </strong>
            </div>
            {paymentMessage && (
              <p
                role="status"
                className="border-copper border-l-2 py-2 pl-4 text-sm leading-6"
              >
                {paymentMessage}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                disabled={paying}
                className="bg-estate-green min-h-12 rounded-sm px-6 text-sm font-medium text-white disabled:opacity-50"
                onClick={() => pay("success")}
              >
                {paying ? "Processing…" : "Pay successfully"}
              </button>
              <button
                disabled={paying}
                className="border-line min-h-12 rounded-sm border px-5 text-sm disabled:opacity-50"
                onClick={() => pay("failure")}
              >
                Simulate failure
              </button>
              <button
                disabled={paying}
                className="border-line min-h-12 rounded-sm border px-5 text-sm disabled:opacity-50"
                onClick={() => pay("pending")}
              >
                Simulate pending
              </button>
            </div>
            {remaining === 0 && (
              <p className="text-copper text-sm">
                This hold has expired. If payment succeeds, the system will only
                confirm if stock is still available; otherwise it will refund
                the test payment.
              </p>
            )}
          </div>
        )}
      </section>

      <aside className="border-line lg:bg-soft-white h-fit border-t pt-5 lg:sticky lg:top-6 lg:border lg:p-5">
        <h2 className="text-estate-green font-serif text-xl">Your stay</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-green">Dates</dt>
            <dd className="text-right">
              {search.checkIn} to {search.checkOut}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-green">Guests</dt>
            <dd>
              {search.adults} adults, {search.children} children
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-green">Category</dt>
            <dd>{selected?.name ?? search.category}</dd>
          </div>
          {currentPrice && (
            <>
              <div className="border-line flex justify-between gap-4 border-t pt-3">
                <dt className="text-muted-green">Room charge</dt>
                <dd>{formatRupees(currentPrice.subtotalPaise)}</dd>
              </div>
              {currentPrice.discountPaise > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-green">Promo</dt>
                  <dd>-{formatRupees(currentPrice.discountPaise)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-muted-green">GST</dt>
                <dd>{formatRupees(currentPrice.gstPaise)}</dd>
              </div>
              <div className="border-line flex justify-between gap-4 border-t pt-3 font-semibold">
                <dt>Total</dt>
                <dd>{formatRupees(currentPrice.totalPaise)}</dd>
              </div>
            </>
          )}
        </dl>
        {selectedPlan && (
          <p className="border-line text-muted-green mt-4 border-t pt-4 text-xs leading-5">
            {selectedPlan.description}
          </p>
        )}
      </aside>
    </div>
  );
}

export function Confirmation({
  refCode,
  late,
}: {
  refCode: string;
  late: boolean;
}) {
  const [booking, setBooking] = useState<null | {
    status: string;
    guestName: string;
    categoryName: string;
    checkIn: string;
    checkOut: string;
    totalPaise: number;
  }>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/bookings/${encodeURIComponent(refCode)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Booking not found.");
        setBooking(data.booking);
      })
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Booking could not be loaded.",
        ),
      );
  }, [refCode]);

  if (error)
    return (
      <p role="alert" className="text-sm">
        {error}
      </p>
    );
  if (!booking)
    return <p className="text-muted-green text-sm">Loading your booking…</p>;
  if (late || booking.status === "REFUNDED_LATE") {
    return (
      <section className="border-copper max-w-2xl border-l-4 py-3 pl-6">
        <p className="text-muted-green text-xs tracking-[0.15em] uppercase">
          Payment apology
        </p>
        <h1 className="text-estate-green mt-3 font-serif text-3xl">
          We could not confirm this stay.
        </h1>
        <p className="text-foreground/75 mt-4 text-sm leading-7">
          The hold expired and another guest took the last available room. The
          test payment has been marked for refund. Please choose new dates or
          contact our team.
        </p>
      </section>
    );
  }
  return (
    <section className="max-w-2xl">
      <p className="text-muted-green text-xs tracking-[0.15em] uppercase">
        Booking confirmed
      </p>
      <h1 className="text-estate-green mt-3 font-serif text-4xl">
        Thank you, {booking.guestName}.
      </h1>
      <p className="text-foreground/75 mt-4 text-sm leading-7">
        Your test-mode booking is confirmed. A real message is not sent in this
        demo.
      </p>
      <dl className="border-line mt-8 grid gap-4 border-y py-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-green">Reference</dt>
          <dd className="mt-1 font-semibold">{refCode}</dd>
        </div>
        <div>
          <dt className="text-muted-green">Stay</dt>
          <dd className="mt-1">{booking.categoryName}</dd>
        </div>
        <div>
          <dt className="text-muted-green">Check-in</dt>
          <dd className="mt-1">{booking.checkIn}</dd>
        </div>
        <div>
          <dt className="text-muted-green">Check-out</dt>
          <dd className="mt-1">{booking.checkOut}</dd>
        </div>
        <div>
          <dt className="text-muted-green">Total including GST</dt>
          <dd className="mt-1 font-semibold">
            {formatRupees(booking.totalPaise)}
          </dd>
        </div>
      </dl>
      <Link
        className="border-copper text-estate-green mt-6 inline-flex min-h-11 items-center border-b text-sm font-medium"
        href="/"
      >
        Back to the estate
      </Link>
    </section>
  );
}

export function EventEnquiryForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setError("");
    const form = new FormData(formElement);
    const rawText = [
      `Event type: ${form.get("eventType")}`,
      `Preferred date: ${form.get("date")}`,
      `Guests: ${form.get("guests")}`,
      `Nights: ${form.get("nights")}`,
      `Budget: ${form.get("budget")}`,
      `Venue needs: ${form.get("requirements")}`,
    ].join(". ");
    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "WEB_FORM",
          rawText,
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          consentAccepted: form.get("consent") === "on",
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Enquiry could not be sent.");
      setMessage(
        `Thank you. Your enquiry ${data.enquiry.ref} is with our ${data.enquiry.owner} team.`,
      );
      formElement.reset();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Enquiry could not be sent.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="max-w-2xl space-y-5" onSubmit={submit}>
      {message && (
        <p
          role="status"
          className="border-estate-green border-l-2 py-2 pl-4 text-sm"
        >
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="border-copper border-l-2 py-2 pl-4 text-sm">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Your name
          <input
            className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3"
            name="name"
            required
            maxLength={100}
          />
        </label>
        <label className="text-sm font-medium">
          Email
          <input
            className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3"
            name="email"
            type="email"
            required
            maxLength={200}
          />
        </label>
        <label className="text-sm font-medium">
          Phone
          <input
            className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3"
            name="phone"
            type="tel"
            required
            maxLength={30}
          />
        </label>
        <label className="text-sm font-medium">
          Gathering type
          <select
            className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3"
            name="eventType"
          >
            <option>Wedding</option>
            <option>Corporate offsite</option>
            <option>Other gathering</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Preferred date
          <input
            className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3"
            name="date"
            type="date"
            required
          />
        </label>
        <label className="text-sm font-medium">
          Guest count
          <input
            className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3"
            name="guests"
            type="number"
            min={1}
            max={2000}
            required
          />
        </label>
        <label className="text-sm font-medium">
          Nights
          <input
            className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3"
            name="nights"
            type="number"
            min={0}
            max={30}
            defaultValue={0}
          />
        </label>
        <label className="text-sm font-medium">
          Budget range (optional)
          <select
            className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3"
            name="budget"
          >
            <option value="">Prefer not to say</option>
            <option>Under ₹2 lakh</option>
            <option>₹2–5 lakh</option>
            <option>₹5–10 lakh</option>
            <option>Over ₹10 lakh</option>
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium">
        Venue and event requirements
        <textarea
          className="border-line bg-soft-white mt-1.5 min-h-28 w-full rounded-sm border px-3 py-2"
          name="requirements"
          maxLength={2000}
          placeholder="Share your hall, lawn or accommodation needs."
        />
      </label>
      <label className="flex items-start gap-3 text-sm leading-6">
        <input className="mt-1" type="checkbox" name="consent" required /> I
        agree to the{" "}
        <Link className="underline" href="/privacy" target="_blank">
          privacy notice
        </Link>{" "}
        for handling this enquiry.
      </label>
      <button
        disabled={busy}
        className="bg-estate-green min-h-12 rounded-sm px-6 text-sm font-medium text-white disabled:opacity-50"
        type="submit"
      >
        {busy ? "Sending…" : "Send event enquiry"}
      </button>
    </form>
  );
}
