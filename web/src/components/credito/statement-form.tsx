"use client";

import { useState } from "react";
import { Label, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { FinancialStatementFields } from "@/lib/financial/schema";
import { dreFieldLabels, ativoFieldLabels, passivoFieldLabels, cambialFieldLabels } from "@/lib/financial/schema";

const dreFields: (keyof FinancialStatementFields)[] = [
  "receitaBruta",
  "deducoes",
  "receitaLiquida",
  "cmv",
  "lucroBruto",
  "outrasReceitasOperacionais",
  "despesasGerais",
  "despesasComerciais",
  "despesasTributarias",
  "depreciacaoAmortizacao",
  "outrasDespesasOperacionais",
  "resultadoAtividade",
  "receitasFinanceiras",
  "despesasFinanceiras",
  "variacaoCambial",
  "resultadoNaoOperacional",
  "impostoRenda",
  "participacoes",
  "lucroLiquido",
];

const ativoCirculanteFields: (keyof FinancialStatementFields)[] = [
  "caixaEquivalentes",
  "titulosValoresMobiliarios",
  "contasReceberClientes",
  "estoques",
  "adiantamentoFornecedores",
  "outrosAtivosOperacionaisCirc",
  "outrosAtivosNaoOperacionaisCirc",
];

const ativoNaoCirculanteFields: (keyof FinancialStatementFields)[] = [
  "contasReceberColigadas",
  "investimentos",
  "imobilizado",
  "intangivel",
  "outrosAtivosNaoCirculantes",
];

const passivoCirculanteFields: (keyof FinancialStatementFields)[] = [
  "fornecedores",
  "salariosEncargos",
  "impostosContribuicoes",
  "emprestimosCurtoPrazo",
  "irAPagar",
  "emprestimosColigadasCP",
  "dividendosAPagar",
  "adiantamentosClientes",
  "outrosPassivosCirc",
];

const passivoNaoCirculanteFields: (keyof FinancialStatementFields)[] = ["emprestimosLongoPrazo", "outrosPassivosNaoCirc"];

const patrimonioLiquidoFields: (keyof FinancialStatementFields)[] = [
  "capitalSocial",
  "reservas",
  "lucrosPrejuizosAcumulados",
  "outrosResultadosAbrangentes",
];

const cambialFields: (keyof FinancialStatementFields)[] = ["ativosMoedaEstrangeira", "passivosMoedaEstrangeira"];

const fieldLabels: Record<string, string> = { ...dreFieldLabels, ...ativoFieldLabels, ...passivoFieldLabels, ...cambialFieldLabels };

type FormState = Record<keyof FinancialStatementFields, string>;

function toFormState(fields: FinancialStatementFields): FormState {
  const state = {} as FormState;
  for (const [key, value] of Object.entries(fields)) {
    state[key as keyof FinancialStatementFields] = value == null ? "" : String(value);
  }
  return state;
}

function NumberRow({
  field,
  value,
  onChange,
}: {
  field: keyof FinancialStatementFields;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={field}>{fieldLabels[field] ?? field}</Label>
      <Input
        id={field}
        type="number"
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function FieldGroup({
  title,
  fields,
  form,
  update,
}: {
  title: string;
  fields: (keyof FinancialStatementFields)[];
  form: FormState;
  update: (field: keyof FinancialStatementFields, value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <NumberRow key={f} field={f} value={form[f]} onChange={(v) => update(f, v)} />
        ))}
      </div>
    </div>
  );
}

export function StatementForm({
  initial,
  submitLabel = "Salvar",
  onSubmit,
}: {
  initial: FinancialStatementFields;
  submitLabel?: string;
  onSubmit: (fields: FinancialStatementFields) => Promise<void> | void;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof FinancialStatementFields, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const fields = {} as FinancialStatementFields;
    for (const key of Object.keys(form) as (keyof FinancialStatementFields)[]) {
      const raw = form[key];
      if (key === "periodLabel" || key === "referenceDate") {
        (fields as Record<string, unknown>)[key] = raw;
      } else if (key === "periodDays") {
        (fields as Record<string, unknown>)[key] = Number(raw);
      } else if (key === "ativosMoedaEstrangeira" || key === "passivosMoedaEstrangeira") {
        (fields as Record<string, unknown>)[key] = raw === "" ? null : Number(raw);
      } else {
        (fields as Record<string, unknown>)[key] = raw === "" ? 0 : Number(raw);
      }
    }

    setSubmitting(true);
    try {
      await onSubmit(fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Identificação do Período</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="periodLabel">Rótulo do período</Label>
            <Input id="periodLabel" value={form.periodLabel} onChange={(e) => update("periodLabel", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="referenceDate">Data de fechamento</Label>
            <Input
              id="referenceDate"
              type="date"
              value={form.referenceDate}
              onChange={(e) => update("referenceDate", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="periodDays">Dias no período</Label>
            <Input
              id="periodDays"
              type="number"
              value={form.periodDays}
              onChange={(e) => update("periodDays", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <Tabs defaultValue="dre">
            <TabsList>
              <TabsTrigger value="dre">DRE</TabsTrigger>
              <TabsTrigger value="ativo">Ativo</TabsTrigger>
              <TabsTrigger value="passivo">Passivo</TabsTrigger>
              <TabsTrigger value="cambio">Câmbio</TabsTrigger>
            </TabsList>

            <TabsContent value="dre">
              <FieldGroup title="Demonstração do Resultado" fields={dreFields} form={form} update={update} />
            </TabsContent>

            <TabsContent value="ativo">
              <FieldGroup title="Ativo Circulante" fields={ativoCirculanteFields} form={form} update={update} />
              <FieldGroup title="Ativo Não Circulante" fields={ativoNaoCirculanteFields} form={form} update={update} />
            </TabsContent>

            <TabsContent value="passivo">
              <FieldGroup title="Passivo Circulante" fields={passivoCirculanteFields} form={form} update={update} />
              <FieldGroup
                title="Passivo Não Circulante"
                fields={passivoNaoCirculanteFields}
                form={form}
                update={update}
              />
              <FieldGroup title="Patrimônio Líquido" fields={patrimonioLiquidoFields} form={form} update={update} />
            </TabsContent>

            <TabsContent value="cambio">
              <p className="text-xs text-muted">
                Opcional — deixe em branco se o balanço não discriminar moeda estrangeira.
              </p>
              <FieldGroup title="Exposição Cambial" fields={cambialFields} form={form} update={update} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
