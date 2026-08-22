-- Insere a nova etapa "Proforma Invoice" entre Assinatura de Contrato e
-- Envio de Amostra de Aprovacao (PSS). Contratos existentes nao mudam de
-- etapa - a nova opcao so passa a existir para novas movimentacoes.
ALTER TYPE "StatusContrato" ADD VALUE 'PROFORMA_INVOICE' AFTER 'ASSINATURA_CONTRATO';
