import Button from "./components/Button/Button"; 
import Cabecalho from "./components/Cabecalho/Cabecalho";
import MenuLateral from "./components/MenuLateral/MenuLateral";
import Clientes from "./components/Clientes/Clientes";
import Fornecedores from "./components/Fornecedores/Fornecedores";
import "./App.css"

function App() {
    return (<> 
         <Cabecalho />

            <div className="layout-principal">
                <MenuLateral />

                <main className="area-conteudo">
                  <Fornecedores/>
                </main>
            </div>
        
    </>
    )
}
export default App;
