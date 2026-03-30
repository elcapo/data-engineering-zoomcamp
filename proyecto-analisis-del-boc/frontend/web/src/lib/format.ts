const numberFormat = new Intl.NumberFormat("es-ES", { useGrouping: "always" });

export function formatNumber(n: number | string | bigint): string {
  return numberFormat.format(Number(n));
}
