import {useState} from 'react';
import './MenuLateral.css';

const gruposMenu = [
    {
        titulo: "Menu",
        itens: ["DashBoard", "Atendimento"],
    },

    {
        titulo: "Cadastro",
        itens: ["Clientes", "Fornecedores", "Produtos"],
    },

    {
        titulo: "Estoque",
        itens: ["Movimentação", "Inventário"],
    },

    {
        titulo: "Fluxo",
        itens: ["DashBard"]
    },
];

function MenuLateral() {
    const [paginaAtiva, setPaginaAtiva] = useState("DashBoard");

    return(
        <aside className='menu-lateral'>
            <h2 className='menu-logo'></h2>

            <nav className='menu-navegacao'>
                {gruposMenu.map((grupo) => (
                    <section className='menu-grupo' key={grupo.titulo}>
                        <h3 
                        className='menu-titulo-grupo'>{grupo.titulo}
                        </h3>

                        <div className='menu-grupo-itens medium-h3'>  {grupo.itens.map((item) => (
                            <a 
                            key={item}
                            href='#'
                            className={`menu-item ${paginaAtiva === item ? "ativo" : ""}`}
                            onClick={(evento) => {
                                evento.preventDefault();
                                setPaginaAtiva(item);
                            }}
                            >
                                {item}
                            </a>
                        ))}
                        </div>
                    </section>
                ))}
            </nav>
        </aside>
    )
}

export default MenuLateral;