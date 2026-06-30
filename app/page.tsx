const SWATCHES = [
  { name: "brand", label: "Accent", fg: "text-brand", bg: "bg-brand-bg", dot: "bg-brand" },
  { name: "success", label: "Success", fg: "text-success", bg: "bg-success-bg", dot: "bg-success" },
  { name: "warning", label: "Warning", fg: "text-warning", bg: "bg-warning-bg", dot: "bg-warning" },
  { name: "danger", label: "Danger", fg: "text-danger", bg: "bg-danger-bg", dot: "bg-danger" },
  { name: "neutral", label: "Neutral", fg: "text-neutral-accent", bg: "bg-neutral-accent-bg", dot: "bg-neutral-accent" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-4xl flex-col gap-12 px-6 py-16">
      <header className="flex flex-col gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
          Orderly · Dizajn sistem
        </p>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">
          Korak 0.2 — Tailwind v4 i brend tokeni
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Test stranica: Geist font, brend boje, senke i tranzicije.
        </p>
      </header>

      {/* ── Brend boje ──────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold">Brend boje</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {SWATCHES.map((s) => (
            <div
              key={s.name}
              className={`flex flex-col gap-2 rounded-lg ${s.bg} p-4`}
            >
              <span className={`h-8 w-8 rounded-full ${s.dot}`} />
              <span className={`text-[13px] font-semibold ${s.fg}`}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tipografija ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold">Tipografija (Geist)</h2>
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-6">
          <span className="text-[32px] font-bold leading-none tracking-[-0.03em] text-brand">
            €128.430
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
            KPI broj 32px / 700 · label 11px / 500
          </span>
          <hr className="border-border" />
          <h3 className="text-2xl font-bold tracking-[-0.02em]">H1 naslov 24px / 700</h3>
          <p className="text-[13px] font-semibold">Naslov kartice 13px / 600</p>
          <p className="text-[13px] text-muted-foreground">
            Body tekst 13px / 400 — brza smeđa lisica skače preko lenjog psa.
          </p>
        </div>
      </section>

      {/* ── Senke i tranzicije ──────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold">Kartica (senka + hover lift) i dugme</h2>
        <div className="flex flex-wrap items-start gap-6">
          <div
            className="rounded-xl border bg-card p-6 shadow-[var(--shadow-sm)] transition-[transform,box-shadow] duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-px hover:shadow-[var(--shadow-md)]"
            style={{ width: 240 }}
          >
            <p className="text-[13px] font-semibold">Hover me</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              shadow-sm → shadow-md + translateY(-1px)
            </p>
          </div>

          <button
            type="button"
            className="rounded-lg bg-brand px-5 py-2.5 text-[13px] font-semibold text-white shadow-[var(--shadow-sm)] transition-transform duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-brand-hover active:scale-[0.98]"
          >
            Klikni me
          </button>
        </div>
      </section>
    </main>
  );
}
