import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

import "./Dashboard.css";

const API_URL = "https://vendas.gabrielpimentel.com.br";

/* =========================
   Tipos da API
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
  cliente?: ClienteApi | null;
  pagamentos?: PagamentoApi[];

  // Campos opcionais para o futuro
  nome_negocio?: string;
  empresa?: string;
  origem?: string;
  data_venda?: string;
};

type FuncionarioApi = {
  id: number;
  nome: string;
};

type ItemVendaApi = {
  id: number;
  quantidade: number;
  preco: number;
  vendas_id: number;
  produtos_id: number;
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
  totalClientes: number;
  totalProdutos: number;
  totalVendas: number;
  totalPagamentos: number;
  valorTotalPagamentos: number;
  vendasRecentes: VendaApi[];
  produtosBaixoEstoque: {
    id: number;
    nome: string;
    quantidade: number;
    preco: number;
  }[];

  // Campos opcionais: se o back-end passar a enviar, eles têm prioridade
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
  pagamentos: PagamentoApi[];
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
  previsaoVendas?: PrevisaoVendaApi[];
  pagamentos: PagamentoApi[];
  periodo: Periodo;
};

type ItemOrigem = {
  nome: string;
  quantidade: number;
  valor: number;
  percentual: number;
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
  if (!data) return "Sem data";

  const convertida = new Date(data);
  if (Number.isNaN(convertida.getTime())) return "Sem data";

  return convertida.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatarPercentual(valor?: number | null) {
  if (valor === undefined || valor === null || !Number.isFinite(valor)) {
    return "—";
  }

  const sinal = valor > 0 ? "+" : "";

  return `${sinal}${valor.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

function dataLocalISO(data: Date) {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function calcularValorVenda(venda: VendaApi, itensVenda: ItemVendaApi[]) {
  const valorItens = itensVenda
    .filter((item) => item.vendas_id === venda.id)
    .reduce(
      (total, item) =>
        total + Number(item.preco || 0) * Number(item.quantidade || 0),
      0,
    );

  if (valorItens > 0) return valorItens;

  return (venda.pagamentos ?? []).reduce(
    (total, pagamento) => total + Number(pagamento.valo_pagamento || 0),
    0,
  );
}

function buscarNomeFuncionario(
  funcionarioId: number,
  funcionarios: FuncionarioApi[],
) {
  const funcionario = funcionarios.find((item) => item.id === funcionarioId);
  return funcionario?.nome ?? `Funcionário #${funcionarioId}`;
}

function gerarBarras(valores: number[]) {
  if (valores.length === 0) return [20, 20, 20, 20];

  const maiorValor = Math.max(...valores);
  if (maiorValor <= 0) return valores.map(() => 20);

  return valores.map((valor) => Math.max(20, (valor / maiorValor) * 100));
}

function nomeMetodoPagamento(metodo: string) {
  const nomes: Record<string, string> = {
    pix: "Pix",
    dinheiro: "Dinheiro",
    cartao_credito: "Cartão de crédito",
    cartao_debito: "Cartão de débito",
    boleto: "Boleto",
  };

  return nomes[metodo] ?? metodo;
}

// Tons da cor primária para o gráfico de rosca e a legenda
const TONS_ORIGEM = [100, 72, 52, 36, 24];

function corDaOrigem(indice: number) {
  const tom = TONS_ORIGEM[Math.min(indice, TONS_ORIGEM.length - 1)];
  return `color-mix(in srgb, var(--primaria) ${tom}%, white)`;
}

function agruparPorMes(pagamentos: PagamentoApi[]) {
  const mapa = new Map<string, number>();

  pagamentos.forEach((pagamento) => {
    if (!pagamento.data_pagamento) return;
    const chave = pagamento.data_pagamento.slice(0, 7);
    mapa.set(
      chave,
      (mapa.get(chave) ?? 0) + Number(pagamento.valo_pagamento || 0),
    );
  });

  return mapa;
}

async function buscarLista<T>(url: string): Promise<T[]> {
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) return [];
    const dados: unknown = await resposta.json();
    return Array.isArray(dados) ? (dados as T[]) : [];
  } catch (erro) {
    console.warn(`Não foi possível carregar ${url}:`, erro);
    return [];
  }
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
            tendencia === "alta" ? "dashboard-seta-alta" : "dashboard-seta-baixa"
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

function GraficoApex({ previsaoVendas, pagamentos, periodo }: GraficoApexProps) {
  const dadosGrafico = useMemo(() => {
    // Se o back-end enviar previsão, ela tem prioridade
    if (previsaoVendas && previsaoVendas.length > 0) {
      return {
        categorias: previsaoVendas.map((item) => item.periodo),
        valores: previsaoVendas.map((item) => Number(item.valor || 0)),
        nomeSerie: "Previsão de vendas",
      };
    }

    // Caso contrário usa TODOS os pagamentos, agrupados pelo período escolhido
    const hoje = new Date();
    const categorias: string[] = [];
    const chaves: string[] = [];

    if (periodo === "semanal") {
      for (let i = 6; i >= 0; i--) {
        const dia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i);
        chaves.push(dataLocalISO(dia));
        categorias.push(
          dia.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        );
      }
    }

    if (periodo === "mensal") {
      for (let i = 5; i >= 0; i--) {
        const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        chaves.push(dataLocalISO(mes).slice(0, 7));
        categorias.push(
          mes.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
        );
      }
    }

    if (periodo === "anual") {
      const anos = pagamentos
        .map((p) => Number(p.data_pagamento?.slice(0, 4)))
        .filter((ano) => Number.isFinite(ano) && ano > 0);

      const anoInicial = anos.length > 0 ? Math.min(...anos) : hoje.getFullYear();

      for (let ano = anoInicial; ano <= hoje.getFullYear(); ano++) {
        chaves.push(String(ano));
        categorias.push(String(ano));
      }
    }

    const tamanhoChave = periodo === "semanal" ? 10 : periodo === "mensal" ? 7 : 4;
    const totais = new Map<string, number>(chaves.map((chave) => [chave, 0]));

    pagamentos.forEach((pagamento) => {
      if (!pagamento.data_pagamento) return;
      const chave = pagamento.data_pagamento.slice(0, tamanhoChave);
      if (totais.has(chave)) {
        totais.set(
          chave,
          (totais.get(chave) ?? 0) + Number(pagamento.valo_pagamento || 0),
        );
      }
    });

    return {
      categorias,
      valores: chaves.map((chave) => Number((totais.get(chave) ?? 0).toFixed(2))),
      nomeSerie: "Vendas realizadas",
    };
  }, [previsaoVendas, pagamentos, periodo]);

  const options: ApexOptions = {
    chart: {
      id: "grafico-previsao-vendas",
      toolbar: { show: false },
    },
    xaxis: { categories: dadosGrafico.categorias },
    yaxis: {
      labels: { formatter: (valor) => formatarMoeda(valor) },
    },
    colors: ["var(--primaria)"],
    plotOptions: {
      bar: {
        columnWidth: "45%",
        borderRadius: 6,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    tooltip: {
   y: {
  formatter: (valor) => formatarMoeda(Number(valor ?? 0)),
},
    },
    noData: { text: "Nenhuma venda encontrada" },
  };

  const series = [{ name: dadosGrafico.nomeSerie, data: dadosGrafico.valores }];

  return (
    <div style={{ width: "100%", marginTop: "20px" }}>
      <Chart options={options} series={series} type="bar" width="100%" height={260} />
    </div>
  );
}

/* =========================
   Dashboard principal
========================= */

function Dashboard() {
  const [dados, setDados] = useState<DadosCompletos | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>("mensal");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionadas, setSelecionadas] = useState<number[]>([]);

  async function carregarDashboard() {
    try {
      setCarregando(true);
      setErro(null);

      const respostaDashboard = await fetch(`${API_URL}/dashboard`);

      if (!respostaDashboard.ok) {
        throw new Error(`Erro ${respostaDashboard.status} ao buscar o dashboard.`);
      }

      const dashboardBruto = (await respostaDashboard.json()) as DashboardApi;

      // Listas auxiliares: se alguma falhar, o dashboard continua funcionando
      const [funcionarios, itensVenda, pagamentos] = await Promise.all([
        buscarLista<FuncionarioApi>(`${API_URL}/funcionarios`),
        buscarLista<ItemVendaApi>(`${API_URL}/itemvenda`),
        buscarLista<PagamentoApi>(`${API_URL}/pagamentos`),
      ]);

      const dashboard: DashboardApi = {
        ...dashboardBruto,
        vendasRecentes: dashboardBruto.vendasRecentes ?? [],
      };

      // Sem /pagamentos, usa os pagamentos que vieram nas vendas recentes
      const pagamentosFinais =
        pagamentos.length > 0
          ? pagamentos
          : dashboard.vendasRecentes.flatMap((venda) => venda.pagamentos ?? []);

      setDados({ dashboard, funcionarios, itensVenda, pagamentos: pagamentosFinais });
      setSelecionadas([]);
    } catch (erroDesconhecido) {
      console.error("Erro ao carregar dashboard:", erroDesconhecido);

      setErro(
        erroDesconhecido instanceof Error
          ? erroDesconhecido.message
          : "Não foi possível carregar o dashboard.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarDashboard();
  }, []);

  if (carregando) {
    return (
      <section className="dashboard">
        <article className="dashboard-card">
          <h2 className="medium-h2">Carregando dashboard...</h2>
          <p className="light-h3">Buscando os dados da API.</p>
        </article>
      </section>
    );
  }

  if (erro) {
    return (
      <section className="dashboard">
        <article className="dashboard-card">
          <h2 className="medium-h2">Erro ao carregar o dashboard</h2>
          <p className="light-h3">{erro}</p>

          <button
            type="button"
            className="dashboard-ver-todos medium-h3"
            onClick={() => void carregarDashboard()}
          >
            Tentar novamente
          </button>
        </article>
      </section>
    );
  }

  if (!dados) return null;

  const { dashboard, funcionarios, itensVenda, pagamentos } = dados;

  /* ----- Cards superiores ----- */

  const totalVendas = Number(dashboard.valorTotalPagamentos || 0);
  const totalDespesas = Number(dashboard.totalDespesas || 0);

  const lucroBruto =
    dashboard.lucroBruto !== undefined
      ? Number(dashboard.lucroBruto)
      : Math.max(0, totalVendas - totalDespesas);

  // Variação do mês atual em relação ao mês anterior (calculada dos pagamentos)
  const totaisMensais = agruparPorMes(pagamentos);
  const agora = new Date();
  const chaveMesAtual = dataLocalISO(agora).slice(0, 7);
  const chaveMesAnterior = dataLocalISO(
    new Date(agora.getFullYear(), agora.getMonth() - 1, 1),
  ).slice(0, 7);

  const vendasMesAtual = totaisMensais.get(chaveMesAtual) ?? 0;
  const vendasMesAnterior = totaisMensais.get(chaveMesAnterior) ?? 0;

  const variacaoVendas =
    vendasMesAnterior > 0
      ? ((vendasMesAtual - vendasMesAnterior) / vendasMesAnterior) * 100
      : null;

  const percentualVendas = dashboard.percentualVendas ?? variacaoVendas;

  const percentualDespesas =
    dashboard.percentualDespesas ?? (totalDespesas === 0 ? 0 : null);

  // Sem despesas cadastradas, o lucro bruto acompanha as vendas
  const percentualLucro =
    dashboard.percentualLucro ?? (totalDespesas === 0 ? variacaoVendas : null);

  // Mini gráficos: últimas vendas em ordem cronológica (a mais recente é a última barra)
  const valoresVendas = [...dashboard.vendasRecentes]
    .sort((a, b) => a.id - b.id)
    .map((venda) => calcularValorVenda(venda, itensVenda));

  const barrasVendas = gerarBarras(valoresVendas);

  /* ----- Origem / formas de pagamento ----- */

  const origensApi = dashboard.origens ?? [];
  const usaOrigensApi = origensApi.length > 0;

  let itensOrigem: ItemOrigem[] = [];

  if (usaOrigensApi) {
    itensOrigem = origensApi.map((origem) => ({
      nome: origem.nome,
      quantidade: Number(origem.quantidade || 0),
      valor: Number(origem.valor || 0),
      percentual: Number(origem.percentual || 0),
    }));
  } else {
    const porMetodo = new Map<string, { quantidade: number; valor: number }>();

    pagamentos.forEach((pagamento) => {
      const atual = porMetodo.get(pagamento.metodo_pagamento) ?? {
        quantidade: 0,
        valor: 0,
      };

      porMetodo.set(pagamento.metodo_pagamento, {
        quantidade: atual.quantidade + 1,
        valor: atual.valor + Number(pagamento.valo_pagamento || 0),
      });
    });

    const totalGeral = Array.from(porMetodo.values()).reduce(
      (soma, item) => soma + item.valor,
      0,
    );

    itensOrigem = Array.from(porMetodo.entries())
      .map(([metodo, item]) => ({
        nome: nomeMetodoPagamento(metodo),
        quantidade: item.quantidade,
        valor: item.valor,
        percentual: totalGeral > 0 ? (item.valor / totalGeral) * 100 : 0,
      }))
      .sort((a, b) => b.valor - a.valor);
  }

  const totalPorOrigem = itensOrigem.reduce((soma, item) => soma + item.valor, 0);
  const totalQuantidade = itensOrigem.reduce((soma, item) => soma + item.quantidade, 0);
  const principalOrigem = itensOrigem[0];

  let acumulado = 0;
  const trechosRosca = itensOrigem.map((item, indice) => {
    const inicio = acumulado;
    acumulado += item.percentual;
    return `${corDaOrigem(indice)} ${inicio}% ${Math.min(acumulado, 100)}%`;
  });

  const fundoRosca =
    itensOrigem.length > 0 && totalPorOrigem > 0
      ? `conic-gradient(${trechosRosca.join(", ")}, var(--c) ${Math.min(acumulado, 100)}% 100%)`
      : "var(--c)";

  /* ----- Seleção na tabela ----- */

  const idsVendas = dashboard.vendasRecentes.map((venda) => venda.id);
  const todasSelecionadas =
    idsVendas.length > 0 && idsVendas.every((id) => selecionadas.includes(id));

  function alternarTodas() {
    setSelecionadas(todasSelecionadas ? [] : idsVendas);
  }

  function alternarVenda(id: number) {
    setSelecionadas((atuais) =>
      atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id],
    );
  }

  return (
    <section className="dashboard">
      {/* Cards superiores */}
      <div className="dashboard-resumos">
        <ResumoCard
          titulo="Total de vendas"
          valor={formatarMoeda(totalVendas)}
          percentual={formatarPercentual(percentualVendas)}
          tendencia={Number(percentualVendas ?? 0) >= 0 ? "alta" : "baixa"}
          barras={barrasVendas}
        />

        <ResumoCard
          titulo="Despesas"
          valor={formatarMoeda(totalDespesas)}
          percentual={formatarPercentual(percentualDespesas)}
          tendencia={Number(percentualDespesas ?? 0) > 0 ? "baixa" : "alta"}
          barras={[20, 20, 20]}
        />

        <ResumoCard
          titulo="Lucro bruto"
          valor={formatarMoeda(lucroBruto)}
          percentual={formatarPercentual(percentualLucro)}
          tendencia={Number(percentualLucro ?? 0) >= 0 ? "alta" : "baixa"}
          barras={barrasVendas}
        />
      </div>

      {/* Parte central */}
      <div className="dashboard-centro">
        <article className="dashboard-card dashboard-previsao">
          <div className="dashboard-card-cabecalho">
            <h2 className="medium-h2">
              {dashboard.previsaoVendas && dashboard.previsaoVendas.length > 0
                ? "Previsão de vendas"
                : "Vendas por período"}
            </h2>

            <select
              className="dashboard-periodo"
              value={periodo}
              aria-label="Período do gráfico de vendas"
              onChange={(evento) => setPeriodo(evento.target.value as Periodo)}
            >
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
              <option value="anual">Anual</option>
            </select>
          </div>

          <GraficoApex
            previsaoVendas={dashboard.previsaoVendas}
            pagamentos={pagamentos}
            periodo={periodo}
          />
        </article>

        {/* Origem das vendas (ou formas de pagamento, enquanto a API não envia origens) */}
        <article className="dashboard-card dashboard-origens">
          <div className="dashboard-card-cabecalho">
            <h2 className="medium-h2">
              {usaOrigensApi ? "Origem" : "Formas de pagamento"}
            </h2>

            <span className="light-h3">
              {totalQuantidade} {usaOrigensApi ? "contatos" : "pagamentos"}
            </span>
          </div>

          <div className="dashboard-origem-total">
            <strong className="bold-h1">{formatarMoeda(totalPorOrigem)}</strong>

            <span className="light-h4">
              {usaOrigensApi ? "Total por origem" : "Total recebido"}
            </span>
          </div>

          <div className="dashboard-circulo" style={{ background: fundoRosca }}>
            <div className="dashboard-circulo-centro">
              <strong className="medium-h2">
                {(principalOrigem?.percentual ?? 0).toLocaleString("pt-BR", {
                  maximumFractionDigits: 0,
                })}
                %
              </strong>

              <span className="light-h4">{principalOrigem?.nome ?? "sem dados"}</span>
            </div>
          </div>

          <div className="dashboard-lista-origens">
            {itensOrigem.length === 0 ? (
              <p className="light-h3">Nenhum pagamento registrado.</p>
            ) : (
              itensOrigem.map((item, indice) => (
                <div className="dashboard-origem-item" key={item.nome}>
                  <span
                    className="dashboard-cor"
                    style={{ background: corDaOrigem(indice) }}
                  />

                  <span className="light-h3">{item.nome}</span>

                  <strong className="medium-h3">
                    {usaOrigensApi ? item.quantidade : formatarMoeda(item.valor)}
                  </strong>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      {/* Vendas recentes */}
      <article className="dashboard-tabela-card">
        <div className="dashboard-tabela-topo">
          <div>
            <h2 className="medium-h2">Vendas recentes</h2>
            <p className="light-h3">Últimos negócios registrados</p>
          </div>

          <button
            type="button"
            className="dashboard-ver-todos medium-h3"
            onClick={() => void carregarDashboard()}
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
                    checked={todasSelecionadas}
                    onChange={alternarTodas}
                  />
                </th>

                <th className="medium-h3">Nome do negócio</th>
                <th className="medium-h3">Empresa</th>
                <th className="medium-h3">Preço</th>
                <th className="medium-h3">Data da venda</th>
                <th className="medium-h3">Responsável</th>
              </tr>
            </thead>

            <tbody>
              {dashboard.vendasRecentes.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="light-h3"
                    style={{ padding: "40px", textAlign: "center" }}
                  >
                    Nenhuma venda encontrada.
                  </td>
                </tr>
              ) : (
                dashboard.vendasRecentes.map((venda) => {
                  const primeiroPagamento = venda.pagamentos?.[0];
                  const valorVenda = calcularValorVenda(venda, itensVenda);

                  const nomeFuncionario = buscarNomeFuncionario(
                    venda.funcionarios_id,
                    funcionarios,
                  );

                  const nomeNegocio = venda.nome_negocio ?? `Venda #${venda.id}`;

                  // Enquanto não existir "empresa", mostra o nome do cliente
                  const nomeEmpresa =
                    venda.empresa ?? venda.cliente?.nome ?? `Cliente #${venda.cliente_id}`;

                  const dataVenda = venda.data_venda ?? primeiroPagamento?.data_pagamento;

                  return (
                    <tr key={venda.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Selecionar ${nomeNegocio}`}
                          checked={selecionadas.includes(venda.id)}
                          onChange={() => alternarVenda(venda.id)}
                        />
                      </td>

                      <td className="light-h3">{nomeNegocio}</td>

                      <td>
                        <div className="dashboard-empresa">
                          <span className="dashboard-avatar">
                            {nomeEmpresa.charAt(0).toUpperCase()}
                          </span>

                          <span className="light-h3">{nomeEmpresa}</span>
                        </div>
                      </td>

                      <td className="medium-h3">{formatarMoeda(valorVenda)}</td>
                      <td className="light-h3">{formatarData(dataVenda)}</td>

                      <td>
                        <div className="dashboard-responsavel">
                          <span className="dashboard-avatar">
                            {nomeFuncionario.charAt(0).toUpperCase()}
                          </span>

                          <span className="light-h3">{nomeFuncionario}</span>
                        </div>
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