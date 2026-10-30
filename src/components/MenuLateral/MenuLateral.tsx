import "./MenuLateral.css";
import { IconeEngrenagem } from "../Configuracao/Configuracao";

const gruposMenu = [
  {
    titulo: "Menu",
    itens: ["Dashboard", "Atendimento"],
  },
  {
    titulo: "Cadastro",
    itens: ["Clientes", "Produtos", "Cargo"],
  },
  {
    titulo: "Estoque",
    itens: ["Movimentação", "Inventário"],
  },
];

type MenuLateralProps = {
  paginaAtiva: string;
  aoMudarPagina: (pagina: string) => void;
};

function MenuLateral({
  paginaAtiva,
  aoMudarPagina,
}: MenuLateralProps) {
  return (
    <aside className="menu-lateral">
      <h2 className="menu-logo"></h2>

      <nav className="menu-navegacao">
        {gruposMenu.map((grupo) => (
          <section className="menu-grupo" key={grupo.titulo}>
            <h3 className="menu-titulo-grupo">{grupo.titulo}</h3>

            <div className="menu-grupo-itens medium-h3">
              {grupo.itens.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`menu-item ${
                    paginaAtiva === item ? "ativo" : ""
                  }`}
                  onClick={() => aoMudarPagina(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>
        ))}
      </nav>

      <div className="menu-rodape">
        <button
          type="button"
          className={`menu-config ${
            paginaAtiva === "Configuração" ? "menu-config--ativo" : ""
          }`}
          aria-label="Configuração"
          title="Configuração"
          onClick={() => aoMudarPagina("Configuração")}
        >
          <IconeEngrenagem />
        </button>
      </div>
    </aside>
  );
}

export default MenuLateral;