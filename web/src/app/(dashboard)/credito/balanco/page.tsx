import { DemonstrativoPagina } from "@/components/credito/demonstrativo-pagina";

export default async function BalancoPage({ searchParams }: { searchParams: Promise<{ ano?: string; visao?: string }> }) {
  const { ano, visao } = await searchParams;
  return <DemonstrativoPagina tipo="balanco" ano={ano} visao={visao} />;
}
