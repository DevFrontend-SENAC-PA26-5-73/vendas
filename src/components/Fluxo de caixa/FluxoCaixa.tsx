import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./FluxoCaixa.css";

const API_URL =
  "https://vendas.gabrielpimentel.com.br";

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

type FormularioMovimentacao = {
  tipo: TipoMovimentacao;
  produto_id: string;
  quantidade: string;
  preco_unitario: string;
  categoria: string;
  descricao: string;
  data_movimentacao: string;
  venda_id: string;
};

type MovimentacaoApi = {
  id: number;
  tipo: TipoMovimentacao;

  produto_id?: number | null;
  quantidade: number;
  preco_unitario: number;
  descricao: string;
  venda_id?: number | null;

  /*
    Campos preparados para quando forem
    adicionados ao back-end.
  */

  categoria?: string;
  valor_total?: number;
  data_movimentacao?: string;
  createdAt?: string;

  produto?: {
    id: number;
    nome: string;
  };
};

type ResumoFluxoApi = {
  totalEntradas?: number;
  totalSaidas?: number;
  entradas?: number;
  saidas?: number;
  saldo?: number;
};

type Mensagem = {
  tipo: "sucesso" | "erro";
  texto: string;
};

const formularioInicial: FormularioMovimentacao = {
  tipo: "entrada",
  produto_id: "",
  quantidade: "1",
  preco_unitario: "",
  categoria: "",
  descricao: "",
  data_movimentacao: new Date()
    .toISOString()
    .slice(0, 10),
  venda_id: "",
};

/* =========================
   Funções auxiliares
========================= */

function formatarMoeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data?: string) {
  if (!data) {
    return "Não informada";
  }

  const dataNormalizada = data.includes("T")
    ? data
    : `${data}T00:00:00`;

  return new Date(dataNormalizada).toLocaleDateString(
    "pt-BR",
    {
      timeZone: "UTC",
    },
  );
}

function obterValorMovimentacao(
  movimentacao: MovimentacaoApi,
) {
  if (movimentacao.valor_total !== undefined) {
    return Number(movimentacao.valor_total);
  }

  return (
    Number(movimentacao.quantidade || 0) *
    Number(movimentacao.preco_unitario || 0)
  );
}

function obterNomeProduto(
  produtoId: number | null | undefined,
  produtos: Produto[],
) {
  if (!produtoId) {
    return "Sem produto";
  }

  const produto = produtos.find(
    (item) => item.id === produtoId,
  );

  return produto?.nome ?? `Produto #${produtoId}`;
}

/* =========================
   Componente principal
========================= */

function FluxoCaixa() {
  const [formulario, setFormulario] =
    useState<FormularioMovimentacao>(
      formularioInicial,
    );

  const [produtos, setProdutos] = useState<
    Produto[]
  >([]);

  const [movimentacoes, setMovimentacoes] =
    useState<MovimentacaoApi[]>([]);

  const [resumoApi, setResumoApi] =
    useState<ResumoFluxoApi | null>(null);

  const [carregando, setCarregando] =
    useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [mensagem, setMensagem] =
    useState<Mensagem | null>(null);

  const [filtroTipo, setFiltroTipo] = useState<
    "todos" | TipoMovimentacao
  >("todos");

  const [busca, setBusca] = useState("");

  /* =========================
     Valores calculados
  ========================= */

  const valorTotalFormulario = useMemo(() => {
    return (
      Number(formulario.quantidade || 0) *
      Number(formulario.preco_unitario || 0)
    );
  }, [
    formulario.quantidade,
    formulario.preco_unitario,
  ]);

  const resumoCalculado = useMemo(() => {
    const totalEntradas = movimentacoes
      .filter(
        (movimentacao) =>
          movimentacao.tipo === "entrada",
      )
      .reduce((total, movimentacao) => {
        return (
          total +
          obterValorMovimentacao(movimentacao)
        );
      }, 0);

    const totalSaidas = movimentacoes
      .filter(
        (movimentacao) =>
          movimentacao.tipo === "saida",
      )
      .reduce((total, movimentacao) => {
        return (
          total +
          obterValorMovimentacao(movimentacao)
        );
      }, 0);

    return {
      totalEntradas,
      totalSaidas,
      saldo: totalEntradas - totalSaidas,
    };
  }, [movimentacoes]);

  /*
    Aceita tanto totalEntradas/totalSaidas
    quanto entradas/saidas, caso o back-end
    utilize algum desses formatos.
  */

  const totalEntradas =
    resumoApi?.totalEntradas ??
    resumoApi?.entradas ??
    resumoCalculado.totalEntradas;

  const totalSaidas =
    resumoApi?.totalSaidas ??
    resumoApi?.saidas ??
    resumoCalculado.totalSaidas;

  const saldo =
    resumoApi?.saldo ??
    totalEntradas - totalSaidas;

  const movimentacoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return movimentacoes.filter(
      (movimentacao) => {
        const correspondeTipo =
          filtroTipo === "todos" ||
          movimentacao.tipo === filtroTipo;

        const nomeProduto = obterNomeProduto(
          movimentacao.produto_id,
          produtos,
        ).toLowerCase();

        const correspondeBusca =
          termo.length === 0 ||
          nomeProduto.includes(termo) ||
          movimentacao.descricao
            ?.toLowerCase()
            .includes(termo) ||
          movimentacao.categoria
            ?.toLowerCase()
            .includes(termo);

        return correspondeTipo && correspondeBusca;
      },
    );
  }, [
    busca,
    filtroTipo,
    movimentacoes,
    produtos,
  ]);

  /* =========================
     Carregamento da API
  ========================= */

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      setMensagem(null);

      /*
        allSettled evita quebrar a tela inteira
        caso GET /fluxo-caixa continue retornando 500.
      */

      const [
        resultadoProdutos,
        resultadoMovimentacoes,
        resultadoResumo,
      ] = await Promise.allSettled([
        fetch(`${API_URL}/produtos`),
        fetch(`${API_URL}/fluxo-caixa`),
        fetch(`${API_URL}/fluxo-caixa/resumo`),
      ]);

      if (
        resultadoProdutos.status === "fulfilled" &&
        resultadoProdutos.value.ok
      ) {
        const produtosRecebidos: Produto[] =
          await resultadoProdutos.value.json();

        setProdutos(produtosRecebidos);
      }

      if (
        resultadoMovimentacoes.status ===
          "fulfilled" &&
        resultadoMovimentacoes.value.ok
      ) {
        const movimentacoesRecebidas:
          MovimentacaoApi[] =
          await resultadoMovimentacoes.value.json();

        setMovimentacoes(
          Array.isArray(movimentacoesRecebidas)
            ? movimentacoesRecebidas
            : [],
        );
      }

      if (
        resultadoResumo.status === "fulfilled" &&
        resultadoResumo.value.ok
      ) {
        const resumoRecebido: ResumoFluxoApi =
          await resultadoResumo.value.json();

        setResumoApi(resumoRecebido);
      }
    } catch (erro) {
      console.error(
        "Erro ao carregar fluxo de caixa:",
        erro,
      );

      setMensagem({
        tipo: "erro",
        texto:
          "Não foi possível carregar todos os dados do fluxo de caixa.",
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
    campo: keyof FormularioMovimentacao,
    valor: string,
  ) {
    setFormulario((dadosAtuais) => ({
      ...dadosAtuais,
      [campo]: valor,
    }));

    setMensagem(null);
  }

  function selecionarProduto(produtoId: string) {
    const produtoSelecionado = produtos.find(
      (produto) =>
        produto.id === Number(produtoId),
    );

    setFormulario((dadosAtuais) => ({
      ...dadosAtuais,
      produto_id: produtoId,

      preco_unitario: produtoSelecionado
        ? String(produtoSelecionado.preco)
        : dadosAtuais.preco_unitario,
    }));

    setMensagem(null);
  }

  function limparFormulario(
    tipo: TipoMovimentacao = formulario.tipo,
  ) {
    setFormulario({
      ...formularioInicial,
      tipo,
      data_movimentacao: new Date()
        .toISOString()
        .slice(0, 10),
    });
  }

  async function registrarMovimentacao(
    evento: React.FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    const quantidade = Number(
      formulario.quantidade,
    );

    const precoUnitario = Number(
      formulario.preco_unitario,
    );

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

    if (
      !Number.isFinite(precoUnitario) ||
      precoUnitario <= 0
    ) {
      setMensagem({
        tipo: "erro",
        texto:
          "Informe um preço unitário válido.",
      });

      return;
    }

    if (!formulario.descricao.trim()) {
      setMensagem({
        tipo: "erro",
        texto:
          "Informe uma descrição para a movimentação.",
      });

      return;
    }

    try {
      setSalvando(true);
      setMensagem(null);

      /*
        Campos aceitos atualmente pelo Swagger.
      */

      consttual = {
        tipo: formulario.tipo,

        produto_id: formulario.produto_id
          ? Number(formulario.produto_id)
          : null,

        quantidade,

        preco_unitario: precoUnitario,

        descricao:
          formulario.descricao.trim(),

        venda_id: formulario.venda_id
          ? Number(formulario.venda_id)
          : null,
      };

      /*
        Campos que futuramente devem fazer parte
        do payload no back-end:

        categoria: formulario.categoria,
        valor_total: valorTotalFormulario,
        data_movimentacao:
          formulario.data_movimentacao,
      */

      const resposta = await fetch(
        `${API_URL}/fluxo-caixa`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          body: JSON.stringify(payloadAtual),
        },
      );

      if (!resposta.ok) {
        let mensagemApi =
          "Não foi possível registrar a movimentação.";

        try {
          const erroApi = await resposta.json();

          if (erroApi?.message) {
            mensagemApi = Array.isArray(
              erroApi.message,
            )
              ? erroApi.message.join(", ")
              : erroApi.message;
          }
        } catch {
          // Mantém a mensagem padrão.
        }

        throw new Error(mensagemApi);
      }

      const movimentacaoCriada =
        (await resposta.json()) as MovimentacaoApi;

      /*
        Acrescenta os campos futuros somente no
        estado da interface. Eles devem ser persistidos
        pelo back-end quando o DTO for atualizado.
      */

      const movimentacaoCompleta: MovimentacaoApi =
        {
          ...movimentacaoCriada,

          categoria:
            movimentacaoCriada.categoria ??
            formulario.categoria,

          valor_total:
            movimentacaoCriada.valor_total ??
            valorTotalFormulario,

          data_movimentacao:
            movimentacaoCriada.data_movimentacao ??
            formulario.data_movimentacao,
        };

      setMovimentacoes((movimentacoesAtuais) => [
        movimentacaoCompleta,
        ...movimentacoesAtuais,
      ]);

      setResumoApi(null);

      setMensagem({
        tipo: "sucesso",
        texto:
          formulario.tipo === "entrada"
            ? "Entrada registrada com sucesso."
            : "Saída registrada com sucesso.",
      });

      limparFormulario(formulario.tipo);
    } catch (erro) {
      console.error(
        "Erro ao registrar movimentação:",
        erro,
      );

      setMensagem({
        tipo: "erro",

        texto:
          erro instanceof Error
            ? erro.message
            : "Não foi possível registrar a movimentação.",
      });
    } finally {
      setSalvando(false);
    }
  }

  /* =========================
     Renderização
  ========================= */

  return (
    <section className="fluxo-caixa">
      <header className="fluxo-cabecalho">
        <div className="fluxo-cabecalho-texto">
          <span className="fluxo-cabecalho-icone">
            $
          </span>

          <div>
            <h1 className="medium-h1">
              Fluxo de Caixa
            </h1>

            <p className="light-h3">
              Registre e acompanhe as movimentações
              financeiras.
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

      {/* Resumo financeiro */}

      <div className="fluxo-resumo">
        <article className="fluxo-resumo-card fluxo-resumo-entrada">
          <div className="fluxo-resumo-topo">
            <span className="fluxo-resumo-icone">
              ↗
            </span>

            <span className="light-h3">
              Total de entradas
            </span>
          </div>

          <strong className="bold-h2">
            {formatarMoeda(totalEntradas)}
          </strong>

          <small>
            Valores registrados como entrada
          </small>
        </article>

        <article className="fluxo-resumo-card fluxo-resumo-saida">
          <div className="fluxo-resumo-topo">
            <span className="fluxo-resumo-icone">
              ↘
            </span>

            <span className="light-h3">
              Total de saídas
            </span>
          </div>

          <strong className="bold-h2">
            {formatarMoeda(totalSaidas)}
          </strong>

          <small>
            Valores registrados como despesa
          </small>
        </article>

        <article
          className={`fluxo-resumo-card fluxo-resumo-saldo ${
            saldo < 0
              ? "fluxo-resumo-saldo-negativo"
              : ""
          }`}
        >
          <div className="fluxo-resumo-topo">
            <span className="fluxo-resumo-icone">
              =
            </span>

            <span className="light-h3">
              Saldo atual
            </span>
          </div>

          <strong className="bold-h2">
            {formatarMoeda(saldo)}
          </strong>

          <small>
            Entradas menos saídas
          </small>
        </article>
      </div>

      {/* Formulário */}

      <article className="fluxo-painel">
        <div className="fluxo-painel-cabecalho">
          <div>
            <h2 className="medium-h2">
              Nova movimentação
            </h2>

            <p className="light-h3">
              Preencha os dados para registrar uma
              entrada ou saída.
            </p>
          </div>
        </div>

        <form
          className="fluxo-formulario"
          onSubmit={registrarMovimentacao}
        >
          <div className="fluxo-tipo-seletor">
            <button
              type="button"
              className={`fluxo-tipo-botao ${
                formulario.tipo === "entrada"
                  ? "fluxo-tipo-botao-entrada-ativo"
                  : ""
              }`}
              onClick={() =>
                alterarCampo("tipo", "entrada")
              }
            >
              <span>↗</span>
              Entrada
            </button>

            <button
              type="button"
              className={`fluxo-tipo-botao ${
                formulario.tipo === "saida"
                  ? "fluxo-tipo-botao-saida-ativo"
                  : ""
              }`}
              onClick={() =>
                alterarCampo("tipo", "saida")
              }
            >
              <span>↘</span>
              Saída
            </button>
          </div>

          <div className="fluxo-campos">
            <label className="fluxo-campo">
              <span className="medium-h3">
                Produto
              </span>

              <select
                value={formulario.produto_id}
                onChange={(evento) =>
                  selecionarProduto(
                    evento.target.value,
                  )
                }
              >
                <option value="">
                  Selecione um produto
                </option>

                {produtos.map((produto) => (
                  <option
                    key={produto.id}
                    value={produto.id}
                  >
                    {produto.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="fluxo-campo">
              <span className="medium-h3">
                Quantidade
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
              />
            </label>

            <label className="fluxo-campo">
              <span className="medium-h3">
                Preço unitário
              </span>

              <div className="fluxo-campo-moeda">
                <span>R$</span>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={
                    formulario.preco_unitario
                  }
                  onChange={(evento) =>
                    alterarCampo(
                      "preco_unitario",
                      evento.target.value,
                    )
                  }
                  placeholder="0,00"
                />
              </div>
            </label>

            <label className="fluxo-campo">
              <span className="medium-h3">
                Data
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
              />
            </label>

            <label className="fluxo-campo">
              <span className="medium-h3">
                Categoria
              </span>

              <select
                value={formulario.categoria}
                onChange={(evento) =>
                  alterarCampo(
                    "categoria",
                    evento.target.value,
                  )
                }
              >
                <option value="">
                  Selecione uma categoria
                </option>

                {formulario.tipo === "entrada" ? (
                  <>
                    <option value="venda">
                      Venda
                    </option>

                    <option value="aporte">
                      Aporte
                    </option>

                    <option value="recebimento">
                      Recebimento
                    </option>

                    <option value="outra_entrada">
                      Outra entrada
                    </option>
                  </>
                ) : (
                  <>
                    <option value="fornecedor">
                      Compra de fornecedor
                    </option>

                    <option value="estoque">
                      Reposição de estoque
                    </option>

                    <option value="frete">
                      Frete
                    </option>

                    <option value="comissao">
                      Comissão
                    </option>

                    <option value="imposto">
                      Imposto
                    </option>

                    <option value="outra_despesa">
                      Outra despesa
                    </option>
                  </>
                )}
              </select>
            </label>

            <label className="fluxo-campo">
              <span className="medium-h3">
                Venda relacionada
              </span>

              <input
                type="number"
                min="1"
                value={formulario.venda_id}
                onChange={(evento) =>
                  alterarCampo(
                    "venda_id",
                    evento.target.value,
                  )
                }
                placeholder="ID da venda, se houver"
              />
            </label>

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
                placeholder={
                  formulario.tipo === "entrada"
                    ? "Ex.: Recebimento da venda do cliente"
                    : "Ex.: Compra de mercadorias do fornecedor"
                }
              />
            </label>

            <div className="fluxo-total">
              <span className="light-h3">
                Valor total
              </span>

              <strong className="bold-h2">
                {formatarMoeda(
                  valorTotalFormulario,
                )}
              </strong>

              <small>
                Quantidade × preço unitário
              </small>
            </div>
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
              onClick={() => limparFormulario()}
              disabled={salvando}
            >
              Limpar
            </button>

            <button
              type="submit"
              className={`fluxo-botao-salvar medium-h3 ${
                formulario.tipo === "saida"
                  ? "fluxo-botao-salvar-saida"
                  : ""
              }`}
              disabled={salvando}
            >
              {salvando
                ? "Salvando..."
                : formulario.tipo === "entrada"
                  ? "Registrar entrada"
                  : "Registrar saída"}
            </button>
          </div>
        </form>
      </article>

      {/* Histórico */}

      <article className="fluxo-painel">
        <div className="fluxo-historico-topo">
          <div>
            <h2 className="medium-h2">
              Movimentações recentes
            </h2>

            <p className="light-h3">
              Histórico de entradas e saídas.
            </p>
          </div>

          <div className="fluxo-filtros">
            <input
              type="search"
              value={busca}
              onChange={(evento) =>
                setBusca(evento.target.value)
              }
              placeholder="Buscar movimentação"
              aria-label="Buscar movimentação"
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
              aria-label="Filtrar por tipo"
            >
              <option value="todos">
                Todos os tipos
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
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Data</th>
                <th>Quantidade</th>
                <th>Valor</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td
                    colSpan={7}
                    className="fluxo-tabela-vazia"
                  >
                    Carregando movimentações...
                  </td>
                </tr>
              ) : movimentacoesFiltradas.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="fluxo-tabela-vazia"
                  >
                    Nenhuma movimentação encontrada.
                    O endpoint de listagem pode ainda
                    estar indisponível.
                  </td>
                </tr>
              ) : (
                movimentacoesFiltradas.map(
                  (movimentacao) => (
                    <tr key={movimentacao.id}>
                      <td>
                        <span
                          className={`fluxo-status fluxo-status-${movimentacao.tipo}`}
                        >
                          {movimentacao.tipo ===
                          "entrada"
                            ? "↗ Entrada"
                            : "↘ Saída"}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {movimentacao.descricao ||
                            "Sem descrição"}
                        </strong>

                        {movimentacao.venda_id && (
                          <small>
                            Venda #
                            {
                              movimentacao.venda_id
                            }
                          </small>
                        )}
                      </td>

                      <td>
                        {obterNomeProduto(
                          movimentacao.produto_id,
                          produtos,
                        )}
                      </td>

                      <td>
                        {movimentacao.categoria
                          ?.replaceAll("_", " ") ??
                          "Não informada"}
                      </td>

                      <td>
                        {formatarData(
                          movimentacao.data_movimentacao ??
                            movimentacao.createdAt,
                        )}
                      </td>

                      <td>
                        {movimentacao.quantidade}
                      </td>

                      <td
                        className={
                          movimentacao.tipo ===
                          "entrada"
                            ? "fluxo-valor-entrada"
                            : "fluxo-valor-saida"
                        }
                      >
                        {movimentacao.tipo ===
                        "entrada"
                          ? "+"
                          : "-"}{" "}
                        {formatarMoeda(
                          obterValorMovimentacao(
                            movimentacao,
                          ),
                        )}
                      </td>
                    </tr>
                  ),
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