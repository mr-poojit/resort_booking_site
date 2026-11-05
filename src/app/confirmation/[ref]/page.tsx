import { BrandMark } from "@/components/brand-mark";
import { Confirmation } from "@/components/guest-workflows";

export const instant = false;

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ late?: string }>;
}) {
  const [{ ref }, query] = await Promise.all([params, searchParams]);
  return (
    <main className="mx-auto min-h-screen max-w-360 px-5 sm:px-8 lg:px-14">
      <header className="border-line flex min-h-20 items-center border-b">
        <BrandMark />
      </header>
      <section className="py-12 sm:py-20">
        <Confirmation refCode={ref} late={query.late === "1"} />
      </section>
    </main>
  );
}
