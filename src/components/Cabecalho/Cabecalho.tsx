import "./Cabecalho.css";
import { Heart, ShoppingCart, User } from "lucide-react";

function Cabecalho(){
    return (
        <div className="container">

            <header className="header">

                <div className="logo"></div>

                <span className="nome-empresa">
                    Nome da empresa
                </span>

                <input
                    className="pesquisa"
                    type="text"
                    placeholder="Pesquisar..."
                />

                <button className="botao">
                    <Heart size={18} />
                </button>

                <button className="botao">
                    <ShoppingCart size={18} />
                </button>

                <button className="perfil">
                    <User size={20} />
                </button>

            </header>

        </div>
    );
}

export default Cabecalho;