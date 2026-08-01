import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { prisma } from "@/lib/prisma";
import { statementRecordToInput } from "@/lib/financial/convert";
import { dreFieldLabels } from "@/lib/financial/schema";
import {
  ebit,
  ebitda,
  margemEbitda,
  margemLiquida,
  analiseVertical,
  analiseHorizontal,
  previousStatement,
  type StatementInput,
} from "@/lib/financial/indicators";
import { formatBRL, formatPercent, cn } from "@/lib/utils";

type LinhaTipo = "item" | "subtotal" | "final";

type LinhaDRE = { key: keyof StatementInput; sinal: "+" | "-" | "="; tipo: LinhaTipo };

const linhas: LinhaDRE[] = [
  { key: "receitaBruta", sinal: "=", tipo: "subtotal" },
  { key: "deducoes", sinal: "-", tipo: "item" },
  { key: "receitaLiquida", sinal: "=", tipo: "subtotal" },
  { key: "cmv", sinal: "-", tipo: "item" },
  { key: "lucroBruto", sinal: "=", tipo: "subtotal" },
  { key: "outrasReceitasOperacionais", sinal: "+", tipo: "item" },
  { key: "despesasGerais", sinal: "-", tipo: "item" },
  { key: "despesasComerciais", sinal: "-", tipo: "item" },
  { key: "despesasTributarias", sinal: "-", tipo: "item" },
  { key: "depreciacaoAmortizacao", sinal: "-", tipo: "item" },
  { key: "outrasDespesasOperacionais", sinal: "-", tipo: "item" },
  { key: "resultadoAtividade", sinal: "=", tipo: "subtotal" },
  { key: "receitasFinanceiras", sinal: "+", tipo: "item" },
  { key: "despesasFinanceiras", sinal: "-", tipo: "item" },
  { key: "variacaoCambial", sinal: "+", tipo: "item" },
  { key: "resultadoNaoOperacional", sinal: "+", tipo: "item" },
  { key: "impostoRenda", sinal: "-", tipo: "item" },
  { key: "participacoes", sinal: "-", tipo: "item" },
  { key: "lucroLiquido", sinal: "=", tipo: "final" },
];

export default async function DrePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const records = await prisma.financialStatement.findMany({ orderBy: { referenceDate: "asc" } });

  if (records.length === 0) {
    return (
      <>
        <Topbar title="Demonstração do Resultado (DRE)" />
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

  return (
    <>
      <Topbar title="Demonstração do Resultado (DRE)" subtitle={statement.periodLabel} />
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PeriodSelector
            periods={records.map((r) => ({ id: r.id, periodLabel: r.periodLabel }))}
            selectedId={selected.id}
          />
          <p className="text-xs text-muted">
            AV % sobre a Receita Líquida · AH %{" "}
            {anterior ? `comparado a ${anterior.periodLabel}` : "— sem período anterior lançado"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted">EBIT (Resultado da Atividade)</p>
              <p className="mt-1.5 text-2xl font-semibold [font-variant-numeric:tabular-nums]">{formatBRL(ebit(statement))}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted">EBITDA</p>
              <p className="mt-1.5 text-2xl font-semibold [font-variant-numeric:tabular-nums]">{formatBRL(ebitda(statement))}</p>
              <p className="mt-1 text-xs text-muted">Margem {formatPercent((margemEbitda(statement) ?? 0) * 100)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted">Margem Líquida</p>
              <p className="mt-1.5 text-2xl font-semibold [font-variant-numeric:tabular-nums]">
                {formatPercent((margemLiquida(statement) ?? 0) * 100)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm [font-variant-numeric:tabular-nums]">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-2 font-medium">Linha</th>
                  <th className="px-4 py-2 text-right font-medium">Valor</th>
                  <th className="px-4 py-2 text-right font-medium">AV %</th>
                  <th className="px-4 py-2 text-right font-medium">AH %</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => {
                  const valor = statement[linha.key] as number;
                  const av = analiseVertical(valor, statement.receitaLiquida);
                  const valorAnterior = anterior ? (anterior[linha.key] as number) : null;
                  const ah = valorAnterior != null ? analiseHorizontal(valor, valorAnterior) : null;
                  const isSubtotal = linha.tipo === "subtotal" || linha.tipo === "final";
                  return (
                    <tr
                      key={linha.key}
                      className={cn(
                        "border-b border-border/60",
                        isSubtotal && "border-t-2 border-t-border font-semibold"
                      )}
                    >
                      <td className={cn("px-4 py-2", !isSubtotal && "pl-6 text-muted")}>
                        {!isSubtotal && <span className="mr-1.5 text-muted">{linha.sinal}</span>}
                        {dreFieldLabels[linha.key]}
                      </td>
                      <td className="px-4 py-2 text-right">{formatBRL(valor)}</td>
                      <td className="px-4 py-2 text-right text-muted">
                        {av != null ? formatPercent(av * 100) : "—"}
                      </td>
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
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
