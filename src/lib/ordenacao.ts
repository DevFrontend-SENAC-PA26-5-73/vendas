export type DirecaoOrdenacao = "asc" | "desc";

export function ordenarLista<T>(
  itens: T[],
  obterValor: (item: T) => string | number | null | undefined,
  direcao: DirecaoOrdenacao,
): T[] {
  return [...itens].sort((primeiro, segundo) => {
    const valorPrimeiro = obterValor(primeiro);
    const valorSegundo = obterValor(segundo);

    let comparacao: number;
    if (typeof valorPrimeiro === "number" && typeof valorSegundo === "number") {
      comparacao = valorPrimeiro - valorSegundo;
    } else {
      comparacao = String(valorPrimeiro ?? "").localeCompare(
        String(valorSegundo ?? ""),
        "pt-BR",
        { numeric: true, sensitivity: "base" },
      );
    }

    return direcao === "asc" ? comparacao : -comparacao;
  });
}