"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { SCENARIO_LABELS, type BudgetScenarioKey } from "@/lib/budget-constants";
import { formatCurrencyPrecise } from "@/lib/format";
import { updateBudgetPlanAssumptions } from "@/app/(dashboard)/planejamento-orcamentario/actions";
import { Save } from "lucide-react";
import { LB_SACA } from "@/lib/hedge-cambial/config";

type PlanoPremissas = {
  id: string;
  name: string;
  scenario: BudgetScenarioKey;
  cotacaoSacaUsd: number;
  nivelBolsa: number;
  diferencial: number;
  cotacaoDolar: number;
  crescimentoModerado: number;
  crescimentoOtimista: number;
  crescimentoMuitoOtimista: number;
  crescimentoModeradoExterno: number;
  crescimentoOtimistaExterno: number;
  crescimentoMuitoOtimistaExterno: number;
  icmsPctInterestadual: number;
  icmsAliquotaInterestadual: number;
};

function formDe(plan: PlanoPremissas) {
  return {
    name: plan.name,
    scenario: plan.scenario,
    nivelBolsa: String(plan.nivelBolsa),
    diferencial: String(plan.diferencial),
    cotacaoDolar: String(plan.cotacaoDolar),
    crescimentoModerado: String(plan.crescimentoModerado * 100),
    crescimentoOtimista: String(plan.crescimentoOtimista * 100),
    crescimentoMuitoOtimista: String(plan.crescimentoMuitoOtimista * 100),
    crescimentoModeradoExterno: String(plan.crescimentoModeradoExterno * 100),
    crescimentoOtimistaExterno: String(plan.crescimentoOtimistaExterno * 100),
    crescimentoMuitoOtimistaExterno: String(plan.crescimentoMuitoOtimistaExterno * 100),
    icmsPctInterestadual: String(plan.icmsPctInterestadual * 100),
    icmsAliquotaInterestadual: String(plan.icmsAliquotaInterestadual * 100),
  };
}

// Premissas do plano (pagina Premissas): nome, cenario ativo, cotacao da saca e
// do dolar e crescimento de volume de cada cenario. Antes era uma janela dentro
// da pagina Orcamento.
export function PremissasPlano({ plan }: { plan: PlanoPremissas }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(() => formDe(plan));
  const [salvo, setSalvo] = useState(false);
  // Mesma conta do valor do contrato de exportacao: (bolsa + diferencial) x 1,3228.
  const sacaUsd = Number((((Number(form.nivelBolsa) || 0) + (Number(form.diferencial) || 0)) * LB_SACA).toFixed(2));
  const precoSaca = sacaUsd * (Number(form.cotacaoDolar) || 0);

  function set<K extends keyof ReturnType<typeof formDe>>(k: K, v: ReturnType<typeof formDe>[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setSalvo(false);
  }

  function salvar() {
    startTransition(async () => {
      await updateBudgetPlanAssumptions(plan.id, {
        name: form.name.trim() || plan.name,
        scenario: form.scenario,
        nivelBolsa: Number(form.nivelBolsa) || 0,
        diferencial: Number(form.diferencial) || 0,
        cotacaoDolar: Number(form.cotacaoDolar) || 0,
        crescimentoModerado: (Number(form.crescimentoModerado) || 0) / 100,
        crescimentoOtimista: (Number(form.crescimentoOtimista) || 0) / 100,
        crescimentoMuitoOtimista: (Number(form.crescimentoMuitoOtimista) || 0) / 100,
        crescimentoModeradoExterno: (Number(form.crescimentoModeradoExterno) || 0) / 100,
        crescimentoOtimistaExterno: (Number(form.crescimentoOtimistaExterno) || 0) / 100,
        crescimentoMuitoOtimistaExterno: (Number(form.crescimentoMuitoOtimistaExterno) || 0) / 100,
        icmsPctInterestadual: (Number(form.icmsPctInterestadual) || 0) / 100,
        icmsAliquotaInterestadual: (Number(form.icmsAliquotaInterestadual) || 0) / 100,
      });
      setSalvo(true);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Premissas do plano orçamentário</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Nome do plano</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label>Cenário ativo</Label>
            <Select value={form.scenario} onChange={(e) => set("scenario", e.target.value as BudgetScenarioKey)}>
              {Object.entries(SCENARIO_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Nível de bolsa (c/lb)</Label>
            <Input type="number" step="0.01" value={form.nivelBolsa} onChange={(e) => set("nivelBolsa", e.target.value)} />
          </div>
          <div>
            <Label>Diferencial (c/lb)</Label>
            <Input type="number" step="0.01" value={form.diferencial} onChange={(e) => set("diferencial", e.target.value)} />
          </div>
          <div>
            <Label>Cotação saca (US$)</Label>
            <Input
              value={sacaUsd.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              disabled
              title="(Nível de bolsa + Diferencial) × 1,3228"
            />
          </div>
          <div>
            <Label>Cotação dólar (R$)</Label>
            <Input type="number" step="0.0001" value={form.cotacaoDolar} onChange={(e) => set("cotacaoDolar", e.target.value)} />
          </div>
        </div>
        <p className="text-[11px] text-muted">
          Cotação saca (US$) = (nível de bolsa + diferencial) × 1,3228, igual ao contrato de exportação. Receita do plano = volume ×
          cotação saca × dólar = {formatCurrencyPrecise(precoSaca)} por saca.
        </p>
        <div>
          <p className="mb-2 text-xs text-muted">
            Crescimento de volume sobre o cenário Conservador (0%), separado por mercado: cada % é aplicado ao volume base em sacas
            daquele mercado.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="py-1 pr-3 font-medium">Mercado</th>
                  <th className="px-2 py-1 font-medium">Moderado (%)</th>
                  <th className="px-2 py-1 font-medium">Otimista (%)</th>
                  <th className="px-2 py-1 font-medium">Muito Otimista (%)</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Mercado interno", "crescimentoModerado", "crescimentoOtimista", "crescimentoMuitoOtimista"],
                    ["Mercado externo", "crescimentoModeradoExterno", "crescimentoOtimistaExterno", "crescimentoMuitoOtimistaExterno"],
                  ] as const
                ).map(([rotulo, ...campos]) => (
                  <tr key={rotulo}>
                    <td className="py-1 pr-3 text-xs font-medium">{rotulo}</td>
                    {campos.map((c) => (
                      <td key={c} className="px-2 py-1">
                        <Input
                          type="number"
                          step="0.01"
                          aria-label={`${rotulo}: ${c}`}
                          value={form[c]}
                          onChange={(e) => set(c, e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs text-muted">
            DARE (ICMS interestadual), usado pela linha automática DARE do grupo Impostos: dentro de MG o ICMS do café cru é diferido e
            na exportação não incide; paga-se só nas vendas internas para outros estados.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>% das vendas internas para outros estados</Label>
              <Input
                type="number"
                step="0.01"
                value={form.icmsPctInterestadual}
                onChange={(e) => set("icmsPctInterestadual", e.target.value)}
              />
            </div>
            <div>
              <Label>Alíquota ICMS interestadual (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.icmsAliquotaInterestadual}
                onChange={(e) => set("icmsAliquotaInterestadual", e.target.value)}
              />
              <p className="mt-1 text-[11px] text-muted">12% para S/SE; 7% para N, NE, CO e ES.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={salvar} disabled={isPending}>
            <Save size={14} />
            {isPending ? "Salvando..." : "Salvar premissas do plano"}
          </Button>
          {salvo && <span className="text-[11px] font-medium text-success">Premissas salvas.</span>}
        </div>
      </CardContent>
    </Card>
  );
}
