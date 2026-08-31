"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ClientesTable, ClienteRow } from "@/components/hedge/cadastros/clientes-table";
import { CorretorasTable, CorretoraRow } from "@/components/hedge/cadastros/corretoras-table";
import { CatalogoSimplesTable } from "@/components/hedge/cadastros/catalogo-simples-table";
import {
  createTipoFrete,
  updateTipoFrete,
  deleteTipoFrete,
} from "@/app/(dashboard)/hedge/mesa-operacao/tipos-frete/actions";
import {
  createTipoEmbalagem,
  updateTipoEmbalagem,
  deleteTipoEmbalagem,
} from "@/app/(dashboard)/hedge/mesa-operacao/tipos-embalagem/actions";
import {
  createFormaPagamento,
  updateFormaPagamento,
  deleteFormaPagamento,
} from "@/app/(dashboard)/hedge/mesa-operacao/formas-pagamento/actions";
import {
  createTipoAmostra,
  updateTipoAmostra,
  deleteTipoAmostra,
} from "@/app/(dashboard)/hedge/mesa-operacao/tipos-amostra/actions";
import {
  createTransportadoraAmostra,
  updateTransportadoraAmostra,
  deleteTransportadoraAmostra,
} from "@/app/(dashboard)/hedge/mesa-operacao/transportadoras-amostra/actions";
import {
  createDescricaoCafe,
  updateDescricaoCafe,
  deleteDescricaoCafe,
} from "@/app/(dashboard)/hedge/mesa-operacao/descricoes-cafe/actions";

type Item = { id: string; name: string };

const tabs = [
  { key: "clientes", label: "Clientes" },
  { key: "corretoras", label: "Corretoras" },
  { key: "frete", label: "Tipo de Frete" },
  { key: "embalagem", label: "Tipo de Embalagem" },
  { key: "pagamento", label: "Forma de Pagamento" },
  { key: "amostra", label: "Tipo de Amostra" },
  { key: "transportadora", label: "Transportadora de Amostra" },
  { key: "cafe", label: "Descricao do Cafe" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export function CadastrosView({
  clientes,
  corretoras,
  tiposFrete,
  tiposEmbalagem,
  formasPagamento,
  tiposAmostra,
  transportadorasAmostra,
  descricoesCafe,
}: {
  clientes: ClienteRow[];
  corretoras: CorretoraRow[];
  tiposFrete: Item[];
  tiposEmbalagem: Item[];
  formasPagamento: Item[];
  tiposAmostra: Item[];
  transportadorasAmostra: Item[];
  descricoesCafe: Item[];
}) {
  const [tab, setTab] = useState<TabKey>("clientes");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted hover:bg-border/40 hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "clientes" && <ClientesTable clientes={clientes} />}
      {tab === "corretoras" && <CorretorasTable corretoras={corretoras} />}
      {tab === "frete" && (
        <CatalogoSimplesTable
          itemLabel="Tipo de frete"
          placeholder="Ex: FOB, CIF, CFR"
          items={tiposFrete}
          createAction={createTipoFrete}
          updateAction={updateTipoFrete}
          deleteAction={deleteTipoFrete}
        />
      )}
      {tab === "embalagem" && (
        <CatalogoSimplesTable
          itemLabel="Tipo de embalagem"
          placeholder="Ex: Saca 60kg, Big bag"
          items={tiposEmbalagem}
          createAction={createTipoEmbalagem}
          updateAction={updateTipoEmbalagem}
          deleteAction={deleteTipoEmbalagem}
        />
      )}
      {tab === "pagamento" && (
        <CatalogoSimplesTable
          itemLabel="Forma de pagamento"
          placeholder="Ex: Carta de credito, 30/60/90 dias"
          items={formasPagamento}
          createAction={createFormaPagamento}
          updateAction={updateFormaPagamento}
          deleteAction={deleteFormaPagamento}
        />
      )}
      {tab === "amostra" && (
        <CatalogoSimplesTable
          itemLabel="Tipo de amostra"
          placeholder="Ex: Amostra de pre-embarque"
          items={tiposAmostra}
          createAction={createTipoAmostra}
          updateAction={updateTipoAmostra}
          deleteAction={deleteTipoAmostra}
        />
      )}
      {tab === "transportadora" && (
        <CatalogoSimplesTable
          itemLabel="Transportadora de amostra"
          placeholder="Ex: DHL, FedEx"
          items={transportadorasAmostra}
          createAction={createTransportadoraAmostra}
          updateAction={updateTransportadoraAmostra}
          deleteAction={deleteTransportadoraAmostra}
        />
      )}
      {tab === "cafe" && (
        <CatalogoSimplesTable
          itemLabel="Descricao do cafe"
          placeholder="Ex: Arabica tipo 6, bica corrida"
          items={descricoesCafe}
          createAction={createDescricaoCafe}
          updateAction={updateDescricaoCafe}
          deleteAction={deleteDescricaoCafe}
        />
      )}
    </div>
  );
}
