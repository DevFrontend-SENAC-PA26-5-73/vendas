import { useState } from "react";
import "./Cargo.css";

function Cargo() {
  const [cargoSelecionado, setCargoSelecionado] = useState("");

  const cargos = [
    "Vendedor",
    "Gerente",
    "Atendente",
    "Caixa",
    "Estoquista",
    "Administrador",
    "Cliente",
  ];

  function salvarCargo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!cargoSelecionado) {
      alert("Selecione um cargo.");
      return;
    }

    alert(`Cargo selecionado: ${cargoSelecionado}`);
  }

  return (
    <div className="pagina-cargo">
      <div className="cargo-cabecalho">
        <div>
          <h2>Cadastro de cargo</h2>
          <p>Selecione o cargo desejado.</p>
        </div>

        <span className="cargo-status">Novo cargo</span>
      </div>

      <form className="cargo-formulario" onSubmit={salvarCargo}>
        <div className="cargo-campo">
          <label htmlFor="cargo">Cargo</label>

          <select
            id="cargo"
            value={cargoSelecionado}
            onChange={(e) => setCargoSelecionado(e.target.value)}
          >
            <option value="">Selecione um cargo</option>

            {cargos.map((cargo) => (
              <option key={cargo} value={cargo}>
                {cargo}
              </option>
            ))}
          </select>
        </div>

        <div className="cargo-acoes">
          <button
            type="button"
            className="cargo-botao-cancelar"
            onClick={() => setCargoSelecionado("")}
          >
            Cancelar
          </button>

          <button type="submit" className="cargo-botao-salvar">
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}

export default Cargo;