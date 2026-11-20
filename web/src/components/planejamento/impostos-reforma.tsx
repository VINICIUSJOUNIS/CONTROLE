"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

// Quadro de tributos do orcamento no ano da reforma (2027: CBS no lugar de
// PIS/COFINS, IBS em teste a 0,1%, ICMS ainda integral). Visao de comercial
// exportadora de cafe cru que compra de comerciantes (PJ) e de produtores.
// Premissas sem dado no sistema ficam em branco ate o usuario informar - o
// quadro nao inventa mix de compras nem destino das vendas internas.

const ALIQ_CBS_2027 = 11.2; // referencia TCU 11,3% menos 0,1 p.p. (2027-2028)
const ALIQ_IBS_2027 = 0.1; // 0,05% estadual + 0,05% municipal
const FUNRURAL_PF = 1.63; // 1,32% INSS + 0,11% RAT + 0,20% SENAR (desde 04/2026, LC 224/2025)
const IRPJ_ADICIONAL_LIMITE = 240_000;

type Linha = {
  operacao: string;
  tributo: string;
  tratamento: string;
  pagar: number | null; // null = nao se aplica; NaN = falta premissa
  credito: number | null;
  base: string;
};

function num(v: string) {
  const n = Number(v.replace(",", "."));
  return v.trim() === "" || !Number.isFinite(n) ? null : n;
}

export function ImpostosReforma({
  ano,
  receitaInterna,
  receitaExterna,
  baseFiscal,
  despesasCreditaveis,
}: {
  ano: number;
  receitaInterna: number;
  receitaExterna: number;
  baseFiscal: { de: string; ate: string; cmvSobreReceita: number; lairSobreReceita: number } | null;
  despesasCreditaveis: number;
}) {
  const [cmvPct, setCmvPct] = useState(() => (baseFiscal ? (baseFiscal.cmvSobreReceita * 100).toFixed(2) : ""));
  const [pctProdutorPf, setPctProdutorPf] = useState("");
  const [pctInterestadual, setPctInterestadual] = useState("");
  const [aliqInterestadual, setAliqInterestadual] = useState("12");
  const [creditoPresumidoPct, setCreditoPresumidoPct] = useState("0");
  const [lairPct, setLairPct] = useState(() => (baseFiscal ? (baseFiscal.lairSobreReceita * 100).toFixed(2) : ""));

  const receita = receitaInterna + receitaExterna;
  const cmv = num(cmvPct);
  const compras = cmv === null ? null : receita * (cmv / 100);
  const pf = num(pctProdutorPf);
  const comprasPf = compras === null || pf === null ? null : compras * (pf / 100);
  const inter = num(pctInterestadual);
  const aliqInter = num(aliqInterestadual) ?? 0;
  const cp = num(creditoPresumidoPct) ?? 0;
  const lair = num(lairPct);
  const lucro = lair === null ? null : receita * (lair / 100);

  const icmsInterestadual = inter === null ? NaN : receitaInterna * (inter / 100) * (aliqInter / 100);
  const funrural = comprasPf === null ? NaN : comprasPf * (FUNRURAL_PF / 100);
  const creditoPresumido = comprasPf === null ? NaN : comprasPf * (cp / 100);
  const aliqCbsIbs = ALIQ_CBS_2027 + ALIQ_IBS_2027;
  // Despesas do plano sao valores totais das notas (tributo "por fora" ja
  // somado): o credito e a parcela de CBS/IBS contida no total.
  const creditoServicos = despesasCreditaveis * (aliqCbsIbs / (100 + aliqCbsIbs));
  const irpj =
    lucro === null ? NaN : Math.max(lucro, 0) * 0.15 + Math.max(lucro - IRPJ_ADICIONAL_LIMITE, 0) * 0.1;
  const csll = lucro === null ? NaN : Math.max(lucro, 0) * 0.09;

  const linhas: Linha[] = [
    {
      operacao: "Venda externa (exportação)",
      tributo: "CBS e IBS",
      tratamento: "Imune. Mantém os créditos das compras e serviços ligados à exportação.",
      pagar: 0,
      credito: null,
      base: "CF art. 156-A §1º III e art. 195 §16 (EC 132/2023); LC 214/2025 (exportações)",
    },
    {
      operacao: "Venda externa (exportação)",
      tributo: "ICMS",
      tratamento: "Não incide. Mantém o crédito das entradas (crédito acumulado).",
      pagar: 0,
      credito: null,
      base: "CF art. 155 §2º X a; LC 87/1996 art. 3º II",
    },
    {
      operacao: "Venda interna de café cru",
      tributo: "CBS e IBS",
      tratamento: "Alíquota zero: café (NCM 09.01) está na Cesta Básica Nacional. Créditos anteriores são mantidos.",
      pagar: 0,
      credito: null,
      base: "LC 214/2025 art. 125 e Anexo I",
    },
    {
      operacao: "Venda interna dentro de MG",
      tributo: "ICMS",
      tratamento: "Diferido para a etapa seguinte (sem destaque na nota).",
      pagar: 0,
      credito: null,
      base: "RICMS/MG 2023 (Dec. 48.589/2023), Anexo VI, item do café cru",
    },
    {
      operacao: "Venda interna para outro estado",
      tributo: "ICMS",
      tratamento: "12% para S/SE; 7% para N, NE, CO e ES.",
      pagar: icmsInterestadual,
      credito: null,
      base: "Resolução do Senado 22/1989",
    },
    {
      operacao: "Compra de comerciantes (PJ)",
      tributo: "CBS e IBS",
      tratamento: "A venda deles também é alíquota zero (café cru): não há tributo na nota, logo não há crédito.",
      pagar: null,
      credito: 0,
      base: "LC 214/2025 Anexo I",
    },
    {
      operacao: "Compra de produtor pessoa física",
      tributo: "CBS e IBS",
      tratamento:
        "Produtor com receita abaixo de R$ 3,6 mi não é contribuinte. A Nayme teria crédito presumido, mas o percentual de 2027 não foi publicado e pode ser zero para produto de alíquota zero. Orçado pelo percentual informado abaixo.",
      pagar: null,
      credito: creditoPresumido,
      base: "LC 214/2025 art. 164 e art. 168",
    },
    {
      operacao: "Compra de produtor pessoa física",
      tributo: "Funrural (retenção)",
      tratamento: `A Nayme retém do produtor e recolhe ${formatPercent(FUNRURAL_PF)} (1,32% INSS + 0,11% RAT + 0,20% SENAR). Segurado especial: 1,5%.`,
      pagar: funrural,
      credito: null,
      base: "Lei 8.212/1991 art. 25 e 30 IV; Lei 13.606/2018; LC 224/2025",
    },
    {
      operacao: "Compra de café dentro de MG",
      tributo: "ICMS",
      tratamento: "Diferido: a nota vem sem ICMS, então não gera crédito. Compra de outro estado vem com 12% ou 7% destacado e gera crédito.",
      pagar: null,
      credito: null,
      base: "RICMS/MG 2023, Anexo VI",
    },
    {
      operacao: "Serviços e insumos (frete, armazém, despachante, sacaria, energia...)",
      tributo: "CBS e IBS",
      tratamento: `O fornecedor cobra ${formatPercent(ALIQ_CBS_2027, 1)} de CBS + ${formatPercent(ALIQ_IBS_2027, 1)} de IBS na nota; a Nayme toma crédito integral.`,
      pagar: null,
      credito: creditoServicos,
      base: "LC 214/2025 art. 47 (não cumulatividade ampla)",
    },
    {
      operacao: "Lucro do ano",
      tributo: "IRPJ + CSLL",
      tratamento: "Lucro Real obrigatório (receita acima de R$ 78 mi): IRPJ 15% + adicional de 10% sobre o que passar de R$ 240 mil/ano + CSLL 9%.",
      pagar: Number.isNaN(irpj) ? NaN : irpj + csll,
      credito: null,
      base: "Lei 9.718/1998 art. 14; Lei 9.249/1995 art. 3º; Lei 7.689/1988",
    },
    {
      operacao: "PIS e COFINS",
      tributo: "PIS/COFINS",
      tratamento: "Extintos em 01/01/2027. Saldos credores escriturados até 12/2026 (inclusive o crédito presumido do café da Lei 12.599/2012) seguem para compensação com a CBS ou ressarcimento.",
      pagar: 0,
      credito: null,
      base: "EC 132/2023 art. 126; LC 214/2025 (transição)",
    },
    {
      operacao: "Câmbio da exportação e ACC",
      tributo: "IOF",
      tratamento: "Alíquota zero no ingresso de receita de exportação.",
      pagar: 0,
      credito: null,
      base: "Decreto 6.306/2007 art. 15-B",
    },
  ];

  const somaValida = (vs: (number | null)[]) => vs.filter((v): v is number => v !== null && !Number.isNaN(v)).reduce((s, v) => s + v, 0);
  const faltaPremissa = linhas.some((l) => Number.isNaN(l.pagar ?? 0) || Number.isNaN(l.credito ?? 0));
  const totalPagar = somaValida(linhas.map((l) => l.pagar));
  const totalCredito = somaValida(linhas.map((l) => l.credito));

  const valor = (v: number | null, tom: "pagar" | "credito") =>
    v === null ? (
      <span className="text-muted">—</span>
    ) : Number.isNaN(v) ? (
      <span className="text-warning">informe a premissa</span>
    ) : (
      <span className={cn(v > 0 && (tom === "pagar" ? "text-danger" : "text-success"))}>{formatCurrency(v)}</span>
    );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Tributos {ano}: o que pagamos e o que aproveitamos de crédito</h2>
        <p className="text-xs text-muted">
          Reforma tributária em {ano}: CBS substitui PIS/COFINS (alíquota de referência do TCU de 11,3%, menos 0,1 p.p. = {formatPercent(ALIQ_CBS_2027, 1)}),
          IBS em teste a {formatPercent(ALIQ_IBS_2027, 1)} e ICMS ainda integral. Receitas do cenário selecionado acima.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Premissas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-0 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>Compras de café / receita (%)</Label>
            <Input type="number" step="0.1" value={cmvPct} onChange={(e) => setCmvPct(e.target.value)} />
            <p className="mt-1 text-[11px] text-muted">
              {baseFiscal
                ? `CMV / receita bruta da DRE (${baseFiscal.de} a ${baseFiscal.ate}): ${formatPercent(baseFiscal.cmvSobreReceita * 100, 1)}.`
                : "Sem DRE na Análise de Crédito."}{" "}
              Compras estimadas: {compras === null ? "-" : formatCurrency(compras)}.
            </p>
          </div>
          <div>
            <Label>Compras de produtor pessoa física (%)</Label>
            <Input type="number" step="1" placeholder="Informe o mix" value={pctProdutorPf} onChange={(e) => setPctProdutorPf(e.target.value)} />
            <p className="mt-1 text-[11px] text-muted">O restante é comprado de comerciantes (PJ). O sistema não tem esse dado.</p>
          </div>
          <div>
            <Label>Crédito presumido CBS/IBS na compra de produtor (%)</Label>
            <Input type="number" step="0.1" value={creditoPresumidoPct} onChange={(e) => setCreditoPresumidoPct(e.target.value)} />
            <p className="mt-1 text-[11px] text-muted">Percentual de 2027 não publicado. Orçado em 0% por prudência; simule outro valor.</p>
          </div>
          <div>
            <Label>Vendas internas para outro estado (%)</Label>
            <Input type="number" step="1" placeholder="Informe" value={pctInterestadual} onChange={(e) => setPctInterestadual(e.target.value)} />
            <p className="mt-1 text-[11px] text-muted">Parte da receita interna que sai de MG (o cadastro de vendas não tem a UF do cliente).</p>
          </div>
          <div>
            <Label>Alíquota ICMS interestadual (%)</Label>
            <Input type="number" step="1" value={aliqInterestadual} onChange={(e) => setAliqInterestadual(e.target.value)} />
            <p className="mt-1 text-[11px] text-muted">12% para S/SE; 7% para N, NE, CO e ES. Use a média ponderada se vender para ambos.</p>
          </div>
          <div>
            <Label>Lucro antes do IR / receita (%)</Label>
            <Input type="number" step="0.01" value={lairPct} onChange={(e) => setLairPct(e.target.value)} />
            <p className="mt-1 text-[11px] text-muted">
              {baseFiscal
                ? `DRE ${baseFiscal.de} a ${baseFiscal.ate}: ${formatPercent(baseFiscal.lairSobreReceita * 100)}.`
                : "Sem DRE na Análise de Crédito."}{" "}
              Lucro estimado: {lucro === null ? "-" : formatCurrency(lucro)}.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-muted">A pagar em {ano}</p>
          <p className="mt-2 text-[22px] font-semibold text-danger">{formatCurrency(totalPagar)}</p>
          {faltaPremissa && <p className="mt-1 text-[11px] text-warning">Parcial: há premissas em branco.</p>}
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-muted">Créditos aproveitados (CBS/IBS)</p>
          <p className="mt-2 text-[22px] font-semibold text-success">{formatCurrency(totalCredito)}</p>
          <p className="mt-1 text-[11px] text-muted">
            Sem débito de CBS/IBS nas vendas, o crédito vira saldo a ressarcir: é caixa a recuperar, não abatimento.
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-muted">Base dos créditos de serviços</p>
          <p className="mt-2 text-[22px] font-semibold">{formatCurrency(despesasCreditaveis)}</p>
          <p className="mt-1 text-[11px] text-muted">
            Despesas previstas no plano com fornecedores PJ (mercado interno e externo, administrativas, fretes e armazenagem).
            {despesasCreditaveis === 0 && " Preencha as despesas do plano para calcular."}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quadro por operação</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-[11px] text-muted">
                <th className="px-2 py-1.5 font-medium">Operação</th>
                <th className="px-2 py-1.5 font-medium">Tributo</th>
                <th className="px-2 py-1.5 font-medium">Tratamento em {ano}</th>
                <th className="px-2 py-1.5 text-right font-medium">A pagar</th>
                <th className="px-2 py-1.5 text-right font-medium">Crédito</th>
                <th className="px-2 py-1.5 font-medium">Base legal</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={i} className="border-b border-border align-top last:border-0">
                  <td className="px-2 py-1.5 font-medium">{l.operacao}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">{l.tributo}</td>
                  <td className="min-w-[18rem] px-2 py-1.5 text-muted">{l.tratamento}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right">{valor(l.pagar, "pagar")}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right">{valor(l.credito, "credito")}</td>
                  <td className="min-w-[12rem] px-2 py-1.5 text-[11px] text-muted">{l.base}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pontos de atenção (visão do fiscal e do contador)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="list-disc space-y-1 pl-4 text-xs text-muted">
            <li>
              Alíquota da CBS: 11,3% é o cálculo do TCU; o Senado fixa por resolução até 15/12/2026. Em 2027 a CBS fica 0,1 p.p. abaixo da
              referência, por causa do IBS de teste.
            </li>
            <li>
              Crédito presumido na compra de produtor: o ato conjunto com os percentuais de 2027 não saiu. Como o café cru é alíquota zero, há
              risco real de o percentual ser zero. Não conte com esse crédito no caixa até a publicação.
            </li>
            <li>
              Saldo credor de CBS/IBS: com vendas imunes ou de alíquota zero, todo crédito vira pedido de ressarcimento. Planeje o capital de
              giro para o prazo de devolução e mantenha a escrituração impecável. A fiscalização vai cruzar nota a nota.
            </li>
            <li>
              Notas fiscais: venda interna com o código de classificação da Cesta Básica (alíquota zero) e exportação vinculada à DU-E. Classificação
              errada na nota é a primeira autuação que o fiscal procura.
            </li>
            <li>
              Funrural: a retenção na compra de produtor pessoa física é da Nayme. Se não reter, responde pelo valor. A ADI 4.395 afastou a
              sub-rogação só até 2018. A alíquota de 1,63% segue a leitura da Receita sobre a LC 224/2025, que é contestada.
            </li>
            <li>
              ICMS: exportar gera crédito acumulado em MG. A transferência tem limites, e é vedada para crédito de produto primário recebido de
              outro estado e exportado (RICMS/MG 2023, Anexo III). Confirme o enquadramento do diferimento com a contabilidade.
            </li>
            <li>
              PIS/COFINS: confirme o saldo credor de dezembro/2026 (inclusive o crédito presumido de exportação de café da Lei 12.599/2012) para
              compensar com a CBS ou pedir ressarcimento.
            </li>
            <li>
              Dividendos: desde 2026 há retenção de 10% de IR sobre dividendos acima de R$ 50 mil por mês por sócio pessoa física (Lei
              15.270/2025). Considere isso na distribuição de lucros de {ano}.
            </li>
          </ul>
          <p className="mt-3 text-[11px] text-muted">
            Estimativa para orçamento, não substitui parecer. Valide as premissas e os enquadramentos com a contabilidade antes de levar aos
            bancos ou à diretoria.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
