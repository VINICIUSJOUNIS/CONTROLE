"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCompactCurrency, formatCurrencyPrecise, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Printer } from "lucide-react";
import type { LoanRow } from "@/lib/data";
import type { AmortizationInstallment } from "@/lib/amortization";

const statusVariant: Record<string, "success" | "danger" | "neutral"> = {
  ATIVO: "success",
  LIQUIDADO: "neutral",
  EM_ATRASO: "danger",
};

const statusLabels: Record<string, string> = {
  ATIVO: "Ativo",
  LIQUIDADO: "Liquidado",
  EM_ATRASO: "Em atraso",
};

const rateBasisSuffix: Record<string, string> = {
  MENSAL: "a.m.",
  SEMESTRAL: "a.s.",
  ANUAL: "a.a.",
};

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted print:text-[8px]">{label}</p>
      <p className="text-sm font-medium print:text-[10px]">{value}</p>
    </div>
  );
}

export function EmprestimoRelatorioView({
  loan,
  schedule,
}: {
  loan: LoanRow;
  schedule: AmortizationInstallment[];
}) {
  const parcelasPorNumero = new Map(loan.parcelas.map((p) => [p.numero, p]));

  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center">
        <Image
          src="/nayme-logo.png"
          alt=""
          width={420}
          height={420}
          className="h-[280px] w-[280px] opacity-[0.05] print:h-[200px] print:w-[200px]"
        />
      </div>

      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-end print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer size={14} />
            Imprimir / PDF
          </Button>
        </div>

        <div className="mb-2 hidden items-end justify-between border-b-2 border-primary pb-4 print:flex print:pb-1.5">
          <div className="flex items-center gap-3">
            <Image src="/nayme-logo.png" alt="Nayme" width={48} height={48} className="rounded-full print:h-8 print:w-8" />
            <div>
              <p className="text-lg font-semibold tracking-wide print:text-sm">NAYME</p>
              <p className="text-xs text-muted print:text-[9px]">Tesouraria Corporativa</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-semibold print:text-xs">Relatório de Empréstimo — {loan.contractNumber}</p>
            <p className="text-xs text-muted print:text-[9px]">
              Emitido em {formatDate(new Date().toISOString().slice(0, 10))}
            </p>
          </div>
        </div>

        <Card className="print:break-inside-avoid print:border-0 print:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="print:text-xs">Dados do Contrato</CardTitle>
            <Badge variant={statusVariant[loan.status]}>{statusLabels[loan.status] ?? loan.status}</Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 print:gap-2">
            <InfoItem label="Banco" value={loan.bankName} />
            <InfoItem label="Contrato" value={loan.contractNumber} />
            <InfoItem label="Finalidade" value={loan.purpose} />
            <InfoItem label="Garantia" value={loan.guarantee} />
            <InfoItem label="Valor Contratado" value={formatCompactCurrency(loan.contractedValue)} />
            <InfoItem label="Valor Líquido" value={formatCompactCurrency(loan.netValue)} />
            <InfoItem
              label="Taxa de Juros"
              value={`${formatPercent(loan.interestRate)} ${rateBasisSuffix[loan.rateBasis] ?? ""}`}
            />
            <InfoItem label="Indexador" value={loan.indexer} />
            <InfoItem label="Spread" value={formatPercent(loan.spread)} />
            <InfoItem label="Sistema de Amortização" value={loan.amortizationSystem} />
            <InfoItem label="Parcelas" value={String(loan.installments)} />
            <InfoItem label="Periodicidade" value={loan.periodicity} />
            <InfoItem label="Data da Contratação" value={formatDate(loan.contractDate)} />
            <InfoItem label="1º Vencimento" value={formatDate(loan.firstDueDate)} />
            <InfoItem label="Vencimento Final" value={formatDate(loan.lastDueDate)} />
            <InfoItem
              label="Data de Liquidação"
              value={loan.settlementDate ? formatDate(loan.settlementDate) : "-"}
            />
            <InfoItem label="Prazo" value={`${loan.prazoMeses} meses`} />
            <InfoItem label="IOF" value={formatCompactCurrency(loan.iof)} />
            <InfoItem
              label="Seguro"
              value={loan.hasInsurance ? formatCompactCurrency(loan.insuranceCost) : "Não"}
            />
            <InfoItem label="Outros Custos" value={formatCompactCurrency(loan.otherCosts)} />
          </CardContent>
        </Card>

        <Card className="print:break-inside-avoid print:border-0 print:shadow-none">
          <CardHeader>
            <CardTitle className="print:text-xs">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4 print:gap-2">
            <InfoItem label="Juros (contrato completo)" value={formatCompactCurrency(loan.jurosValor)} />
            <InfoItem label="Juros Acumulados até Hoje" value={formatCompactCurrency(loan.jurosAcumulado)} />
            <InfoItem label="Custo Total (contrato completo)" value={formatCompactCurrency(loan.custoTotal)} />
            <InfoItem label="Custo Acumulado até Hoje" value={formatCompactCurrency(loan.custoAcumulado)} />
            <InfoItem label="Saldo Devedor Atual" value={formatCompactCurrency(loan.saldoDevedorAtual)} />
          </CardContent>
        </Card>

        <Card className="print:break-inside-avoid print:border-0 print:shadow-none">
          <CardHeader>
            <CardTitle className="print:text-xs">Cronograma de Amortização — Valor Mensal de Juros</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0 print:p-0">
            <table className="w-full whitespace-nowrap text-sm print:text-[9px]">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted print:text-[8px]">
                  <th className="px-3 py-2 font-medium print:py-1">Parcela</th>
                  <th className="px-3 py-2 font-medium print:py-1">Vencimento</th>
                  <th className="px-3 py-2 font-medium print:py-1">Amortização</th>
                  <th className="px-3 py-2 font-medium print:py-1">Juros do Mês</th>
                  <th className="px-3 py-2 font-medium print:py-1">Valor da Parcela</th>
                  <th className="px-3 py-2 font-medium print:py-1">Pago Acumulado</th>
                  <th className="px-3 py-2 font-medium print:py-1">Saldo Devedor</th>
                  <th className="px-3 py-2 font-medium print:py-1">Pagamento Real</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => {
                  const parcela = parcelasPorNumero.get(row.numero);
                  return (
                    <tr key={row.numero} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 print:py-0.5">{row.numero}</td>
                      <td className="px-3 py-2 print:py-0.5">{formatDate(row.vencimento)}</td>
                      <td className="px-3 py-2 print:py-0.5">{formatCurrencyPrecise(row.amortizacao)}</td>
                      <td className="px-3 py-2 print:py-0.5">{formatCurrencyPrecise(row.juros)}</td>
                      <td className="px-3 py-2 font-medium print:py-0.5">{formatCurrencyPrecise(row.valorParcela)}</td>
                      <td className="px-3 py-2 print:py-0.5">{formatCurrencyPrecise(row.pagoAcumulado)}</td>
                      <td className={cn("px-3 py-2 print:py-0.5", row.saldoDevedor < 0 && "text-danger")}>
                        {formatCurrencyPrecise(row.saldoDevedor)}
                      </td>
                      <td className="px-3 py-2 print:py-0.5">
                        {parcela?.paidAt ? (
                          <>
                            {formatDate(parcela.paidAt)}
                            {parcela.paidValue != null && ` — ${formatCurrencyPrecise(parcela.paidValue)}`}
                          </>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="mt-4 hidden grid-cols-2 gap-12 print:grid print:gap-8">
          <div className="text-center text-xs print:text-[9px]">
            <div className="mb-1 border-t border-foreground pt-2 print:pt-1">Assinatura do responsável</div>
          </div>
          <div className="text-center text-xs print:text-[9px]">
            <div className="mb-1 border-t border-foreground pt-2 print:pt-1">Data</div>
          </div>
        </div>

        <div className="mt-4 hidden border-t border-border pt-2 text-center text-[10px] text-muted print:block print:pt-1 print:text-[8px]">
          NAYME - Tesouraria Corporativa
        </div>
      </div>
    </div>
  );
}
