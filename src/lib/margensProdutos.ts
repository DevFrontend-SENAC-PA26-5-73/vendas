const CHAVE_MARGENS_MINIMAS = "vendas:margens-minimas:v1";

export type CategoriaProduto = {
  valor: string;
  label: string;
  margemBase: number;
  prefixo: string;
};

export type MargensPorCategoria = Record<string, number>;
export type MargensMinimasProdutos = Record<number, number>;

export const CATEGORIAS_PRODUTOS: CategoriaProduto[] = [
  { valor: "camisa", label: "Camisa", margemBase: 35, prefixo: "110" },
  { valor: "calca", label: "Calça", margemBase: 40, prefixo: "120" },
  { valor: "sapato", label: "Sapato", margemBase: 45, prefixo: "130" },
  { valor: "acessorio", label: "Acessório", margemBase: 50, prefixo: "140" },
  { valor: "vestido", label: "Vestido", margemBase: 38, prefixo: "150" },
  { valor: "jaqueta", label: "Jaqueta", margemBase: 42, prefixo: "160" },
  { valor: "roupa", label: "Roupa", margemBase: 30, prefixo: "170" },
  { valor: "outro", label: "Outro", margemBase: 25, prefixo: "900" },
];

export function normalizarCategoriaProduto(valor: string): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function obterCategoriaProduto(valor: string): CategoriaProduto | undefined {
  const chave = normalizarCategoriaProduto(valor);
  return CATEGORIAS_PRODUTOS.find(
    (categoria) => normalizarCategoriaProduto(categoria.valor) === chave,
  );
}

export function lerMargensCategoriasProdutos(): MargensPorCategoria {
  return Object.fromEntries(
    CATEGORIAS_PRODUTOS.map((categoria) => [
      normalizarCategoriaProduto(categoria.valor),
      categoria.margemBase,
    ]),
  );
}

export function salvarMargemCategoriaProduto(
  categoria: string,
  margem: number,
): MargensPorCategoria {
  const margens = lerMargensCategoriasProdutos();
  const categoriaAtual = obterCategoriaProduto(categoria);

  if (!categoriaAtual) {
    return margens;
  }

  return { ...margens, [normalizarCategoriaProduto(categoriaAtual.valor)]: Number.isFinite(margem) ? margem : categoriaAtual.margemBase };
}

export function removerMargemCategoriaProduto(
  categoria?: string,
): MargensPorCategoria {
  if (categoria) {
    return lerMargensCategoriasProdutos();
  }

  return lerMargensCategoriasProdutos();
}

export function lerMargensMinimasProdutos(): MargensMinimasProdutos {
  try {
    const dados: unknown = JSON.parse(
      localStorage.getItem(CHAVE_MARGENS_MINIMAS) ?? "{}",
    );

    if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(dados).filter(([id, valor]) => {
        const margem = Number(valor);
        return Number.isInteger(Number(id)) && Number.isFinite(margem) && margem >= 0;
      }),
    );
  } catch {
    return {};
  }
}

export function salvarMargemMinimaProduto(
  produtoId: number,
  margem: number,
): MargensMinimasProdutos {
  const margens = lerMargensMinimasProdutos();
  const atualizadas = { ...margens, [produtoId]: margem };

  try {
    localStorage.setItem(
      CHAVE_MARGENS_MINIMAS,
      JSON.stringify(atualizadas),
    );
  } catch {
    return margens;
  }

  return atualizadas;
}

export function removerMargemMinimaProduto(
  produtoId: number,
): MargensMinimasProdutos {
  const margens = lerMargensMinimasProdutos();
  const atualizadas = { ...margens };
  delete atualizadas[produtoId];

  try {
    localStorage.setItem(
      CHAVE_MARGENS_MINIMAS,
      JSON.stringify(atualizadas),
    );
  } catch {
    return margens;
  }

  return atualizadas;
}