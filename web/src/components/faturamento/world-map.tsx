"use client";

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import worldData from "world-atlas/countries-110m.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { countryLabel } from "@/lib/countries";
import type { SaleRow } from "@/lib/data";

type CountryStat = {
  count: number;
  kg: number;
  sacas: number;
  containers: number;
  valueBRL: number;
  valueUSD: number;
};

export function WorldMap({ sales }: { sales: SaleRow[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const statsByCountry = useMemo(() => {
    const map = new Map<string, CountryStat>();
    for (const s of sales) {
      if (s.clientType !== "EXTERNO" || !s.country) continue;
      const cur =
        map.get(s.country) ?? { count: 0, kg: 0, sacas: 0, containers: 0, valueBRL: 0, valueUSD: 0 };
      cur.count += 1;
      cur.kg += s.quantityKg;
      cur.sacas += s.quantitySacas;
      cur.containers += s.containerCount ?? 0;
      cur.valueBRL += s.valueBRL;
      cur.valueUSD += s.valueUSD ?? 0;
      map.set(s.country, cur);
    }
    return map;
  }, [sales]);

  const hoveredStat = hovered ? statsByCountry.get(hovered) : null;

  if (statsByCountry.size === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Países para onde já exportamos</CardTitle>
        </CardHeader>
        <CardContent className="py-10 text-center text-sm text-muted">
          Nenhuma venda para cliente externo registrada ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Países para onde já exportamos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div className="overflow-hidden rounded-lg border border-border">
            <ComposableMap projection="geoEqualEarth" projectionConfig={{ scale: 150 }} style={{ width: "100%", height: "auto" }}>
              <Geographies geography={worldData}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const id = String(geo.id);
                    const exported = statsByCountry.has(id);
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onMouseEnter={() => exported && setHovered(id)}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                          default: {
                            fill: exported ? "var(--color-primary)" : "var(--color-border)",
                            stroke: "var(--color-card)",
                            strokeWidth: 0.5,
                            outline: "none",
                          },
                          hover: {
                            fill: exported ? "var(--color-success)" : "var(--color-border)",
                            stroke: "var(--color-card)",
                            strokeWidth: 0.5,
                            outline: "none",
                            cursor: exported ? "pointer" : "default",
                          },
                          pressed: {
                            fill: "var(--color-success)",
                            outline: "none",
                          },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "var(--color-primary)" }} />
              Já exportamos
              <span className="ml-2 inline-block h-3 w-3 rounded-sm" style={{ background: "var(--color-border)" }} />
              Ainda não
            </div>

            {hoveredStat && hovered ? (
              <Card className="border-primary/40 bg-primary/5 p-3">
                <p className="font-semibold">{countryLabel(hovered)}</p>
                <p className="mt-1 text-xs text-muted">{hoveredStat.count} venda(s)</p>
                <p className="mt-2 text-sm">{hoveredStat.kg.toLocaleString("pt-BR")} kg</p>
                <p className="text-sm">{hoveredStat.sacas.toLocaleString("pt-BR")} sacas (60kg)</p>
                <p className="text-sm">{hoveredStat.containers.toLocaleString("pt-BR")} contêiner(es)</p>
                <p className="mt-2 text-sm font-medium">{formatCurrency(hoveredStat.valueBRL)}</p>
                {hoveredStat.valueUSD > 0 && (
                  <p className="text-sm">US$ {hoveredStat.valueUSD.toLocaleString("pt-BR")}</p>
                )}
              </Card>
            ) : (
              <p className="text-xs text-muted">Passe o mouse sobre um país destacado para ver o detalhe.</p>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Países ({statsByCountry.size})
              </p>
              <ul className="space-y-1 text-sm">
                {[...statsByCountry.entries()]
                  .sort((a, b) => b[1].valueBRL - a[1].valueBRL)
                  .map(([id, stat]) => (
                    <li key={id} className="flex justify-between gap-2">
                      <span>{countryLabel(id)}</span>
                      <span className="text-muted">
                        {stat.sacas.toLocaleString("pt-BR")} sc · {stat.containers.toLocaleString("pt-BR")} cnt
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
