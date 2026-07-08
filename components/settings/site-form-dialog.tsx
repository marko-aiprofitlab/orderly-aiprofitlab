"use client";

import * as React from "react";
import { toast } from "sonner";

import type { Platform, SiteFormInput, SiteListItem } from "@/lib/types";
import { PLATFORMS } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CURRENCIES = ["EUR", "USD", "RSD", "GBP", "CHF"];

/** Prazno početno stanje forme (za „Dodaj sajt"). */
function emptyState(): SiteFormInput {
  return {
    name: "",
    platform: "woocommerce",
    url: "",
    consumer_key: "",
    consumer_secret: "",
    api_key: "",
    webhook_secret: "",
    color_hex: "#1B6EF3",
    project_type: "",
    default_margin_percent: 70,
    base_currency: "EUR",
    active: true,
  };
}

/** Popuni formu iz postojećeg sajta — tajne se NIKAD ne prepopunjavaju. */
function stateFromSite(site: SiteListItem): SiteFormInput {
  return {
    name: site.name,
    platform: site.platform,
    url: site.url ?? "",
    consumer_key: site.consumer_key ?? "",
    consumer_secret: "",
    api_key: "",
    webhook_secret: "",
    color_hex: site.color_hex,
    project_type: site.project_type ?? "",
    default_margin_percent: site.default_margin_percent,
    base_currency: site.base_currency,
    active: site.active,
  };
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-foreground"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}

export function SiteFormDialog({
  open,
  onOpenChange,
  site,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: SiteListItem | null;
  onSaved: () => void;
}) {
  const isEdit = site !== null;
  const [form, setForm] = React.useState<SiteFormInput>(emptyState);
  const [saving, setSaving] = React.useState(false);

  // Reset forme na prelazu zatvoreno→otvoreno (React preporučeni „adjust state
  // during render" pattern umesto effect-a). Popuni iz sajta ili prazno.
  const [wasOpen, setWasOpen] = React.useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(site ? stateFromSite(site) : emptyState());
    }
  }

  function set<K extends keyof SiteFormInput>(key: K, value: SiteFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const secretHint = isEdit
    ? "Ostavi prazno da ne menjaš postojeću vrednost."
    : undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    if (!form.name.trim()) {
      toast.error("Naziv je obavezan.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        isEdit ? `/api/sites/${site!.id}` : "/api/sites",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Čuvanje nije uspelo.");
        return;
      }
      toast.success(isEdit ? "Sajt ažuriran." : "Sajt dodat.");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Greška u komunikaciji sa serverom.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Izmeni sajt" : "Dodaj sajt"}</DialogTitle>
            <DialogDescription>
              Prodajni kanal koji se sinhronizuje u Orderly.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Field label="Naziv" htmlFor="site-name">
              <Input
                id="site-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="npr. AI Profit Lab Shop"
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Platforma">
                <Select
                  value={form.platform}
                  onValueChange={(v) => set("platform", v as Platform)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Valuta">
                <Select
                  value={form.base_currency}
                  onValueChange={(v) => set("base_currency", v as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="URL" htmlFor="site-url">
              <Input
                id="site-url"
                type="url"
                value={form.url ?? ""}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://..."
              />
            </Field>

            {/* Kredencijali po platformi */}
            {form.platform === "woocommerce" && (
              <>
                <Field label="Consumer key" htmlFor="site-ck">
                  <Input
                    id="site-ck"
                    value={form.consumer_key ?? ""}
                    onChange={(e) => set("consumer_key", e.target.value)}
                    placeholder="ck_..."
                  />
                </Field>
                <Field
                  label="Consumer secret"
                  htmlFor="site-cs"
                  hint={secretHint}
                >
                  <Input
                    id="site-cs"
                    type="password"
                    autoComplete="new-password"
                    value={form.consumer_secret ?? ""}
                    onChange={(e) => set("consumer_secret", e.target.value)}
                    placeholder={
                      isEdit && site?.has_consumer_secret ? "••••••••" : "cs_..."
                    }
                  />
                </Field>
              </>
            )}

            {form.platform === "thinkific" && (
              <Field label="API ključ" htmlFor="site-api" hint={secretHint}>
                <Input
                  id="site-api"
                  type="password"
                  autoComplete="new-password"
                  value={form.api_key ?? ""}
                  onChange={(e) => set("api_key", e.target.value)}
                  placeholder={isEdit && site?.has_api_key ? "••••••••" : ""}
                />
              </Field>
            )}

            <Field
              label="Webhook secret"
              htmlFor="site-wh"
              hint={secretHint}
            >
              <Input
                id="site-wh"
                type="password"
                autoComplete="new-password"
                value={form.webhook_secret ?? ""}
                onChange={(e) => set("webhook_secret", e.target.value)}
                placeholder={
                  isEdit && site?.has_webhook_secret ? "••••••••" : "opciono"
                }
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Margina (%)" htmlFor="site-margin">
                <Input
                  id="site-margin"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.default_margin_percent ?? 0}
                  onChange={(e) =>
                    set("default_margin_percent", Number(e.target.value))
                  }
                />
              </Field>

              <Field label="Boja" htmlFor="site-color">
                <div className="flex items-center gap-2">
                  <input
                    id="site-color"
                    type="color"
                    value={form.color_hex ?? "#1B6EF3"}
                    onChange={(e) => set("color_hex", e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded-lg border border-input bg-transparent p-0.5"
                  />
                  <Input
                    value={form.color_hex ?? ""}
                    onChange={(e) => set("color_hex", e.target.value)}
                    className="font-mono"
                  />
                </div>
              </Field>
            </div>

            <Field label="Tip projekta" htmlFor="site-project">
              <Input
                id="site-project"
                value={form.project_type ?? ""}
                onChange={(e) => set("project_type", e.target.value)}
                placeholder="opciono"
              />
            </Field>

            <div className="flex items-center justify-between rounded-lg border border-input px-3 py-2">
              <div className="flex flex-col">
                <span className="text-xs font-medium">Aktivan</span>
                <span className="text-xs text-muted-foreground">
                  Neaktivni sajtovi se ne sinhronizuju.
                </span>
              </div>
              <Switch
                checked={form.active ?? true}
                onCheckedChange={(v) => set("active", v)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Otkaži
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Čuvam…" : isEdit ? "Sačuvaj" : "Dodaj"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
