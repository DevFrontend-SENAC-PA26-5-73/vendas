import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { FormEvent } from "react";

import "./FluxoCaixa.css";

const API_URL = "http://10.3.20.30:5001";

/* =========================
   Tipos
========================= */

type TipoMovimentacao = "entrada" | "saida";

type Produto = {
  id: number;
  nome: string;
  quantidade: number;
  tipo: string;
  preco: number;
};

type ItemVenda = {
  id: number;
  quantidade: number;
  preco: number;
  vendas_id: number;
  produtos_id: number;
};

type FormularioEntrada = {
  produto_id: string;
  quantidade: string;
  descricao: string;
  data_movimentacao: string;
};

type MovimentacaoVisual = {
  id: string;
  tipo: TipoMovimentacao;
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
  descricao: string;
  data_movimentacao?: string;
};

type Mensagem = {
  tipo: "sucesso" | "erro";
  texto: string;
};

type RespostaErroApi = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

/* =========================
   Estado inicial
========================= */

function obterDataAtual() {
  return new Date().toISOString().slice(0, 10);
}

const formularioInicial: FormularioEntrada = {
  produto_id: "",
  quantidade: "1",
  descricao: "",
  data_movimentacao: obterDataAtual(),
};

/* =========================
   Formatação
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
  if (!data) {
    return "Não informada";
  }

  const dataNormalizada = data.includes("T")
    ? data
    : `${data}T00:00:00`;

  const dataConvertida = new Date(dataNormalizada);

  if (Number.isNaN(dataConvertida.getTime())) {
    return "Data inválida";
  }

  return dataConvertida.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/* =========================
   Funções auxiliares
========================= */

function obterProduto(
  produtoId: number,
  produtos: Produto[],
) {
  return produtos.find(
    (produto) => produto.id === produtoId,
  );
}

async function lerResposta(
  resposta: Response,
): Promise<unknown> {
  const texto = await resposta.text();

  if (!texto) {
    return null;
  }

  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}

function obterMensagemErro(
  dados: unknown,
  status: number,
) {
  if (
    dados &&
    typeof dados === "object" &&
    "message" in dados
  ) {
    const erro = dados as RespostaErroApi;

    if (Array.isArray(erro.message)) {
      return erro.message.join(", ");
    }

    if (typeof erro.message === "string") {
      return erro.message;
    }
  }

  if (
    typeof dados === "string" &&
    dados.trim().length > 0
  ) {
    return dados;
  }

  return `Erro HTTP ${status}`;
}

/* =========================
   Componente
========================= */

function FluxoCaixa() {
  const [formulario, setFormulario] =
    useState<FormularioEntrada>({
      ...formularioInicial,
    });

  const [produtos, setProdutos] = useState<
    Produto[]
  >([]);

  const [estoque, setEstoque] = useState<
    Produto[]
  >([]);

  const [itensVenda, setItensVenda] = useState<
    ItemVenda[]
  >([]);

  const [entradasSessao, setEntradasSessao] =
    useState<MovimentacaoVisual[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [mensagem, setMensagem] =
    useState<Mensagem | null>(null);

  const [busca, setBusca] = useState("");

  const [filtroTipo, setFiltroTipo] = useState<
    "todos" | TipoMovimentacao
  >("todos");

  /* =========================
     Produto selecionado
  ========================= */

  const produtoSelecionado = useMemo(() => {
    const produtoId = Number(
      formulario.produto_id,
    );

    if (!produtoId) {
      return undefined;
    }

    return produtos.find(
      (produto) => produto.id === produtoId,
    );
  }, [formulario.produto_id, produtos]);

  const precoUnitario = Number(
    produtoSelecionado?.preco ?? 0,
  );

  const categoriaProduto =
    produtoSelecionado?.tipo ??
    "Selecione um produto";

  const quantidadeInformada = Number(
    formulario.quantidade || 0,
  );

  const valorTotalFormulario = useMemo(() => {
    const valor =
      quantidadeInformada * precoUnitario;

    return Number(valor.toFixed(2));
  }, [
    quantidadeInformada,
    precoUnitario,
  ]);

  /* =========================
     Totais em unidades
  ========================= */

  const totalUnidadesEstoque = useMemo(() => {
    return estoque.reduce(
      (total, produto) => {
        return (
          total +
          Number(produto.quantidade || 0)
        );
      },
      0,
    );
  }, [estoque]);

  const totalUnidadesVendidas = useMemo(() => {
    return itensVenda.reduce(
      (total, item) => {
        return (
          total +
          Number(item.quantidade || 0)
        );
      },
      0,
    );
  }, [itensVenda]);

  /* =========================
     Saídas do Atendimento
  ========================= */

  const saidasAtendimento =
    useMemo<MovimentacaoVisual[]>(() => {
      return itensVenda.map((item) => {
        const quantidade = Number(
          item.quantidade || 0,
        );

        const preco = Number(
          item.preco || 0,
        );

        return {
          id: `saida-${item.id}`,
          tipo: "saida",
          produto_id: item.produtos_id,
          quantidade,
          preco_unitario: Number(
            preco.toFixed(2),
          ),
          descricao: `Saída gerada pela venda #${item.vendas_id}`,
        };
      });
    }, [itensVenda]);

  /* =========================
     Histórico
  ========================= */

  const historicoCompleto = useMemo(() => {
    return [
      ...entradasSessao,
      ...saidasAtendimento,
    ];
  }, [
    entradasSessao,
    saidasAtendimento,
  ]);

  const historicoFiltrado = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return historicoCompleto.filter(
      (movimentacao) => {
        const correspondeTipo =
          filtroTipo === "todos" ||
          movimentacao.tipo === filtroTipo;

        const produto = obterProduto(
          movimentacao.produto_id,
          produtos,
        );

        const textoPesquisa = [
          produto?.nome,
          produto?.tipo,
          movimentacao.descricao,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const correspondeBusca =
          termo.length === 0 ||
          textoPesquisa.includes(termo);

        return (
          correspondeTipo &&
          correspondeBusca
        );
      },
    );
  }, [
    busca,
    filtroTipo,
    historicoCompleto,
    produtos,
  ]);

  /* =========================
     Carregamento da API
  ========================= */

  const carregarDados =
    useCallback(async () => {
      try {
        setCarregando(true);
        setMensagem(null);

        const [
          respostaProdutos,
          respostaEstoque,
          respostaItensVenda,
        ] = await Promise.all([
          fetch(`${API_URL}/produtos`),
          fetch(`${API_URL}/estoque`),
          fetch(`${API_URL}/itemvenda`),
        ]);

        if (!respostaProdutos.ok) {
          throw new Error(
            `Erro ${respostaProdutos.status} ao carregar produtos.`,
          );
        }

        if (!respostaEstoque.ok) {
          throw new Error(
            `Erro ${respostaEstoque.status} ao carregar estoque.`,
          );
        }

        if (!respostaItensVenda.ok) {
          throw new Error(
            `Erro ${respostaItensVenda.status} ao carregar vendas.`,
          );
        }

        const [
          produtosRecebidos,
          estoqueRecebido,
          itensRecebidos,
        ] = await Promise.all([
          respostaProdutos.json() as Promise<
            Produto[]
          >,

          respostaEstoque.json() as Promise<
            Produto[]
          >,

          respostaItensVenda.json() as Promise<
            ItemVenda[]
          >,
        ]);

        setProdutos(
          Array.isArray(produtosRecebidos)
            ? produtosRecebidos
            : [],
        );

        setEstoque(
          Array.isArray(estoqueRecebido)
            ? estoqueRecebido
            : [],
        );

        setItensVenda(
          Array.isArray(itensRecebidos)
            ? itensRecebidos
            : [],
        );

        console.log(
          "Produtos recebidos da API:",
          produtosRecebidos,
        );
      } catch (erro) {
        console.error(
          "Erro ao carregar dados:",
          erro,
        );

        setMensagem({
          tipo: "erro",
          texto:
            erro instanceof Error
              ? erro.message
              : "Não foi possível carregar os dados.",
        });
      } finally {
        setCarregando(false);
      }
    }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  /* =========================
     Eventos do formulário
  ========================= */

function alterarCampo(
  campo: keyof FormularioEntrada,
  novoValor: string,
) {
  setFormulario((dadosAtuais) => ({
    ...dadosAtuais,
    [campo]: novoValor,
  }));

  setMensagem(null);
}

  function limparFormulario() {
    setFormulario({
      ...formularioInicial,
      data_movimentacao: obterDataAtual(),
    });

    setMensagem(null);
  }

  /* =========================
     Registrar entrada
  ========================= */

  async function registrarEntrada(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    const produtoId = Number(
      formulario.produto_id,
    );

    const quantidade = Number(
      formulario.quantidade,
    );

    if (
      !Number.isFinite(produtoId) ||
      produtoId <= 0
    ) {
      setMensagem({
        tipo: "erro",
        texto: "Selecione um produto.",
      });

      return;
    }

    if (
      !Number.isFinite(quantidade) ||
      quantidade <= 0
    ) {
      setMensagem({
        tipo: "erro",
        texto:
          "Informe uma quantidade maior que zero.",
      });

      return;
    }

    const payload = {
      produto_id: produtoId,
      quantidade,
    };

    console.log(
      "Enviando para POST /estoque:",
      payload,
    );

    try {
      setSalvando(true);
      setMensagem(null);

      const resposta = await fetch(
        `${API_URL}/estoque`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            Accept: "application/json",
          },

          body: JSON.stringify(payload),
        },
      );

      const dadosResposta =
        await lerResposta(resposta);

      if (!resposta.ok) {
        console.error(
          "Erro retornado pela API:",
          dadosResposta,
        );

        throw new Error(
          obterMensagemErro(
            dadosResposta,
            resposta.status,
          ),
        );
      }

      const novaEntrada: MovimentacaoVisual = {
        id: `entrada-${Date.now()}`,
        tipo: "entrada",
        produto_id: produtoId,
        quantidade,
        preco_unitario: Number(
          precoUnitario.toFixed(2),
        ),
        descricao:
          formulario.descricao.trim() ||
          "Entrada de produto no estoque",
        data_movimentacao:
          formulario.data_movimentacao,
      };

      setEntradasSessao(
        (entradasAtuais) => [
          novaEntrada,
          ...entradasAtuais,
        ],
      );

      setEstoque((estoqueAtual) => {
        const produtoExiste =
          estoqueAtual.some(
            (produto) =>
              produto.id === produtoId,
          );

        if (!produtoExiste) {
          if (!produtoSelecionado) {
            return estoqueAtual;
          }

          return [
            ...estoqueAtual,
            {
              ...produtoSelecionado,
              quantidade,
            },
          ];
        }

        return estoqueAtual.map((produto) => {
          if (produto.id !== produtoId) {
            return produto;
          }

          return {
            ...produto,
            quantidade:
              Number(produto.quantidade || 0) +
              quantidade,
          };
        });
      });

      setMensagem({
        tipo: "sucesso",
        texto:
          "Entrada registrada com sucesso.",
      });

      setFormulario({
        ...formularioInicial,
        data_movimentacao: obterDataAtual(),
      });
    } catch (erro) {
      console.error(
        "Erro ao registrar entrada:",
        erro,
      );

      setMensagem({
        tipo: "erro",

        texto:
          erro instanceof Error
            ? erro.message
            : "Não foi possível registrar a entrada.",
      });
    } finally {
      setSalvando(false);
    }
  }

  /* =========================
     Interface
  ========================= */

  return (
    <section className="fluxo-caixa">
      <header className="fluxo-cabecalho">
        <div className="fluxo-cabecalho-texto">
          <span className="fluxo-cabecalho-icone">
            ↕
          </span>

          <div>
            <h1 className="medium-h1">
              Movimentação de estoque
            </h1>

            <p className="light-h3">
              Registre entradas e acompanhe as
              saídas realizadas pelo atendimento.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="fluxo-botao-atualizar medium-h3"
          onClick={carregarDados}
          disabled={carregando}
        >
          {carregando
            ? "Atualizando..."
            : "Atualizar dados"}
        </button>
      </header>

      <div className="fluxo-resumo">
        <article className="fluxo-resumo-card fluxo-resumo-entrada">
          <div className="fluxo-resumo-topo">
            <span className="fluxo-resumo-icone">
              +
            </span>

            <span className="light-h3">
              Unidades em estoque
            </span>
          </div>

          <strong className="bold-h2">
            {formatarNumero(
              totalUnidadesEstoque,
            )}
          </strong>

          <small>
            Soma atual das unidades disponíveis
          </small>
        </article>

        <article className="fluxo-resumo-card fluxo-resumo-saida">
          <div className="fluxo-resumo-topo">
            <span className="fluxo-resumo-icone">
              −
            </span>

            <span className="light-h3">
              Unidades vendidas
            </span>
          </div>

          <strong className="bold-h2">
            {formatarNumero(
              totalUnidadesVendidas,
            )}
          </strong>

          <small>
            Saídas registradas pelo atendimento
          </small>
        </article>
      </div>

      <article className="fluxo-painel">
        <div className="fluxo-painel-cabecalho">
          <div>
            <h2 className="medium-h2">
              Nova entrada de produto
            </h2>

            <p className="light-h3">
              Selecione um produto e informe a
              quantidade recebida.
            </p>
          </div>
        </div>

        <form
          className="fluxo-formulario"
          onSubmit={registrarEntrada}
        >
          <div className="fluxo-campos">
            <label className="fluxo-campo">
              <span className="medium-h3">
                Produto
              </span>

              <select
                value={formulario.produto_id}
                onChange={(evento) =>
                  alterarCampo(
                    "produto_id",
                    evento.target.value,
                  )
                }
                disabled={carregando}
                required
              >
                <option value="">
                  {carregando
                    ? "Carregando produtos..."
                    : "Selecione um produto"}
                </option>

                {produtos.map((produto) => (
                  <option
                    key={produto.id}
                    value={String(produto.id)}
                  >
                    {produto.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="fluxo-campo">
              <span className="medium-h3">
                Quantidade recebida
              </span>

              <input
                type="number"
                min="1"
                step="1"
                value={formulario.quantidade}
                onChange={(evento) =>
                  alterarCampo(
                    "quantidade",
                    evento.target.value,
                  )
                }
                placeholder="Ex.: 10"
                required
              />
            </label>

            <label className="fluxo-campo">
              <span className="medium-h3">
                Data da entrada
              </span>

              <input
                type="date"
                value={
                  formulario.data_movimentacao
                }
                onChange={(evento) =>
                  alterarCampo(
                    "data_movimentacao",
                    evento.target.value,
                  )
                }
                required
              />
            </label>

            <div className="fluxo-campo">
              <span className="medium-h3">
                Categoria
              </span>

              <div className="fluxo-informacao">
                {categoriaProduto}
              </div>
            </div>

            <div className="fluxo-campo">
              <span className="medium-h3">
                Preço unitário
              </span>

              <div className="fluxo-informacao">
                {produtoSelecionado
                  ? formatarMoeda(precoUnitario)
                  : "Selecione um produto"}
              </div>
            </div>

            <div className="fluxo-campo">
              <span className="medium-h3">
                Valor total
              </span>

              <div className="fluxo-informacao fluxo-informacao-valor">
                {formatarMoeda(
                  valorTotalFormulario,
                )}
              </div>
            </div>

            <label className="fluxo-campo fluxo-campo-descricao">
              <span className="medium-h3">
                Descrição
              </span>

              <textarea
                rows={3}
                value={formulario.descricao}
                onChange={(evento) =>
                  alterarCampo(
                    "descricao",
                    evento.target.value,
                  )
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
              role="alert"
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
              disabled={salvando}
            >
              {salvando
                ? "Salvando..."
                : "Registrar entrada"}
            </button>
          </div>
        </form>
      </article>

      <article className="fluxo-painel">
        <div className="fluxo-historico-topo">
          <div>
            <h2 className="medium-h2">
              Histórico desta sessão
            </h2>

            <p className="light-h3">
              Entradas adicionadas agora e saídas
              geradas pelas vendas.
            </p>
          </div>

          <div className="fluxo-filtros">
            <input
              type="search"
              value={busca}
              onChange={(evento) =>
                setBusca(evento.target.value)
              }
              placeholder="Buscar produto"
              aria-label="Buscar produto"
            />

            <select
              value={filtroTipo}
              onChange={(evento) =>
                setFiltroTipo(
                  evento.target.value as
                    | "todos"
                    | TipoMovimentacao,
                )
              }
              aria-label="Filtrar movimentações"
            >
              <option value="todos">
                Todas
              </option>

              <option value="entrada">
                Entradas
              </option>

              <option value="saida">
                Saídas
              </option>
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
                <th>Quantidade</th>
                <th>Preço unitário</th>
                <th>Valor total</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td
                    colSpan={8}
                    className="fluxo-tabela-vazia"
                  >
                    Carregando dados...
                  </td>
                </tr>
              ) : historicoFiltrado.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="fluxo-tabela-vazia"
                  >
                    Nenhuma movimentação encontrada.
                  </td>
                </tr>
              ) : (
                historicoFiltrado.map(
                  (movimentacao) => {
                    const produto =
                      obterProduto(
                        movimentacao.produto_id,
                        produtos,
                      );

                    const nomeProduto =
                      produto?.nome ??
                      `Produto #${movimentacao.produto_id}`;

                    const categoria =
                      produto?.tipo ??
                      "Não informada";

                    const valorTotal = Number(
                      (
                        movimentacao.quantidade *
                        movimentacao.preco_unitario
                      ).toFixed(2),
                    );

                    return (
                      <tr key={movimentacao.id}>
                        <td>
                          <span
                            className={`fluxo-status fluxo-status-${movimentacao.tipo}`}
                          >
                            {movimentacao.tipo ===
                            "entrada"
                              ? "Entrada"
                              : "Saída"}
                          </span>
                        </td>

                        <td>
                          <div className="fluxo-produto">
                            <span className="fluxo-produto-avatar">
                              {nomeProduto
                                .charAt(0)
                                .toUpperCase()}
                            </span>

                            <strong>
                              {nomeProduto}
                            </strong>
                          </div>
                        </td>

                        <td>{categoria}</td>

                        <td>
                          {movimentacao.descricao}
                        </td>

                        <td>
                          {formatarData(
                            movimentacao.data_movimentacao,
                          )}
                        </td>

                        <td>
                          {formatarNumero(
                            movimentacao.quantidade,
                          )}{" "}
                          un.
                        </td>

                        <td>
                          {formatarMoeda(
                            movimentacao.preco_unitario,
                          )}
                        </td>

                        <td className="fluxo-valor-total">
                          {formatarMoeda(
                            valorTotal,
                          )}
                        </td>
                      </tr>
                    );
                  },
                )
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

export default FluxoCaixa;