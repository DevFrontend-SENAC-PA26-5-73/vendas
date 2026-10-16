import "./FluxoCaixa.css";

function FluxoCaixa() {
  const colunas = ["Vendedor", "Produto", "Qntd", "Valor"];

  return (
    <div className="fluxo-caixa">
      {/* CABEÇALHO */}
      <div className="fluxo-titulo">
        <span className="seta-voltar">←</span>
        <h2>Fluxo de Caixa</h2>
      </div>

      {/* CONTEÚDO */}
      <div className="fluxo-conteudo">
        {/* ENTRADA */}
        <section className="fluxo-lado">
          <div className="fluxo-faixa entrada">
            Entrada
          </div>

          <div className="fluxo-colunas">
            {colunas.map((coluna) => (
              <span key={coluna}>{coluna}</span>
            ))}
          </div>

          <div className="fluxo-linhas">
            {Array.from({ length: 16 }).map((_, linha) => (
              <div className="fluxo-linha" key={linha}>
                {colunas.map((coluna) => (
                  <input
                    key={coluna}
                    type={
                      coluna === "Qntd"
                        ? "number"
                        : coluna === "Valor"
                          ? "number"
                          : "text"
                    }
                    min={coluna === "Valor" ? "0" : "1"}
                    step={coluna === "Valor" ? "0.01" : "1"}
                    placeholder={
                      coluna === "Vendedor"
                        ? "Vendedor"
                        : coluna === "Produto"
                          ? "Produto"
                          : coluna === "Qntd"
                            ? "Quantidade"
                            : "R$ 0,00"
                    }
                    aria-label={`Entrada ${coluna} ${linha + 1}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* SAÍDA */}
        <section className="fluxo-lado">
          <div className="fluxo-faixa saida">
            Saída
          </div>

          <div className="fluxo-colunas">
            {colunas.map((coluna) => (
              <span key={coluna}>{coluna}</span>
            ))}
          </div>

          <div className="fluxo-linhas">
            {Array.from({ length: 16 }).map((_, linha) => (
              <div className="fluxo-linha" key={linha}>
                {colunas.map((coluna) => (
                  <input
                    key={coluna}
                    type={
                      coluna === "Qntd"
                        ? "number"
                        : coluna === "Valor"
                          ? "number"
                          : "text"
                    }
                    min={coluna === "Valor" ? "0" : "1"}
                    step={coluna === "Valor" ? "0.01" : "1"}
                    placeholder={
                      coluna === "Vendedor"
                        ? "Vendedor"
                        : coluna === "Produto"
                          ? "Produto"
                          : coluna === "Qntd"
                            ? "Quantidade"
                            : "R$ 0,00"
                    }
                    aria-label={`Saída ${coluna} ${linha + 1}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default FluxoCaixa;