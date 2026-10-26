import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { ComparativoTabela } from "@/components/credito/comparativo-tabela";
import { cn } from "@/lib/utils";
import { listarRegistrosCredito } from "@/lib/credito/dados";
import { colunasMensais, linhasComparativo } from "@/lib/credito/comparativo";

export default async function ComparativoMensalPage({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  const { ano } = await searchParams;
  const registros = await listarRegistrosCredito();
  const anos = Array.from(new Set(registros.map((r) => r.competencia.slice(0, 4)))).sort();
  const anoSel = ano && anos.includes(ano) ? ano : anos[anos.length - 1];
  // Analise usa o historico inteiro (mes anterior, 12 meses de EBITDA); o filtro so escolhe as colunas.
  const colunas = colunasMensais(registros).filter((c) => c.chave.startsWith(anoSel ?? ""));

  return (
    <>
      <Topbar title="Comparativo Mensal" subtitle="Análise de Crédito - DRE, balanço e indicadores mês a mês" />
      <div className="space-y-4 p-6">
        {anos.length > 1 && <SeletorAno anos={anos} atual={anoSel} />}
        {colunas.length === 0 ? (
          <p className="text-sm text-muted">Nenhum mês incluído ainda.</p>
        ) : (
          <>
            <p className="text-xs text-muted">
              Cada coluna é a DRE do mês isolado e o balanço do fim do mês, com os mesmos cálculos da tela de cada mês. A última coluna
              compara os dois meses mais recentes.
            </p>
            <ComparativoTabela colunas={colunas} linhas={linhasComparativo(colunas)} />
          </>
        )}
      </div>
    </>
  );
}

function SeletorAno({ anos, atual }: { anos: string[]; atual?: string }) {
  return (
    <div className="flex gap-2">
      {anos.map((a) => (
        <Link
          key={a}
          href={`?ano=${a}`}
          className={cn("rounded-md border px-3 py-1 text-sm", a === atual ? "border-primary text-primary" : "border-border text-muted hover:text-foreground")}
        >
          {a}
        </Link>
      ))}
    </div>
  );
}
