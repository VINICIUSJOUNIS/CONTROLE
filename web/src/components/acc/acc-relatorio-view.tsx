"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCompactCurrency, formatCurrencyPrecise, formatDate, formatPercent } from "@/lib/format";
import { Printer } from "lucide-react";
import type { AccRow } from "@/lib/data";
import type { AccMonthlyInterest } from "@/lib/acc-calc";

const statusVariant: Record<string, "success" | "danger" | "neutral"> = {
  EM_ABERTO: "success",
  LIQUIDADO: "neutral",
  EM_ATRASO: "danger",
};

const statusLabels: Record<string, string> = {
  EM_ABERTO: "Em aberto",
  LIQUIDADO: "Liquidado",
  EM_ATRASO: "Em atraso",
};

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted print:text-[8px]">{label}</p>
      <p className="text-sm font-medium print:text-[10px]">{value}</p>
    </div>
  );
}

export function AccRelatorioView({ acc, monthlySchedule }: { acc: AccRow; monthlySchedule: AccMonthlyInterest[] }) {
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
            <p className="text-base font-semibold print:text-xs">Relatório de ACC — {acc.accNumber}</p>
            <p className="text-xs text-muted print:text-[9px]">
              Emitido em {formatDate(new Date().toISOString().slice(0, 10))}
            </p>
          </div>
        </div>

        <Card className="print:break-inside-avoid print:border-0 print:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="print:text-xs">Dados do Contrato</CardTitle>
            <Badge variant={statusVariant[acc.status]}>{statusLabels[acc.status] ?? acc.status}</Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 print:gap-2">
            <InfoItem label="Banco" value={acc.bankName} />
            <InfoItem label="Número do ACC" value={acc.accNumber} />
            <InfoItem label="Contrato de Câmbio" value={acc.exchangeContractNumber} />
            <InfoItem label="Exportador" value={acc.exporter} />
            <InfoItem label="País" value={acc.country} />
            <InfoItem label="Moeda" value={acc.currency} />
            <InfoItem label="Valor Contratado" value={`US$ ${acc.contractedValueForeign.toLocaleString("pt-BR")}`} />
            <InfoItem label="Valor Recebido (R$)" value={formatCompactCurrency(acc.receivedValueBRL)} />
            <InfoItem label="Taxa Spot" value={acc.spotRate.toLocaleString("pt-BR", { minimumFractionDigits: 4 })} />
            <InfoItem
              label="Taxa de Fechamento"
              value={acc.closingRate.toLocaleString("pt-BR", { minimumFractionDigits: 4 })}
            />
            <InfoItem
              label="PTAX da Contratação"
              value={acc.ptaxContracting.toLocaleString("pt-BR", { minimumFractionDigits: 4 })}
            />
            <InfoItem label="Spread Cambial" value={formatPercent(acc.exchangeSpread)} />
            <InfoItem label="Taxa de Juros" value={`${formatPercent(acc.interestRate)} a.a.`} />
            <InfoItem label="Data da Contratação" value={formatDate(acc.contractDate)} />
            <InfoItem label="Vencimento" value={formatDate(acc.settlementDate)} />
            <InfoItem label="Data de Quitação" value={acc.dataQuitacao ? formatDate(acc.dataQuitacao) : "-"} />
            <InfoItem label="Prazo" value={`${acc.prazoMeses} meses`} />
            <InfoItem label="IOF" value={formatCompactCurrency(acc.iof)} />
            <InfoItem label="Tarifas Bancárias" value={formatCompactCurrency(acc.bankFees)} />
            <InfoItem
              label="Taxa Flat"
              value={
                acc.flatFeeRate > 0
                  ? `${formatPercent(acc.flatFeeRate)} (${formatCompactCurrency(acc.flatFeeValor)})`
                  : "-"
              }
            />
            <InfoItem
              label="Seguro"
              value={acc.hasInsurance ? formatCompactCurrency(acc.insuranceCost) : "Não"}
            />
            <InfoItem label="Outros Custos" value={formatCompactCurrency(acc.otherCosts)} />
          </CardContent>
        </Card>

        <Card className="print:break-inside-avoid print:border-0 print:shadow-none">
          <CardHeader>
            <CardTitle className="print:text-xs">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 print:gap-2">
            <InfoItem label="Spread (R$)" value={formatCompactCurrency(acc.spreadValor)} />
            <InfoItem label="Juros Projetados (US$)" value={`US$ ${acc.jurosValorUSD.toLocaleString("pt-BR")}`} />
            <InfoItem label="Juros Projetados (R$)" value={formatCompactCurrency(acc.jurosValor)} />
            <InfoItem label="Juros Pagos (US$)" value={`US$ ${acc.jurosPagoUSD.toLocaleString("pt-BR")}`} />
            <InfoItem label="Juros Pagos (R$)" value={formatCompactCurrency(acc.jurosPagoValor)} />
            <InfoItem label="Custo Total (R$)" value={formatCompactCurrency(acc.custoTotal)} />
            <InfoItem label="% Custo Total" value={formatPercent(acc.percentualCustoTotal)} />
            <InfoItem
              label="Saldo em Aberto"
              value={`US$ ${acc.saldoAbertoUSD.toLocaleString("pt-BR")}`}
            />
          </CardContent>
        </Card>

        {acc.baixas.length > 0 && (
          <Card className="print:break-inside-avoid print:border-0 print:shadow-none">
            <CardHeader>
              <CardTitle className="print:text-xs">Baixas Parciais (Quitações)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0 print:p-0">
              <table className="w-full whitespace-nowrap text-sm print:text-[9px]">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted print:text-[8px]">
                    <th className="px-3 py-2 font-medium print:py-1">Data</th>
                    <th className="px-3 py-2 font-medium print:py-1">Valor (US$)</th>
                    <th className="px-3 py-2 font-medium print:py-1">Câmbio</th>
                    <th className="px-3 py-2 font-medium print:py-1">Dias</th>
                    <th className="px-3 py-2 font-medium print:py-1">Juros (US$)</th>
                    <th className="px-3 py-2 font-medium print:py-1">Juros (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {acc.baixas.map((b) => (
                    <tr key={b.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 print:py-0.5">{formatDate(b.dataQuitacao)}</td>
                      <td className="px-3 py-2 print:py-0.5">US$ {b.valorUSD.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2 print:py-0.5">
                        {b.closingRate.toLocaleString("pt-BR", { minimumFractionDigits: 4 })}
                      </td>
                      <td className="px-3 py-2 print:py-0.5">{b.dias}</td>
                      <td className="px-3 py-2 print:py-0.5">US$ {b.jurosUSD.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2 print:py-0.5">{formatCurrencyPrecise(b.jurosValor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        <Card className="print:break-inside-avoid print:border-0 print:shadow-none">
          <CardHeader>
            <CardTitle className="print:text-xs">Cálculo de Juros — Valor Mensal</CardTitle>
            <p className="text-xs text-muted print:text-[8px]">
              Juros simples (taxa a.a. / 360 dias) sobre o saldo em aberto no início de cada mês.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0 print:p-0">
            <table className="w-full whitespace-nowrap text-sm print:text-[9px]">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted print:text-[8px]">
                  <th className="px-3 py-2 font-medium print:py-1">Mês</th>
                  <th className="px-3 py-2 font-medium print:py-1">Dias</th>
                  <th className="px-3 py-2 font-medium print:py-1">Saldo Base (US$)</th>
                  <th className="px-3 py-2 font-medium print:py-1">Juros do Mês (US$)</th>
                  <th className="px-3 py-2 font-medium print:py-1">Juros do Mês (R$)</th>
                </tr>
              </thead>
              <tbody>
                {monthlySchedule.map((row) => (
                  <tr key={row.month} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 print:py-0.5">{row.month}</td>
                    <td className="px-3 py-2 print:py-0.5">{row.dias}</td>
                    <td className="px-3 py-2 print:py-0.5">US$ {row.saldoBaseUSD.toLocaleString("pt-BR")}</td>
                    <td className="px-3 py-2 print:py-0.5">US$ {row.jurosUSD.toLocaleString("pt-BR")}</td>
                    <td className="px-3 py-2 font-medium print:py-0.5">{formatCurrencyPrecise(row.jurosValor)}</td>
                  </tr>
                ))}
                {monthlySchedule.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted">
                      Sem período de acumulação para exibir.
                    </td>
                  </tr>
                )}
              </tbody>
              {monthlySchedule.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border font-semibold">
                    <td className="px-3 py-2 print:py-1" colSpan={3}>
                      Total
                    </td>
                    <td className="px-3 py-2 print:py-1">
                      US$ {monthlySchedule.reduce((s, r) => s + r.jurosUSD, 0).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-2 print:py-1">
                      {formatCurrencyPrecise(monthlySchedule.reduce((s, r) => s + r.jurosValor, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
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
