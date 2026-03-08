"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  ChartNoAxesCombined,
  HandHeart,
  Recycle,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Users,
} from "lucide-react";

const portals = [
  { name: "Staff Portal", href: "/staff/login", icon: Users },
  { name: "Admin Portal", href: "/admin/login", icon: ShieldCheck },
  { name: "NGO Portal", href: "/ngo/login", icon: HandHeart },
  { name: "Recycler Portal", href: "/recycler/login", icon: Recycle },
];

const pillars = [
  {
    title: "AI Waste Intelligence",
    text: "Track waste trends from real student meal submissions and session data.",
    tag: "Track",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Helping Hand",
    text: "Edible leftovers are published as tokens and claimed by NGO partners.",
    tag: "Donate",
    icon: HandHeart,
  },
  {
    title: "Waste2Resource",
    text: "Non-edible waste is picked by recyclers for compost and bio-gas output.",
    tag: "Recycle",
    icon: Recycle,
  },
];

const roleViews = [
  {
    id: "staff",
    label: "Staff",
    headline: "Raise tokens after meal sessions",
    kpi: "2 tokens pending claim",
    stream: [
      "Dinner session closed",
      "Leftover token FD-1042 created",
      "Waste token WT-1019 created",
    ],
    actions: [
      { label: "Open Staff Dashboard", href: "/staff/dashboard" },
      { label: "Raise Leftover Token", href: "/staff/leftover-food" },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    headline: "Monitor ecosystem-level impact",
    kpi: "Waste trend down 18%",
    stream: [
      "Staff verification requests: 3",
      "Most wasted dish: Lemon Rice",
      "Pickup completion this week: 92%",
    ],
    actions: [{ label: "Open Admin Dashboard", href: "/admin/dashboard" }],
  },
  {
    id: "ngo",
    label: "NGO",
    headline: "Claim edible leftovers in real time",
    kpi: "1 food token available",
    stream: [
      "FD-1042 | Rice + Dal | 24 plates",
      "Pickup window ends at 09:00 PM",
      "Claimed tokens today: 4",
    ],
    actions: [
      { label: "Open NGO Dashboard", href: "/ngo/dashboard" },
      { label: "NGO Login", href: "/ngo/login" },
    ],
  },
  {
    id: "recycler",
    label: "Recycler",
    headline: "Collect non-edible waste for processing",
    kpi: "1 waste token available",
    stream: [
      "WT-1019 | Mixed Food | 18kg",
      "Pickup from Kitchen Back Area",
      "Claimed waste today: 6 batches",
    ],
    actions: [
      { label: "Open Recycler Dashboard", href: "/recycler/dashboard" },
      { label: "Recycler Login", href: "/recycler/login" },
    ],
  },
] as const;

export default function Landing() {
  const [activeRole, setActiveRole] = useState<(typeof roleViews)[number]["id"]>("staff");

  const activeView =
    useMemo(() => roleViews.find((view) => view.id === activeRole) ?? roleViews[0], [activeRole]);

  return (
    <div className="min-h-screen bg-[radial-gradient(1100px_560px_at_0%_-10%,_hsl(var(--primary)/0.2),_transparent),radial-gradient(900px_460px_at_100%_0%,_hsl(var(--primary)/0.12),_transparent),hsl(var(--background))]">
      <main className="container mx-auto px-4 py-10 lg:py-14">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl border bg-card/85 p-6 md:p-10"
        >
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-primary/12 blur-3xl" />
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                PlateInsight Zero-Waste Platform
              </div>
              <h1 className="text-3xl font-black leading-tight md:text-5xl">
                From plate to purpose.
                <br />
                <span className="text-primary">One smart campus food loop.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
                AI tracking, NGO donation, and recycler collection in one continuous
                operational flow across all ecosystems.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/student/welcome?demo=1"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Start Student Demo
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center rounded-xl border border-primary/30 px-5 py-3 text-sm font-semibold hover:bg-primary/5"
                >
                  Explore Product Tour
                </Link>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <KpiChip label="Student Flow" value="Fast and Frictionless" />
                <KpiChip label="Token Lifecycle" value="Available -> Claimed" />
                <KpiChip label="Architecture" value="Multi-Ecosystem" />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="relative mx-auto w-full max-w-sm"
            >
              <div className="relative rounded-[2.8rem] border-[8px] border-zinc-800 bg-zinc-800 p-2 shadow-2xl">
                <div className="absolute left-1/2 top-0 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-zinc-800" />
                <div className="rounded-[2.2rem] border border-primary/15 bg-[linear-gradient(145deg,_hsl(var(--background)),_hsl(var(--primary)/0.08))] p-5">
                  <div className="rounded-2xl border bg-background/85 p-4">
                    <p className="text-xs font-semibold text-muted-foreground">Live Snapshot</p>
                    <p className="mt-1 text-sm font-semibold">Dinner Session Analytics</p>
                    <div className="mt-3 space-y-2">
                      <MiniStat label="Waste trend" value="-18%" />
                      <MiniStat label="Edible leftovers" value="24 plates" />
                      <MiniStat label="Recyclable waste" value="18kg" />
                    </div>
                    <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="text-xs text-primary">Token Event</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        FD-1042 claimed by Hope Foundation
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-8 top-8 rounded-xl border bg-card px-3 py-2 text-xs shadow-lg"
              >
                <p className="font-semibold">NGO Claim</p>
                <p className="text-muted-foreground">FD-1042</p>
              </motion.div>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-6 bottom-10 rounded-xl border bg-card px-3 py-2 text-xs shadow-lg"
              >
                <p className="font-semibold">Recycler Claim</p>
                <p className="text-muted-foreground">WT-1019</p>
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.35 }}
          className="mt-8 rounded-2xl border bg-card p-5 md:p-6"
        >
          <div className="flex flex-wrap gap-2">
            {portals.map((portal) => {
              const Icon = portal.icon;
              return (
                <Link
                  key={portal.href}
                  href={portal.href}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:border-primary/40 hover:bg-primary/5"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {portal.name}
                </Link>
              );
            })}
            <Link
              href="/ngo/signup"
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-primary/5"
            >
              NGO Sign Up
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/recycler/signup"
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-primary/5"
            >
              Recycler Sign Up
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.35 }}
          className="mt-8 rounded-2xl border bg-card p-5 md:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Interactive Dashboard View</h2>
              <p className="text-sm text-muted-foreground">
                Switch role to preview how the same system behaves for each stakeholder.
              </p>
            </div>
            <div className="inline-flex items-center rounded-full border bg-background p-1">
              {roleViews.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setActiveRole(role.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeRole === role.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <motion.div
            key={activeView.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"
          >
            <div className="rounded-xl border bg-background/75 p-4">
              <p className="text-xs text-muted-foreground">Current Focus</p>
              <p className="mt-1 text-lg font-bold">{activeView.headline}</p>
              <p className="mt-1 text-sm text-primary">{activeView.kpi}</p>
              <ul className="mt-4 space-y-2">
                {activeView.stream.map((line) => (
                  <li key={line} className="rounded-lg border bg-card p-2.5 text-sm">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border bg-background/75 p-4">
              <p className="text-xs text-muted-foreground">Quick Actions</p>
              <div className="mt-3 space-y-2">
                {activeView.actions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium hover:border-primary/40 hover:bg-primary/5"
                  >
                    {action.label}
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </Link>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs text-primary">Flow Insight</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Edible leftovers are routed to NGOs while non-edible waste is routed to
                  recyclers, both tracked by ecosystem.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.35 }}
          className="mt-8 grid gap-4 md:grid-cols-3"
        >
          {pillars.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-2xl border bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="rounded-full border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    {item.tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
              </article>
            );
          })}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.35 }}
          className="mt-8 rounded-2xl border bg-card p-5 md:p-6"
        >
          <h3 className="text-xl font-bold">How the loop works</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <Step title="1. Student Input" text="Meal feedback and waste signals are collected." />
            <Step title="2. Staff Decision" text="Leftover food and waste are classified." />
            <Step title="3. Token Raised" text="Food and waste tokens are created with deadlines." />
            <Step title="4. Partner Claims" text="NGO and recycler partners claim available tokens." />
            <Step title="5. Impact Tracking" text="Dashboard reflects claims and sustainability outcomes." />
          </div>
        </motion.section>
      </main>
    </div>
  );
}

function KpiChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/80 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1 text-xs font-semibold">
        <TrendingDown className="h-3 w-3 text-primary" />
        {value}
      </span>
    </div>
  );
}

function Step({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
