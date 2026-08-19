"use client";

import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency } from "@/lib/format";
import { countryNameToCode } from "@/lib/country-codes";
import type { PaisExportacao } from "@/lib/hedge-data";

const GEO_URL = "/world-countries-110m.json";

export function WorldMapCard({ paises }: { paises: PaisExportacao[] }) {
  const byCode = new Map<string, PaisExportacao>();
  for (const p of paises) {
    const code = countryNameToCode(p.country);
    if (code) byCode.set(code, p);
  }

  const maxValor = Math.max(1, ...paises.map((p) => p.valorUsd));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paises que Exportamos</CardTitle>
      </CardHeader>
      <CardContent>
        <ComposableMap projectionConfig={{ scale: 140 }} style={{ width: "100%", height: "auto" }}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const pais = byCode.get(geo.id as string);
                const intensity = pais ? 0.25 + 0.75 * (pais.valorUsd / maxValor) : 0;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: {
                        fill: pais ? `color-mix(in srgb, var(--primary) ${intensity * 100}%, var(--card))` : "var(--border)",
                        stroke: "var(--background)",
                        strokeWidth: 0.5,
                        outline: "none",
                      },
                      hover: {
                        fill: pais ? "var(--primary)" : "var(--muted)",
                        stroke: "var(--background)",
                        strokeWidth: 0.5,
                        outline: "none",
                      },
                      pressed: {
                        fill: "var(--primary)",
                        outline: "none",
                      },
                    }}
                  >
                    <title>
                      {pais
                        ? `${geo.properties.name}: ${pais.totalContratos} contrato(s), ${formatCompactCurrency(pais.valorUsd, "USD")}`
                        : geo.properties.name}
                    </title>
                  </Geography>
                );
              })
            }
          </Geographies>
        </ComposableMap>

        {paises.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {paises.slice(0, 8).map((p) => (
              <div key={p.country} className="flex items-center gap-1.5 text-xs text-muted">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                {p.country} - {p.totalContratos} contrato{p.totalContratos === 1 ? "" : "s"}
              </div>
            ))}
          </div>
        )}
        {paises.length === 0 && (
          <p className="mt-3 text-sm text-muted">Nenhum contrato com pais definido ainda.</p>
        )}
      </CardContent>
    </Card>
  );
}
