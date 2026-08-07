import { Fragment } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiPeriodPicker } from "@/components/credito/multi-period-picker";
import { prisma } from "@/lib/prisma";
import { statementRecordToInput } from "@/lib/financial/convert";
import { ativoFieldLabels, passivoFieldLabels, dreFieldLabels } from "@/lib/financial/schema";
import {
  ativoCirculante,
  ativoNaoCirculante,
  ativoTotal,
  passivoCirculante,
  passivoNaoCirculante,
  patrimonioLiquido,
  passivoTotal,
  ebit,
  ebitda,
  margemEbitda,
  margemLiquida,
  capitalDeGiro,
  ncg,
  totalInvestimentosOperacionais,
  totalFinanciamentosOperacionais,
  variacaoNcg,
  saldoTesouraria,
  cicloFinanceiro,
  pmrDias,
  pmeDias,
  pmpDias,
  liquidezCorrente,
  liquidezSeca,
  liquidezGeral,
  participacaoCapitalTerceiros,
  composicaoExigibilidades,
  participacaoDividaFinanceira,
  plSobreAtivo,
  alavancagemFinanceira,
  giroDoAtivo,
  lucratividadeNasVendas,
  rentabilidadeDoAtivo,
  mediaMensalReceita,
  analiseVertical,
  analiseHorizontal,
  type StatementInput,
} from "@/lib/financial/indicators";
import { fluxoCaixaEbitda } from "@/lib/financial/cashflow";
import { formatBRL, formatPercent, formatDays, cn } from "@/lib/utils";

const ativoCircKeys = [
  "caixaEquivalentes",
  "titulosValoresMobiliarios",
  "contasReceberClientes",
  "estoques",
  "adiantamentoFornecedores",
  "outrosAtivosOperacionaisCirc",
  "outrosAtivosNaoOperacionaisCirc",
] as const;

const ativoNaoCircKeys = [
  "contasReceberColigadas",
  "investimentos",
  "imobilizado",
  "intangivel",
  "outrosAtivosNaoCirculantes",
] as const;

const passivoCircKeys = [
  "fornecedores",
  "salariosEncargos",
  "impostosContribuicoes",
  "emprestimosCurtoPrazo",
  "irAPagar",
  "emprestimosColigadasCP",
  "dividendosAPagar",
  "adiantamentosClientes",
  "outrosPassivosCirc",
] as const;

const passivoNaoCircKeys = ["emprestimosLongoPrazo", "outrosPassivosNaoCirc"] as const;

// Formata um indice/multiplicador simples (ex: Liquidez Corrente, Giro do
// Ativo) com 2 casas decimais e sufixo "x", em vez de moeda ou percentual.
function formatIndex(v: number) {
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
}

const plKeys = ["capitalSocial", "reservas", "lucrosPrejuizosAcumulados", "outrosResultadosAbrangentes"] as const;

type LinhaTipo = "item" | "subtotal" | "final";
type LinhaDRE = { key: keyof StatementInput; sinal: "+" | "-" | "="; tipo: LinhaTipo };

const dreLinhas: LinhaDRE[] = [
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

type Periodo = { statement: StatementInput; label: string };

function PeriodHeader({ periodos }: { periodos: Periodo[] }) {
  return (
    <tr className="border-b border-border text-left text-xs text-muted">
      <th className="px-4 py-2 font-medium">Item</th>
      {periodos.map((p, i) => (
        <th key={p.label} className="px-4 py-2 text-right font-medium" colSpan={i === 0 ? 2 : 3}>
          {p.label}
        </th>
      ))}
    </tr>
  );
}

function PeriodSubHeader({ periodos }: { periodos: Periodo[] }) {
  return (
    <tr className="border-b border-border text-right text-[11px] text-muted">
      <th className="px-4 py-1" />
      {periodos.map((p, i) => (
        <Fragment key={p.label}>
          <th className="px-4 py-1 font-normal">Valor</th>
          <th className="px-4 py-1 font-normal">AV %</th>
          {i > 0 && <th className="px-4 py-1 font-normal">AH %</th>}
        </Fragment>
      ))}
    </tr>
  );
}

function ValorCells({
  periodos,
  valores,
  totais,
}: {
  periodos: Periodo[];
  valores: number[];
  totais: number[];
}) {
  return (
    <>
      {periodos.map((p, i) => {
        const av = analiseVertical(valores[i], totais[i]);
        const ah = i > 0 ? analiseHorizontal(valores[i], valores[i - 1]) : null;
        return (
          <Fragment key={p.label}>
            <td className={cn("px-4 py-2 text-right", valores[i] < 0 && "text-danger")}>
              {formatBRL(valores[i])}
            </td>
            <td className="px-4 py-2 text-right text-muted">
              {av != null ? formatPercent(av * 100) : "—"}
            </td>
            {i > 0 && (
              <td
                className={cn(
                  "px-4 py-2 text-right",
                  ah == null ? "text-muted" : ah >= 0 ? "text-success" : "text-danger"
                )}
              >
                {ah != null ? `${ah >= 0 ? "+" : ""}${formatPercent(ah * 100)}` : "—"}
              </td>
            )}
          </Fragment>
        );
      })}
    </>
  );
}

function BalancoLado({
  title,
  periodos,
  grupos,
  totalFn,
  fieldLabels,
  totalGeralLabel,
}: {
  title: string;
  periodos: Periodo[];
  grupos: { titulo: string; keys: readonly string[]; totalFn: (s: StatementInput) => number }[];
  totalFn: (s: StatementInput) => number;
  fieldLabels: Record<string, string>;
  totalGeralLabel: string;
}) {
  const totais = periodos.map((p) => totalFn(p.statement));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full whitespace-nowrap text-sm [font-variant-numeric:tabular-nums]">
          <thead>
            <PeriodHeader periodos={periodos} />
            <PeriodSubHeader periodos={periodos} />
          </thead>
          <tbody>
            {grupos.map((grupo) => {
              const subtotais = periodos.map((p) => grupo.totalFn(p.statement));
              return (
                <Fragment key={grupo.titulo}>
                  {grupo.keys.map((key) => {
                    const valores = periodos.map((p) => p.statement[key as keyof StatementInput] as number);
                    return (
                      <tr key={key} className="border-b border-border/60">
                        <td className="px-4 py-2 pl-6 text-muted">{fieldLabels[key]}</td>
                        <ValorCells periodos={periodos} valores={valores} totais={totais} />
                      </tr>
                    );
                  })}
                  <tr className="border-b border-border font-medium">
                    <td className="px-4 py-2">{grupo.titulo}</td>
                    <ValorCells periodos={periodos} valores={subtotais} totais={totais} />
                  </tr>
                </Fragment>
              );
            })}
            <tr className="border-t-2 border-border font-semibold">
              <td className="px-4 py-2.5">{totalGeralLabel}</td>
              <ValorCells periodos={periodos} valores={totais} totais={totais} />
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function IndiceRow({
  label,
  periodos,
  valorFn,
  formatter,
}: {
  label: string;
  periodos: Periodo[];
  valorFn: (s: StatementInput) => number | null;
  formatter: (v: number) => string;
}) {
  return (
    <tr className="border-b border-border/60">
      <td className="px-4 py-2 text-muted">{label}</td>
      {periodos.map((p) => {
        const v = valorFn(p.statement);
        return (
          <td
            key={p.label}
            className={cn(
              "px-4 py-2 text-right [font-variant-numeric:tabular-nums]",
              v != null && v < 0 && "text-danger"
            )}
          >
            {v != null ? formatter(v) : "—"}
          </td>
        );
      })}
    </tr>
  );
}

// Linha de variacao (AH) entre periodos consecutivos - o Periodo I fica sem
// valor (nao ha periodo anterior pra comparar), igual ao layout da planilha.
function IndiceAHRow({
  label,
  periodos,
  valorFn,
}: {
  label: string;
  periodos: Periodo[];
  valorFn: (s: StatementInput) => number | null;
}) {
  return (
    <tr className="border-b border-border/60">
      <td className="px-4 py-2 text-muted">{label}</td>
      {periodos.map((p, i) => {
        if (i === 0) {
          return (
            <td key={p.label} className="px-4 py-2 text-right text-muted">
              —
            </td>
          );
        }
        const atual = valorFn(p.statement);
        const anterior = valorFn(periodos[i - 1].statement);
        const ah = atual != null && anterior != null ? analiseHorizontal(atual, anterior) : null;
        return (
          <td
            key={p.label}
            className={cn(
              "px-4 py-2 text-right [font-variant-numeric:tabular-nums]",
              ah == null ? "text-muted" : ah >= 0 ? "text-success" : "text-danger"
            )}
          >
            {ah != null ? `${ah >= 0 ? "+" : ""}${formatPercent(ah * 100)}` : "—"}
          </td>
        );
      })}
    </tr>
  );
}

export default async function CreditoAnalisePage({
  searchParams,
}: {
  searchParams: Promise<{ periods?: string }>;
}) {
  const { periods: periodsParam } = await searchParams;

  const records = await prisma.financialStatement.findMany({ orderBy: { referenceDate: "asc" } });

  if (records.length === 0) {
    return (
      <>
        <Topbar title="Análise de Crédito" />
        <div className="p-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <p className="text-sm text-muted">
                Nenhum balancete lançado ainda. Cadastre os valores do balanço/balancete para ver a análise.
              </p>
              <Link
                href="/credito/importar"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Novo Balancete
              </Link>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const statements = records.map(statementRecordToInput);
  const allPeriods: { id: string; periodLabel: string }[] = records.map((r) => ({
    id: r.id,
    periodLabel: r.periodLabel,
  }));

  const requestedIds = periodsParam ? periodsParam.split(",").filter(Boolean) : [];
  const validIds = requestedIds.filter((id) => records.some((r) => r.id === id));
  const selectedIds = validIds.length > 0 ? validIds : records.slice(-3).map((r) => r.id);

  // Sempre em ordem cronologica (Periodo I = mais antigo, III = mais recente),
  // independente da ordem em que foram clicados no seletor.
  const periodos: Periodo[] = selectedIds
    .map((id) => {
      const idx = records.findIndex((r) => r.id === id);
      return { statement: statements[idx], label: records[idx].periodLabel, date: records[idx].referenceDate };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(({ statement, label }) => ({ statement, label }));

  return (
    <>
      <Topbar title="Análise de Crédito" subtitle="Balanço, DRE, índices e fluxo de caixa por período" />
      <div className="space-y-8 p-6">
        <MultiPeriodPicker periods={allPeriods} selectedIds={selectedIds} />

        {periodos.map((p, i) => {
          const totalAtivo = ativoTotal(p.statement);
          const totalPassivo = passivoTotal(p.statement);
          const diferenca = totalAtivo - totalPassivo;
          if (Math.abs(diferenca) <= 1) return null;
          return (
            <Card key={p.label} className="border-danger/40 bg-danger/5">
              <CardContent className="p-4 text-sm text-danger">
                <span className="font-semibold">{p.label} não fecha:</span> Total do Ativo (
                {formatBRL(totalAtivo)}) difere do Total do Passivo ({formatBRL(totalPassivo)}) em{" "}
                {formatBRL(Math.abs(diferenca))}.
              </CardContent>
            </Card>
          );
        })}

        {/* 1 - Balanco Patrimonial */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            1 — Balanço Patrimonial
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <BalancoLado
              title="Ativo"
              periodos={periodos}
              fieldLabels={ativoFieldLabels}
              totalFn={ativoTotal}
              totalGeralLabel="Total do Ativo"
              grupos={[
                { titulo: "Ativo Circulante", keys: ativoCircKeys, totalFn: ativoCirculante },
                { titulo: "Ativo Não Circulante", keys: ativoNaoCircKeys, totalFn: ativoNaoCirculante },
              ]}
            />
            <BalancoLado
              title="Passivo"
              periodos={periodos}
              fieldLabels={passivoFieldLabels}
              totalFn={passivoTotal}
              totalGeralLabel="Total do Passivo"
              grupos={[
                { titulo: "Passivo Circulante", keys: passivoCircKeys, totalFn: passivoCirculante },
                { titulo: "Passivo Não Circulante", keys: passivoNaoCircKeys, totalFn: passivoNaoCirculante },
                { titulo: "Patrimônio Líquido", keys: plKeys, totalFn: patrimonioLiquido },
              ]}
            />
          </div>
        </section>

        {/* 2 - DRE */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            2 — Demonstração de Resultado (DRE)
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {periodos.map((p) => (
              <Card key={p.label}>
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted">{p.label}</p>
                  <p className="mt-1.5 text-xl font-semibold [font-variant-numeric:tabular-nums]">
                    {formatBRL(ebitda(p.statement))}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    EBITDA · margem {formatPercent((margemEbitda(p.statement) ?? 0) * 100)} · EBIT{" "}
                    {formatBRL(ebit(p.statement))} · margem líq.{" "}
                    {formatPercent((margemLiquida(p.statement) ?? 0) * 100)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full whitespace-nowrap text-sm [font-variant-numeric:tabular-nums]">
                <thead>
                  <PeriodHeader periodos={periodos} />
                  <PeriodSubHeader periodos={periodos} />
                </thead>
                <tbody>
                  {dreLinhas.map((linha) => {
                    const valores = periodos.map((p) => p.statement[linha.key] as number);
                    const totais = periodos.map((p) => p.statement.receitaLiquida);
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
                        <ValorCells periodos={periodos} valores={valores} totais={totais} />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        {/* 3 - Indices */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            3 — Índices Econômico-Financeiros
          </h2>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full whitespace-nowrap text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="px-4 py-2 font-medium">Índice</th>
                    {periodos.map((p) => (
                      <th key={p.label} className="px-4 py-2 text-right font-medium">
                        {p.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={1 + periodos.length} className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                      Modelo Fleuriet
                    </td>
                  </tr>
                  <IndiceRow label="CCL (Capital Circulante Líquido)" periodos={periodos} valorFn={capitalDeGiro} formatter={formatBRL} />
                  <IndiceRow label="NCG (Necessidade de Capital de Giro)" periodos={periodos} valorFn={ncg} formatter={formatBRL} />
                  <IndiceRow label="Saldo de Tesouraria" periodos={periodos} valorFn={saldoTesouraria} formatter={formatBRL} />
                  <tr>
                    <td colSpan={1 + periodos.length} className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                      Ciclo Financeiro
                    </td>
                  </tr>
                  <IndiceRow label="PMR — Prazo Médio de Recebimento" periodos={periodos} valorFn={pmrDias} formatter={formatDays} />
                  <IndiceRow label="PME — Prazo Médio de Estocagem" periodos={periodos} valorFn={pmeDias} formatter={formatDays} />
                  <IndiceRow label="PMP — Prazo Médio de Pagamento" periodos={periodos} valorFn={pmpDias} formatter={formatDays} />
                  <IndiceRow label="CF — Ciclo Financeiro (PMR + PME − PMP)" periodos={periodos} valorFn={cicloFinanceiro} formatter={formatDays} />
                  <tr>
                    <td colSpan={1 + periodos.length} className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                      Liquidez
                    </td>
                  </tr>
                  <IndiceRow label="Liquidez Corrente (AC/PC)" periodos={periodos} valorFn={liquidezCorrente} formatter={formatIndex} />
                  <IndiceRow label="Liquidez Seca ((AC−E)/PC)" periodos={periodos} valorFn={liquidezSeca} formatter={formatIndex} />
                  <IndiceRow label="Liquidez Geral ((AC+RLP)/(PC+PNC))" periodos={periodos} valorFn={liquidezGeral} formatter={formatIndex} />
                  <tr>
                    <td colSpan={1 + periodos.length} className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                      Estrutura
                    </td>
                  </tr>
                  <IndiceRow
                    label="Participação de Capital de Terceiros ((PC+PNC)/PL)"
                    periodos={periodos}
                    valorFn={participacaoCapitalTerceiros}
                    formatter={formatIndex}
                  />
                  <IndiceRow
                    label="Composição das Exigibilidades (PC/(PC+PNC))"
                    periodos={periodos}
                    valorFn={composicaoExigibilidades}
                    formatter={(v) => formatPercent(v * 100)}
                  />
                  <IndiceRow
                    label="Participação Dívida Financeira (DF/ET)"
                    periodos={periodos}
                    valorFn={participacaoDividaFinanceira}
                    formatter={(v) => formatPercent(v * 100)}
                  />
                  <IndiceAHRow
                    label="Variação da Dívida Bancária"
                    periodos={periodos}
                    valorFn={participacaoDividaFinanceira}
                  />
                  <IndiceRow label="PL / Total do Ativo" periodos={periodos} valorFn={plSobreAtivo} formatter={(v) => formatPercent(v * 100)} />
                  <IndiceRow
                    label="Alavancagem Financeira"
                    periodos={periodos}
                    valorFn={alavancagemFinanceira}
                    formatter={formatIndex}
                  />
                  <tr>
                    <td colSpan={1 + periodos.length} className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                      Rentabilidade
                    </td>
                  </tr>
                  <IndiceRow label="Giro do Ativo (Rec. Líq./AT)" periodos={periodos} valorFn={giroDoAtivo} formatter={formatIndex} />
                  <IndiceRow
                    label="Lucratividade nas Vendas (LL/Rec.)"
                    periodos={periodos}
                    valorFn={lucratividadeNasVendas}
                    formatter={(v) => formatPercent(v * 100)}
                  />
                  <IndiceRow
                    label="Rentabilidade do Ativo (LL/AT)"
                    periodos={periodos}
                    valorFn={rentabilidadeDoAtivo}
                    formatter={(v) => formatPercent(v * 100)}
                  />
                  <IndiceAHRow
                    label="Evolução das Vendas Líquidas"
                    periodos={periodos}
                    valorFn={(s) => s.receitaLiquida}
                  />
                  <IndiceRow label="Média Mensal (Receita Líquida)" periodos={periodos} valorFn={mediaMensalReceita} formatter={formatBRL} />
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Necessidade de Capital de Giro — detalhe</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full whitespace-nowrap text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="px-4 py-2 font-medium">Item</th>
                    {periodos.map((p) => (
                      <th key={p.label} className="px-4 py-2 text-right font-medium">
                        {p.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <IndiceRow
                    label="Contas a Receber de Clientes"
                    periodos={periodos}
                    valorFn={(s) => s.contasReceberClientes}
                    formatter={formatBRL}
                  />
                  <IndiceRow label="Estoques" periodos={periodos} valorFn={(s) => s.estoques} formatter={formatBRL} />
                  <IndiceRow
                    label="Outros Ativos Operacionais"
                    periodos={periodos}
                    valorFn={(s) => s.outrosAtivosOperacionaisCirc}
                    formatter={formatBRL}
                  />
                  <IndiceRow
                    label="Total de Investimentos Operacionais"
                    periodos={periodos}
                    valorFn={totalInvestimentosOperacionais}
                    formatter={formatBRL}
                  />
                  <tr>
                    <td colSpan={1 + periodos.length} className="h-2" />
                  </tr>
                  <IndiceRow label="Fornecedores" periodos={periodos} valorFn={(s) => s.fornecedores} formatter={formatBRL} />
                  <IndiceRow
                    label="Salários e Benefícios / Impostos e Contribuições"
                    periodos={periodos}
                    valorFn={(s) => s.salariosEncargos + s.impostosContribuicoes}
                    formatter={formatBRL}
                  />
                  <IndiceRow
                    label="Outros Passivos Operacionais"
                    periodos={periodos}
                    valorFn={(s) => s.outrosPassivosCirc}
                    formatter={formatBRL}
                  />
                  <IndiceRow
                    label="Total de Financiamentos Recebidos"
                    periodos={periodos}
                    valorFn={totalFinanciamentosOperacionais}
                    formatter={formatBRL}
                  />
                  <tr>
                    <td colSpan={1 + periodos.length} className="h-2" />
                  </tr>
                  <IndiceRow label="Necessidade de Capital de Giro" periodos={periodos} valorFn={ncg} formatter={formatBRL} />
                  <tr className="border-b border-border/60">
                    <td className="px-4 py-2 text-muted">Variação do N.C.G</td>
                    {periodos.map((p, i) => (
                      <td key={p.label} className="px-4 py-2 text-right [font-variant-numeric:tabular-nums]">
                        {i === 0 ? <span className="text-muted">—</span> : formatBRL(variacaoNcg(p.statement, periodos[i - 1].statement))}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        {/* 4 - Fluxo de Caixa via EBITDA */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            4 — Fluxo de Caixa (via EBITDA)
          </h2>
          {periodos.length < 2 ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted">
                Selecione pelo menos 2 períodos para calcular o fluxo de caixa (ele compara a variação entre
                períodos consecutivos).
              </CardContent>
            </Card>
          ) : (
            <div className={cn("grid grid-cols-1 gap-4", periodos.length === 3 && "lg:grid-cols-2")}>
              {periodos.slice(1).map((atual, i) => {
                const anterior = periodos[i];
                const dfc = fluxoCaixaEbitda(atual.statement, anterior.statement);
                const linhas: { label: string; valor: number; bold?: boolean }[] = [
                  { label: "EBITDA", valor: dfc.ebitda, bold: true },
                  { label: "(-) Imposto de Renda", valor: -dfc.impostoRenda },
                  { label: "Geração Interna de Caixa", valor: dfc.geracaoInternaCaixa, bold: true },
                  { label: "(+/-) Resultado Financeiro", valor: dfc.resultadoFinanceiro },
                  { label: "(+/-) Resultado Não Operacional e Participações", valor: dfc.outrosItensResultado },
                  ...dfc.variacaoCapitalGiro,
                  { label: "Variação de Capital de Giro", valor: dfc.totalVariacaoCapitalGiro, bold: true },
                  { label: "Fluxo de Caixa Operacional", valor: dfc.fluxoCaixaOperacional, bold: true },
                  ...dfc.fluxoCaixaInvestimento,
                  { label: "Total Investimento", valor: dfc.totalFluxoCaixaInvestimento, bold: true },
                  ...dfc.fluxoCaixaFinanciamento,
                  { label: "Total Financiamento", valor: dfc.totalFluxoCaixaFinanciamento, bold: true },
                  { label: "Fluxo de Caixa Gerado", valor: dfc.fluxoCaixaGerado, bold: true },
                  { label: "Caixa Inicial", valor: dfc.caixaInicial },
                  { label: "Caixa Final (calculado)", valor: dfc.caixaFinalCalculado, bold: true },
                  { label: "Caixa Final (balancete)", valor: dfc.caixaFinal },
                ];
                return (
                  <Card key={atual.label}>
                    <CardHeader>
                      <CardTitle>
                        {anterior.label} → {atual.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto p-0">
                      <table className="w-full text-sm">
                        <tbody>
                          {linhas.map((l, idx) => (
                            <tr
                              key={`${l.label}-${idx}`}
                              className={cn("border-b border-border/60", l.bold && "border-t-2 border-t-border font-semibold")}
                            >
                              <td className={cn("px-4 py-2", !l.bold && "pl-6 text-muted")}>{l.label}</td>
                              <td
                                className={cn(
                                  "px-4 py-2 text-right [font-variant-numeric:tabular-nums]",
                                  !l.bold && (l.valor >= 0 ? "text-success" : "text-danger")
                                )}
                              >
                                {formatBRL(l.valor)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {Math.abs(dfc.caixaFinalCalculado - dfc.caixaFinal) > 1 && (
                        <p className="px-4 py-3 text-xs text-warning">
                          Caixa final calculado diverge do balancete em{" "}
                          {formatBRL(dfc.caixaFinalCalculado - dfc.caixaFinal)}.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
