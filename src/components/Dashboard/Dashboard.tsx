import "./Dashboard.css";

type ResumoCardProps = {
  titulo: string;
  valor: string;
  percentual: string;
  tendencia: "alta" | "baixa";
  barras: number[];
};

type Venda = {
  id: number;
  negocio: string;
  empresa: string;
  preco: string;
  data: string;
  responsavel: string;
};

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

        <strong className="bold-h2">
          {valor}
        </strong>
      </div>

      <div className="dashboard-mini-grafico">
        {barras.map((altura, index) => (
          <span
            key={index}
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

        <span className="light-h4">
          {percentual}
        </span>
      </div>
    </article>
  );
}

function Dashboard() {
  const vendas: Venda[] = [
    {
      id: 1,
      negocio: "Venda balcão",
      empresa: "Empresa Norte",
      preco: "R$ 11.777",
      data: "01 jun 2026",
      responsavel: "João Silva",
    },
    {
      id: 2,
      negocio: "Pedido comercial",
      empresa: "Comercial Pará",
      preco: "R$ 22.666",
      data: "09 set 2026",
      responsavel: "Maria Oliveira",
    },
    {
      id: 3,
      negocio: "Venda corporativa",
      empresa: "Castanhal Tech",
      preco: "R$ 32.212",
      data: "12 set 2026",
      responsavel: "Carlos Souza",
    },
  ];

  return (
    <section className="dashboard">
      {/* Cards de resumo */}

      <div className="dashboard-resumos">
        <ResumoCard
          titulo="Total de vendas"
          valor="R$ 17.000"
          percentual="20%"
          tendencia="alta"
          barras={[32, 68, 68, 78]}
        />

        <ResumoCard
          titulo="Despesas"
          valor="R$ 17.000"
          percentual="20%"
          tendencia="baixa"
          barras={[78, 68, 68]}
        />

        <ResumoCard
          titulo="Lucro bruto"
          valor="R$ 97.000"
          percentual="20,1%"
          tendencia="alta"
          barras={[75, 58, 70, 72, 68]}
        />
      </div>

      {/* Área central */}

      <div className="dashboard-centro">
        <article className="dashboard-card dashboard-previsao">
          <div className="dashboard-card-cabecalho">
            <h2 className="medium-h2">
              Previsão de vendas
            </h2>

            <select
              className="dashboard-periodo"
              defaultValue="mensal"
              aria-label="Período da previsão de vendas"
            >
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
              <option value="anual">Anual</option>
            </select>
          </div>

          <div className="dashboard-grafico">
            <div className="dashboard-grafico-valores">
              <span className="light-h4">R$ 40 mil</span>
              <span className="light-h4">R$ 30 mil</span>
              <span className="light-h4">R$ 20 mil</span>
              <span className="light-h4">R$ 10 mil</span>
              <span className="light-h4">R$ 0</span>
            </div>

            <div className="dashboard-grafico-barras">
              <div className="dashboard-coluna">
                <span style={{ height: "42%" }} />
                <small>Jan</small>
              </div>

              <div className="dashboard-coluna">
                <span style={{ height: "58%" }} />
                <small>Fev</small>
              </div>

              <div className="dashboard-coluna">
                <span style={{ height: "48%" }} />
                <small>Mar</small>
              </div>

              <div className="dashboard-coluna">
                <span style={{ height: "72%" }} />
                <small>Abr</small>
              </div>

              <div className="dashboard-coluna">
                <span style={{ height: "63%" }} />
                <small>Mai</small>
              </div>

              <div className="dashboard-coluna">
                <span style={{ height: "84%" }} />
                <small>Jun</small>
              </div>

              <div className="dashboard-coluna">
                <span style={{ height: "70%" }} />
                <small>Jul</small>
              </div>
            </div>
          </div>
        </article>

        {/* Origem dos contatos */}

        <article className="dashboard-card dashboard-origens">
          <div className="dashboard-card-cabecalho">
            <h2 className="medium-h2">
              Origem
            </h2>

            <span className="light-h3">
              Contatos
            </span>
          </div>

          <div className="dashboard-origem-total">
            <strong className="bold-h1">
              R$ 97.000
            </strong>

            <span className="light-h4">
              Total por origem
            </span>
          </div>

          <div className="dashboard-circulo">
            <div className="dashboard-circulo-centro">
              <strong className="medium-h2">65%</strong>
              <span className="light-h4">contatos</span>
            </div>
          </div>

          <div className="dashboard-lista-origens">
            <div className="dashboard-origem-item">
              <span className="dashboard-cor dashboard-cor-site" />

              <span className="light-h3">
                Website
              </span>

              <strong className="medium-h3">
                4.909
              </strong>
            </div>

            <div className="dashboard-origem-item">
              <span className="dashboard-cor dashboard-cor-social" />

              <span className="light-h3">
                Redes sociais
              </span>

              <strong className="medium-h3">
                9.333
              </strong>
            </div>

            <div className="dashboard-origem-item">
              <span className="dashboard-cor dashboard-cor-email" />

              <span className="light-h3">
                E-mails
              </span>

              <strong className="medium-h3">
                1.212
              </strong>
            </div>
          </div>
        </article>
      </div>

      {/* Tabela */}

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
          >
            Ver todos
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
              {vendas.map((venda) => (
                <tr key={venda.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Selecionar ${venda.negocio}`}
                    />
                  </td>

                  <td className="light-h3">
                    {venda.negocio}
                  </td>

                  <td>
                    <div className="dashboard-empresa">
                      <span className="dashboard-avatar">
                        {venda.empresa.charAt(0)}
                      </span>

                      <span className="light-h3">
                        {venda.empresa}
                      </span>
                    </div>
                  </td>

                  <td className="medium-h3">
                    {venda.preco}
                  </td>

                  <td className="light-h3">
                    {venda.data}
                  </td>

                  <td>
                    <div className="dashboard-responsavel">
                      <span className="dashboard-avatar">
                        {venda.responsavel.charAt(0)}
                      </span>

                      <span className="light-h3">
                        {venda.responsavel}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

export default Dashboard;