import Button from "./components/Button/Button"; 
import Cabecalho from "./components/Cabecalho/Cabecalho";
import MenuLateral from "./components/MenuLateral/MenuLateral";
import Clientes from "./components/Clientes/Clientes";
import FluxoCaixa from "./components/Fluxo de caixa/FluxoCaixa";
import "./App.css"

function App() {
    return (<> 
         <Cabecalho />

            <div className="layout-principal">
                <MenuLateral />

                <main className="area-conteudo">
                 <FluxoCaixa/>
                </main>
            </div>
        
    </>
    )
}
export default App;
