import Link from "next/link";
import { EventEnquiryForm } from "@/components/guest-workflows";

export default function EventsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-360 px-5 sm:px-8 lg:px-14">
      <header className="border-line flex min-h-20 items-center justify-between border-b">
        <Link
          className="text-estate-green text-xs font-semibold tracking-[0.12em]"
          href="/"
        >
          COMPANY A
          <span className="text-muted-green mt-1 block text-[10px] font-normal">
            COFFEE ESTATE · KARNATAKA
          </span>
        </Link>
        <Link className="text-estate-green text-sm underline" href="/stays">
          Stay booking
        </Link>
      </header>
      <section className="grid gap-10 py-10 lg:grid-cols-[0.7fr_1.3fr] lg:py-16">
        <div>
          <p className="text-muted-green text-xs tracking-[0.15em] uppercase">
            Weddings and offsites
          </p>
          <h1 className="text-estate-green mt-3 font-serif text-4xl">
            Bring everyone together.
          </h1>
          <p className="text-foreground/70 mt-4 max-w-md text-sm leading-7">
            Share a few details and the team will follow up. This form creates
            an enquiry in the shared inbox; it does not quote or confirm event
            pricing.
          </p>
        </div>
        <EventEnquiryForm />
      </section>
      <footer className="border-line text-muted-green border-t py-5 text-xs">
        <Link className="underline" href="/privacy">
          Privacy notice
        </Link>
      </footer>
    </main>
  );
}
