import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
} from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet";
};

const buttonVariants = {
  primary: "bg-estate-green text-white hover:bg-[#243c2e]",
  secondary: "border border-estate-green text-estate-green hover:bg-[#edf0e9]",
  quiet: "text-estate-green hover:bg-[#edf0e9]",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-sm px-5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Label({
  className = "",
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`text-foreground mb-1.5 block text-sm font-medium ${className}`}
      {...props}
    />
  );
}

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`border-line bg-soft-white text-foreground placeholder:text-muted-green/75 min-h-11 w-full rounded-sm border px-3 text-sm ${className}`}
      {...props}
    />
  );
}

export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={`border-line bg-soft-white rounded-sm border p-5 ${className}`}
      {...props}
    />
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="text-estate-green inline-flex items-center rounded-sm bg-[#e8ede5] px-2.5 py-1 text-xs font-medium">
      {children}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-sm bg-[#e8e4dc] ${className}`}
    />
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-line bg-soft-white border border-dashed p-6 text-center">
      <h2 className="text-estate-green font-serif text-xl">{title}</h2>
      <p className="text-foreground/70 mt-2 text-sm leading-6">{description}</p>
    </div>
  );
}

export function ErrorState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div role="alert" className="border border-[#c98975] bg-[#fff7f3] p-5">
      <h2 className="text-foreground font-medium">{title}</h2>
      <p className="text-foreground/75 mt-1 text-sm leading-6">{description}</p>
    </div>
  );
}

export function Stepper({
  steps,
  currentStep,
}: {
  steps: string[];
  currentStep: number;
}) {
  return (
    <ol aria-label="Booking progress" className="flex items-center gap-3">
      {steps.map((step, index) => {
        const complete = index < currentStep;
        const current = index === currentStep;

        return (
          <li
            key={step}
            aria-current={current ? "step" : undefined}
            className={`flex min-h-11 items-center gap-2 text-sm ${current ? "text-estate-green font-semibold" : "text-muted-green"}`}
          >
            <span
              className={`grid size-7 place-items-center rounded-full border text-xs ${complete || current ? "border-estate-green bg-estate-green text-white" : "border-line"}`}
              aria-hidden="true"
            >
              {complete ? "✓" : index + 1}
            </span>
            {step}
          </li>
        );
      })}
    </ol>
  );
}
