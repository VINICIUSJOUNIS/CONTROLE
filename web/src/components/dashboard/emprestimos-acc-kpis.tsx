import { KpiCard } from "@/components/dashboard/kpi-card";
import { getAccOperations, getKpis, getLoans, ModalidadeFilter as ModalidadeFilterValue } from "@/lib/data";
import { formatCompactCurrency, formatDate, formatPercent } from "@/lib/format";
import { buildAmortizationSchedule } from "@/lib/amortization";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CalendarClock,
  PiggyBank,
  Percent,
  PieChart,
} from "lucide-react";

// Proxima parcela ainda nao paga de um emprestimo (data e valor reais dela, nao a
// data final do contrato nem o valor total contratado). Pode ser uma parcela em
// atraso (vencimento no passado) - nesse caso e a mais urgente, nao a mais futura.
function proximaParcela(
  loan: Parameters<typeof buildAmortizationSchedule>[0] & {
    parcelas: { numero: number; vencimento: string | null; paidAt: string | null }[];
  }
) {
  const overrides: Record<number, string> = {};
  const pagas = new Set<number>();
  loan.parcelas.forEach((p) => {
    if (p.vencimento) overrides[p.numero] = p.vencimento;
    if (p.paidAt) pagas.add(p.numero);
  });
  const schedule = buildAmortizationSchedule(loan, overrides);
  return schedule.find((row) => !pagas.has(row.numero)) ?? null;
}

// Mesmos 12 KPIs do topo do Dashboard Executivo ("/") - centralizados aqui para
// nao duplicar a busca/calculo dos dados em outra tela que precise mostra-los.
export async function EmprestimosAccKpis({
  range,
  modalidade = "TODOS",
  compact = false,
}: {
  range?: { from?: string; to?: string };
  modalidade?: ModalidadeFilterValue;
  // Esconde Operacoes em atraso, Exposicao cambial, Proximo vencimento e
  // Concentracao no maior banco - usado na pagina Emprestimo e ACC (Faturamento).
  compact?: boolean;
}) {
  const [allLoans, allAccOperations, kpis] = await Promise.all([
    getLoans(),
    getAccOperations(),
    getKpis(range, modalidade),
  ]);

  const inPeriod = (contractDate: string) => {
    if (range?.from && contractDate.slice(0, 7) < range.from) return false;
    if (range?.to && contractDate.slice(0, 7) > range.to) return false;
    return true;
  };
  const loans = modalidade === "ACC" ? [] : allLoans.filter((l) => inPeriod(l.contractDate));
  const accOperations =
    modalidade === "EMPRESTIMOS" ? [] : allAccOperations.filter((a) => inPeriod(a.contractDate));

  const upcoming = [
    ...loans
      .filter((l) => l.status !== "LIQUIDADO")
      .map((l) => {
        const parcela = proximaParcela(l);
        if (!parcela) return null;
        return { vencimento: parcela.vencimento };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
    ...accOperations
      .filter((a) => a.status !== "LIQUIDADO")
      .map((a) => ({ vencimento: a.settlementDate })),
  ].sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      <KpiCard
        label="Saldo devedor total"
        value={formatCompactCurrency(kpis.saldoDevedorTotal)}
        icon={Wallet}
        tone="teal"
      />
      <KpiCard
        label="Emprestimos em aberto"
        value={formatCompactCurrency(kpis.saldoDevedorLoans)}
        icon={PiggyBank}
        tone="green"
      />
      <KpiCard
        label="ACC em aberto (R$)"
        value={formatCompactCurrency(kpis.saldoDevedorAcc)}
        icon={PiggyBank}
        tone="soft"
      />
      <KpiCard
        label="ACC em aberto (US$)"
        value={formatCompactCurrency(kpis.saldoDevedorAccUsd, "USD")}
        icon={PiggyBank}
        tone="teal"
      />
      <KpiCard
        label="Total contratado"
        value={formatCompactCurrency(kpis.totalContratadoGeral)}
        icon={PiggyBank}
        tone="green"
      />
      <KpiCard label="Juros pagos" value={formatCompactCurrency(kpis.jurosPagos)} icon={TrendingDown} tone="soft" />
      <KpiCard label="Juros futuros" value={formatCompactCurrency(kpis.jurosFuturos)} icon={TrendingUp} tone="teal" />
      <KpiCard label="Operacoes ativas" value={String(kpis.operacoesAtivas)} icon={PiggyBank} tone="green" />
      {!compact && (
        <KpiCard
          label="Operacoes em atraso"
          value={String(kpis.operacoesAtraso)}
          icon={AlertTriangle}
          trendPositive={false}
          tone="soft"
        />
      )}
      {!compact && (
        <KpiCard
          label="Exposicao cambial (ACC aberto)"
          value={formatCompactCurrency(kpis.exposicaoCambial, "USD")}
          icon={TrendingUp}
          tone="teal"
        />
      )}
      {!compact && (
        <KpiCard
          label="Proximo vencimento"
          value={upcoming[0] ? formatDate(upcoming[0].vencimento) : "-"}
          icon={CalendarClock}
          tone="green"
        />
      )}
      <KpiCard
        label="Custo medio ponderado da carteira"
        value={formatPercent(kpis.custoMedioPonderado)}
        icon={Percent}
        tone="soft"
      />
      {!compact && (
        <KpiCard
          label="Concentracao no maior banco"
          value={formatPercent(kpis.concentracaoMaiorBanco, 1)}
          icon={PieChart}
          tone="teal"
        />
      )}
    </div>
  );
}
