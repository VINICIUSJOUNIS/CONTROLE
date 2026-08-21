-- Expande o enum de status do contrato dos 6 estagios amplos anteriores para as
-- 20 etapas operacionais reais da Mesa de Operacao (lista da area de operacoes).
-- Contratos existentes sao remapeados para a etapa nova equivalente mais proxima;
-- a posicao pode ser ajustada manualmente depois pelo board da Mesa de Operacao.
CREATE TYPE "StatusContrato_new" AS ENUM (
  'CONFIRMACAO_NEGOCIO',
  'ASSINATURA_CONTRATO',
  'ENVIO_AMOSTRA_PSS',
  'APROVACAO_AMOSTRA_PSS',
  'ENVIO_ARTE_SACARIA',
  'APROVACAO_ARTE_SACARIA',
  'ENVIO_INSTRUCAO_EMBARQUE',
  'BOOKING',
  'MARCACAO_EMBARQUE_TRANSPORTADORA',
  'ESTUFAGEM_CARREGAMENTO',
  'RECEBIMENTO_BL',
  'ENVIO_DOCUMENTOS_APROVACAO',
  'APROVACAO_DOCUMENTOS',
  'ENVIO_FINANCIAMENTO_RTS',
  'TRADUCAO_PEDIDO_LEGALIZACAO',
  'EMISSAO_CARTA_BORDERO',
  'ENVIO_DOCUMENTOS_BANCO_CLIENTE',
  'RECEBIMENTO_CLIENTE',
  'ENVIO_BL_ORIGINAL_TELEX',
  'LIBERACAO_CARGA'
);

ALTER TABLE "contratos_exportacao" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "contratos_exportacao"
  ALTER COLUMN "status" TYPE "StatusContrato_new"
  USING (
    CASE "status"::text
      WHEN 'CONTRATO_ASSINADO' THEN 'ASSINATURA_CONTRATO'
      WHEN 'PRE_EMBARQUE' THEN 'ENVIO_INSTRUCAO_EMBARQUE'
      WHEN 'ESTUFAGEM_PORTO' THEN 'ESTUFAGEM_CARREGAMENTO'
      WHEN 'EMBARCADO' THEN 'RECEBIMENTO_BL'
      WHEN 'CARGA_DESTINO' THEN 'ENVIO_BL_ORIGINAL_TELEX'
      WHEN 'CONTRATO_FINALIZADO' THEN 'LIBERACAO_CARGA'
    END
  )::"StatusContrato_new";

DROP TYPE "StatusContrato";
ALTER TYPE "StatusContrato_new" RENAME TO "StatusContrato";

ALTER TABLE "contratos_exportacao" ALTER COLUMN "status" SET DEFAULT 'CONFIRMACAO_NEGOCIO';
