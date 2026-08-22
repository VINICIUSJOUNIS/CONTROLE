-- "frete" passa de valor monetario para uma escolha entre FOB e CIF (incoterm).
ALTER TABLE "contrato_confirmacao_negocio" ALTER COLUMN "frete" TYPE TEXT USING "frete"::text;
