import { useCallback, useState } from "react";

/**
 * Mantém apenas dígitos e descarta zeros à esquerda:
 * "025" vira "25" e "0" continua "0".
 */
export function normalizarDigitos(texto: string): string {
  return texto.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

/**
 * Campo numérico inteiro controlado.
 *
 * O zero inicial continua visível, mas não é somado ao número digitado:
 * os zeros à esquerda são removidos e o valor exibido é sempre o que o
 * usuário digitou.
 */
export function useCampoNumero(valorInicial = 0) {
  const [texto, setTexto] = useState(() => String(valorInicial));

  const valor = Number(texto) || 0;

  const alterar = useCallback((novoTexto: string) => {
    setTexto(normalizarDigitos(novoTexto));
  }, []);

  const resetar = useCallback(() => {
    setTexto(String(valorInicial));
  }, [valorInicial]);

  return { texto, valor, alterar, resetar };
}
