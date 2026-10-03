import { Formato, Valor } from "@/lib/hedge-cambial/config";

const nf = (min: number, max: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: min, maximumFractionDigits: max });

const F2 = nf(2, 2);
const F4 = nf(4, 4);
const FS = nf(0, 2);

export function formatarValor(v: Valor | undefined, formato: Formato | undefined): string {
  if (v === null || v === undefined || v === "") return "";
  if (formato === "data" && typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    return `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}`;
  }
  if (typeof v !== "number") return String(v);
  switch (formato) {
    case "brl":
      return `R$ ${F2.format(v)}`;
    case "usd":
      return `US$ ${F2.format(v)}`;
    case "num4":
      return F4.format(v);
    case "pct":
      return `${F2.format(v)}%`;
    case "sacas":
    case "lotes":
      return FS.format(v);
    case "centlb":
    case "num2":
    default:
      return F2.format(v);
  }
}
