/* Máscaras e filtros de digitação. Colocar em src/lib/mascaras.ts */

export function somenteDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

/** 12345678900 -> 123.456.789-00 */
export function mascararCpf(valor: string) {
  return somenteDigitos(valor)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

/** 11987654321 -> (11) 98765-4321 | 1134567890 -> (11) 3456-7890 */
export function mascararTelefone(valor: string) {
  const d = somenteDigitos(valor).slice(0, 11);

  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }

  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** 01001000 -> 01001-000 */
export function mascararCep(valor: string) {
  const d = somenteDigitos(valor).slice(0, 8);

  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Só letras (com acentos), espaço, apóstrofo e hífen. */
export function apenasLetras(valor: string) {
  return valor
    .replace(/[^\p{L}\s'-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s/, "");
}

/** Nomes de rua aceitam letras, números e alguns símbolos comuns. */
export function apenasEndereco(valor: string) {
  return valor
    .replace(/[^\p{L}\p{N}\s.,'/-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s/, "");
}

/** Sigla do estado: 2 letras maiúsculas. */
export function apenasUf(valor: string) {
  return valor.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();
}

export function limparEmail(valor: string) {
  return valor.replace(/\s/g, "").toLowerCase();
}

/** Valor monetário em digitação: só números, uma vírgula, 2 casas. */
export function limparDecimal(valor: string) {
  const texto = valor.replace(/[^\d.,]/g, "").replace(/\./g, ",");
  const [inteiro, ...resto] = texto.split(",");

  return resto.length > 0
    ? `${inteiro},${resto.join("").slice(0, 2)}`
    : inteiro;
}

export function cpfValido(cpf: string) {
  const d = somenteDigitos(cpf);

  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;

  const digito = (base: string, pesoInicial: number) => {
    const soma = base
      .split("")
      .reduce((total, n, i) => total + Number(n) * (pesoInicial - i), 0);
    const resto = (soma * 10) % 11;

    return resto === 10 ? 0 : resto;
  };

  return (
    digito(d.slice(0, 9), 10) === Number(d[9]) &&
    digito(d.slice(0, 10), 11) === Number(d[10])
  );
}

export function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

/** Confere se a sigla existe entre os 27 estados. */
export function ufValida(uf: string) {
  return UFS.includes(uf.toUpperCase());
}

/** 10 ou 11 dígitos, DDD a partir de 11 e celular começando com 9. */
export function telefoneValido(telefone: string) {
  const d = somenteDigitos(telefone);

  if (d.length !== 10 && d.length !== 11) return false;
  if (Number(d.slice(0, 2)) < 11) return false;
  if (d.length === 11 && d[2] !== "9") return false;

  return true;
}

/** Pelo menos duas palavras com 2 letras ou mais (nome e sobrenome). */
export function nomeCompletoValido(nome: string) {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter((parte) => parte.length >= 2);

  return partes.length >= 2;
}