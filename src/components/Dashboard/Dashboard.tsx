import { useEffect, useMemo, useState } from "react";

import "./Dashboard.css";

import { API_BASE_URL } from "../../lib/api";
import {
  lerMargensCategoriasProdutos,
  normalizarCategoriaProduto,
  obterCategoriaProduto,
} from "../../lib/margensProdutos";
import SortableHeader from "../SortableHeader/SortableHeader";
import type { DirecaoOrdenacao } from "../../lib/ordenacao";
import { ordenarLista } from "../../lib/ordenacao";

const API_URL = API_BASE_URL;
const CHAVE_HISTORICO_OCULTO = "vendas:dashboard:historico-oculto:v1";

/* =========================
   Tipos atuais da API
========================= */

type ProdutoApi = {
  id: number;
  nome: string;
  tipo: string;
  preco: number;
};

type FluxoCaixaItemApi = {
  id: number;
  tipo: "entrada" | "saida";
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
  data: string;
  descricao: string;
  venda_id: number | null;
  produto: {
    id: number;
    nome: string;
    preco: number;
  } | null;
  vendas: unknown | null;
};

type DadosCompletos = {
  fluxoCaixa: FluxoCaixaItemApi[];
  produtos: ProdutoApi[];
};

type Periodo = "diario" | "mensal" | "anual";
type FiltroHistorico = "todos" | "despesas" | "faturamento" | "ajustes";
type ChaveHistorico = "classificacao" | "produto" | "data" | "quantidade" | "unitario" | "total";
type ChaveCategoria = "categoria" | "markup" | "faturamento" | "lucro" | "margem";
type EstadoOrdenacao<T extends string> = { chave: T; direcao: DirecaoOrdenacao } | null;

type ResumoCardProps = {
  titulo: string;
  valor: string;
  detalhe: string;
  tipo: "despesa" | "faturamento" | "lucro" | "margem";
};

type GraficoVendasProps = {
  fluxoCaixa: FluxoCaixaItemApi[];
  periodo: Periodo;
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

function formatarEixo(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

function formatarData(data?: string) {
  if (!data) {
    return "Sem data";
  }

  const dataConvertida = new Date(data);
  if (Number.isNaN(dataConvertida.getTime())) return "Sem data";

  return dataConvertida.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatarPercentual(valor: number) {
  return `${valor.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

function normalizarBusca(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function valorMovimentacao(movimentacao: FluxoCaixaItemApi) {
  return Number(movimentacao.quantidade || 0) *
    Number(movimentacao.preco_unitario || 0);
}

function ehAjusteInventario(movimentacao: FluxoCaixaItemApi) {
  const descricao = String(movimentacao.descricao ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return descricao.includes("ajuste") && descricao.includes("inventario");
}

function chaveMovimentacao(movimentacao: FluxoCaixaItemApi) {
  return `${movimentacao.tipo}:${movimentacao.id}`;
}

function lerMovimentacoesOcultas() {
  try {
    const dados: unknown = JSON.parse(
      localStorage.getItem(CHAVE_HISTORICO_OCULTO) ?? "[]",
    );

    return Array.isArray(dados)
      ? dados.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

/* =========================
   Card de resumo
========================= */

function ResumoCard({
  titulo,
  valor,
  detalhe,
  tipo,
}: ResumoCardProps) {
  return (
    <article className={`dashboard-resumo-card dashboard-resumo-${tipo}`}>
      <div className="dashboard-resumo-informacoes">
        <span className="light-h3">{titulo}</span>
        <strong className="bold-h2">{valor}</strong>
        <small className="dashboard-resumo-detalhe">{detalhe}</small>
      </div>
    </article>
  );
}

/* =========================
   Gráfico
========================= */

function GraficoVendas({ fluxoCaixa, periodo }: GraficoVendasProps) {
  const dadosGrafico = useMemo(() => {
    const grupos = new Map<
      string,
      {
        ordem: string;
        rotulo: string;
        faturamento: number;
        compras: number;
      }
    >();

    fluxoCaixa.forEach((movimento) => {
      if (!movimento.data || ehAjusteInventario(movimento)) {
        return;
      }

      const data = new Date(movimento.data);

      let ordem = "";
      let rotulo = "";

      if (periodo === "diario") {
        ordem = data.toISOString().slice(0, 10);
        rotulo = data.toLocaleDateString("pt-BR", {
          timeZone: "UTC",
          day: "2-digit",
          month: "2-digit",
        });
      }

      if (periodo === "mensal") {
        const ano = data.getUTCFullYear();
        const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
        ordem = `${ano}-${mes}`;
        rotulo = data.toLocaleDateString("pt-BR", {
          timeZone: "UTC",
          month: "short",
          year: "numeric",
        });
      }

      if (periodo === "anual") {
        ordem = String(data.getUTCFullYear());
        rotulo = ordem;
      }

      const grupoExistente = grupos.get(ordem);
      grupos.set(ordem, {
        ordem,
        rotulo,
        faturamento:
          Number(grupoExistente?.faturamento || 0) +
          (movimento.tipo === "saida" ? valorMovimentacao(movimento) : 0),
        compras:
          Number(grupoExistente?.compras || 0) +
          (movimento.tipo === "entrada" ? valorMovimentacao(movimento) : 0),
      });
    });

    const resultado = Array.from(grupos.values()).sort(
      (primeiro, segundo) =>
        primeiro.ordem.localeCompare(segundo.ordem),
    );

    return resultado;
  }, [fluxoCaixa, periodo]);

  const maiorValor = Math.max(
    ...dadosGrafico.flatMap((item) => [item.faturamento, item.compras]),
    0,
  );

  return (
    <div
      className="dashboard-grafico"
      aria-label="Faturamento de vendas comparado às compras por período"
    >
      {dadosGrafico.length === 0 ? (
        <p className="dashboard-grafico-vazio">
          Nenhuma movimentação com data disponível.
        </p>
      ) : (
        <>
          <div className="dashboard-grafico-valores" aria-hidden="true">
            <small>{formatarEixo(maiorValor)}</small>
            <small>{formatarEixo(maiorValor / 2)}</small>
            <small>{formatarEixo(0)}</small>
          </div>
          <div className="dashboard-grafico-conteudo">
            <div className="dashboard-grafico-legenda">
              <span><i className="dashboard-legenda-faturamento" />Faturamento</span>
              <span><i className="dashboard-legenda-compras" />Compras</span>
            </div>
            <div
              className="dashboard-grafico-barras"
              style={{
                gridTemplateColumns: `repeat(${dadosGrafico.length}, minmax(52px, 1fr))`,
              }}
            >
              {dadosGrafico.map((item) => (
                <div className="dashboard-coluna" key={item.ordem}>
                  <div className="dashboard-coluna-barras">
                    <span
                      className="dashboard-barra-faturamento"
                      style={{
                        height: `${maiorValor > 0 ? (item.faturamento / maiorValor) * 100 : 0}%`,
                      }}
                      title={`Faturamento: ${formatarMoeda(item.faturamento)}`}
                    />
                    <span
                      className="dashboard-barra-compras"
                      style={{
                        height: `${maiorValor > 0 ? (item.compras / maiorValor) * 100 : 0}%`,
                      }}
                      title={`Compras: ${formatarMoeda(item.compras)}`}
                    />
                  </div>
                  <small>{item.rotulo}</small>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* =========================
   Dashboard principal
========================= */

function Dashboard({ buscaGlobal }: { buscaGlobal: string }) {
  const [dados, setDados] =
    useState<DadosCompletos | null>(null);

  const [periodo, setPeriodo] =
    useState<Periodo>("mensal");

  const [filtroHistorico, setFiltroHistorico] =
    useState<FiltroHistorico>("todos");
  const [buscaHistorico, setBuscaHistorico] = useState("");
  const [ordenacaoHistorico, setOrdenacaoHistorico] =
    useState<EstadoOrdenacao<ChaveHistorico>>(null);
  const [ordenacaoCategoria, setOrdenacaoCategoria] =
    useState<EstadoOrdenacao<ChaveCategoria>>(null);

  const [movimentacoesOcultas, setMovimentacoesOcultas] =
    useState<string[]>(lerMovimentacoesOcultas);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState<string | null>(null);

  async function carregarDashboard() {
    try {
      const [respostaFluxoCaixa, respostaProdutos] = await Promise.all([
        fetch(`${API_URL}/fluxo-caixa`),
        fetch(`${API_URL}/produtos`),
      ]);

      if (!respostaFluxoCaixa.ok) {
        throw new Error(
          `Erro ${respostaFluxoCaixa.status} ao buscar o fluxo de caixa.`,
        );
      }

      if (!respostaProdutos.ok) {
        throw new Error(
          `Erro ${respostaProdutos.status} ao buscar produtos.`,
        );
      }

      const [fluxoCaixa, produtos] = await Promise.all([
        respostaFluxoCaixa.json() as Promise<
          FluxoCaixaItemApi[]
        >,
        respostaProdutos.json() as Promise<
          ProdutoApi[]
        >,
      ]);

      setDados({
        fluxoCaixa,
        produtos,
      });
    } catch (erroDesconhecido) {
      console.error(
        "Erro ao carregar dashboard:",
        erroDesconhecido,
      );

      if (erroDesconhecido instanceof Error) {
        setErro(erroDesconhecido.message);
      } else {
        setErro(
          "Não foi possível carregar o dashboard.",
        );
      }
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    async function iniciar() {
      await carregarDashboard();
    }

    void iniciar();
  }, []);

  function recarregarDashboard() {
    setCarregando(true);
    setErro(null);
    void carregarDashboard();
  }

  function limparHistoricoDashboard() {
    if (!dados) return;

    const chavesVisiveis = dados.fluxoCaixa
      .filter((movimento) => !movimentacoesOcultas.includes(chaveMovimentacao(movimento)))
      .map(chaveMovimentacao);

    if (chavesVisiveis.length === 0) return;

    const confirmado = window.confirm(
      `Ocultar ${chavesVisiveis.length} movimentação(ões) deste dashboard? Os registros continuarão salvos na API e poderão ser restaurados aqui.`,
    );
    if (!confirmado) return;

    const atualizadas = Array.from(
      new Set([...movimentacoesOcultas, ...chavesVisiveis]),
    );
    setMovimentacoesOcultas(atualizadas);
    localStorage.setItem(
      CHAVE_HISTORICO_OCULTO,
      JSON.stringify(atualizadas),
    );
  }

  function restaurarHistoricoDashboard() {
    setMovimentacoesOcultas([]);
    localStorage.removeItem(CHAVE_HISTORICO_OCULTO);
  }

  if (carregando) {
    return (
      <section className="dashboard">
        <article className="dashboard-card">
          <h2 className="medium-h2">
            Carregando dashboard...
          </h2>

          <p className="light-h3">
            Buscando os dados da API.
          </p>
        </article>
      </section>
    );
  }

  if (erro) {
    return (
      <section className="dashboard">
        <article className="dashboard-card">
          <h2 className="medium-h2">
            Erro ao carregar o dashboard
          </h2>

          <p className="light-h3">{erro}</p>

          <button
            type="button"
            className="dashboard-ver-todos medium-h3"
            onClick={recarregarDashboard}
          >
            Tentar novamente
          </button>
        </article>
      </section>
    );
  }

  if (!dados) {
    return null;
  }

  const { fluxoCaixa, produtos } = dados;

  const produtosPorId = new Map(
    produtos.map((produto) => [Number(produto.id), produto]),
  );
  const comprasPorProduto = new Map<number, { custo: number; unidades: number }>();

  for (const movimento of fluxoCaixa) {
    if (movimento.tipo !== "entrada") continue;
    const atual = comprasPorProduto.get(Number(movimento.produto_id)) ?? {
      custo: 0,
      unidades: 0,
    };
    atual.custo += valorMovimentacao(movimento);
    atual.unidades += Number(movimento.quantidade || 0);
    comprasPorProduto.set(Number(movimento.produto_id), atual);
  }

  const margensCategorias = lerMargensCategoriasProdutos();
  const custoMedioPorProduto = new Map<number, number>();

  for (const produto of produtos) {
    const compras = comprasPorProduto.get(Number(produto.id));
    if (compras && compras.unidades > 0) {
      custoMedioPorProduto.set(produto.id, compras.custo / compras.unidades);
      continue;
    }

    const categoria = normalizarCategoriaProduto(produto.tipo);
    const margem =
      margensCategorias[categoria] ??
      obterCategoriaProduto(produto.tipo)?.margemBase;
    const preco = Number(produto.preco || 0);
    if (margem !== undefined && preco > 0) {
      custoMedioPorProduto.set(produto.id, preco / (1 + margem / 100));
    }
  }

  const movimentacoesVenda = fluxoCaixa.filter(
    (movimento) =>
      movimento.tipo === "saida" && !ehAjusteInventario(movimento),
  );
  const compras = fluxoCaixa
    .filter(
      (movimento) =>
        movimento.tipo === "entrada" && !ehAjusteInventario(movimento),
    )
    .reduce((total, movimento) => total + valorMovimentacao(movimento), 0);
  const faturamento = movimentacoesVenda.reduce(
    (total, movimento) => total + valorMovimentacao(movimento),
    0,
  );
  const custoProdutosVendidos = movimentacoesVenda.reduce(
    (total, movimento) =>
      total +
      Number(movimento.quantidade || 0) *
        Number(custoMedioPorProduto.get(Number(movimento.produto_id)) || 0),
    0,
  );
  const lucroBruto = faturamento - custoProdutosVendidos;
  const margemBruta = faturamento > 0 ? (lucroBruto / faturamento) * 100 : 0;

  const resumoCategorias = new Map<
    string,
    { nome: string; faturamento: number; custo: number; lucro: number }
  >();

  for (const movimento of movimentacoesVenda) {
    const produto = produtosPorId.get(Number(movimento.produto_id));
    const categoria = obterCategoriaProduto(produto?.tipo ?? "");
    const nomeCategoria = categoria?.label ?? produto?.tipo ?? "Sem categoria";
    const atual = resumoCategorias.get(nomeCategoria) ?? {
      nome: nomeCategoria,
      faturamento: 0,
      custo: 0,
      lucro: 0,
    };
    const receita = valorMovimentacao(movimento);
    const custo =
      Number(movimento.quantidade || 0) *
      Number(custoMedioPorProduto.get(Number(movimento.produto_id)) || 0);
    atual.faturamento += receita;
    atual.custo += custo;
    atual.lucro += receita - custo;
    resumoCategorias.set(nomeCategoria, atual);
  }

  const categoriasRentaveis = Array.from(resumoCategorias.values()).sort(
    (a, b) => b.lucro - a.lucro,
  );

  const categoriasOrdenadas = ordenacaoCategoria
    ? ordenarLista(
      categoriasRentaveis,
      (categoria) => {
        switch (ordenacaoCategoria.chave) {
          case "categoria": return categoria.nome;
          case "markup": return margensCategorias[normalizarCategoriaProduto(categoria.nome)] ?? -1;
          case "faturamento": return categoria.faturamento;
          case "lucro": return categoria.lucro;
          case "margem": return categoria.faturamento > 0 ? categoria.lucro / categoria.faturamento : 0;
        }
      },
      ordenacaoCategoria.direcao,
    )
    : categoriasRentaveis;

  const historicoFinanceiro = [...fluxoCaixa]
    .filter((movimento) => !movimentacoesOcultas.includes(chaveMovimentacao(movimento)))
    .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""))
    .filter((movimento) => {
      const termos = [buscaHistorico, buscaGlobal]
        .map(normalizarBusca)
        .filter(Boolean);
      const nomeProduto = produtosPorId.get(Number(movimento.produto_id))?.nome;
      const textoMovimento = normalizarBusca(
        `${movimento.id} ${movimento.venda_id ?? ""} ${nomeProduto ?? ""} ${movimento.descricao} ${movimento.data} ${movimento.quantidade}`,
      );
      const correspondeBusca = termos.every((termo) =>
        textoMovimento.includes(termo),
      );

      if (!correspondeBusca) return false;
      if (filtroHistorico === "ajustes") return ehAjusteInventario(movimento);
      if (filtroHistorico === "despesas") {
        return movimento.tipo === "entrada" && !ehAjusteInventario(movimento);
      }
      if (filtroHistorico === "faturamento") {
        return movimento.tipo === "saida" && !ehAjusteInventario(movimento);
      }
      return true;
    });

  const historicoOrdenado = ordenacaoHistorico
    ? ordenarLista(
      historicoFinanceiro,
      (movimento) => {
        const produto = produtosPorId.get(Number(movimento.produto_id));
        switch (ordenacaoHistorico.chave) {
          case "classificacao":
            return ehAjusteInventario(movimento)
              ? "Ajuste de estoque"
              : movimento.tipo === "entrada" ? "Despesa" : "Faturamento";
          case "produto": return produto?.nome ?? movimento.produto?.nome ?? `Produto ${movimento.produto_id}`;
          case "data": return new Date(movimento.data).getTime() || 0;
          case "quantidade": return Number(movimento.quantidade || 0);
          case "unitario": return Number(movimento.preco_unitario || 0);
          case "total": return valorMovimentacao(movimento);
        }
      },
      ordenacaoHistorico.direcao,
    )
    : historicoFinanceiro;

  function alternarOrdenacaoHistorico(chave: ChaveHistorico) {
    setOrdenacaoHistorico((atual) => ({
      chave,
      direcao: atual?.chave === chave && atual.direcao === "desc" ? "asc" : "desc",
    }));
  }

  function alternarOrdenacaoCategoria(chave: ChaveCategoria) {
    setOrdenacaoCategoria((atual) => ({
      chave,
      direcao: atual?.chave === chave && atual.direcao === "desc" ? "asc" : "desc",
    }));
  }

  return (
    <section className="dashboard">
      {/* Cards superiores */}

      <div className="dashboard-resumos">
        <ResumoCard
          titulo="Compras (despesas)"
          valor={formatarMoeda(compras)}
          detalhe="Custo total das entradas registradas"
          tipo="despesa"
        />

        <ResumoCard
          titulo="Faturamento"
          valor={formatarMoeda(faturamento)}
          detalhe="Valor total das vendas registradas"
          tipo="faturamento"
        />

        <ResumoCard
          titulo="Lucro bruto estimado"
          valor={formatarMoeda(lucroBruto)}
          detalhe={`Faturamento menos custo médio dos itens vendidos (${formatarMoeda(custoProdutosVendidos)}); estimado pela categoria quando falta histórico de compra`}
          tipo="lucro"
        />

        <ResumoCard
          titulo="Margem bruta"
          valor={formatarPercentual(margemBruta)}
          detalhe="Lucro bruto como percentual do faturamento"
          tipo="margem"
        />
      </div>

      {/* Parte central */}

      <div className="dashboard-centro">
        <article className="dashboard-card dashboard-previsao">
          <div className="dashboard-card-cabecalho">
            <h2 className="medium-h2">
              Faturamento e compras
            </h2>

            <select
              className="dashboard-periodo"
              value={periodo}
              aria-label="Agrupar histórico financeiro"
              onChange={(evento) =>
                setPeriodo(
                  evento.target.value as Periodo,
                )
              }
            >
              <option value="diario">
                Diário
              </option>

              <option value="mensal">
                Mensal
              </option>

              <option value="anual">
                Anual
              </option>
            </select>
          </div>

          <GraficoVendas
            fluxoCaixa={fluxoCaixa}
            periodo={periodo}
          />
        </article>

        <article className="dashboard-card dashboard-rentabilidade">
          <div className="dashboard-card-cabecalho">
            <h2 className="medium-h2">
              Rentabilidade por categoria
            </h2>
          </div>

          {categoriasRentaveis.length === 0 ? (
            <p className="dashboard-sem-dados-origem">
              Ainda não há vendas por categoria para calcular a rentabilidade.
            </p>
          ) : (
            <div className="dashboard-rentabilidade-tabela-wrap">
              <table className="dashboard-rentabilidade-tabela">
                <thead>
                  <tr>
                    <SortableHeader label="Categoria" active={ordenacaoCategoria?.chave === "categoria"} direction={ordenacaoCategoria?.direcao ?? "desc"} onClick={() => alternarOrdenacaoCategoria("categoria")} />
                    <SortableHeader label="Markup mínimo (sobre custo)" active={ordenacaoCategoria?.chave === "markup"} direction={ordenacaoCategoria?.direcao ?? "desc"} onClick={() => alternarOrdenacaoCategoria("markup")} />
                    <SortableHeader label="Faturamento" active={ordenacaoCategoria?.chave === "faturamento"} direction={ordenacaoCategoria?.direcao ?? "desc"} onClick={() => alternarOrdenacaoCategoria("faturamento")} />
                    <SortableHeader label="Lucro bruto" active={ordenacaoCategoria?.chave === "lucro"} direction={ordenacaoCategoria?.direcao ?? "desc"} onClick={() => alternarOrdenacaoCategoria("lucro")} />
                    <SortableHeader label="Margem realizada (sobre faturamento)" active={ordenacaoCategoria?.chave === "margem"} direction={ordenacaoCategoria?.direcao ?? "desc"} onClick={() => alternarOrdenacaoCategoria("margem")} />
                  </tr>
                </thead>
                <tbody>
                  {categoriasOrdenadas.map((categoria) => (
                    <tr key={categoria.nome}>
                      <td>{categoria.nome}</td>
                      <td>
                        {margensCategorias[
                          normalizarCategoriaProduto(categoria.nome)
                        ] === undefined
                          ? "—"
                          : formatarPercentual(
                              margensCategorias[
                                normalizarCategoriaProduto(categoria.nome)
                              ],
                            )}
                      </td>
                      <td>{formatarMoeda(categoria.faturamento)}</td>
                      <td>{formatarMoeda(categoria.lucro)}</td>
                      <td>
                        {formatarPercentual(
                          categoria.faturamento > 0
                            ? (categoria.lucro / categoria.faturamento) * 100
                            : 0,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>

      {/* Histórico financeiro */}

      <article className="dashboard-tabela-card">
        <div className="dashboard-tabela-topo">
          <div>
            <h2 className="medium-h2">
              Histórico financeiro
            </h2>

            <p className="light-h3">
              Compras como despesas e vendas como faturamento. Limpar oculta apenas neste dashboard.
            </p>
          </div>

          <div className="dashboard-historico-controles">
            <input
              className="dashboard-historico-busca"
              type="search"
              value={buscaHistorico}
              onChange={(evento) => setBuscaHistorico(evento.target.value)}
              placeholder="Produto, descrição, venda ou data"
              aria-label="Pesquisar no histórico financeiro"
            />
            <select
              className="dashboard-periodo"
              value={filtroHistorico}
              aria-label="Filtrar histórico financeiro"
              onChange={(evento) =>
                setFiltroHistorico(evento.target.value as FiltroHistorico)
              }
            >
              <option value="todos">Todas</option>
              <option value="despesas">Despesas</option>
              <option value="faturamento">Faturamento</option>
              <option value="ajustes">Ajustes de estoque</option>
            </select>

            {movimentacoesOcultas.length > 0 ? (
              <button
                type="button"
                className="dashboard-historico-restaurar medium-h3"
                onClick={restaurarHistoricoDashboard}
              >
                Restaurar histórico
              </button>
            ) : (
              <button
                type="button"
                className="dashboard-historico-limpar medium-h3"
                onClick={limparHistoricoDashboard}
                disabled={historicoFinanceiro.length === 0}
              >
                Limpar histórico
              </button>
            )}

            <button
              type="button"
              className="dashboard-ver-todos medium-h3"
              onClick={recarregarDashboard}
            >
              Atualizar
            </button>
          </div>
        </div>

        <div className="dashboard-tabela-container">
          <table className="dashboard-tabela">
            <thead>
              <tr>
                <SortableHeader label="Classificação" active={ordenacaoHistorico?.chave === "classificacao"} direction={ordenacaoHistorico?.direcao ?? "desc"} onClick={() => alternarOrdenacaoHistorico("classificacao")} />
                <SortableHeader label="Produto / descrição" active={ordenacaoHistorico?.chave === "produto"} direction={ordenacaoHistorico?.direcao ?? "desc"} onClick={() => alternarOrdenacaoHistorico("produto")} />
                <SortableHeader label="Data" active={ordenacaoHistorico?.chave === "data"} direction={ordenacaoHistorico?.direcao ?? "desc"} onClick={() => alternarOrdenacaoHistorico("data")} />
                <SortableHeader label="Quantidade" active={ordenacaoHistorico?.chave === "quantidade"} direction={ordenacaoHistorico?.direcao ?? "desc"} onClick={() => alternarOrdenacaoHistorico("quantidade")} />
                <SortableHeader label="Valor unitário" active={ordenacaoHistorico?.chave === "unitario"} direction={ordenacaoHistorico?.direcao ?? "desc"} onClick={() => alternarOrdenacaoHistorico("unitario")} />
                <SortableHeader label="Valor total" active={ordenacaoHistorico?.chave === "total"} direction={ordenacaoHistorico?.direcao ?? "desc"} onClick={() => alternarOrdenacaoHistorico("total")} />
              </tr>
            </thead>

            <tbody>
              {historicoOrdenado.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="light-h3"
                    style={{
                      padding: "40px",
                      textAlign: "center",
                    }}
                  >
                    Nenhuma movimentação encontrada.
                  </td>
                </tr>
              ) : (
                historicoOrdenado.map((movimento) => {
                  const ehAjuste = ehAjusteInventario(movimento);
                  const ehDespesa = movimento.tipo === "entrada" && !ehAjuste;
                  const classificacao = ehAjuste
                    ? "Ajuste de estoque"
                    : ehDespesa
                      ? "Despesa"
                      : "Faturamento";
                  const nomeProduto =
                    produtosPorId.get(Number(movimento.produto_id))?.nome ??
                    movimento.produto?.nome ??
                    `Produto #${movimento.produto_id}`;

                  return (
                    <tr
                      key={`${movimento.tipo}-${movimento.id}`}
                      className={
                        ehDespesa
                          ? "dashboard-linha-despesa"
                          : ehAjuste
                            ? "dashboard-linha-ajuste"
                            : "dashboard-linha-faturamento"
                      }
                    >
                      <td>
                        <span
                          className={`dashboard-movimento-tag ${
                            ehDespesa
                              ? "dashboard-tag-despesa"
                              : ehAjuste
                                ? "dashboard-tag-ajuste"
                                : "dashboard-tag-faturamento"
                          }`}
                        >
                          {classificacao}
                        </span>
                      </td>
                      <td>
                        <strong className="dashboard-historico-produto">
                          {nomeProduto}
                        </strong>
                        <small className="dashboard-historico-descricao">
                          {movimento.descricao ||
                            (movimento.venda_id
                              ? `Venda #${movimento.venda_id}`
                              : "Movimentação de estoque")}
                        </small>
                      </td>
                      <td>{formatarData(movimento.data)}</td>
                      <td>
                        {Number(movimento.quantidade || 0).toLocaleString("pt-BR")} un.
                      </td>
                      <td>{formatarMoeda(movimento.preco_unitario)}</td>
                      <td
                        className={`dashboard-historico-total ${
                          ehAjuste
                            ? "dashboard-total-ajuste"
                            : ehDespesa
                            ? "dashboard-total-despesa"
                            : "dashboard-total-faturamento"
                        }`}
                      >
                        {ehAjuste
                          ? "Não financeiro"
                          : `${ehDespesa ? "− " : "+ "}${formatarMoeda(valorMovimentacao(movimento))}`}
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

export default Dashboard;