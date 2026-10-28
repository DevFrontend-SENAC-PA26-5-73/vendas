import { useState } from "react";
import Cargo from "./components/Cargo/Cargo";
import Funcionario from "./components/Funcionario/Funcionario";

import "./App.css";
import Cabecalho from "./components/Cabecalho/Cabecalho";
import MenuLateral from "./components/MenuLateral/MenuLateral";
import Dashboard from "./components/Dashboard/Dashboard";
import Atendimento from "./components/Atendimento/Atendimento";
import Clientes from "./components/Clientes/Clientes";
import Movimentacao from "./components/Movimentacao/Movimentacao";
import Produtos from "./components/Produtos/Produto";

function App() {
  const [paginaAtiva, setPaginaAtiva] =
    useState<string>("Dashboard");

  function renderizarPagina() {
    switch (paginaAtiva) {
      case "Dashboard":
        return <Dashboard />;

      case "Atendimento":
        return <Atendimento />;

      case "Clientes":
        return <Clientes />;

      case "Fornecedores":
        return (
          <section className="pagina-em-construcao">
            <h1 className="medium-h1">
              Fornecedores
            </h1>

            <p className="light-h3">
              Esta tela ainda não foi criada.
            </p>
          </section>
        );

      case "Movimentação":
        return (
          <Movimentacao/>
        );

      case "Produtos":
        return (
          <Produtos/>
        );

      default:
        return <Dashboard />;
    }
  }

  return (
    <div className="app">
      <header className="app-cabecalho">
        <Cabecalho />
      </header>

      <aside className="app-menu">
        <MenuLateral
          paginaAtiva={paginaAtiva}
          aoMudarPagina={setPaginaAtiva}
        />
      </aside>

      <main className="app-main">
        {renderizarPagina()}
      </main>
    </div>
  );
}

export default App;