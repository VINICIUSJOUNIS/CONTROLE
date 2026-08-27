// Converte um valor monetario para a forma por extenso em portugues (ex: 63654.04 ->
// "sessenta e tres mil seiscentos e cinquenta e quatro dolares e quatro centavos de dolar").
// Usado para sugerir o campo "valor por extenso" da Transferencia de Ordem - o usuario pode
// editar o resultado livremente.

const UNIDADES = [
  "zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  "dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove",
];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
  "seiscentos", "setecentos", "oitocentos", "novecentos",
];

function under1000(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (c > 0) parts.push(CENTENAS[c]);
  if (r > 0) {
    if (c > 0) parts.push("e");
    if (r < 20) parts.push(UNIDADES[r]);
    else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      parts.push(u === 0 ? DEZENAS[d] : `${DEZENAS[d]} e ${UNIDADES[u]}`);
    }
  }
  return parts.join(" ");
}

function joinGroups(parts: string[], lastGroupValue: number): string {
  if (parts.length === 0) return "zero";
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const head = parts.slice(0, -1).join(" ");
  const useE = lastGroupValue > 0 && (lastGroupValue < 100 || lastGroupValue % 100 === 0);
  return `${head}${useE ? " e " : " "}${last}`;
}

// Numero inteiro (sem casas decimais) por extenso, ex: 63654 -> "sessenta e tres mil ...".
export function inteiroPorExtenso(n: number): string {
  const value = Math.floor(Math.abs(n));
  if (value === 0) return "zero";

  const bilhoes = Math.floor(value / 1_000_000_000);
  let resto = value % 1_000_000_000;
  const milhoes = Math.floor(resto / 1_000_000);
  resto = resto % 1_000_000;
  const milhares = Math.floor(resto / 1000);
  const unidadesGrupo = resto % 1000;

  const parts: string[] = [];
  let lastGroupValue = 0;

  if (bilhoes > 0) {
    parts.push(`${under1000(bilhoes)} ${bilhoes === 1 ? "bilhão" : "bilhões"}`);
    lastGroupValue = bilhoes;
  }
  if (milhoes > 0) {
    parts.push(`${under1000(milhoes)} ${milhoes === 1 ? "milhão" : "milhões"}`);
    lastGroupValue = milhoes;
  }
  if (milhares > 0) {
    parts.push(milhares === 1 ? "mil" : `${under1000(milhares)} mil`);
    lastGroupValue = milhares;
  }
  if (unidadesGrupo > 0) {
    parts.push(under1000(unidadesGrupo));
    lastGroupValue = unidadesGrupo;
  }

  return joinGroups(parts, lastGroupValue);
}

const MOEDA_NOMES: Record<string, { singular: string; plural: string }> = {
  USD: { singular: "dólar", plural: "dólares" },
  EUR: { singular: "euro", plural: "euros" },
  BRL: { singular: "real", plural: "reais" },
  GBP: { singular: "libra esterlina", plural: "libras esterlinas" },
};

// Valor monetario por extenso completo, com moeda e centavos, ex:
// valorPorExtenso(63654.04, "USD") -> "sessenta e tres mil seiscentos e cinquenta e quatro
// dolares e quatro centavos de dolar".
export function valorPorExtenso(valor: number, moeda: string): string {
  const nomes = MOEDA_NOMES[moeda] ?? MOEDA_NOMES.USD;
  const inteiro = Math.floor(Math.abs(valor) + 1e-9);
  const centavos = Math.round((Math.abs(valor) - inteiro) * 100);

  // "de" entra quando o numero termina exatamente em milhao/milhoes/bilhao/bilhoes
  // (ex: "um milhao DE dolares"), mas nao quando sobra "mil" ou unidades depois
  // (ex: "um milhao e cinquenta dolares", sem "de").
  const precisaDe = inteiro > 0 && inteiro % 1_000_000 === 0;
  const parteInteira = `${inteiroPorExtenso(inteiro)}${precisaDe ? " de" : ""} ${inteiro === 1 ? nomes.singular : nomes.plural}`;
  if (centavos === 0) return parteInteira;

  const parteCentavos = `${inteiroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"} de ${nomes.singular}`;
  return `${parteInteira} e ${parteCentavos}`;
}
