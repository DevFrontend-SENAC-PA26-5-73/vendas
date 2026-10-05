import Button from "./components/Button/Button";
import MenuButton from "./components/MenuButton/MenuButton";

function App() {
    return (<> 
    <Button texto="clique em mim" cor="btn-secundaria"/>
    <Button texto="aperte aqui" cor="btn-primaria"/>
    <Button texto ="clique aqui" cor="btn-c" />
    <MenuButton/>
    </>
    )
}
export default App;
