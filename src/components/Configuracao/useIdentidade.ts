import { useEffect, useState } from "react";

export type Identidade = {
  nome: string;
  logo: string; // imagem em data URL
};

const CHAVE = "vendas:identidade";
const EVENTO = "identidade-atualizada";

export const IDENTIDADE_PADRAO: Identidade = { nome: "", logo: "" };

export function lerIdentidade(): Identidade {
  try {
    const bruto = localStorage.getItem(CHAVE);
    return bruto ? { ...IDENTIDADE_PADRAO, ...JSON.parse(bruto) } : IDENTIDADE_PADRAO;
  } catch {
    return IDENTIDADE_PADRAO;
  }
}

export function salvarIdentidade(identidade: Identidade) {
  localStorage.setItem(CHAVE, JSON.stringify(identidade));
  window.dispatchEvent(new Event(EVENTO));
}

export function limparIdentidade() {
  localStorage.removeItem(CHAVE);
  window.dispatchEvent(new Event(EVENTO));
}

/** Use no Cabecalho para mostrar a logo e o nome definidos em Configuração. */
export function useIdentidade(): Identidade {
  const [identidade, setIdentidade] = useState<Identidade>(lerIdentidade);

  useEffect(() => {
    const atualizar = () => setIdentidade(lerIdentidade());
    window.addEventListener(EVENTO, atualizar);
    return () => window.removeEventListener(EVENTO, atualizar);
  }, []);

  return identidade;
}