import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { apiRequest, descreverErro } from "../../lib/api";
import type {
  MovimentacaoEstoque,
  MovimentacaoPayload,
  Produto,
  TipoMovimentacao,
} from "../../types/api";

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
  return "Compra de estoque";
}

/* =========================
   Componente
========================= */

function Movimentacao() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [formulario, setFormulario] =
    useState<FormularioMovimentacao>(formularioInicial);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] =
    useState<"todos" | TipoMovimentacao>("todos");

  const produtoSelecionado = useMemo(() => {
    const id = Number(formulario.produto_id);
    return id ? produtos.find((produto) => produto.id === id) : undefined;
  }, [formulario.produto_id, produtos]);

  const estoqueDisponivel = Number(produtoSelecionado?.quantidade ?? 0);
  const quantidadeInformada = Number(formulario.quantidade || 0);
  const precoInformado = Number(formulario.preco_unitario || 0);
  const valorTotalFormulario = Number(
    (quantidadeInformada * precoInformado).toFixed(2),
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
    const termo = busca.trim().toLowerCase();

    return [...movimentacoes]
      .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""))
      .filter((movimentacao) => {
        const produto = produtosPorId.get(movimentacao.produto_id);
        const texto = [
          produto?.nome,
          produto?.tipo,
          movimentacao.descricao,
          movimentacao.venda_id ? `venda ${movimentacao.venda_id}` : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          (filtroTipo === "todos" || movimentacao.tipo === filtroTipo) &&
          (!termo || texto.includes(termo))
        );
      });
  }, [busca, filtroTipo, movimentacoes, produtosPorId]);

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
    const produto = produtos.find((item) => item.id === Number(valor));

    setFormulario((atual) => ({
      ...atual,
      produto_id: valor,
      preco_unitario: produto
        ? String(Number(produto.preco.toFixed(2)))
        : "",
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
    const precoUnitario = Number(formulario.preco_unitario);

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      setMensagem({ tipo: "erro", texto: "Selecione um produto." });
      return;
    }

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      setMensagem({
        tipo: "erro",
        texto: "Informe uma quantidade inteira maior que zero.",
      });
      return;
    }

    if (!Number.isFinite(precoUnitario) || precoUnitario < 0) {
      setMensagem({
        tipo: "erro",
        texto: "Informe um preço unitário válido.",
      });
      return;
    }

    const payload: MovimentacaoPayload = {
      tipo: "entrada",
      produto_id: produtoId,
      quantidade,
      preco_unitario: Number(precoUnitario.toFixed(2)),
      descricao: formulario.descricao.trim() || descricaoPadrao(),
    };

    try {
      setSalvando(true);
      setMensagem(null);

      await apiRequest<MovimentacaoEstoque>("/fluxo-caixa", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setFormulario(formularioInicial);
      setMensagem({
        tipo: "sucesso",
        texto: "Entrada de estoque registrada com sucesso.",
      });

      await carregarDados();
    } catch (erro) {
      setMensagem({ tipo: "erro", texto: descreverErro(erro) });
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
              Registre a compra de produtos que a loja adquiriu para revender.
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
            <span className="light-h3">Saídas por venda</span>
          </div>
          <strong className="bold-h2">{formatarMoeda(resumo.saidas)}</strong>
          <small>{formatarNumero(resumo.unidadesSaida)} un. vendidas no atendimento</small>
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
              Selecione o produto comprado e informe quantidade e custo unitário.
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

            <label className="fluxo-campo">
              <span className="medium-h3">Preço unitário</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formulario.preco_unitario}
                onChange={(evento) =>
                  alterarCampo("preco_unitario", evento.target.value)
                }
                required
              />
            </label>

            <div className="fluxo-campo">
              <span className="medium-h3">Estoque atual</span>
              <div className="fluxo-informacao">
                {produtoSelecionado
                  ? `${formatarNumero(estoqueDisponivel)} un.`
                  : "Selecione um produto"}
              </div>
            </div>

            <div className="fluxo-campo">
              <span className="medium-h3">Valor total da compra</span>
              <div className="fluxo-informacao fluxo-informacao-valor">
                {formatarMoeda(valorTotalFormulario)}
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
              Entradas registradas aqui e saídas geradas pelas vendas.
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
              <option value="entrada">Entradas (compras)</option>
              <option value="saida">Saídas (vendas)</option>
            </select>
          </div>
        </div>

        <div className="fluxo-tabela-container">
          <table className="fluxo-tabela">
            <thead>
              <tr>
                <th>Movimentação</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Data</th>
                <th>Venda</th>
                <th>Quantidade</th>
                <th>Preço unitário</th>
                <th>Valor total</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={9} className="fluxo-tabela-vazia">
                    Carregando dados...
                  </td>
                </tr>
              ) : historicoFiltrado.length === 0 ? (
                <tr>
                  <td colSpan={9} className="fluxo-tabela-vazia">
                    Nenhuma movimentação encontrada.
                  </td>
                </tr>
              ) : (
                historicoFiltrado.map((movimentacao) => {
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
                          className={`fluxo-status fluxo-status-${movimentacao.tipo}`}
                        >
                          {movimentacao.tipo === "entrada"
                            ? "Entrada (compra)"
                            : "Saída (venda)"}
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
