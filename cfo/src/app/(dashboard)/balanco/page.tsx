import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { prisma } from "@/lib/prisma";
import { statementRecordToInput } from "@/lib/financial/convert";
import { ativoFieldLabels, passivoFieldLabels } from "@/lib/financial/schema";
import {
  ativoCirculante,
  ativoNaoCirculante,
  ativoTotal,
  passivoCirculante,
  passivoNaoCirculante,
  patrimonioLiquido,
  passivoTotal,
  analiseVertical,
  analiseHorizontal,
  previousStatement,
  type StatementInput,
} from "@/lib/financial/indicators";
import { formatBRL, formatPercent, cn } from "@/lib/utils";

type Linha = { label: string; valor: number };

function BalanceTable({
  title,
  linhas,
  total,
  totalGrupo,
  anterior,
  linhasAnterior,
}: {
  title: string;
  linhas: Linha[];
  total: number;
  totalGrupo: number;
  anterior: StatementInput | null;
  linhasAnterior: Linha[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm [font-variant-numeric:tabular-nums]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-2 font-medium">Item</th>
              <th className="px-4 py-2 text-right font-medium">Valor</th>
              <th className="px-4 py-2 text-right font-medium">AV %</th>
              <th className="px-4 py-2 text-right font-medium">AH %</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, i) => {
              const av = analiseVertical(linha.valor, totalGrupo);
              const linhaAnterior = anterior ? linhasAnterior[i] : null;
              const ah = linhaAnterior ? analiseHorizontal(linha.valor, linhaAnterior.valor) : null;
              return (
                <tr key={linha.label} className="border-b border-border/60">
                  <td className="px-4 py-2 pl-6 text-muted">{linha.label}</td>
                  <td className="px-4 py-2 text-right">{formatBRL(linha.valor)}</td>
                  <td className="px-4 py-2 text-right text-muted">{av != null ? formatPercent(av * 100) : "—"}</td>
                  <td
                    className={cn(
                      "px-4 py-2 text-right",
                      ah == null ? "text-muted" : ah >= 0 ? "text-success" : "text-danger"
                    )}
                  >
                    {ah != null ? `${ah >= 0 ? "+" : ""}${formatPercent(ah * 100)}` : "—"}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-border font-semibold">
              <td className="px-4 py-2.5">{title}</td>
              <td className="px-4 py-2.5 text-right">{formatBRL(total)}</td>
              <td className="px-4 py-2.5 text-right text-muted">
                {totalGrupo ? formatPercent((total / totalGrupo) * 100) : "—"}
              </td>
              <td className="px-4 py-2.5" />
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default async function BalancoPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;

  const records = await prisma.financialStatement.findMany({ orderBy: { referenceDate: "asc" } });

  if (records.length === 0) {
    return (
      <>
        <Topbar title="Balanço Patrimonial" />
        <div className="p-6">
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted">
              Nenhum balancete lançado ainda.
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const statements = records.map(statementRecordToInput);
  const selected = (period && records.find((r) => r.id === period)) || records[records.length - 1];
  const selectedIndex = records.findIndex((r) => r.id === selected.id);
  const statement = statements[selectedIndex];
  const anterior = previousStatement(statement, statements);

  const totalAtivo = ativoTotal(statement);
  const totalPassivo = passivoTotal(statement);

  const ativoCircLinhas: Linha[] = [
    "caixaEquivalentes",
    "titulosValoresMobiliarios",
    "contasReceberClientes",
    "estoques",
    "adiantamentoFornecedores",
    "outrosAtivosOperacionaisCirc",
    "outrosAtivosNaoOperacionaisCirc",
  ].map((k) => ({ label: ativoFieldLabels[k], valor: statement[k as keyof StatementInput] as number }));

  const ativoNaoCircLinhas: Linha[] = [
    "contasReceberColigadas",
    "investimentos",
    "imobilizado",
    "intangivel",
    "outrosAtivosNaoCirculantes",
  ].map((k) => ({ label: ativoFieldLabels[k], valor: statement[k as keyof StatementInput] as number }));

  const passivoCircLinhas: Linha[] = [
    "fornecedores",
    "salariosEncargos",
    "impostosContribuicoes",
    "emprestimosCurtoPrazo",
    "irAPagar",
    "emprestimosColigadasCP",
    "dividendosAPagar",
    "adiantamentosClientes",
    "outrosPassivosCirc",
  ].map((k) => ({ label: passivoFieldLabels[k], valor: statement[k as keyof StatementInput] as number }));

  const passivoNaoCircLinhas: Linha[] = ["emprestimosLongoPrazo", "outrosPassivosNaoCirc"].map((k) => ({
    label: passivoFieldLabels[k],
    valor: statement[k as keyof StatementInput] as number,
  }));

  const plLinhas: Linha[] = ["capitalSocial", "reservas", "lucrosPrejuizosAcumulados", "outrosResultadosAbrangentes"].map(
    (k) => ({ label: passivoFieldLabels[k], valor: statement[k as keyof StatementInput] as number })
  );

  const mapAnterior = (keys: string[]) =>
    anterior ? keys.map((k) => ({ label: "", valor: anterior[k as keyof StatementInput] as number })) : [];

  return (
    <>
      <Topbar title="Balanço Patrimonial" subtitle={statement.periodLabel} />
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PeriodSelector
            periods={records.map((r) => ({ id: r.id, periodLabel: r.periodLabel }))}
            selectedId={selected.id}
          />
          <p className="text-xs text-muted">
            AH % {anterior ? `comparado a ${anterior.periodLabel}` : "— sem período anterior lançado"}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <BalanceTable
              title="Ativo Circulante"
              linhas={ativoCircLinhas}
              total={ativoCirculante(statement)}
              totalGrupo={totalAtivo}
              anterior={anterior}
              linhasAnterior={mapAnterior([
                "caixaEquivalentes",
                "titulosValoresMobiliarios",
                "contasReceberClientes",
                "estoques",
                "adiantamentoFornecedores",
                "outrosAtivosOperacionaisCirc",
                "outrosAtivosNaoOperacionaisCirc",
              ])}
            />
            <BalanceTable
              title="Ativo Não Circulante"
              linhas={ativoNaoCircLinhas}
              total={ativoNaoCirculante(statement)}
              totalGrupo={totalAtivo}
              anterior={anterior}
              linhasAnterior={mapAnterior(["contasReceberColigadas", "investimentos", "imobilizado", "intangivel", "outrosAtivosNaoCirculantes"])}
            />
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="flex items-center justify-between p-4">
                <p className="font-semibold">Total do Ativo</p>
                <p className="text-lg font-semibold [font-variant-numeric:tabular-nums]">{formatBRL(totalAtivo)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <BalanceTable
              title="Passivo Circulante"
              linhas={passivoCircLinhas}
              total={passivoCirculante(statement)}
              totalGrupo={totalPassivo}
              anterior={anterior}
              linhasAnterior={mapAnterior([
                "fornecedores",
                "salariosEncargos",
                "impostosContribuicoes",
                "emprestimosCurtoPrazo",
                "irAPagar",
                "emprestimosColigadasCP",
                "dividendosAPagar",
                "adiantamentosClientes",
                "outrosPassivosCirc",
              ])}
            />
            <BalanceTable
              title="Passivo Não Circulante"
              linhas={passivoNaoCircLinhas}
              total={passivoNaoCirculante(statement)}
              totalGrupo={totalPassivo}
              anterior={anterior}
              linhasAnterior={mapAnterior(["emprestimosLongoPrazo", "outrosPassivosNaoCirc"])}
            />
            <BalanceTable
              title="Patrimônio Líquido"
              linhas={plLinhas}
              total={patrimonioLiquido(statement)}
              totalGrupo={totalPassivo}
              anterior={anterior}
              linhasAnterior={mapAnterior(["capitalSocial", "reservas", "lucrosPrejuizosAcumulados", "outrosResultadosAbrangentes"])}
            />
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="flex items-center justify-between p-4">
                <p className="font-semibold">Total do Passivo</p>
                <p className="text-lg font-semibold [font-variant-numeric:tabular-nums]">{formatBRL(totalPassivo)}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
