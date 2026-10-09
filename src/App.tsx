import Button from "./components/Button/Button"; 
import Cabecalho from "./components/Cabecalho/Cabecalho";
import MenuLateral from "./components/MenuLateral/MenuLateral";
import "./App.css"

function App() {
    return (<> 
         <Cabecalho />

            <div className="layout-principal">
                <MenuLateral />

                <main className="area-conteudo">
                    
                </main>
            </div>
        
    </>
    )
}
export default App;
