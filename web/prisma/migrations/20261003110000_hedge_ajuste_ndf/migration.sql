-- TRAVA NDF: a coluna DESAGIO R$ da planilha (positivo = custo) vira AJUSTE R$
-- (positivo = ganho, formula de mercado do ajuste de NDF: nocional x (taxa de
-- liquidacao - taxa contratada)). Os desagios digitados na planilha, importados
-- em "desagioInformado", passam para "ajusteInformado" com o sinal invertido.
UPDATE "hedge_registros"
SET "dados" = ("dados" - 'desagioInformado')
  || jsonb_build_object('ajusteInformado', -(("dados"->>'desagioInformado')::numeric)),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "aba" = 'trava-ndf-us-nayme' AND "dados" ? 'desagioInformado';
