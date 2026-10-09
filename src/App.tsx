import "./App.css";

import Cabecalho from "./components/Cabecalho/Cabecalho";
import MenuLateral from "./components/MenuLateral/MenuLateral";
import Atendimento from "./components/Atendimento/Atendimento";
import Dashboard from "./components/Dashboard/Dashboard";
import Produtos from "./components/Produtos/Produto";

function App() {
  return (
    <div className="app">
      <header className="app-cabecalho">
        <Cabecalho />
      </header>

      <aside className="app-menu">
        <MenuLateral />
      </aside>

      <main className="app-main">
        <Produtos/>
      </main>
    </div>
  );
}

export default App;