import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 sm:px-8">
      <BrandMark />
      <article className="mt-12">
        <p className="text-muted-green text-xs tracking-[0.15em] uppercase">
          Guest information
        </p>
        <h1 className="text-estate-green mt-3 font-serif text-4xl">
          Privacy notice
        </h1>
        <p className="text-foreground/75 mt-6 text-sm leading-7">
          This demo collects only the details needed to respond to an enquiry or
          manage a booking: name, email, phone, stay details and the
          foreign-national tick. Passport or identity documents are not
          collected online; Form C details are taken at check-in.
        </p>
        <p className="text-foreground/75 mt-4 text-sm leading-7">
          Contact details are used for booking and enquiry follow-up. Enquiry
          and booking records in this demo are held in server memory and reset
          when the local server restarts. Guest accounts (name, email, and a
          password hash or Google account id) are stored in a local file on the
          server. A production retention period and DPDP deletion/export
          workflow must be confirmed with the resort owner before launch.
        </p>
        <p className="text-foreground/75 mt-4 text-sm leading-7">
          Consent text version {"booking-consent-v1"} and its timestamp are
          recorded when a booking is placed. Enquiry consent is required before
          submitting this form.
        </p>
        <Link
          className="border-copper text-estate-green mt-8 inline-flex min-h-11 items-center border-b text-sm"
          href="/"
        >
          Return home
        </Link>
      </article>
    </main>
  );
}
