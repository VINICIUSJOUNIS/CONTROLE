"use client";

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { geoCentroid } from "d3-geo";
import worldData from "world-atlas/countries-110m.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { formatCurrency } from "@/lib/format";
import { countryLabel, countryContinent, CONTINENTS, type Continent } from "@/lib/countries";
import type { SaleRow } from "@/lib/data";

type CountryStat = {
  count: number;
  kg: number;
  sacas: number;
  containers20: number;
  containers40: number;
  valueBRL: number;
  valueUSD: number;
  diferencialSoma: number;
  diferencialQtd: number;
};

function diferencialMedio(stat: { diferencialSoma: number; diferencialQtd: number }) {
  return stat.diferencialQtd > 0 ? stat.diferencialSoma / stat.diferencialQtd : null;
}

function formatDiferencial(v: number | null) {
  if (v == null) return "-";
  return `${v >= 0 ? "+" : ""}${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const SEQ_STEPS = 5;

const CONTINENT_COLOR: Record<Continent, string> = {
  América: "#f59e0b",
  Europa: "#3b82f6",
  África: "#ef4444",
  Ásia: "#8b5cf6",
  Oceania: "#10b981",
};

export function WorldMap({ sales }: { sales: SaleRow[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState("todos");
  const [continentFilter, setContinentFilter] = useState<"todos" | Continent>("todos");

  const years = useMemo(
    () =>
      Array.from(
        new Set(
          sales.filter((s) => s.clientType === "EXTERNO" && s.country).map((s) => s.saleDate.slice(0, 4))
        )
      ).sort(),
    [sales]
  );

  const filteredSales = useMemo(() => {
    if (yearFilter === "todos") return sales;
    return sales.filter((s) => s.saleDate.slice(0, 4) === yearFilter);
  }, [sales, yearFilter]);

  const statsByCountry = useMemo(() => {
    const map = new Map<string, CountryStat>();
    for (const s of filteredSales) {
      if (s.clientType !== "EXTERNO" || !s.country) continue;
      const cur =
        map.get(s.country) ??
        {
          count: 0,
          kg: 0,
          sacas: 0,
          containers20: 0,
          containers40: 0,
          valueBRL: 0,
          valueUSD: 0,
          diferencialSoma: 0,
          diferencialQtd: 0,
        };
      cur.count += 1;
      cur.kg += s.quantityKg;
      cur.sacas += s.quantitySacas;
      cur.containers20 += s.containers20 ?? 0;
      cur.containers40 += s.containers40 ?? 0;
      cur.valueBRL += s.valueBRL;
      cur.valueUSD += s.valueUSD ?? 0;
      if (s.diferencial != null) {
        cur.diferencialSoma += s.diferencial;
        cur.diferencialQtd += 1;
      }
      map.set(s.country, cur);
    }
    return map;
  }, [filteredSales]);

  const hoveredStat = hovered ? statsByCountry.get(hovered) : null;

  const totalValueBRL = [...statsByCountry.values()].reduce((s, v) => s + v.valueBRL, 0);
  const maxValueBRL = Math.max(0, ...[...statsByCountry.values()].map((v) => v.valueBRL));
  const minValueBRL = statsByCountry.size > 0 ? Math.min(...[...statsByCountry.values()].map((v) => v.valueBRL)) : 0;

  function seqStep(value: number) {
    if (maxValueBRL <= minValueBRL) return SEQ_STEPS - 1;
    const t = (value - minValueBRL) / (maxValueBRL - minValueBRL);
    return Math.min(SEQ_STEPS - 1, Math.floor(t * SEQ_STEPS));
  }

  if (statsByCountry.size === 0 && yearFilter === "todos") {
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

  const rankedCountries = [...statsByCountry.entries()]
    .filter(([id]) => continentFilter === "todos" || countryContinent(id) === continentFilter)
    .sort((a, b) => b[1].valueBRL - a[1].valueBRL);

  const continentTotals = new Map<Continent, { valueBRL: number; count: number }>();
  for (const [id, stat] of statsByCountry) {
    const cont = countryContinent(id);
    if (!cont) continue;
    const cur = continentTotals.get(cont) ?? { valueBRL: 0, count: 0 };
    cur.valueBRL += stat.valueBRL;
    cur.count += 1;
    continentTotals.set(cont, cur);
  }
  const rankedContinents = CONTINENTS.filter((c) => continentTotals.has(c)).sort(
    (a, b) => (continentTotals.get(b)?.valueBRL ?? 0) - (continentTotals.get(a)?.valueBRL ?? 0)
  );

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>Países para onde já exportamos</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="w-auto">
            <option value="todos">Todos os anos</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
          <Select
            value={continentFilter}
            onChange={(e) => setContinentFilter(e.target.value as "todos" | Continent)}
            className="w-auto"
          >
            <option value="todos">Todos os continentes</option>
            {CONTINENTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="map-viz-root grid gap-4 lg:grid-cols-[1fr_340px]">
          <style>{`
            .map-viz-root {
              --seq-0: #d4ecec;
              --seq-1: #a6d3d5;
              --seq-2: #5fabb0;
              --seq-3: #2a8f97;
              --seq-4: #0e4a4f;
              --seq-none: #e2e6e6;
              --map-stroke: rgba(11, 11, 11, 0.16);
              --hover-ring: var(--color-success);
            }
            .dark .map-viz-root {
              --seq-0: #123638;
              --seq-1: #1c5257;
              --seq-2: #2c7d84;
              --seq-3: #4fabb3;
              --seq-4: #8fd4d9;
              --seq-none: #33393a;
              --map-stroke: rgba(255, 255, 255, 0.16);
            }
          `}</style>

          <div className="min-w-0">
            {rankedContinents.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {rankedContinents.map((c) => {
                  const totals = continentTotals.get(c)!;
                  const pct = totalValueBRL > 0 ? (totals.valueBRL / totalValueBRL) * 100 : 0;
                  const active = continentFilter === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setContinentFilter(active ? "todos" : c)}
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        active ? "border-primary bg-primary/10" : "border-border hover:bg-background"
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: CONTINENT_COLOR[c] }}
                      />
                      <span className="font-medium">{c}</span>
                      <span className="text-muted">
                        {totals.count} · {pct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="overflow-hidden rounded-lg border border-border bg-background">
              <ComposableMap projection="geoEqualEarth" projectionConfig={{ scale: 150 }} style={{ width: "100%", height: "auto" }}>
                <Geographies geography={worldData}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const id = String(geo.id);
                      const stat = statsByCountry.get(id);
                      const exported = Boolean(stat);
                      const cont = countryContinent(id);
                      const dimmed = continentFilter !== "todos" && cont !== continentFilter;
                      const fill = stat ? `var(--seq-${seqStep(stat.valueBRL)})` : "var(--seq-none)";
                      const isHovered = hovered === id;
                      const geography = (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onMouseEnter={() => {
                            setHovered(id);
                            setHoveredName(String(geo.properties?.name ?? id));
                          }}
                          onMouseLeave={() => {
                            setHovered(null);
                            setHoveredName(null);
                          }}
                          style={{
                            default: {
                              fill,
                              fillOpacity: dimmed ? 0.25 : 1,
                              stroke: isHovered ? "var(--hover-ring)" : "var(--map-stroke)",
                              strokeWidth: isHovered ? 1.75 : 0.5,
                              outline: "none",
                            },
                            hover: {
                              fill,
                              fillOpacity: dimmed ? 0.25 : 1,
                              stroke: "var(--hover-ring)",
                              strokeWidth: 1.75,
                              outline: "none",
                              cursor: exported ? "pointer" : "default",
                            },
                            pressed: {
                              fill,
                              fillOpacity: dimmed ? 0.25 : 1,
                              stroke: "var(--hover-ring)",
                              strokeWidth: 1.75,
                              outline: "none",
                            },
                          }}
                        >
                          <title>{countryLabel(id) !== "-" ? countryLabel(id) : String(geo.properties?.name ?? id)}</title>
                        </Geography>
                      );

                      if (!exported || dimmed) return geography;

                      const centroid = geoCentroid(geo);
                      if (!Number.isFinite(centroid[0]) || !Number.isFinite(centroid[1])) return geography;

                      return (
                        <g key={geo.rsmKey}>
                          {geography}
                          <Marker coordinates={centroid as [number, number]}>
                            <image
                              href="/nayme-logo.png"
                              x={-4}
                              y={-4}
                              width={8}
                              height={8}
                              style={{ pointerEvents: "none" }}
                            />
                          </Marker>
                        </g>
                      );
                    })
                  }
                </Geographies>
              </ComposableMap>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
              <div className="flex items-center gap-2">
                <span>Faturamento (R$)</span>
                <div className="flex overflow-hidden rounded-sm border border-border">
                  {Array.from({ length: SEQ_STEPS }).map((_, i) => (
                    <span key={i} className="h-3 w-6" style={{ background: `var(--seq-${i})` }} />
                  ))}
                </div>
                <span>
                  {formatCurrency(minValueBRL)} → {formatCurrency(maxValueBRL)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm border border-border" style={{ background: "var(--seq-none)" }} />
                <span>Ainda não exportamos</span>
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            {hovered ? (
              <Card className="border-primary/40 bg-primary/5 p-3">
                <div className="flex items-center gap-2">
                  {countryContinent(hovered) && (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: CONTINENT_COLOR[countryContinent(hovered)!] }}
                    />
                  )}
                  <p className="font-semibold">
                    {countryLabel(hovered) !== "-" ? countryLabel(hovered) : hoveredName}
                  </p>
                </div>
                {countryContinent(hovered) && (
                  <p className="text-xs text-muted">{countryContinent(hovered)}</p>
                )}
                {hoveredStat ? (
                  <>
                    <p className="mt-2 text-xs text-muted">{hoveredStat.count} venda(s)</p>
                    <p className="mt-2 text-sm">{hoveredStat.kg.toLocaleString("pt-BR")} kg</p>
                    <p className="text-sm">
                      {hoveredStat.sacas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} sacas (60kg)
                    </p>
                    <p className="text-sm">
                      {hoveredStat.containers20.toLocaleString("pt-BR")} cnt 20&apos; ·{" "}
                      {hoveredStat.containers40.toLocaleString("pt-BR")} cnt 40&apos;
                    </p>
                    <p className="mt-2 text-sm font-medium">{formatCurrency(hoveredStat.valueBRL)}</p>
                    {hoveredStat.valueUSD > 0 && (
                      <p className="text-sm">US$ {hoveredStat.valueUSD.toLocaleString("pt-BR")}</p>
                    )}
                    {totalValueBRL > 0 && (
                      <p className="text-xs text-muted">
                        {((hoveredStat.valueBRL / totalValueBRL) * 100).toLocaleString("pt-BR", {
                          maximumFractionDigits: 1,
                        })}
                        % do faturamento externo
                      </p>
                    )}
                    <p className="text-xs text-muted">
                      Diferencial médio:{" "}
                      <span className={(diferencialMedio(hoveredStat) ?? 0) < 0 ? "text-danger" : undefined}>
                        {formatDiferencial(diferencialMedio(hoveredStat))}
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-muted">Ainda não exportamos para cá.</p>
                )}
              </Card>
            ) : (
              <p className="text-xs text-muted">Passe o mouse sobre um país para ver o detalhe.</p>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Países ({rankedCountries.length})
              </p>
              {rankedCountries.length === 0 ? (
                <p className="text-xs text-muted">Nenhum país exportado neste filtro.</p>
              ) : (
                <div className="space-y-3">
                  {rankedContinents
                    .filter((c) => continentFilter === "todos" || c === continentFilter)
                    .map((continent) => {
                      const paisesDoContinente = rankedCountries.filter(
                        ([id]) => countryContinent(id) === continent
                      );
                      if (paisesDoContinente.length === 0) return null;
                      const totals = continentTotals.get(continent)!;
                      return (
                        <div key={continent}>
                          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ background: CONTINENT_COLOR[continent] }}
                            />
                            {continent}
                            <span className="font-normal">
                              ({paisesDoContinente.length} ·{" "}
                              {totalValueBRL > 0
                                ? ((totals.valueBRL / totalValueBRL) * 100).toLocaleString("pt-BR", {
                                    maximumFractionDigits: 1,
                                  })
                                : 0}
                              %)
                            </span>
                          </p>
                          <ul className="space-y-1 text-sm [font-variant-numeric:tabular-nums]">
                            {paisesDoContinente.map(([id, stat]) => (
                              <li key={id} className="flex items-center gap-2 pl-3.5">
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                                  style={{ background: `var(--seq-${seqStep(stat.valueBRL)})` }}
                                />
                                <span className="min-w-0 flex-1 leading-snug break-words">{countryLabel(id)}</span>
                                <span className="shrink-0 whitespace-nowrap text-right text-xs text-muted">
                                  {stat.sacas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} sc ·{" "}
                                  {totalValueBRL > 0
                                    ? ((stat.valueBRL / totalValueBRL) * 100).toLocaleString("pt-BR", {
                                        maximumFractionDigits: 1,
                                      })
                                    : 0}
                                  %
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
