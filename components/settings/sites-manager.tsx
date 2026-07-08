"use client";

import * as React from "react";
import { toast } from "sonner";
import { PlusIcon, PencilIcon, Trash2Icon, RefreshCwIcon } from "lucide-react";

import type { SiteListItem } from "@/lib/types";
import { PLATFORMS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SiteFormDialog } from "@/components/settings/site-form-dialog";

function platformLabel(value: string) {
  return PLATFORMS.find((p) => p.value === value)?.label ?? value;
}

export function SitesManager({ initialSites }: { initialSites: SiteListItem[] }) {
  const [sites, setSites] = React.useState<SiteListItem[]>(initialSites);
  const [loading, setLoading] = React.useState(false);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SiteListItem | null>(null);

  const [deleteTarget, setDeleteTarget] = React.useState<SiteListItem | null>(
    null,
  );
  const [deleting, setDeleting] = React.useState(false);

  const [syncingId, setSyncingId] = React.useState<string | null>(null);

  const refetch = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sites", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Učitavanje nije uspelo.");
        return;
      }
      setSites(json.sites ?? []);
    } catch {
      toast.error("Greška u komunikaciji sa serverom.");
    } finally {
      setLoading(false);
    }
  }, []);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(site: SiteListItem) {
    setEditing(site);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/sites/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Brisanje nije uspelo.");
        return;
      }
      toast.success("Sajt obrisan.");
      setSites((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      toast.error("Greška u komunikaciji sa serverom.");
    } finally {
      setDeleting(false);
    }
  }

  /**
   * Backfill jednog sajta: petlja preko strana (ruta vraća kursor `nextPage`)
   * dok `done`, sa progres toast-om. Ograničeno na Woo sajtove sa kredencijalima.
   */
  async function runSync(site: SiteListItem) {
    if (syncingId) return;
    setSyncingId(site.id);
    const toastId = toast.loading(`Sinhronizacija „${site.name}“…`);
    let processed = 0;
    let page = 1;
    try {
      for (;;) {
        const res = await fetch(`/api/sync/woo/${site.id}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ page }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(json.error ?? "Sinhronizacija nije uspela.", {
            id: toastId,
          });
          return;
        }
        processed += json.processed ?? 0;
        if (json.done || !json.nextPage) {
          toast.success(`Gotovo: ${processed} porudžbina.`, { id: toastId });
          break;
        }
        toast.loading(
          `„${site.name}“: ${processed}/${json.total ?? "?"} porudžbina…`,
          { id: toastId },
        );
        page = json.nextPage;
      }
      await refetch();
    } catch {
      toast.error("Greška u komunikaciji sa serverom.", { id: toastId });
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Sajtovi</h1>
          <p className="text-sm text-muted-foreground">
            Prodajni kanali (WooCommerce, Thinkific) koji se sinhronizuju u
            Orderly.
          </p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon />
          Dodaj sajt
        </Button>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naziv</TableHead>
              <TableHead>Platforma</TableHead>
              <TableHead>URL</TableHead>
              <TableHead className="text-right">Margina</TableHead>
              <TableHead>Valuta</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-0 text-right">Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {loading
                    ? "Učitavanje…"
                    : "Nema sajtova još — dodaj prvi prodajni kanal."}
                </TableCell>
              </TableRow>
            ) : (
              sites.map((site) => (
                <TableRow key={site.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block size-3 shrink-0 rounded-full ring-1 ring-foreground/10"
                        style={{ backgroundColor: site.color_hex }}
                      />
                      <span className="font-medium">{site.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {platformLabel(site.platform)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {site.url ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {site.default_margin_percent}%
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {site.base_currency}
                  </TableCell>
                  <TableCell>
                    <Badge variant={site.active ? "default" : "outline"}>
                      {site.active ? "Aktivan" : "Neaktivan"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {site.platform === "woocommerce" &&
                        site.active &&
                        site.has_consumer_secret && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => runSync(site)}
                            disabled={syncingId !== null}
                            aria-label="Sinhronizuj porudžbine"
                          >
                            <RefreshCwIcon
                              className={
                                syncingId === site.id ? "animate-spin" : undefined
                              }
                            />
                          </Button>
                        )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(site)}
                        aria-label="Izmeni"
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteTarget(site)}
                        aria-label="Obriši"
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SiteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        site={editing}
        onSaved={refetch}
      />

      {/* Delete potvrda (obični Dialog — alert-dialog nije instaliran) */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Obriši sajt</DialogTitle>
            <DialogDescription>
              Obrisati &bdquo;{deleteTarget?.name}&ldquo;? Sve povezane
              porudžbine, proizvodi i pretplate se trajno brišu. Ovo se ne može
              opozvati.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Otkaži
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Brišem…" : "Obriši"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
