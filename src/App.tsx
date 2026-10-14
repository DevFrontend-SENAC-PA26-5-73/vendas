import "./App.css";

import Cabecalho from "./components/Cabecalho/Cabecalho";
import MenuLateral from "./components/MenuLateral/MenuLateral";
<<<<<<< HEAD
import Atendimento from "./components/Atendimento/Atendimento";
import Dashboard from "./components/Dashboard/Dashboard";
import Produtos from "./components/Produtos/Produto";
=======
import Clientes from "./components/Clientes/Clientes";
import Fornecedores from "./components/Fornecedores/Fornecedores";
import "./App.css"
>>>>>>> origin/main

function App() {
  return (
    <div className="app">
      <header className="app-cabecalho">
        <Cabecalho />
      </header>

      <aside className="app-menu">
        <MenuLateral />
      </aside>

<<<<<<< HEAD
      <main className="app-main">
        <Produtos/>
      </main>
    </div>
  );
=======
                <main className="area-conteudo">
                  <Fornecedores/>
                </main>
            </div>
        
    </>
    )
>>>>>>> origin/main
}

export default App;