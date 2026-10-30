import { lazy, Suspense, useState } from "react";

import "./App.css";
import Cabecalho from "./components/Cabecalho/Cabecalho";
import MenuLateral from "./components/MenuLateral/MenuLateral";

const Dashboard = lazy(() => import("./components/Dashboard/Dashboard"));
const Atendimento = lazy(() => import("./components/Atendimento/Atendimento"));
const Clientes = lazy(() => import("./components/Clientes/Clientes"));
const Cargo = lazy(() => import("./components/Cargo/Cargo"));
const Funcionario = lazy(() => import("./components/Funcionario/Funcionario"));
const Movimentacao = lazy(() => import("./components/Movimentacao/Movimentacao"));
const Produtos = lazy(() => import("./components/Produtos/Produtos"));
const Inventario = lazy(() => import("./components/Inventario/Inventario"));

function App() {
  const [paginaAtiva, setPaginaAtiva] = useState<string>("Dashboard");
  const [buscaGlobal, setBuscaGlobal] = useState("");

  function mudarPagina(pagina: string) {
    setPaginaAtiva(pagina);
    setBuscaGlobal("");
  }

  function renderizarPagina() {
    switch (paginaAtiva) {
      case "Dashboard":
        return <Dashboard buscaGlobal={buscaGlobal} />;

      case "Atendimento":
        return <Atendimento buscaGlobal={buscaGlobal} />;

      case "Clientes":
        return <Clientes buscaGlobal={buscaGlobal} />;

      case "Fornecedores":
        return (
          <section className="pagina-em-construcao">
            <h1 className="medium-h1">Fornecedores</h1>
            <p className="light-h3">Esta tela ainda não foi criada.</p>
          </section>
        );

      case "Movimentação":
        return <Movimentacao buscaGlobal={buscaGlobal} />;

      case "Produtos":
        return <Produtos buscaGlobal={buscaGlobal} />;

      case "Cargo":
        return <Cargo buscaGlobal={buscaGlobal} />;

      case "Funcionario":
      case "Funcionário":
        return <Funcionario buscaGlobal={buscaGlobal} />;

      case "Inventario":
        return <Inventario buscaGlobal={buscaGlobal} />;

      default:
        return <> </>;
    }
  }

  return (
    <div className="app">
      <header className="app-cabecalho">
        <Cabecalho busca={buscaGlobal} aoAlterarBusca={setBuscaGlobal} />
      </header>

      <aside className="app-menu">
        <MenuLateral
          paginaAtiva={paginaAtiva}
          aoMudarPagina={mudarPagina}
        />
      </aside>

      <main className="app-main">
        <Suspense
          fallback={
            <p className="app-carregando" role="status">
              Carregando tela...
            </p>
          }
        >
          {renderizarPagina()}
        </Suspense>
      </main>
    </div>
  );
}

export default App;