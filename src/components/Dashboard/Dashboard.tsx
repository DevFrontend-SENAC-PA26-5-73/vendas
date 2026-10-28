import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

import "./Dashboard.css";

const API_URL = "https://vendas.gabrielpimentel.com.br";

/* =========================
   Tipos atuais da API
========================= */

type ClienteApi = {
  id: number;
  cpf: string;
  nome: string;
  contato: string;
  rua: string;
  numero: number;
  complemento: string | null;
  cidade: string;
  estado: string;
  email: string;
};

type PagamentoApi = {
  id: number;
  metodo_pagamento: string;
  valo_pagamento: number;
  status_pagamento: string;
  data_pagamento: string;
  id_transa__o_operadora: string | null;
  mensagem_retorno: string | null;
  vendas_id: number;
};

type VendaApi = {
  id: number;
  id_status: string;
  cliente_id: number;
  transportadoras_id: number;
  funcionarios_id: number;

  cliente: ClienteApi;
  pagamentos: PagamentoApi[];

  /*
    Campos que você pode criar futuramente no back-end.
    Como são opcionais, o front-end continuará funcionando
    enquanto eles não existirem.
  */

  nome_negocio?: string;
  empresa?: string;
  origem?: string;
  data_venda?: string;
};

type FuncionarioApi = {
  id: number;
  nome: string;
  cpf: string;
  rg: string;
  data_nasc: string;
  estado_civil: string;
  contato: string;
  endereco_id: number;
  cargo_id: number;
  departamento_id: number;
};

type ItemVendaApi = {
  id: number;
  quantidade: number;
  preco: number;
  vendas_id: number;
  produtos_id: number;
};

type ProdutoBaixoEstoqueApi = {
  id: number;
  nome: string;
  quantidade: number;
  preco: number;
};

type PrevisaoVendaApi = {
  periodo: string;
  valor: number;
};

type OrigemVendaApi = {
  nome: string;
  quantidade: number;
  valor: number;
  percentual: number;
};

type DashboardApi = {
  /* Campos que já existem */

  totalClientes: number;
  totalProdutos: number;
  totalVendas: number;
  totalPagamentos: number;
  valorTotalPagamentos: number;
  vendasRecentes: VendaApi[];
  produtosBaixoEstoque: ProdutoBaixoEstoqueApi[];

  /*
    Campos futuros esperados pelo seu front-end.
    Você poderá adicioná-los no GET /dashboard.
  */

  totalDespesas?: number;
  lucroBruto?: number;

  percentualVendas?: number;
  percentualDespesas?: number;
  percentualLucro?: number;

  previsaoVendas?: PrevisaoVendaApi[];
  origens?: OrigemVendaApi[];
};

type DadosCompletos = {
  dashboard: DashboardApi;
  funcionarios: FuncionarioApi[];
  itensVenda: ItemVendaApi[];
};

type Periodo = "semanal" | "mensal" | "anual";

type ResumoCardProps = {
  titulo: string;
  valor: string;
  percentual: string;
  tendencia: "alta" | "baixa";
  barras: number[];
};

type GraficoApexProps = {
  dashboard: DashboardApi;
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

function formatarData(data?: string) {
  if (!data) {
    return "Sem data";
  }

  return new Date(data).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatarPercentual(valor?: number) {
  if (valor === undefined || valor === null) {
    return "0%";
  }

  return `${valor.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

function calcularValorVenda(
  venda: VendaApi,
  itensVenda: ItemVendaApi[],
) {
  const itensDaVenda = itensVenda.filter(
    (item) => item.vendas_id === venda.id,
  );

  const valorItens = itensDaVenda.reduce((total, item) => {
    return (
      total +
      Number(item.preco || 0) *
        Number(item.quantidade || 0)
    );
  }, 0);

  if (valorItens > 0) {
    return valorItens;
  }

  return venda.pagamentos.reduce((total, pagamento) => {
    return total + Number(pagamento.valo_pagamento || 0);
  }, 0);
}

function buscarNomeFuncionario(
  funcionarioId: number,
  funcionarios: FuncionarioApi[],
) {
  const funcionario = funcionarios.find(
    (item) => item.id === funcionarioId,
  );

  return funcionario?.nome ?? `Funcionário #${funcionarioId}`;
}

function gerarBarras(valores: number[]) {
  if (valores.length === 0) {
    return [20, 20, 20, 20];
  }

  const maiorValor = Math.max(...valores);

  if (maiorValor <= 0) {
    return valores.map(() => 20);
  }

  return valores.map((valor) => {
    const altura = (valor / maiorValor) * 100;

    return Math.max(20, altura);
  });
}

/* =========================
   Card de resumo
========================= */

function ResumoCard({
  titulo,
  valor,
  percentual,
  tendencia,
  barras,
}: ResumoCardProps) {
  return (
    <article className="dashboard-resumo-card">
      <div className="dashboard-resumo-informacoes">
        <span className="light-h3">{titulo}</span>

        <strong className="bold-h2">{valor}</strong>
      </div>

      <div className="dashboard-mini-grafico">
        {barras.map((altura, index) => (
          <span
            key={`${titulo}-${index}`}
            className={
              index === barras.length - 1
                ? "dashboard-mini-barra dashboard-mini-barra-ativa"
                : "dashboard-mini-barra"
            }
            style={{ height: `${altura}%` }}
          />
        ))}
      </div>

      <div className="dashboard-tendencia">
        <span
          className={`dashboard-seta ${
            tendencia === "alta"
              ? "dashboard-seta-alta"
              : "dashboard-seta-baixa"
          }`}
        >
          {tendencia === "alta" ? "↗" : "↘"}
        </span>

        <span className="light-h4">{percentual}</span>
      </div>
    </article>
  );
}

/* =========================
   Gráfico
========================= */

function GraficoApex({
  dashboard,
  periodo,
}: GraficoApexProps) {
  const dadosGrafico = useMemo(() => {
    /*
      Quando previsaoVendas existir no back-end,
      ela terá prioridade no gráfico.
    */

    if (
      dashboard.previsaoVendas &&
      dashboard.previsaoVendas.length > 0
    ) {
      return {
        categorias: dashboard.previsaoVendas.map(
          (item) => item.periodo,
        ),

        valores: dashboard.previsaoVendas.map(
          (item) => Number(item.valor || 0),
        ),

        nomeSerie: "Previsão de vendas",
      };
    }

    /*
      Enquanto a previsão não existe, o gráfico utiliza
      os pagamentos reais agrupados por período.
    */

    const grupos = new Map<
      string,
      {
        ordem: string;
        rotulo: string;
        valor: number;
      }
    >();

    dashboard.vendasRecentes.forEach((venda) => {
      venda.pagamentos.forEach((pagamento) => {
        if (!pagamento.data_pagamento) {
          return;
        }

        const data = new Date(pagamento.data_pagamento);

        let ordem = "";
        let rotulo = "";

        if (periodo === "semanal") {
          ordem = data.toISOString().slice(0, 10);

          rotulo = data.toLocaleDateString("pt-BR", {
            timeZone: "UTC",
            day: "2-digit",
            month: "2-digit",
          });
        }

        if (periodo === "mensal") {
          const ano = data.getUTCFullYear();
          const mes = String(
            data.getUTCMonth() + 1,
          ).padStart(2, "0");

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
          valor:
            Number(grupoExistente?.valor || 0) +
            Number(pagamento.valo_pagamento || 0),
        });
      });
    });

    const resultado = Array.from(grupos.values()).sort(
      (primeiro, segundo) =>
        primeiro.ordem.localeCompare(segundo.ordem),
    );

    return {
      categorias: resultado.map((item) => item.rotulo),
      valores: resultado.map((item) => item.valor),
      nomeSerie: "Vendas realizadas",
    };
  }, [dashboard, periodo]);

  const options: ApexOptions = {
    chart: {
      id: "grafico-previsao-vendas",
      toolbar: {
        show: false,
      },
    },

    xaxis: {
      categories: dadosGrafico.categorias,
    },

    yaxis: {
      labels: {
        formatter: (valor) => formatarMoeda(valor),
      },
    },

    colors: ["var(--primaria)"],

    plotOptions: {
      bar: {
        columnWidth: "45%",
        borderRadius: 6,
        borderRadiusApplication: "end",
      },
    },

    dataLabels: {
      enabled: false,
    },

    tooltip: {
      y: 
      {
  formatter: (valor) => formatarMoeda(Number(valor ?? 0)),
},
    },

    noData: {
      text: "Nenhuma venda encontrada",
    },
  };

  const series = [
    {
      name: dadosGrafico.nomeSerie,
      data: dadosGrafico.valores,
    },
  ];

  return (
    <div
      style={{
        width: "100%",
        marginTop: "20px",
      }}
    >
      <Chart
        options={options}
        series={series}
        type="bar"
        width="100%"
        height={260}
      />
    </div>
  );
}

/* =========================
   Dashboard principal
========================= */

function Dashboard() {
  const [dados, setDados] =
    useState<DadosCompletos | null>(null);

  const [periodo, setPeriodo] =
    useState<Periodo>("mensal");

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState<string | null>(null);

  async function carregarDashboard() {
    try {
      setCarregando(true);
      setErro(null);

      const [
        respostaDashboard,
        respostaFuncionarios,
        respostaItensVenda,
      ] = await Promise.all([
        fetch(`${API_URL}/dashboard`),
        fetch(`${API_URL}/funcionarios`),
        fetch(`${API_URL}/itemvenda`),
      ]);

      if (!respostaDashboard.ok) {
        throw new Error(
          `Erro ${respostaDashboard.status} ao buscar o dashboard.`,
        );
      }

      if (!respostaFuncionarios.ok) {
        throw new Error(
          `Erro ${respostaFuncionarios.status} ao buscar funcionários.`,
        );
      }

      if (!respostaItensVenda.ok) {
        throw new Error(
          `Erro ${respostaItensVenda.status} ao buscar itens das vendas.`,
        );
      }

      const [
        dashboard,
        funcionarios,
        itensVenda,
      ] = await Promise.all([
        respostaDashboard.json() as Promise<DashboardApi>,
        respostaFuncionarios.json() as Promise<
          FuncionarioApi[]
        >,
        respostaItensVenda.json() as Promise<
          ItemVendaApi[]
        >,
      ]);

      setDados({
        dashboard,
        funcionarios,
        itensVenda,
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
    carregarDashboard();
  }, []);

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
            onClick={carregarDashboard}
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

  const {
    dashboard,
    funcionarios,
    itensVenda,
  } = dados;

  /*
    Valores existentes e futuros.
    Enquanto o back-end não fornecer despesas e lucro,
    aparecerá R$ 0,00.
  */

  const totalVendas =
    Number(dashboard.valorTotalPagamentos || 0);

  const totalDespesas =
    Number(dashboard.totalDespesas || 0);

  const lucroBruto =
    dashboard.lucroBruto !== undefined
      ? Number(dashboard.lucroBruto)
      : Math.max(0, totalVendas - totalDespesas);

  const valoresVendas =
    dashboard.vendasRecentes.map((venda) =>
      calcularValorVenda(venda, itensVenda),
    );

  const barrasVendas =
    gerarBarras(valoresVendas);

  const percentualVendas =
    formatarPercentual(
      dashboard.percentualVendas,
    );

  const percentualDespesas =
    formatarPercentual(
      dashboard.percentualDespesas,
    );

  const percentualLucro =
    formatarPercentual(
      dashboard.percentualLucro,
    );

  /*
    Origem das vendas.
    Enquanto o back-end não devolver origens,
    os valores permanecem zerados.
  */

  const origens =
    dashboard.origens ?? [];

  const origemWebsite = origens.find(
    (origem) =>
      origem.nome.toLowerCase() === "website",
  );

  const origemRedesSociais = origens.find(
    (origem) =>
      origem.nome
        .toLowerCase()
        .includes("rede"),
  );

  const origemEmail = origens.find(
    (origem) =>
      origem.nome
        .toLowerCase()
        .includes("email") ||
      origem.nome
        .toLowerCase()
        .includes("e-mail"),
  );

  const totalPorOrigem = origens.reduce(
    (total, origem) =>
      total + Number(origem.valor || 0),
    0,
  );

  const totalContatos = origens.reduce(
    (total, origem) =>
      total + Number(origem.quantidade || 0),
    0,
  );

  const maiorPercentualOrigem =
    origens.length > 0
      ? Math.max(
          ...origens.map((origem) =>
            Number(origem.percentual || 0),
          ),
        )
      : 0;

  return (
    <section className="dashboard">
      {/* Cards superiores */}

      <div className="dashboard-resumos">
        <ResumoCard
          titulo="Total de vendas"
          valor={formatarMoeda(totalVendas)}
          percentual={percentualVendas}
          tendencia={
            Number(
              dashboard.percentualVendas || 0,
            ) >= 0
              ? "alta"
              : "baixa"
          }
          barras={barrasVendas}
        />

        <ResumoCard
          titulo="Despesas"
          valor={formatarMoeda(totalDespesas)}
          percentual={percentualDespesas}
          tendencia={
            Number(
              dashboard.percentualDespesas || 0,
            ) > 0
              ? "baixa"
              : "alta"
          }
          barras={[20, 20, 20]}
        />

        <ResumoCard
          titulo="Lucro bruto"
          valor={formatarMoeda(lucroBruto)}
          percentual={percentualLucro}
          tendencia={
            Number(
              dashboard.percentualLucro || 0,
            ) >= 0
              ? "alta"
              : "baixa"
          }
          barras={[20, 20, 20, 20, 20]}
        />
      </div>

      {/* Parte central */}

      <div className="dashboard-centro">
        <article className="dashboard-card dashboard-previsao">
          <div className="dashboard-card-cabecalho">
            <h2 className="medium-h2">
              Previsão de vendas
            </h2>

            <select
              className="dashboard-periodo"
              value={periodo}
              aria-label="Período da previsão de vendas"
              onChange={(evento) =>
                setPeriodo(
                  evento.target.value as Periodo,
                )
              }
            >
              <option value="semanal">
                Semanal
              </option>

              <option value="mensal">
                Mensal
              </option>

              <option value="anual">
                Anual
              </option>
            </select>
          </div>

          <GraficoApex
            dashboard={dashboard}
            periodo={periodo}
          />
        </article>

        {/* Origens */}

        <article className="dashboard-card dashboard-origens">
          <div className="dashboard-card-cabecalho">
            <h2 className="medium-h2">
              Origem
            </h2>

            <span className="light-h3">
              {totalContatos} contatos
            </span>
          </div>

          <div className="dashboard-origem-total">
            <strong className="bold-h1">
              {formatarMoeda(totalPorOrigem)}
            </strong>

            <span className="light-h4">
              Total por origem
            </span>
          </div>

          <div
            className="dashboard-circulo"
            style={{
              background: `conic-gradient(
                var(--primaria) 0 ${maiorPercentualOrigem}%,
                var(--c) ${maiorPercentualOrigem}% 100%
              )`,
            }}
          >
            <div className="dashboard-circulo-centro">
              <strong className="medium-h2">
                {maiorPercentualOrigem.toLocaleString(
                  "pt-BR",
                  {
                    maximumFractionDigits: 1,
                  },
                )}
                %
              </strong>

              <span className="light-h4">
                contatos
              </span>
            </div>
          </div>

          <div className="dashboard-lista-origens">
            <div className="dashboard-origem-item">
              <span className="dashboard-cor dashboard-cor-site" />

              <span className="light-h3">
                Website
              </span>

              <strong className="medium-h3">
                {origemWebsite?.quantidade ?? 0}
              </strong>
            </div>

            <div className="dashboard-origem-item">
              <span className="dashboard-cor dashboard-cor-social" />

              <span className="light-h3">
                Redes sociais
              </span>

              <strong className="medium-h3">
                {origemRedesSociais?.quantidade ??
                  0}
              </strong>
            </div>

            <div className="dashboard-origem-item">
              <span className="dashboard-cor dashboard-cor-email" />

              <span className="light-h3">
                E-mails
              </span>

              <strong className="medium-h3">
                {origemEmail?.quantidade ?? 0}
              </strong>
            </div>
          </div>
        </article>
      </div>

      {/* Vendas recentes */}

      <article className="dashboard-tabela-card">
        <div className="dashboard-tabela-topo">
          <div>
            <h2 className="medium-h2">
              Vendas recentes
            </h2>

            <p className="light-h3">
              Últimos negócios registrados
            </p>
          </div>

          <button
            type="button"
            className="dashboard-ver-todos medium-h3"
            onClick={carregarDashboard}
          >
            Atualizar
          </button>
        </div>

        <div className="dashboard-tabela-container">
          <table className="dashboard-tabela">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Selecionar todas as vendas"
                  />
                </th>

                <th className="medium-h3">
                  Nome do negócio
                </th>

                <th className="medium-h3">
                  Empresa
                </th>

                <th className="medium-h3">
                  Preço
                </th>

                <th className="medium-h3">
                  Data da venda
                </th>

                <th className="medium-h3">
                  Responsável
                </th>
              </tr>
            </thead>

            <tbody>
              {dashboard.vendasRecentes.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="light-h3"
                    style={{
                      padding: "40px",
                      textAlign: "center",
                    }}
                  >
                    Nenhuma venda encontrada.
                  </td>
                </tr>
              ) : (
                dashboard.vendasRecentes.map(
                  (venda) => {
                    const primeiroPagamento =
                      venda.pagamentos[0];

                    const valorVenda =
                      calcularValorVenda(
                        venda,
                        itensVenda,
                      );

                    const nomeFuncionario =
                      buscarNomeFuncionario(
                        venda.funcionarios_id,
                        funcionarios,
                      );

                    const nomeNegocio =
                      venda.nome_negocio ??
                      `Venda #${venda.id}`;

                    /*
                      Usa empresa quando o campo
                      existir futuramente.

                      Enquanto não existir, mostra
                      o nome do cliente.
                    */

                    const nomeEmpresa =
                      venda.empresa ??
                      venda.cliente.nome;

                    const dataVenda =
                      venda.data_venda ??
                      primeiroPagamento
                        ?.data_pagamento;

                    return (
                      <tr key={venda.id}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Selecionar ${nomeNegocio}`}
                          />
                        </td>

                        <td className="light-h3">
                          {nomeNegocio}
                        </td>

                        <td>
                          <div className="dashboard-empresa">
                            <span className="dashboard-avatar">
                              {nomeEmpresa
                                .charAt(0)
                                .toUpperCase()}
                            </span>

                            <span className="light-h3">
                              {nomeEmpresa}
                            </span>
                          </div>
                        </td>

                        <td className="medium-h3">
                          {formatarMoeda(
                            valorVenda,
                          )}
                        </td>

                        <td className="light-h3">
                          {formatarData(
                            dataVenda,
                          )}
                        </td>

                        <td>
                          <div className="dashboard-responsavel">
                            <span className="dashboard-avatar">
                              {nomeFuncionario
                                .charAt(0)
                                .toUpperCase()}
                            </span>

                            <span className="light-h3">
                              {nomeFuncionario}
                            </span>
                          </div>
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

export default Dashboard;