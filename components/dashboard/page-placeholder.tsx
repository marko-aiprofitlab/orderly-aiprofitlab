/**
 * Privremeni placeholder za ekrane čiji sadržaj dolazi u Fazi 1/2.
 * Drži navigacioni skelet potpuno prohodnim (bez 404) dok se stranice ne
 * napune. Zameniti pravim sadržajem u odgovarajućem koraku.
 */
export function PagePlaceholder({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">
        {description ?? "Uskoro — ova stranica se popunjava u sledećoj fazi."}
      </p>
    </div>
  );
}
