import { DemonstrativoPagina } from "@/components/credito/demonstrativo-pagina";

export default async function DrePage({ searchParams }: { searchParams: Promise<{ ano?: string; visao?: string }> }) {
  const { ano, visao } = await searchParams;
  return <DemonstrativoPagina tipo="dre" ano={ano} visao={visao} />;
}
