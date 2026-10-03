-- Remove do modulo Hedge as abas SINTETICO EM REAIS - BANCOS, LOTE ESPECIAL,
-- LIQUIDEZ e NET QUALIDADE (retiradas do sistema a pedido). So havia os
-- registros importados da planilha em 20261003100100, sem alteracoes.
DELETE FROM "hedge_registros"
WHERE "aba" IN ('sintetico-em-reais-bancos', 'lote-especial', 'liquidez', 'net-qualidade');
