import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { apiRequest, descreverErro } from "../../lib/api";
import type {
  MovimentacaoEstoque,
  MovimentacaoPayload,
  Produto,
  TipoMovimentacao,
} from "../../types/api";
import {
  lerMargensCategoriasProdutos,
  normalizarCategoriaProduto,
} from "../../lib/margensProdutos";
import SortableHeader from "../SortableHeader/SortableHeader";
import { ordenarLista } from "../../lib/ordenacao";
import type { DirecaoOrdenacao } from "../../lib/ordenacao";

import "./Movimentacao.css";

/* =========================
   Tipos locais
========================= */

type FormularioMovimentacao = {
  produto_id: string;
  quantidade: string;
  preco_unitario: string;
  descricao: string;
};

type Mensagem = {
  tipo: "sucesso" | "erro";
  texto: string;
};

type ColunaOrdenacaoMovimento =
  | "tipo" | "produto" | "categoria" | "descricao" | "data"
  | "venda" | "quantidade" | "unitario" | "total";

const formularioInicial: FormularioMovimentacao = {
  produto_id: "",
  quantidade: "1",
  preco_unitario: "",
  descricao: "",
};

/* =========================
   Utilitários
========================= */

function formatarNumero(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatarMoeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatarData(data?: string) {
  if (!data) return "Não informada";

  const valor = data.includes("T") ? data : `${data}T00:00:00`;
  const dataConvertida = new Date(valor);

  if (Number.isNaN(dataConvertida.getTime())) return "Data inválida";

  return dataConvertida.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function descricaoPadrao() {
  return "Entrada de estoque";
}

/* =========================
   Componente
========================= */

function Movimentacao({ buscaGlobal }: { buscaGlobal: string }) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [margensCategorias] = useState(lerMargensCategoriasProdutos);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [formulario, setFormulario] =
    useState<FormularioMovimentacao>(formularioInicial);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] =
    useState<"todos" | TipoMovimentacao>("todos");
  const [ordenacao, setOrdenacao] = useState<{
    coluna: ColunaOrdenacaoMovimento;
    direcao: DirecaoOrdenacao;
  } | null>(null);

  const produtoSelecionado = useMemo(() => {
    const id = Number(formulario.produto_id);
    return id ? produtos.find((produto) => produto.id === id) : undefined;
  }, [formulario.produto_id, produtos]);

  const estoqueDisponivel = Number(produtoSelecionado?.quantidade ?? 0);
  const margemMinima = produtoSelecionado
    ? margensCategorias[
        normalizarCategoriaProduto(produtoSelecionado.tipo ?? "")
      ]
    : undefined;
  const quantidadeInformada = Number(formulario.quantidade || 0);
  const custoUnitario = Number(produtoSelecionado?.preco ?? 0);
  const precoVendaMinimo =
    margemMinima === undefined || custoUnitario <= 0
      ? null
      : Number(
          (custoUnitario * (1 + margemMinima / 100)).toFixed(2),
        );
  const valorTotalFormulario = Number(
    (quantidadeInformada * custoUnitario).toFixed(2),
  );

  const produtosPorId = useMemo(() => {
    const mapa = new Map<number, Produto>();
    produtos.forEach((produto) => mapa.set(produto.id, produto));
    return mapa;
  }, [produtos]);

  /** Resumo calculado a partir do próprio razão, para ficar igual à tabela. */
  const resumo = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    let unidadesEntrada = 0;
    let unidadesSaida = 0;

    for (const movimentacao of movimentacoes) {
      const quantidade = Number(movimentacao.quantidade || 0);
      const valor = quantidade * Number(movimentacao.preco_unitario || 0);

      if (movimentacao.tipo === "entrada") {
        entradas += valor;
        unidadesEntrada += quantidade;
      } else {
        saidas += valor;
        unidadesSaida += quantidade;
      }
    }

    return {
      entradas,
      saidas,
      saldo: entradas - saidas,
      unidadesEntrada,
      unidadesSaida,
    };
  }, [movimentacoes]);

  const historicoFiltrado = useMemo(() => {
    const termos = [busca, buscaGlobal]
      .map((valor) => valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase(),
      )
      .filter(Boolean);

    return [...movimentacoes]
      .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""))
      .filter((movimentacao) => {
        const produto = produtosPorId.get(movimentacao.produto_id);
        const texto = [
          movimentacao.id,
          movimentacao.produto_id,
          produto?.nome,
          produto?.tipo,
          movimentacao.descricao,
          movimentacao.venda_id ? `venda ${movimentacao.venda_id}` : "",
        ]
          .filter(Boolean)
          .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

        return (
          (filtroTipo === "todos" || movimentacao.tipo === filtroTipo) &&
          termos.every((termo) => texto.includes(termo))
        );
      });
  }, [busca, buscaGlobal, filtroTipo, movimentacoes, produtosPorId]);

  const historicoOrdenado = useMemo(() => {
    if (!ordenacao) return historicoFiltrado;
    return ordenarLista(
      historicoFiltrado,
      (movimentacao) => {
        const produto = produtosPorId.get(movimentacao.produto_id);
        switch (ordenacao.coluna) {
          case "tipo": return movimentacao.tipo;
          case "produto": return produto?.nome ?? movimentacao.produto?.nome ?? `Produto ${movimentacao.produto_id}`;
          case "categoria": return produto?.tipo ?? "Não informada";
          case "descricao": return movimentacao.descricao;
          case "data": return new Date(movimentacao.data).getTime() || 0;
          case "venda": return movimentacao.venda_id ?? 0;
          case "quantidade": return Number(movimentacao.quantidade || 0);
          case "unitario": return Number(movimentacao.preco_unitario || 0);
          case "total": return Number(movimentacao.quantidade || 0) * Number(movimentacao.preco_unitario || 0);
        }
      },
      ordenacao.direcao,
    );
  }, [historicoFiltrado, ordenacao, produtosPorId]);

  function alternarOrdenacao(coluna: ColunaOrdenacaoMovimento) {
    setOrdenacao((atual) => ({
      coluna,
      direcao: atual?.coluna === coluna && atual.direcao === "desc" ? "asc" : "desc",
    }));
  }

  const carregarDados = useCallback(async (signal?: AbortSignal) => {
    try {
      const [listaProdutos, listaMovimentacoes] = await Promise.all([
        apiRequest<Produto[]>("/produtos", { signal }),
        apiRequest<MovimentacaoEstoque[]>("/fluxo-caixa", { signal }),
      ]);

      if (signal?.aborted) return;

      setProdutos(Array.isArray(listaProdutos) ? listaProdutos : []);
      setMovimentacoes(
        Array.isArray(listaMovimentacoes) ? listaMovimentacoes : [],
      );
    } catch (erro) {
      if (signal?.aborted) return;
      setMensagem({ tipo: "erro", texto: descreverErro(erro) });
    } finally {
      if (!signal?.aborted) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function iniciar() {
      await carregarDados(controller.signal);
    }

    void iniciar();
    return () => controller.abort();
  }, [carregarDados]);

  async function atualizarDados() {
    setCarregando(true);
    setMensagem(null);
    await carregarDados();
  }

  function alterarCampo(
    campo: keyof FormularioMovimentacao,
    valor: string,
  ) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
    setMensagem(null);
  }

  function selecionarProduto(valor: string) {
    setFormulario((atual) => ({
      ...atual,
      produto_id: valor,
      preco_unitario: "",
    }));

    setMensagem(null);
  }

  function limparFormulario() {
    setFormulario(formularioInicial);
    setMensagem(null);
  }

  async function salvarMovimentacao(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (salvando) return;

    const produtoId = Number(formulario.produto_id);
    const quantidade = Number(formulario.quantidade);
    const custoUnitario = Number(produtoSelecionado?.preco ?? 0);

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      setMensagem({ tipo: "erro", texto: "Selecione um produto." });
      return;
    }

    if (!produtoSelecionado) {
      setMensagem({
        tipo: "erro",
        texto: "Produto não encontrado. Atualize a lista e tente novamente.",
      });
      return;
    }

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      setMensagem({
        tipo: "erro",
        texto: "Informe uma quantidade inteira maior que zero.",
      });
      return;
    }

    if (!Number.isFinite(custoUnitario) || custoUnitario < 0) {
      setMensagem({
        tipo: "erro",
        texto: "Defina o preço de compra do produto na aba Produtos.",
      });
      return;
    }

    const payload: MovimentacaoPayload = {
      tipo: "entrada",
      produto_id: produtoId,
      quantidade,
      preco_unitario: Number(custoUnitario.toFixed(2)),
      descricao: formulario.descricao.trim() || descricaoPadrao(),
    };

    let precoAtualizado = false;

    try {
      setSalvando(true);
      setMensagem(null);

      if (
        produtoSelecionado &&
        precoVendaMinimo !== null &&
        precoVendaMinimo > produtoSelecionado.preco
      ) {
        await apiRequest(`/produtos/${produtoId}`, {
          method: "PATCH",
          body: JSON.stringify({ preco: precoVendaMinimo }),
        });
        precoAtualizado = true;
      }

      await apiRequest<MovimentacaoEstoque>("/fluxo-caixa", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setFormulario(formularioInicial);
      setMensagem({
        tipo: "sucesso",
        texto: precoAtualizado
          ? `Entrada registrada. Preço de venda ajustado para ${formatarMoeda(precoVendaMinimo ?? 0)}.`
          : "Entrada de estoque registrada com sucesso.",
      });

      await carregarDados();
    } catch (erro) {
      setMensagem({
        tipo: "erro",
        texto: precoAtualizado
          ? `O preço de venda foi ajustado, mas não foi possível confirmar a entrada. Confira o estoque antes de repetir. ${descreverErro(erro)}`
          : descreverErro(erro),
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="fluxo-caixa">
      <header className="fluxo-cabecalho">
        <div className="fluxo-cabecalho-texto">
          <span className="fluxo-cabecalho-icone">↑</span>
          <div>
            <h1 className="medium-h1">Entrada de estoque</h1>
            <p className="light-h3">
              Registre entradas e saídas do estoque.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="fluxo-botao-atualizar medium-h3"
          onClick={() => void atualizarDados()}
          disabled={carregando || salvando}
        >
          {carregando ? "Atualizando..." : "Atualizar dados"}
        </button>
      </header>

      <div className="fluxo-resumo">
        <article className="fluxo-resumo-card fluxo-resumo-entrada">
          <div className="fluxo-resumo-topo">
            <span className="fluxo-resumo-icone">+</span>
            <span className="light-h3">Valor de entradas</span>
          </div>
          <strong className="bold-h2">{formatarMoeda(resumo.entradas)}</strong>
          <small>{formatarNumero(resumo.unidadesEntrada)} un. recebidas</small>
        </article>

        <article className="fluxo-resumo-card fluxo-resumo-saida">
          <div className="fluxo-resumo-topo">
            <span className="fluxo-resumo-icone">−</span>
            <span className="light-h3">Valor das saídas</span>
          </div>
          <strong className="bold-h2">{formatarMoeda(resumo.saidas)}</strong>
          <small>{formatarNumero(resumo.unidadesSaida)} un. baixadas</small>
        </article>

        <article className="fluxo-resumo-card">
          <div className="fluxo-resumo-topo">
            <span className="fluxo-resumo-icone">=</span>
            <span className="light-h3">Saldo do período</span>
          </div>
          <strong className="bold-h2">{formatarMoeda(resumo.saldo)}</strong>
          <small>Entradas menos saídas</small>
        </article>
      </div>

      <article className="fluxo-painel">
        <div className="fluxo-painel-cabecalho">
          <div>
            <h2 className="medium-h2">Registrar entrada</h2>
            <p className="light-h3">
              Selecione o produto e informe quantidade e custo unitário.
            </p>
          </div>
        </div>

        <form className="fluxo-formulario" onSubmit={salvarMovimentacao}>
          <div className="fluxo-campos">
            <label className="fluxo-campo">
              <span className="medium-h3">Produto</span>
              <select
                value={formulario.produto_id}
                onChange={(evento) => selecionarProduto(evento.target.value)}
                disabled={carregando}
                required
              >
                <option value="">
                  {carregando ? "Carregando produtos..." : "Selecione um produto"}
                </option>
                {produtos.map((produto) => (
                  <option key={produto.id} value={String(produto.id)}>
                    {produto.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="fluxo-campo">
              <span className="medium-h3">Quantidade</span>
              <input
                type="number"
                min="1"
                step="1"
                value={formulario.quantidade}
                onChange={(evento) =>
                  alterarCampo("quantidade", evento.target.value)
                }
                required
              />
            </label>

            <div className="fluxo-campo">
              <span className="medium-h3">Preço de compra</span>
              <div className="fluxo-informacao fluxo-informacao-valor">
                {produtoSelecionado
                  ? formatarMoeda(produtoSelecionado.preco)
                  : "Selecione um produto"}
              </div>
            </div>

            <div className="fluxo-campo">
              <span className="medium-h3">Estoque atual</span>
              <div className="fluxo-informacao">
                {produtoSelecionado
                  ? `${formatarNumero(estoqueDisponivel)} un.`
                  : "Selecione um produto"}
              </div>
            </div>

            <div className="fluxo-campo">
              <span className="medium-h3">Valor total da entrada</span>
              <div className="fluxo-informacao fluxo-informacao-valor">
                {formatarMoeda(valorTotalFormulario)}
              </div>
            </div>

            <div className="fluxo-campo">
              <span className="medium-h3">Margem mínima</span>
              <div className="fluxo-informacao">
                {margemMinima === undefined
                  ? "Não definida em Produtos"
                  : `${formatarNumero(margemMinima)}%`}
              </div>
            </div>

            <div className="fluxo-campo">
              <span className="medium-h3">Preço de venda mínimo</span>
              <div className="fluxo-informacao fluxo-informacao-valor">
                {precoVendaMinimo === null
                  ? "Defina a margem em Produtos"
                  : formatarMoeda(precoVendaMinimo)}
              </div>
            </div>

            <label className="fluxo-campo fluxo-campo-descricao">
              <span className="medium-h3">Descrição</span>
              <textarea
                rows={3}
                value={formulario.descricao}
                onChange={(evento) =>
                  alterarCampo("descricao", evento.target.value)
                }
                placeholder="Ex.: Reposição do estoque"
              />
            </label>
          </div>

          {mensagem && (
            <div
              className={`fluxo-mensagem ${
                mensagem.tipo === "sucesso"
                  ? "fluxo-mensagem-sucesso"
                  : "fluxo-mensagem-erro"
              }`}
              role={mensagem.tipo === "erro" ? "alert" : "status"}
            >
              {mensagem.texto}
            </div>
          )}

          <div className="fluxo-acoes">
            <button
              type="button"
              className="fluxo-botao-cancelar medium-h3"
              onClick={limparFormulario}
              disabled={salvando}
            >
              Limpar
            </button>

            <button
              type="submit"
              className="fluxo-botao-salvar medium-h3"
              disabled={salvando || carregando}
            >
              {salvando ? "Salvando..." : "Registrar entrada"}
            </button>
          </div>
        </form>
      </article>

      <article className="fluxo-painel">
        <div className="fluxo-historico-topo">
          <div>
            <h2 className="medium-h2">Histórico de movimentações</h2>
            <p className="light-h3">
              Histórico de entradas e saídas registradas no estoque.
            </p>
          </div>

          <div className="fluxo-filtros">
            <input
              type="search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar produto"
              aria-label="Buscar movimentação"
            />
            <select
              value={filtroTipo}
              onChange={(evento) =>
                setFiltroTipo(evento.target.value as "todos" | TipoMovimentacao)
              }
              aria-label="Filtrar por tipo"
            >
              <option value="todos">Todas</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas</option>
            </select>
          </div>
        </div>

        <div className="fluxo-tabela-container">
          <table className="fluxo-tabela">
            <thead>
              <tr>
                <SortableHeader label="Movimentação" active={ordenacao?.coluna === "tipo"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("tipo")} />
                <SortableHeader label="Produto" active={ordenacao?.coluna === "produto"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("produto")} />
                <SortableHeader label="Categoria" active={ordenacao?.coluna === "categoria"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("categoria")} />
                <SortableHeader label="Descrição" active={ordenacao?.coluna === "descricao"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("descricao")} />
                <SortableHeader label="Data" active={ordenacao?.coluna === "data"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("data")} />
                <SortableHeader label="Venda" active={ordenacao?.coluna === "venda"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("venda")} />
                <SortableHeader label="Quantidade" active={ordenacao?.coluna === "quantidade"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("quantidade")} />
                <SortableHeader label="Preço unitário" active={ordenacao?.coluna === "unitario"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("unitario")} />
                <SortableHeader label="Valor total" active={ordenacao?.coluna === "total"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("total")} />
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={9} className="fluxo-tabela-vazia">
                    Carregando dados...
                  </td>
                </tr>
              ) : historicoOrdenado.length === 0 ? (
                <tr>
                  <td colSpan={9} className="fluxo-tabela-vazia">
                    Nenhuma movimentação encontrada.
                  </td>
                </tr>
              ) : (
                historicoOrdenado.map((movimentacao) => {
                  const produto = produtosPorId.get(movimentacao.produto_id);
                  const nome =
                    produto?.nome ??
                    movimentacao.produto?.nome ??
                    `Produto #${movimentacao.produto_id}`;
                  const categoria = produto?.tipo ?? "Não informada";
                  const total =
                    Number(movimentacao.quantidade || 0) *
                    Number(movimentacao.preco_unitario || 0);

                  return (
                    <tr key={movimentacao.id}>
                      <td>
                        <span
                          className="fluxo-status"
                        >
                          {movimentacao.tipo === "entrada" ? "Entrada" : "Saída"}
                        </span>
                      </td>
                      <td>
                        <div className="fluxo-produto">
                          <span className="fluxo-produto-avatar">
                            {nome.charAt(0).toUpperCase()}
                          </span>
                          <strong>{nome}</strong>
                        </div>
                      </td>
                      <td>{categoria}</td>
                      <td>{movimentacao.descricao}</td>
                      <td>{formatarData(movimentacao.data)}</td>
                      <td>
                        {movimentacao.venda_id
                          ? `#${movimentacao.venda_id}`
                          : "—"}
                      </td>
                      <td>{formatarNumero(movimentacao.quantidade)} un.</td>
                      <td>{formatarMoeda(movimentacao.preco_unitario)}</td>
                      <td className="fluxo-valor-total">
                        {formatarMoeda(total)}
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

export default Movimentacao;
