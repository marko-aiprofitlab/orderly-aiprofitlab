import { Bell, Plus, Search } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SWATCHES = [
  { name: "brand", label: "Accent", fg: "text-brand", bg: "bg-brand-bg", dot: "bg-brand" },
  { name: "success", label: "Success", fg: "text-success", bg: "bg-success-bg", dot: "bg-success" },
  { name: "warning", label: "Warning", fg: "text-warning", bg: "bg-warning-bg", dot: "bg-warning" },
  { name: "danger", label: "Danger", fg: "text-danger", bg: "bg-danger-bg", dot: "bg-danger" },
  { name: "neutral", label: "Neutral", fg: "text-neutral-accent", bg: "bg-neutral-accent-bg", dot: "bg-neutral-accent" },
];

const ORDERS = [
  { id: "#1042", site: "Shop RS", amount: "€129,00", status: "Plaćeno" },
  { id: "#1041", site: "Kurs Pro", amount: "€49,00", status: "U obradi" },
  { id: "#1040", site: "Shop EU", amount: "€312,50", status: "Plaćeno" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-4xl flex-col gap-12 px-6 py-16">
      <header className="flex flex-col gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
          Orderly · Dizajn sistem
        </p>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">
          Korak 0.3 — UI komponente (shadcn/ui)
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Galerija baznih komponenti u Orderly brendu (Base UI · base-nova).
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

      {/* ── Buttons ─────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold">Button</h2>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-6">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Disabled</Button>
          <Button>
            <Plus />
            Nova porudžbina
          </Button>
        </div>
      </section>

      {/* ── Card + Input + Badge ────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold">Card · Input · Badge</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Prihod danas</CardTitle>
              <CardDescription>Svi kanali · base valuta</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <span className="text-[28px] font-bold leading-none tracking-[-0.03em] text-brand">
                €4.812
              </span>
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pretraga</CardTitle>
              <CardDescription>Input + Switch + Select</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Pretraži porudžbine…" className="pl-8" />
              </div>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Izaberi sajt…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rs">Shop RS</SelectItem>
                  <SelectItem value="eu">Shop EU</SelectItem>
                  <SelectItem value="kurs">Kurs Pro</SelectItem>
                </SelectContent>
              </Select>
              <label className="flex items-center justify-between text-[13px]">
                Zvučne notifikacije
                <Switch defaultChecked />
              </label>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Tabs + Table ────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold">Tabs · Table</h2>
        <Tabs defaultValue="porudzbine" className="rounded-lg border bg-card p-6">
          <TabsList>
            <TabsTrigger value="porudzbine">Porudžbine</TabsTrigger>
            <TabsTrigger value="kupci">Kupci</TabsTrigger>
          </TabsList>
          <TabsContent value="porudzbine" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Porudžbina</TableHead>
                  <TableHead>Sajt</TableHead>
                  <TableHead>Iznos</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ORDERS.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.id}</TableCell>
                    <TableCell>{o.site}</TableCell>
                    <TableCell>{o.amount}</TableCell>
                    <TableCell>
                      <Badge variant={o.status === "Plaćeno" ? "secondary" : "outline"}>
                        {o.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="kupci" className="mt-4 text-[13px] text-muted-foreground">
            Lista kupaca dolazi u Fazi 2.
          </TabsContent>
        </Tabs>
      </section>

      {/* ── Dialog · Sheet · Tooltip · Avatar · Separator ───────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold">
          Dialog · Sheet · Tooltip · Avatar · Separator
        </h2>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-6">
          <Dialog>
            <DialogTrigger
              render={<Button variant="outline">Otvori Dialog</Button>}
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Detalji porudžbine</DialogTitle>
                <DialogDescription>
                  Primer modalnog dijaloga u Orderly stilu.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="ghost">Zatvori</Button>} />
                <DialogClose render={<Button>Sačuvaj</Button>} />
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet>
            <SheetTrigger render={<Button variant="outline">Otvori Sheet</Button>} />
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filteri</SheetTitle>
                <SheetDescription>Bočni panel (drawer) za detalje.</SheetDescription>
              </SheetHeader>
              <SheetFooter>
                <SheetClose render={<Button>Primeni</Button>} />
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label="Notifikacije">
                    <Bell />
                  </Button>
                }
              />
              <TooltipContent>Notifikacije</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-8" />

          <Avatar>
            <AvatarImage src="" alt="MM" />
            <AvatarFallback>MM</AvatarFallback>
          </Avatar>
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
          <Separator />
          <h3 className="text-2xl font-bold tracking-[-0.02em]">H1 naslov 24px / 700</h3>
          <p className="text-[13px] font-semibold">Naslov kartice 13px / 600</p>
          <p className="text-[13px] text-muted-foreground">
            Body tekst 13px / 400 — brza smeđa lisica skače preko lenjog psa.
          </p>
        </div>
      </section>
    </main>
  );
}
