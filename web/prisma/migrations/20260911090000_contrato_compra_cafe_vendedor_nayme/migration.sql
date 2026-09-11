-- A Nayme passa a ser sempre a vendedora no Contrato de Compra; os campos que
-- descreviam a contraparte como "vendedor" agora a descrevem como "comprador".
ALTER TABLE "contratos_compra_cafe" RENAME COLUMN "codigoVendedor" TO "codigoComprador";
ALTER TABLE "contratos_compra_cafe" RENAME COLUMN "nomeVendedor" TO "nomeComprador";
ALTER TABLE "contratos_compra_cafe" RENAME COLUMN "cnpjVendedor" TO "cnpjComprador";
ALTER TABLE "contratos_compra_cafe" RENAME COLUMN "enderecoVendedor" TO "enderecoComprador";
ALTER TABLE "contratos_compra_cafe" RENAME COLUMN "inscricaoEstadualVendedor" TO "inscricaoEstadualComprador";
ALTER TABLE "contratos_compra_cafe" RENAME COLUMN "grupoVendedor" TO "grupoComprador";
