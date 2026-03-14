import Link from "next/link";
import {
  Dumbbell,
  IndianRupee,
  MessageCircle,
  ScanLine,
  Shield,
  Clock,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: IndianRupee,
    title: "Zero-Cost UPI Payments",
    description:
      "Generate direct UPI payment links. No payment gateway fees, no middlemen — money goes straight to your account.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Reminders",
    description:
      "Send renewal reminders via WhatsApp with one tap. No SMS costs, no third-party integrations needed.",
  },
  {
    icon: ScanLine,
    title: "10-Second Kiosk Check-ins",
    description:
      "Members punch in a 4-digit PIN on a full-screen kiosk. No hardware required — just a cheap Android tablet.",
  },
  {
    icon: Shield,
    title: "Role-Based Staff Access",
    description:
      "Owners see revenue. Receptionists handle check-ins. Trainers see their members. Everyone gets exactly what they need.",
  },
  {
    icon: Clock,
    title: "Auto Expiry Management",
    description:
      "Memberships are automatically marked expired. No more manual tracking or spreadsheet nightmares.",
  },
  {
    icon: Dumbbell,
    title: "Multi-Branch Support",
    description:
      "Manage multiple gym locations from a single dashboard. Each branch tracks its own members and revenue.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="size-5 text-primary" />
            <span className="text-lg font-bold">Vajra</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              data-testid="nav-login"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              data-testid="nav-signup"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-20 pb-16 text-center md:pt-28 md:pb-20">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Dumbbell className="size-3" />
          Built for independent gym owners
        </div>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl">
          Stop losing money on
          <span className="block text-primary"> expired memberships.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
          Vajra automates member tracking, UPI payments, and check-ins — so you
          can focus on running your gym, not chasing renewals.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            data-testid="hero-cta"
          >
            Start for Free
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-semibold text-foreground transition-colors hover:bg-muted"
            data-testid="hero-login"
          >
            I have an account
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 md:py-20">
        <h2 className="mb-4 text-center text-2xl font-bold md:text-3xl">
          Everything your gym needs. Nothing it doesn&apos;t.
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
          No bloated features, no monthly payment-gateway fees. Vajra is
          built for Indian gym owners who want a fast, simple tool that works on
          any device.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-2.5">
                <feature.icon className="size-5 text-primary" />
              </div>
              <h3 className="mb-2 text-base font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <div className="rounded-2xl bg-primary/5 border border-primary/20 px-6 py-12 text-center md:px-12">
          <h2 className="text-2xl font-bold md:text-3xl">
            Ready to run your gym smarter?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Set up takes under 5 minutes. No credit card required.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            data-testid="bottom-cta"
          >
            Create Your Gym Account
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Dumbbell className="size-4" />
            <span>Vajra — Gym Operations Platform</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Self-hosted. No vendor lock-in. Your data stays yours.
          </p>
        </div>
      </footer>
    </div>
  );
}
