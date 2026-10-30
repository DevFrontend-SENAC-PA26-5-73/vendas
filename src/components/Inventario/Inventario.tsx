import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import "./Inventario.css";

const API_URL = "https://vendas.gabrielpimentel.com.br";

const ESTOQUE_MINIMO = 5;

type Produto = {
  id: number;
  nome: string;
  descricao: string;
  codigo_barra: string;
  quantidade: number;
  tipo: string;
  preco: number;
};

type Situacao = "disponivel" | "baixo" | "esgotado";

const rotuloSituacao: Record<Situacao, string> = {
  disponivel: "Disponível",
  baixo: "Estoque baixo",
  esgotado: "Esgotado",
};

/* =========================
   Normalização dos dados

function formatarMoeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatarNumero(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function classificarEstoque(quantidade: number): Situacao {
  if (quantidade <= 0) return "esgotado";
  if (quantidade <= ESTOQUE_MINIMO) return "baixo";
  return "disponivel";
}

/* =========================
   Componente

  const carregarInventario = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);

      const [respostaProdutos, respostaEstoque] = await Promise.allSettled([
        fetch(`${API_URL}/produtos`),
        fetch(`${API_URL}/estoque`),
      ]);

      if (
        respostaProdutos.status !== "fulfilled" ||
        !respostaProdutos.value.ok
      ) {
        throw new Error(
          "Não foi possível carregar os produtos do inventário.",
        );
      }

      const listaProdutos = normalizarProdutos(
        await respostaProdutos.value.json(),
      );

      // A rota /estoque é opcional: quando responde, a quantidade dela
      // tem prioridade sobre a quantidade cadastrada no produto.
      let quantidadesEstoque = new Map<number, number>();

      if (respostaEstoque.status === "fulfilled" && respostaEstoque.value.ok) {
        quantidadesEstoque = normalizarEstoque(
          await respostaEstoque.value.json(),
        );
      }

      const listaCompleta = listaProdutos.map((produto) => ({
        ...produto,
        quantidade: quantidadesEstoque.get(produto.id) ?? produto.quantidade,
      }));

      listaCompleta.sort((primeiro, segundo) =>
        primeiro.nome.localeCompare(segundo.nome, "pt-BR"),
      );

      setProdutos(listaCompleta);
      setAtualizadoEm(new Date());
    } catch (erroDesconhecido) {
      console.error("Erro ao carregar inventário:", erroDesconhecido);

      setProdutos([]);
      setErro(
        erroDesconhecido instanceof Error
          ? erroDesconhecido.message
          : "Não foi possível carregar o inventário.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarInventario();
  }, [carregarInventario]);

  useEffect(() => {
    function atualizar() {
      void carregarInventario();
    }

    window.addEventListener("estoque-atualizado", atualizar);
    window.addEventListener("produtos-atualizados", atualizar);

    return () => {
      window.removeEventListener("estoque-atualizado", atualizar);
      window.removeEventListener("produtos-atualizados", atualizar);
    };
  }, [carregarInventario]);

  /* =========================
     Resumos
  ========================= */

  const resumo = useMemo(() => {
    return produtos.reduce(
      (total, produto) => {
        const situacao = classificarEstoque(produto.quantidade);

        return {
          unidades: total.unidades + produto.quantidade,
          valor: total.valor + produto.quantidade * produto.preco,
          disponiveis:
            total.disponiveis + (situacao === "disponivel" ? 1 : 0),
          alertas:
            total.alertas + (situacao === "disponivel" ? 0 : 1),
        };
      },
      {
        unidades: 0,
        valor: 0,
        disponiveis: 0,
        alertas: 0,
      },
    );
  }, [produtos]);

  const categorias = useMemo(() => {
    const valores = new Set(
      produtos.map((produto) => produto.tipo.trim()).filter(Boolean),
    );

    return Array.from(valores).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [produtos]);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return produtos.filter((produto) => {
      const correspondeBusca =
        termo.length === 0 ||
        [produto.nome, produto.tipo, produto.codigo_barra].some((campo) =>
          campo.toLowerCase().includes(termo),
        );

      const correspondeCategoria =
        filtroCategoria === "todas" ||
        produto.tipo.toLowerCase() === filtroCategoria.toLowerCase();

      const correspondeSituacao =
        filtroSituacao === "todas" ||
        classificarEstoque(produto.quantidade) === filtroSituacao;

      return (
        correspondeBusca && correspondeCategoria && correspondeSituacao
      );
    });
  }, [busca, filtroCategoria, filtroSituacao, produtos]);

  return (
    <section className="inventario">
      <header className="inventario-cabecalho">
        <div className="inventario-cabecalho-texto">
          <span className="inventario-cabecalho-icone">▦</span>

          <div>
            <h1 className="medium-h1">Inventário</h1>

            <p className="light-h3">
              Consulte a quantidade, o valor e a situação de cada produto em
              estoque.
            </p>
          </div>
        </div>

        <div className="inventario-cabecalho-acoes">
          {atualizadoEm && (
            <span className="light-h3 inventario-atualizado">
              Atualizado às{" "}
              {atualizadoEm.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}

          <button
            type="button"
            className="inventario-botao-atualizar medium-h3"
            onClick={() => void carregarInventario()}
            disabled={carregando}
          >
            {carregando ? "Atualizando..." : "Atualizar inventário"}
          </button>
        </div>
      </header>

      <div className="inventario-resumo">
        <article className="inventario-resumo-card">
          <span className="light-h3">Produtos cadastrados</span>
          <strong className="bold-h2">
            {formatarNumero(produtos.length)}
          </strong>
          <small>Itens diferentes no catálogo</small>
        </article>

        <article className="inventario-resumo-card">
          <span className="light-h3">Unidades em estoque</span>
          <strong className="bold-h2">{formatarNumero(resumo.unidades)}</strong>
          <small>Soma das quantidades disponíveis</small>
        </article>

        <article className="inventario-resumo-card">
          <span className="light-h3">Valor do inventário</span>
          <strong className="bold-h2">{formatarMoeda(resumo.valor)}</strong>
          <small>Quantidade × preço unitário</small>
        </article>

        <article
          className={`inventario-resumo-card inventario-resumo-alerta ${
            resumo.alertas > 0 ? "inventario-resumo-alerta-ativo" : ""
          }`}
        >
          <span className="light-h3">Itens em alerta</span>
          <strong className="bold-h2">
            {formatarNumero(resumo.alertas)}
          </strong>
          <small>Esgotados ou com {ESTOQUE_MINIMO} unidades ou menos</small>
        </article>
      </div>

      {erro && (
        <div className="inventario-mensagem" role="alert">
          {erro}
        </div>
      )}

      <article className="inventario-painel">
        <div className="inventario-painel-topo">
          <div>
            <h2 className="medium-h2">Posição de estoque</h2>

            <p className="light-h3">
              {carregando
                ? "Carregando produtos..."
                : `${produtosFiltrados.length} de ${produtos.length} produto(s) exibido(s)`}
            </p>
          </div>

          <div className="inventario-filtros">
            <div className="inventario-busca">
              <Search size={16} className="inventario-busca-icone" />

              <input
                type="search"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Buscar produto"
                aria-label="Buscar produto no inventário"
              />
            </div>

            <select
              value={filtroCategoria}
              onChange={(evento) => setFiltroCategoria(evento.target.value)}
              aria-label="Filtrar por categoria"
            >
              <option value="todas">Todas as categorias</option>

              {categorias.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>

            <select
              value={filtroSituacao}
              onChange={(evento) =>
                setFiltroSituacao(evento.target.value as "todas" | Situacao)
              }
              aria-label="Filtrar por situação"
            >
              <option value="todas">Todas as situações</option>
              <option value="disponivel">Disponível</option>
              <option value="baixo">Estoque baixo</option>
              <option value="esgotado">Esgotado</option>
            </select>
          </div>
        </div>

        <div className="inventario-tabela-container">
          <table className="inventario-tabela">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Código interno</th>
                <th>Quantidade</th>
                <th>Preço unitário</th>
                <th>Valor em estoque</th>
                <th>Situação</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={7} className="inventario-tabela-vazia">
                    Carregando inventário...
                  </td>
                </tr>
              ) : produtosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="inventario-tabela-vazia">
                    {produtos.length === 0
                      ? "Nenhum produto cadastrado."
                      : "Nenhum produto encontrado com os filtros atuais."}
                  </td>
                </tr>
              ) : (
                produtosFiltrados.map((produto) => {
                  const situacao = classificarEstoque(produto.quantidade);

                  return (
                    <tr key={produto.id}>
                      <td>
                        <div className="inventario-produto">
                          <span className="inventario-produto-avatar">
                            {produto.nome.charAt(0).toUpperCase()}
                          </span>

                          <div className="inventario-produto-texto">
                            <strong>{produto.nome}</strong>

                            {produto.descricao && (
                              <small title={produto.descricao}>
                                {produto.descricao}
                              </small>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>{produto.tipo || "Não informada"}</td>
                      <td>{produto.codigo_barra || "Não informado"}</td>
                      <td className="inventario-quantidade">
                        {formatarNumero(produto.quantidade)} un.
                      </td>
                      <td>{formatarMoeda(produto.preco)}</td>
                      <td className="inventario-valor">
                        {formatarMoeda(produto.quantidade * produto.preco)}
                      </td>
                      <td>
                        <span
                          className={`inventario-situacao inventario-situacao-${situacao}`}
                        >
                          {rotuloSituacao[situacao]}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

export default Inventario;
