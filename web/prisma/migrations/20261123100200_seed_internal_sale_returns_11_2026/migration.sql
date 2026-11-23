-- Importa a devolucao de venda do mercado interno de 10/11/2026, a partir do
-- relatorio "DEVOLUCAO VENDA INTERNO 11-2026.pdf". Nenhuma devolucao de
-- novembro estava gravada (a ultima e de 28/10/2026).
-- clientName grafado como nas vendas ja gravadas (CAFE TRES CORACOES S.A),
-- para que getSaleReturns resolva o tipo INTERNO pelo nome.
-- Soma: 220,02 kg / R$ 3.740,34.
INSERT INTO "sale_returns" ("id", "clientName", "quantityKg", "returnDate", "valueBRL", "createdAt", "updatedAt") VALUES
('2e6b6960-c68f-4672-8ba1-c24bca0d5058', 'CAFE TRES CORACOES S.A', 220.02, '2026-11-10', 3740.34, '2026-11-23T12:00:00.000Z', '2026-11-23T12:00:00.000Z');
