-- Corrige as utilizacoes de Santander de 2026 importadas na migration
-- 20260905140000: elas estavam splitadas entre as 2 contas cadastradas
-- (taxa 16,2% e 2,16%), mas o usuario confirmou que em 2026 so a conta de
-- 2,16% foi usada - a de 16,2% nao teve movimento nesse ano. Remove as 14
-- linhas de 2026 (7 meses x 2 contas) e insere de volta so na conta de
-- 2,16%, com o valor cheio do mes (sem split), mantendo jurosReal/iofReal
-- exatos do PDF. 2025 fica como estava (splitado entre as 2 contas).

DELETE FROM "contas_garantidas_usos"
WHERE "contaGarantidaId" IN ('d7aff0d1-2a02-4384-aba0-5f388dfe26e1', 'e5ff7f29-77c6-4a7c-802e-019a9b51f147')
  AND "dataInicio" >= '2026-01-01'
  AND "dataInicio" <= '2026-07-31'
  AND "observacao" LIKE 'Juros/IOF de%(SANTANDER(%';

INSERT INTO "contas_garantidas_usos" ("id", "contaGarantidaId", "valorUtilizado", "jurosReal", "iofReal", "dataInicio", "dataFim", "observacao", "createdAt", "updatedAt") VALUES
('2197bca0-fc7d-4418-82dc-4bacae0185d6', 'e5ff7f29-77c6-4a7c-802e-019a9b51f147', 0.00, 7147.50, 765.23, '2026-01-01', '2026-01-31', 'Juros/IOF de 2026-01 (SANTANDER 2,16%) - valor real do documento JUROS/IOF DE CONTA GARANTIDA.pdf, sem calculo', '2026-09-06T12:00:00.000Z', '2026-09-06T12:00:00.000Z'),
('273be314-0405-4c1f-9b07-e339f0052f82', 'e5ff7f29-77c6-4a7c-802e-019a9b51f147', 0.00, 4373.26, 4833.19, '2026-02-01', '2026-02-28', 'Juros/IOF de 2026-02 (SANTANDER 2,16%) - valor real do documento JUROS/IOF DE CONTA GARANTIDA.pdf, sem calculo', '2026-09-06T12:00:00.000Z', '2026-09-06T12:00:00.000Z'),
('822b1539-d8e0-40b8-9564-83e29c673064', 'e5ff7f29-77c6-4a7c-802e-019a9b51f147', 0.00, 5550.40, 954.50, '2026-03-01', '2026-03-31', 'Juros/IOF de 2026-03 (SANTANDER 2,16%) - valor real do documento JUROS/IOF DE CONTA GARANTIDA.pdf, sem calculo', '2026-09-06T12:00:00.000Z', '2026-09-06T12:00:00.000Z'),
('98c20641-aa51-48a8-888f-592a55b5d9e9', 'e5ff7f29-77c6-4a7c-802e-019a9b51f147', 0.00, 8508.43, 6739.51, '2026-04-01', '2026-04-30', 'Juros/IOF de 2026-04 (SANTANDER 2,16%) - valor real do documento JUROS/IOF DE CONTA GARANTIDA.pdf, sem calculo', '2026-09-06T12:00:00.000Z', '2026-09-06T12:00:00.000Z'),
('08f902da-1a73-46e5-887e-5b8538eb1615', 'e5ff7f29-77c6-4a7c-802e-019a9b51f147', 0.00, 10642.98, 8891.36, '2026-05-01', '2026-05-31', 'Juros/IOF de 2026-05 (SANTANDER 2,16%) - valor real do documento JUROS/IOF DE CONTA GARANTIDA.pdf, sem calculo', '2026-09-06T12:00:00.000Z', '2026-09-06T12:00:00.000Z'),
('9e8e2d55-8c94-48cd-8a8e-b7bfd2fbcd77', 'e5ff7f29-77c6-4a7c-802e-019a9b51f147', 0.00, 3220.59, 2316.38, '2026-06-01', '2026-06-30', 'Juros/IOF de 2026-06 (SANTANDER 2,16%) - valor real do documento JUROS/IOF DE CONTA GARANTIDA.pdf, sem calculo', '2026-09-06T12:00:00.000Z', '2026-09-06T12:00:00.000Z'),
('0d9d06ea-5cc0-42cb-9c71-22f7b64ca166', 'e5ff7f29-77c6-4a7c-802e-019a9b51f147', 0.00, 13239.47, 5959.48, '2026-07-01', '2026-07-31', 'Juros/IOF de 2026-07 (SANTANDER 2,16%) - valor real do documento JUROS/IOF DE CONTA GARANTIDA.pdf, sem calculo', '2026-09-06T12:00:00.000Z', '2026-09-06T12:00:00.000Z');
