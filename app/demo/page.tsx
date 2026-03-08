"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  ChartColumn,
  HandHeart,
  Leaf,
  ScanLine,
  Settings2,
  Sparkles,
  UserCheck,
} from "lucide-react";

type DemoAction = {
  label: string;
  href: string;
};

type DemoStep = {
  id: string;
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  points: string[];
  outcome: string;
  actions: DemoAction[];
};

const demoSteps: DemoStep[] = [
  {
    id: "01",
    title: "Student Feedback Capture",
    subtitle: "Quick meal feedback in under 20 seconds",
    icon: ScanLine,
    points: [
      "Student enters the meal feedback flow and submits plate feedback.",
      "AI and structured feedback capture dish sentiment and waste pattern.",
      "Submission is mapped to ecosystem and active meal session.",
    ],
    outcome: "Live waste signals are generated for staff and admin dashboards.",
    actions: [{ label: "Open Student Demo", href: "/student/welcome?demo=1" }],
  },
  {
    id: "02",
    title: "Staff Operational Decisions",
    subtitle: "Classify leftovers and non-edible waste",
    icon: Settings2,
    points: [
      "Staff reviews trends and meal outcomes after each service window.",
      "Edible leftovers are raised as Helping Hand tokens.",
      "Non-edible waste is raised as Waste2Resource tokens.",
    ],
    outcome: "The right material reaches the right downstream partner.",
    actions: [
      { label: "Staff Dashboard", href: "/staff/dashboard" },
      { label: "Leftover Food", href: "/staff/leftover-food" },
      { label: "Waste Collection", href: "/staff/waste-collection" },
    ],
  },
  {
    id: "03",
    title: "Admin Oversight",
    subtitle: "Multi-ecosystem control and visibility",
    icon: ChartColumn,
    points: [
      "Admin monitors waste trends and participation performance.",
      "Staff verification and governance are managed per ecosystem.",
      "Settings keep operations consistent across meal cycles.",
    ],
    outcome: "Management gets measurable impact, control, and accountability.",
    actions: [{ label: "Admin Dashboard", href: "/admin/dashboard" }],
  },
  {
    id: "04",
    title: "Helping Hand NGO Claims",
    subtitle: "Edible leftovers routed to social impact",
    icon: HandHeart,
    points: [
      "NGO sees available food tokens with quantity and pickup deadline.",
      "Claimed token is removed from public available list.",
      "Claimed items move into NGO picked history.",
    ],
    outcome: "Edible food reaches people instead of becoming waste.",
    actions: [
      { label: "NGO Dashboard", href: "/ngo/dashboard" },
      { label: "NGO Login", href: "/ngo/login" },
    ],
  },
  {
    id: "05",
    title: "Waste2Resource Recycler Claims",
    subtitle: "Non-edible waste converted into resources",
    icon: Leaf,
    points: [
      "Recycler companies view available waste collection tokens.",
      "Claimed token exits available pool and enters claimed history.",
      "Waste is redirected to compost, manure, or bio-gas processing.",
    ],
    outcome: "PlateInsight supports a practical zero-landfill campus loop.",
    actions: [
      { label: "Recycler Dashboard", href: "/recycler/dashboard" },
      { label: "Recycler Login", href: "/recycler/login" },
    ],
  },
];

export default function DemoPage() {
  const [activeStep, setActiveStep] = useState(0);

  const current = demoSteps[activeStep];
  const progress = useMemo(
    () => ((activeStep + 1) / demoSteps.length) * 100,
    [activeStep]
  );
  const handleBackHome = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_45%),linear-gradient(to_bottom,_hsl(var(--background)),_hsl(var(--background)))] pb-16 text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <button
            type="button"
            onClick={handleBackHome}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Interactive Product Tour
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-10">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-3xl border bg-card/80 p-6 md:p-8"
        >
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h1 className="text-3xl font-black leading-tight md:text-5xl">
                Explore PlateInsight step by step.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
                Click any phase to preview exactly what each role does and what outcome it
                creates across your campus ecosystem.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/student/welcome?demo=1"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Camera className="h-4 w-4" />
                  Start Live Demo
                </Link>
                <Link
                  href="/staff/login"
                  className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-colors hover:bg-primary/5"
                >
                  <UserCheck className="h-4 w-4 text-primary" />
                  Staff Login
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border bg-background/85 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tour Progress
              </p>
              <p className="mt-1 text-sm">
                Step {activeStep + 1} of {demoSteps.length}
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  key={activeStep}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.35 }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Follow the full journey from student input to social donation and recycling.
              </p>
            </div>
          </div>
        </motion.section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl border bg-card p-4 md:p-5">
            <p className="mb-3 text-sm font-semibold">Flow Map</p>
            <div className="space-y-2">
              {demoSteps.map((step, index) => {
                const Icon = step.icon;
                const selected = index === activeStep;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveStep(index)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                      selected
                        ? "border-primary/50 bg-primary/10"
                        : "hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background">
                        <Icon className="h-4 w-4 text-primary" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-primary">STEP {step.id}</p>
                        <p className="text-sm font-semibold">{step.title}</p>
                        <p className="text-xs text-muted-foreground">{step.subtitle}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <motion.article
            key={current.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="rounded-2xl border bg-card p-5 md:p-6"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  Step {current.id}
                </div>
                <h2 className="text-xl font-bold md:text-2xl">{current.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{current.subtitle}</p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <current.icon className="h-5 w-5 text-primary" />
              </span>
            </div>

            <ul className="mt-4 space-y-2">
              {current.points.map((point) => (
                <li key={point} className="rounded-lg border bg-background/70 p-3 text-sm">
                  {point}
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Expected Output
              </p>
              <p className="mt-1 text-sm">{current.outcome}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {current.actions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  {action.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between border-t pt-4">
              <button
                type="button"
                onClick={() => setActiveStep((prev) => Math.max(prev - 1, 0))}
                disabled={activeStep === 0}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 hover:bg-primary/5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveStep((prev) => Math.min(prev + 1, demoSteps.length - 1))
                }
                disabled={activeStep === demoSteps.length - 1}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60 hover:bg-primary/90"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.article>
        </section>

        <section className="mt-8 rounded-2xl border bg-card p-5 md:p-6">
          <h3 className="text-lg font-bold">Quick Access</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Jump directly to role-specific entry points while presenting the demo.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/admin/login" className="rounded-lg border px-3 py-2 text-sm hover:bg-primary/5">
              Admin Login
            </Link>
            <Link href="/staff/login" className="rounded-lg border px-3 py-2 text-sm hover:bg-primary/5">
              Staff Login
            </Link>
            <Link href="/ngo/login" className="rounded-lg border px-3 py-2 text-sm hover:bg-primary/5">
              NGO Login
            </Link>
            <Link
              href="/recycler/login"
              className="rounded-lg border px-3 py-2 text-sm hover:bg-primary/5"
            >
              Recycler Login
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
