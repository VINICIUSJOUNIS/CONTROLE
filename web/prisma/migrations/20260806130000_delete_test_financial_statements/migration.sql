-- Remove os balancetes de teste (Instituto dos Missionarios, 2020/2021)
-- lancados na migration anterior - eram dados ficticios usados so para
-- validar o novo layout de Analise de Credito. O balancete oficial real
-- sera lancado em seguida.

DELETE FROM "financial_statements";
