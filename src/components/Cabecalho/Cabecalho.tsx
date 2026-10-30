import "./Cabecalho.css";
import { Heart, ShoppingCart, User } from "lucide-react";

type CabecalhoProps = {
    busca: string;
    aoAlterarBusca: (busca: string) => void;
};

function Cabecalho({ busca, aoAlterarBusca }: CabecalhoProps){
    return (
        <div className="container">

            <header className="header">

                <div className="logo"></div>

                <span className="nome-empresa">
                    Nome da empresa
                </span>

                <input
                    className="pesquisa"
                    type="search"
                    value={busca}
                    onChange={(evento) => aoAlterarBusca(evento.target.value)}
                    placeholder="Pesquisar nesta tela..."
                    aria-label="Pesquisar na tela atual"
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