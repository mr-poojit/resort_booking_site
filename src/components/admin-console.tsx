"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatRupees } from "@/server/core";

type StaffUser = {
  email: string;
  name: string;
  role: "RESERVATIONS" | "SALES" | "GM";
};
type CalendarDay = {
  categorySlug: string;
  categoryName: string;
  date: string;
  allotment: number;
  sold: number;
  held: number;
  free: number;
  blackout: boolean;
  flexRatePaise: number;
  nonrefRatePaise: number;
};
type Booking = {
  ref: string;
  guestName: string;
  email: string;
  phone: string;
  categoryName: string;
  checkIn: string;
  checkOut: string;
  totalPaise: number;
  status: string;
};
type Enquiry = {
  ref: string;
  source: string;
  rawText: string;
  name?: string;
  email?: string;
  owner: string;
  status: string;
  classification: {
    category: string;
    confidence: number;
    complaintAlert: boolean;
    unsorted: boolean;
    checkCategory: boolean;
  };
  fields: {
    checkIn?: string;
    checkOut?: string;
    month?: string;
    guests?: number;
    budgetPaise?: number;
    inferredDates?: boolean;
  };
  draft?: string;
  createdAt: string;
  history: Array<{ owner: string; reason: string; at: string }>;
};

type Tab = "rates" | "bookings" | "inbox" | "audit";

const demoAccounts = [
  "reservations@company-a.example",
  "sales@company-a.example",
  "gm@company-a.example",
];

export function AdminConsole({ initialDate }: { initialDate: string }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [tab, setTab] = useState<Tab>("rates");
  const [email, setEmail] = useState(demoAccounts[0]);
  const [password, setPassword] = useState("EstateDemo2026!");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [auditEntries, setAuditEntries] = useState<
    Array<{
      id: number;
      action: string;
      entityType: string;
      entityId: string;
      createdAt: string;
    }>
  >([]);
  const [selectedRef, setSelectedRef] = useState("");
  const [reply, setReply] = useState("");
  const [rerouteOwner, setRerouteOwner] = useState("Reservations");
  const [rerouteReason, setRerouteReason] = useState("");
  const [pickedCategory, setPickedCategory] = useState("ROOM_BOOKING");
  const [exportDate, setExportDate] = useState(initialDate);

  const selectedEnquiry = enquiries.find((item) => item.ref === selectedRef);
  const selectedRefRef = useRef(selectedRef);
  selectedRefRef.current = selectedRef;
  const tabs = useMemo<Tab[]>(
    () =>
      user?.role === "SALES"
        ? ["inbox"]
        : user?.role === "GM"
          ? ["rates", "bookings", "inbox", "audit"]
          : ["rates", "bookings", "inbox"],
    [user?.role],
  );

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => setError("Could not check the staff session."));
  }, []);

  useEffect(() => {
    if (!user) return;
    if (tab === "rates" && user.role !== "SALES") {
      const end = addDays(today(), 15);
      fetch(`/api/admin/rates?start=${today()}&end=${end}`)
        .then(readJson)
        .then((data) => setCalendar(data.calendar))
        .catch((cause: unknown) => setError(messageOf(cause)));
    }
    if (tab === "bookings" && user.role !== "SALES") {
      fetch("/api/admin/bookings")
        .then(readJson)
        .then((data) => setBookings(data.bookings))
        .catch((cause: unknown) => setError(messageOf(cause)));
    }
    if (tab === "audit" && user.role === "GM") {
      fetch("/api/admin/audit")
        .then(readJson)
        .then((data) => setAuditEntries(data.entries))
        .catch((cause: unknown) => setError(messageOf(cause)));
    }
  }, [tab, user]);

  useEffect(() => {
    if (!user || tab !== "inbox") return;
    let active = true;

    async function loadInbox() {
      try {
        const response = await fetch("/api/enquiries");
        const data = await readJson(response);
        if (!active) return;
        const nextEnquiries = data.enquiries as typeof enquiries;
        setEnquiries(nextEnquiries);
        const current = selectedRefRef.current;
        if (current && nextEnquiries.some((item) => item.ref === current))
          return;
        const next = nextEnquiries[0];
        setSelectedRef(next?.ref ?? "");
        setReply(next?.draft ?? "");
        if (next) setRerouteOwner(next.owner);
      } catch (cause: unknown) {
        if (active) setError(messageOf(cause));
      }
    }

    void loadInbox();
    const timer = window.setInterval(() => void loadInbox(), 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [tab, user]);

  function selectEnquiry(ref: string) {
    const enquiry = enquiries.find((item) => item.ref === ref);
    setSelectedRef(ref);
    setReply(enquiry?.draft ?? "");
    setRerouteOwner(enquiry?.owner ?? "Reservations");
    setRerouteReason("");
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Sign-in failed.");
      return;
    }
    setUser(data.user);
    setNotice(`Signed in as ${data.user.name}.`);
  }

  async function logout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    setUser(null);
    setCalendar([]);
    setBookings([]);
    setEnquiries([]);
    setNotice("You are signed out.");
  }

  async function updateDay(
    event: FormEvent<HTMLFormElement>,
    day: CalendarDay,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutate("/api/admin/rates", "PATCH", {
      categorySlug: day.categorySlug,
      date: day.date,
      allotment: Number(form.get("allotment")),
      flexRatePaise: Math.round(Number(form.get("flexRate")) * 100),
      nonrefRatePaise: Math.round(Number(form.get("nonrefRate")) * 100),
      blackout: form.get("blackout") === "on",
    });
  }

  async function cancelBooking(ref: string) {
    if (!window.confirm(`Cancel ${ref}?`)) return;
    await mutate("/api/admin/bookings", "PATCH", { ref, action: "cancel" });
  }

  async function reroute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEnquiry) return;
    await mutate(`/api/enquiries/${selectedEnquiry.ref}`, "PATCH", {
      action: "reroute",
      owner: rerouteOwner,
      reason: rerouteReason,
    });
  }

  async function sendReply() {
    if (!selectedEnquiry) return;
    await mutate(`/api/enquiries/${selectedEnquiry.ref}`, "PATCH", {
      action: "send",
      body: reply,
    });
  }

  async function categorize(category: string) {
    if (!selectedEnquiry) return;
    await mutate(`/api/enquiries/${selectedEnquiry.ref}`, "PATCH", {
      action: "categorize",
      category,
    });
  }

  async function simulateEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await mutate("/api/enquiries", "POST", {
      source: form.get("source"),
      rawText: form.get("rawText"),
    });
    formElement.reset();
  }

  async function mutate(url: string, method: string, body: unknown) {
    setBusy(true);
    setError("");
    setNotice("");
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "The change could not be saved.");
      return;
    }
    setNotice("Saved.");
    if (tab === "rates") {
      const updated = data.day as Partial<CalendarDay>;
      setCalendar((current) =>
        current.map((item) =>
          item.date === updated.date &&
          item.categorySlug === updated.categorySlug
            ? { ...item, ...updated }
            : item,
        ),
      );
    } else if (tab === "bookings") {
      setBookings((current) =>
        current.map((item) =>
          item.ref === data.booking.ref ? data.booking : item,
        ),
      );
    } else if (data.enquiry) {
      setEnquiries((current) => [
        data.enquiry,
        ...current.filter((item) => item.ref !== data.enquiry.ref),
      ]);
      setSelectedRef(data.enquiry.ref);
      setReply(data.enquiry.draft ?? "");
      setRerouteOwner(data.enquiry.owner);
    }
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-lg py-12">
        <p className="text-muted-green text-xs tracking-[0.15em] uppercase">
          Staff workspace
        </p>
        <h1 className="text-estate-green mt-3 font-serif text-4xl">Sign in</h1>
        <p className="text-foreground/70 mt-3 text-sm leading-6">
          Use a local demo account. These accounts are fake and for this demo
          only.
        </p>
        {error && (
          <p
            role="alert"
            className="border-copper mt-5 border-l-2 py-2 pl-4 text-sm"
          >
            {error}
          </p>
        )}
        <form className="mt-6 space-y-4" onSubmit={login}>
          <label className="block text-sm font-medium">
            Staff email
            <select
              className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            >
              {demoAccounts.map((account) => (
                <option key={account}>{account}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              className="border-line bg-soft-white mt-1.5 min-h-11 w-full rounded-sm border px-3"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button
            disabled={busy}
            className="bg-estate-green min-h-12 rounded-sm px-6 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-muted-green text-xs">
            Local demo password: <code>EstateDemo2026!</code>. Set{" "}
            <code>SEED_DEMO_PASSWORD</code> to change it.
          </p>
        </form>
      </section>
    );
  }

  return (
    <div>
      <div className="border-line flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div>
          <p className="text-muted-green text-xs tracking-[0.14em] uppercase">
            Staff workspace
          </p>
          <h1 className="text-estate-green mt-2 font-serif text-3xl">
            Good day, {user.name}
          </h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-green">{user.role}</span>
          <button
            className="border-line text-estate-green min-h-11 border-b px-1"
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </div>
      {notice && (
        <p role="status" className="text-estate-green mt-4 text-sm">
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="border-copper mt-4 border-l-2 py-2 pl-4 text-sm"
        >
          {error}
        </p>
      )}
      <nav
        aria-label="Admin sections"
        className="border-line mt-5 flex gap-2 border-b"
      >
        {tabs.map((item) => (
          <button
            key={item}
            aria-current={tab === item ? "page" : undefined}
            onClick={() => {
              setError("");
              setTab(item);
            }}
            className={`min-h-11 border-b-2 px-4 text-sm capitalize ${tab === item ? "border-copper text-estate-green font-semibold" : "text-muted-green border-transparent"}`}
          >
            {item === "inbox"
              ? `Inbox${enquiries.length ? ` (${enquiries.filter((enquiry) => enquiry.status !== "REPLIED").length})` : ""}`
              : item}
          </button>
        ))}
      </nav>
      {tab === "rates" && user.role !== "SALES" && (
        <RatesPanel
          calendar={calendar}
          updateDay={updateDay}
          canManagePromos={user.role === "GM"}
        />
      )}
      {tab === "bookings" && user.role !== "SALES" && (
        <BookingsPanel
          bookings={bookings}
          cancel={cancelBooking}
          exportDate={exportDate}
          setExportDate={setExportDate}
        />
      )}
      {tab === "inbox" && (
        <InboxPanel
          enquiries={enquiries}
          selected={selectedEnquiry}
          select={selectEnquiry}
          reply={reply}
          setReply={setReply}
          send={sendReply}
          busy={busy}
          owner={rerouteOwner}
          setOwner={setRerouteOwner}
          reason={rerouteReason}
          setReason={setRerouteReason}
          reroute={reroute}
          category={pickedCategory}
          setCategory={setPickedCategory}
          categorize={categorize}
          simulate={simulateEnquiry}
        />
      )}
      {tab === "audit" && user.role === "GM" && (
        <AuditPanel entries={auditEntries} />
      )}
    </div>
  );
}

function RatesPanel({
  calendar,
  updateDay,
  canManagePromos,
}: {
  calendar: CalendarDay[];
  updateDay: (event: FormEvent<HTMLFormElement>, day: CalendarDay) => void;
  canManagePromos: boolean;
}) {
  const groups = new Map<string, CalendarDay[]>();
  calendar.forEach((day) =>
    groups.set(day.categoryName, [
      ...(groups.get(day.categoryName) ?? []),
      day,
    ]),
  );
  return (
    <section className="py-6">
      <div className="mb-5">
        <h2 className="text-estate-green font-serif text-2xl">
          Rates and website allotment
        </h2>
        <p className="text-foreground/70 mt-2 text-sm leading-6">
          Edit daily amounts in rupees. Allotment cannot fall below rooms
          already sold or held.
        </p>
      </div>
      {[...groups.entries()].map(([name, days]) => (
        <details key={name} open className="border-line border-t py-4">
          <summary className="text-estate-green cursor-pointer font-serif text-lg">
            {name}
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[790px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-line text-muted-green border-b">
                  <th className="py-2 pr-3">Date</th>
                  <th className="px-2">Sold</th>
                  <th className="px-2">Held</th>
                  <th className="px-2">Free</th>
                  <th className="px-2">Flexible ₹</th>
                  <th className="px-2">Non-refundable ₹</th>
                  <th className="px-2">Allotment</th>
                  <th className="px-2">Blackout</th>
                  <th className="px-2"></th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => {
                  const formId = `rate-${day.categorySlug}-${day.date}`;
                  return (
                    <tr key={day.date} className="border-line/70 border-b">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {day.date}
                      </td>
                      <td className="px-2">{day.sold}</td>
                      <td className="px-2">{day.held}</td>
                      <td className="px-2 font-semibold">{day.free}</td>
                      <td className="px-2">
                        <input
                          form={formId}
                          aria-label={`${name} ${day.date} flexible rate`}
                          className="border-line bg-soft-white min-h-9 w-24 rounded-sm border px-2"
                          type="number"
                          min="0"
                          step="0.01"
                          name="flexRate"
                          defaultValue={(day.flexRatePaise / 100).toFixed(2)}
                        />
                      </td>
                      <td className="px-2">
                        <input
                          form={formId}
                          aria-label={`${name} ${day.date} non-refundable rate`}
                          className="border-line bg-soft-white min-h-9 w-24 rounded-sm border px-2"
                          type="number"
                          min="0"
                          step="0.01"
                          name="nonrefRate"
                          defaultValue={(day.nonrefRatePaise / 100).toFixed(2)}
                        />
                      </td>
                      <td className="px-2">
                        <input
                          form={formId}
                          aria-label={`${name} ${day.date} allotment`}
                          className="border-line bg-soft-white min-h-9 w-16 rounded-sm border px-2"
                          type="number"
                          min={day.sold + day.held}
                          max="100"
                          name="allotment"
                          defaultValue={day.allotment}
                        />
                      </td>
                      <td className="px-2">
                        <input
                          form={formId}
                          aria-label={`${name} ${day.date} blackout`}
                          type="checkbox"
                          name="blackout"
                          defaultChecked={day.blackout}
                        />
                      </td>
                      <td className="px-2">
                        <form
                          id={formId}
                          onSubmit={(event) => updateDay(event, day)}
                        >
                          <button className="border-copper text-estate-green min-h-9 border-b px-1 font-medium">
                            Save
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      ))}
      {canManagePromos && <PromoPanel />}
    </section>
  );
}

function PromoPanel() {
  const [promos, setPromos] = useState<
    Array<{
      code: string;
      kind: string;
      value: number;
      active: boolean;
      minimumNights: number;
    }>
  >([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/admin/promos")
      .then(readJson)
      .then((data) => setPromos(data.promos))
      .catch(() => setPromos([]));
  }, []);
  async function toggle(code: string, active: boolean) {
    const response = await fetch("/api/admin/promos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, active: !active }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Promo update failed.");
      return;
    }
    setPromos(data.promos);
    setMessage("Promo updated.");
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/admin/promos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.get("code"),
        kind: form.get("kind"),
        value: Number(form.get("value")),
        startsAt: form.get("startsAt"),
        endsAt: form.get("endsAt"),
        minimumNights: Number(form.get("minimumNights")),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Promo could not be created.");
      return;
    }
    setPromos(data.promos);
    setMessage("Promo created.");
    formElement.reset();
  }
  return (
    <section className="border-line mt-8 border-t pt-5">
      <h3 className="text-estate-green font-serif text-xl">Promo codes</h3>
      <div className="divide-line mt-3 divide-y">
        {promos.map((promo) => (
          <div
            key={promo.code}
            className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
          >
            <p>
              <strong>{promo.code}</strong>
              <span className="text-muted-green ml-3">
                {promo.kind === "PERCENT"
                  ? `${promo.value}%`
                  : formatRupees(promo.value)}{" "}
                · min {promo.minimumNights} nights ·{" "}
                {promo.active ? "Active" : "Paused"}
              </span>
            </p>
            <button
              className="border-line text-estate-green min-h-10 border-b px-1"
              onClick={() => toggle(promo.code, promo.active)}
            >
              {promo.active ? "Pause" : "Activate"}
            </button>
          </div>
        ))}
      </div>
      <form
        className="border-line mt-5 grid gap-3 border-t pt-5 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={create}
      >
        <label className="text-muted-green text-xs">
          Code
          <input
            className="border-line bg-soft-white text-foreground mt-1 block min-h-10 w-full rounded-sm border px-2 text-sm"
            name="code"
            required
            minLength={3}
            maxLength={24}
          />
        </label>
        <label className="text-muted-green text-xs">
          Type
          <select
            className="border-line bg-soft-white text-foreground mt-1 block min-h-10 w-full rounded-sm border px-2 text-sm"
            name="kind"
          >
            <option value="PERCENT">Percent</option>
            <option value="FLAT">Flat rupees</option>
          </select>
        </label>
        <label className="text-muted-green text-xs">
          Value
          <input
            className="border-line bg-soft-white text-foreground mt-1 block min-h-10 w-full rounded-sm border px-2 text-sm"
            name="value"
            type="number"
            min="1"
            required
          />
        </label>
        <label className="text-muted-green text-xs">
          Minimum nights
          <input
            className="border-line bg-soft-white text-foreground mt-1 block min-h-10 w-full rounded-sm border px-2 text-sm"
            name="minimumNights"
            type="number"
            min="1"
            max="30"
            defaultValue="1"
            required
          />
        </label>
        <label className="text-muted-green text-xs">
          Starts
          <input
            className="border-line bg-soft-white text-foreground mt-1 block min-h-10 w-full rounded-sm border px-2 text-sm"
            name="startsAt"
            type="date"
            required
          />
        </label>
        <label className="text-muted-green text-xs">
          Ends
          <input
            className="border-line bg-soft-white text-foreground mt-1 block min-h-10 w-full rounded-sm border px-2 text-sm"
            name="endsAt"
            type="date"
            required
          />
        </label>
        <button className="bg-estate-green min-h-10 self-end rounded-sm px-4 text-sm text-white sm:col-span-2 lg:col-span-1">
          Create promo
        </button>
        {message && (
          <p role="status" className="text-muted-green self-center text-xs">
            {message}
          </p>
        )}
      </form>
    </section>
  );
}

function AuditPanel({
  entries,
}: {
  entries: Array<{
    id: number;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
  }>;
}) {
  return (
    <section className="py-6">
      <h2 className="text-estate-green font-serif text-2xl">Change history</h2>
      <p className="text-foreground/70 mt-2 text-sm">
        Append-only record of staff changes in this demo session.
      </p>
      {entries.length === 0 ? (
        <p className="border-line text-muted-green mt-5 border-t py-5 text-sm">
          No changes recorded yet.
        </p>
      ) : (
        <ol className="divide-line mt-5 divide-y">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="grid gap-1 py-3 sm:grid-cols-[1fr_auto]"
            >
              <p className="text-sm">
                <strong>{entry.action.replaceAll("_", " ")}</strong>
                <span className="text-muted-green ml-2">
                  {entry.entityType} · {entry.entityId}
                </span>
              </p>
              <time className="text-muted-green text-xs">
                {new Date(entry.createdAt).toLocaleString()}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function BookingsPanel({
  bookings,
  cancel,
  exportDate,
  setExportDate,
}: {
  bookings: Booking[];
  cancel: (ref: string) => void;
  exportDate: string;
  setExportDate: (date: string) => void;
}) {
  return (
    <section className="py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-estate-green font-serif text-2xl">Bookings</h2>
          <p className="text-foreground/70 mt-2 text-sm">
            Paid demo bookings, with cancellation returning allotment once.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="text-muted-green text-xs">
            Check-in date
            <input
              className="border-line bg-soft-white mt-1 block min-h-10 rounded-sm border px-2 text-sm"
              type="date"
              value={exportDate}
              onChange={(event) => setExportDate(event.target.value)}
            />
          </label>
          <a
            className="bg-estate-green inline-flex min-h-10 items-center rounded-sm px-4 text-xs font-medium text-white"
            href={`/api/admin/export?date=${exportDate}`}
          >
            Download CSV
          </a>
        </div>
      </div>
      {bookings.length === 0 ? (
        <p className="border-line text-muted-green mt-6 border-t py-6 text-sm">
          No bookings yet. A completed mock payment will appear here.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[740px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-line text-muted-green border-b text-xs">
                <th className="py-3">Reference / guest</th>
                <th>Stay</th>
                <th>Dates</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.ref} className="border-line border-b">
                  <td className="py-3">
                    <strong>{booking.ref}</strong>
                    <span className="text-muted-green mt-1 block text-xs">
                      {booking.guestName} · {booking.email}
                    </span>
                  </td>
                  <td>{booking.categoryName}</td>
                  <td>
                    {booking.checkIn} – {booking.checkOut}
                  </td>
                  <td>{formatRupees(booking.totalPaise)}</td>
                  <td>{booking.status}</td>
                  <td>
                    {booking.status === "PAID" && (
                      <button
                        className="border-copper text-estate-green min-h-10 border-b text-xs"
                        onClick={() => cancel(booking.ref)}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function InboxPanel({
  enquiries,
  selected,
  select,
  reply,
  setReply,
  send,
  busy,
  owner,
  setOwner,
  reason,
  setReason,
  reroute,
  category,
  setCategory,
  categorize,
  simulate,
}: {
  enquiries: Enquiry[];
  selected?: Enquiry;
  select: (ref: string) => void;
  reply: string;
  setReply: (reply: string) => void;
  send: () => void;
  busy: boolean;
  owner: string;
  setOwner: (owner: string) => void;
  reason: string;
  setReason: (reason: string) => void;
  reroute: (event: FormEvent<HTMLFormElement>) => void;
  category: string;
  setCategory: (category: string) => void;
  categorize: (category: string) => void;
  simulate: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const lanes = [
    "UNSORTED",
    "ROOM_BOOKING",
    "WEDDING",
    "CORPORATE_OFFSITE",
    "COMPLAINT",
  ];
  return (
    <section className="grid min-h-[600px] gap-0 py-5 lg:grid-cols-[270px_1fr]">
      <aside className="border-line border-b lg:border-r lg:border-b-0 lg:pr-4">
        <h2 className="text-estate-green font-serif text-xl">Enquiry inbox</h2>
        <div className="mt-3 flex gap-2 overflow-x-auto lg:block">
          {lanes.map((lane) => (
            <div
              key={lane}
              className="text-muted-green shrink-0 py-2 text-[10px] font-semibold tracking-[0.1em]"
            >
              {lane.replaceAll("_", " ")}{" "}
              <span className="ml-1">
                {
                  enquiries.filter((item) =>
                    lane === "UNSORTED"
                      ? item.classification.unsorted
                      : item.classification.category === lane,
                  ).length
                }
              </span>
            </div>
          ))}
        </div>
        <form className="border-line mt-3 border-y py-3" onSubmit={simulate}>
          <label className="text-muted-green text-xs font-medium">
            Simulate incoming message
            <select
              className="border-line bg-soft-white text-foreground mt-1 block min-h-10 w-full rounded-sm border px-2 text-sm"
              name="source"
            >
              <option value="EMAIL">Forwarded email</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="PHONE">Phone note</option>
              <option value="SOCIAL">Social message</option>
            </select>
          </label>
          <textarea
            className="border-line bg-soft-white mt-2 min-h-20 w-full rounded-sm border p-2 text-xs"
            name="rawText"
            required
            minLength={10}
            maxLength={5000}
            placeholder="Paste the guest message"
          />
          <button
            disabled={busy}
            className="border-copper text-estate-green min-h-9 border-b text-xs font-medium disabled:opacity-50"
          >
            Add to inbox
          </button>
        </form>
        <ul className="divide-line mt-2 max-h-[480px] divide-y overflow-y-auto">
          {enquiries.map((enquiry) => (
            <li key={enquiry.ref}>
              <button
                className={`w-full px-2 py-3 text-left ${selected?.ref === enquiry.ref ? "bg-soft-white" : ""}`}
                onClick={() => select(enquiry.ref)}
              >
                <span className="flex items-center justify-between gap-2 text-xs">
                  <strong className="text-estate-green">{enquiry.ref}</strong>
                  <span className="text-muted-green">{enquiry.source}</span>
                </span>
                <span className="text-foreground/75 mt-1 line-clamp-2 block text-xs leading-5">
                  {enquiry.rawText}
                </span>
                <span className="text-muted-green mt-1 block text-[10px]">
                  {enquiry.owner} ·{" "}
                  {Math.round(enquiry.classification.confidence * 100)}%
                  confidence
                </span>
                {enquiry.classification.checkCategory && (
                  <span className="border-copper text-copper mt-1 inline-block border-b text-[10px] font-medium">
                    Check category
                  </span>
                )}
                {enquiry.classification.complaintAlert && (
                  <span className="border-copper text-copper mt-1 inline-block border-b text-[10px] font-medium">
                    GM alert
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      {!selected ? (
        <div className="text-muted-green grid place-items-center py-16 text-sm">
          Choose an enquiry to review.
        </div>
      ) : (
        <article className="min-w-0 px-0 py-5 lg:px-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-muted-green text-xs tracking-[0.12em] uppercase">
                {selected.ref} · {selected.source}
              </p>
              <h3 className="text-estate-green mt-2 font-serif text-2xl">
                {selected.classification.category.replaceAll("_", " ")}
              </h3>
            </div>
            {selected.classification.complaintAlert && (
              <span className="border-copper text-copper border-l-2 py-1 pl-3 text-xs">
                Complaint alert · GM notified
              </span>
            )}
          </div>
          <blockquote className="border-line mt-5 border-l-2 py-1 pl-4 text-sm leading-6">
            {selected.rawText}
          </blockquote>
          <div className="text-muted-green mt-4 flex flex-wrap gap-3 text-xs">
            {selected.fields.checkIn && (
              <span>
                Check-in: {selected.fields.checkIn}
                {selected.fields.inferredDates ? " (inferred)" : ""}
              </span>
            )}
            {selected.fields.checkOut && (
              <span>
                Check-out: {selected.fields.checkOut}
                {selected.fields.inferredDates ? " (inferred)" : ""}
              </span>
            )}
            {selected.fields.month && (
              <span>
                Month: {selected.fields.month}
                {selected.fields.inferredDates ? " (inferred)" : ""}
              </span>
            )}
            {selected.fields.guests && (
              <span>Guests: {selected.fields.guests}</span>
            )}
            {selected.fields.budgetPaise && (
              <span>Budget: {formatRupees(selected.fields.budgetPaise)}</span>
            )}
            <span>Owner: {selected.owner}</span>
          </div>
          {selected.classification.unsorted && (
            <div className="border-copper mt-4 border-l-2 py-2 pl-4">
              <p className="text-sm">
                Low confidence or ambiguous enquiry. Choose its category before
                a draft is created.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="text-muted-green text-xs">
                  Category
                  <select
                    className="border-line bg-soft-white text-foreground mt-1 block min-h-10 rounded-sm border px-2 text-sm"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="ROOM_BOOKING">Room booking</option>
                    <option value="WEDDING">Wedding</option>
                    <option value="CORPORATE_OFFSITE">Corporate offsite</option>
                    <option value="COMPLAINT">Complaint</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={busy}
                  className="bg-estate-green min-h-10 rounded-sm px-4 text-xs text-white disabled:opacity-50"
                  onClick={() => categorize(category)}
                >
                  Set category
                </button>
              </div>
            </div>
          )}
          <form
            className="mt-5 grid gap-2 sm:grid-cols-[180px_1fr_auto]"
            onSubmit={reroute}
          >
            <label className="text-muted-green text-xs">
              Re-route to
              <select
                className="border-line bg-soft-white text-foreground mt-1 block min-h-10 w-full rounded-sm border px-2 text-sm"
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
              >
                <option>Reservations</option>
                <option>Sales</option>
                <option>GM</option>
              </select>
            </label>
            <label className="text-muted-green text-xs">
              Reason
              <input
                className="border-line bg-soft-white text-foreground mt-1 block min-h-10 w-full rounded-sm border px-2 text-sm"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Why are you re-routing?"
                required
                minLength={3}
              />
            </label>
            <button className="border-line text-estate-green mt-5 min-h-10 border-b px-2 text-xs">
              Re-route
            </button>
          </form>
          {selected.draft && (
            <div className="mt-6">
              <label
                className="text-muted-green text-xs font-medium"
                htmlFor="reply-draft"
              >
                Reply draft · review before sending
              </label>
              <textarea
                id="reply-draft"
                className="border-line bg-soft-white mt-2 min-h-36 w-full rounded-sm border p-3 text-sm leading-6"
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                maxLength={5000}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-muted-green max-w-lg text-xs leading-5">
                  Sending is simulated and recorded in the inbox. Price and
                  high-risk phrase guards run on the server.
                </p>
                <button
                  disabled={busy}
                  className="bg-estate-green min-h-11 rounded-sm px-5 text-sm font-medium text-white disabled:opacity-50"
                  onClick={send}
                >
                  Simulate send
                </button>
              </div>
            </div>
          )}
        </article>
      )}
    </section>
  );
}

async function readJson(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Request failed.";
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
