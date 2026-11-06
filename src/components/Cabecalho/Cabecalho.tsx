import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LogOut, Search, Settings, User } from "lucide-react";

import "./Cabecalho.css";
import {
  lerIdentidade,
  type Identidade,
} from "../Configuracao/useIdentidade";

type Props = {
  busca: string;
  aoAlterarBusca: (busca: string) => void;
  aoMudarPagina: (pagina: string) => void;
};

type Resultado = {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  pesquisa: string;
  pagina: string;
};

const API = "https://vendas.gabrielpimentel.com.br";

// USUÁRIO LOGADO (valores de exemplo: trocar quando existir login)
const USUARIO_EXEMPLO = {
  nome: "Nome do usuário",
  cargo: "Cargo",
};

function extrairLista(
  dados: unknown,
  chaves: string[],
): Record<string, unknown>[] {
  if (Array.isArray(dados)) {
    return dados as Record<string, unknown>[];
  }

  if (dados && typeof dados === "object") {
    const objeto = dados as Record<string, unknown>;

    for (const chave of chaves) {
      if (Array.isArray(objeto[chave])) {
        return objeto[chave] as Record<string, unknown>[];
      }
    }

    if (objeto.data) {
      return extrairLista(objeto.data, chaves);
    }
  }

  return [];
}

// TRANSFORMAR VALORES EM TEXTO
function texto(valor: unknown): string {
  return valor === null || valor === undefined
    ? ""
    : String(valor);
}

// NORMALIZAR TEXTO
function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// PESQUISA APROXIMADA
function correspondePesquisa(
  textoOriginal: string,
  buscaOriginal: string
): boolean {

  const palavrasTexto = normalizar(textoOriginal).split(/\s+/);
  const palavrasBusca = normalizar(buscaOriginal).split(/\s+/);

  return palavrasBusca.every((busca) => {

    return palavrasTexto.some((palavra) => {

      // Pesquisa normal
      if (palavra.includes(busca)) {
        return true;
      }

      // Pesquisa aproximada
      if (
        palavra.length >= 4 &&
        busca.length >= 4 &&
        palavra.slice(0, 4) === busca.slice(0, 4)
      ) {
        return true;
      }

      return false;
    });
  });
}

// COMPONENTE CABEÇALHO
function Cabecalho({
  busca,
  aoAlterarBusca,
  aoMudarPagina,
}: Props) {

  const [identidade, setIdentidade] =
    useState<Identidade>(lerIdentidade);

  const [resultados, setResultados] =
    useState<Resultado[]>([]);

  const [carregando, setCarregando] = useState(false);

  const [erro, setErro] = useState(false);

  const [aberto, setAberto] = useState(false);

  // MENU DO PERFIL
  const [menuPerfilAberto, setMenuPerfilAberto] = useState(false);

  const botaoPerfilRef = useRef<HTMLButtonElement>(null);

  const menuPerfilRef = useRef<HTMLDivElement>(null);

  // POSIÇÃO DO MENU (fixa na tela, para não ser cortada pelo cabeçalho)
  const [posicaoMenu, setPosicaoMenu] = useState({ top: 0, right: 0 });


  // FECHAR MENU DO PERFIL AO CLICAR FORA OU APERTAR ESC
  useEffect(() => {

    if (!menuPerfilAberto) {
      return;
    }

    function aoClicarFora(evento: MouseEvent) {
      const alvo = evento.target as Node;

      if (
        !botaoPerfilRef.current?.contains(alvo) &&
        !menuPerfilRef.current?.contains(alvo)
      ) {
        setMenuPerfilAberto(false);
      }
    }

    function fechar() {
      setMenuPerfilAberto(false);
    }

    function aoApertarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setMenuPerfilAberto(false);
      }
    }

    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoApertarTecla);
    window.addEventListener("resize", fechar);

    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoApertarTecla);
      window.removeEventListener("resize", fechar);
    };

  }, [menuPerfilAberto]);


  // ATUALIZAR LOGO E NOME DA EMPRESA
  useEffect(() => {

    function atualizarIdentidade() {
      setIdentidade(lerIdentidade());
    }

    atualizarIdentidade();

    window.addEventListener(
      "identidade-atualizada",
      atualizarIdentidade
    );

    return () => {
      window.removeEventListener(
        "identidade-atualizada",
        atualizarIdentidade
      );
    };

  }, []);


  // CARREGAR PRODUTOS, CLIENTES E VENDAS
  useEffect(() => {

    let ativo = true;

    async function carregarDados() {

      setCarregando(true);
      setErro(false);

      try {

        const respostas = await Promise.all(

          [
            `${API}/produtos`,
            `${API}/clientes`,
            `${API}/vendas`
          ].map(async (url) => {

            try {

              const resposta = await fetch(url);

              if (!resposta.ok) {
                console.warn(
                  `Erro ao consultar ${url}: ${resposta.status}`
                );

                return null;
              }

              return await resposta.json();

            } catch (error) {

              console.error(`Erro na rota ${url}:`, error);

              return null;
            }

          })

        );

        if (respostas.every((resposta) => resposta === null)) {
          throw new Error("Não foi possível carregar os dados.");
        }

        const [dadosProdutos, dadosClientes, dadosVendas] =
          respostas;

        const produtos = extrairLista(
          dadosProdutos,
          ["produtos"]
        );

        const clientes = extrairLista(
          dadosClientes,
          ["clientes"]
        );

        const vendas = extrairLista(
          dadosVendas,
          ["vendas"]
        );

        const lista: Resultado[] = [];


        // =================================
        // TELAS DO SISTEMA
        // =================================

        const telas = [

          {
            nome: "Dashboard",
            pagina: "Dashboard",
            descricao: "Painel principal estatísticas resumo"
          },

          {
            nome: "Atendimento",
            pagina: "Atendimento",
            descricao: "Novo pedido vendas atendimento"
          },

          {
            nome: "Clientes",
            pagina: "Clientes",
            descricao: "Cadastro consulta clientes"
          },

          {
            nome: "Fornecedores",
            pagina: "Fornecedores",
            descricao: "Cadastro consulta fornecedores"
          },

          {
            nome: "Produtos",
            pagina: "Produtos",
            descricao: "Cadastro consulta produtos"
          },

          {
            nome: "Cargo",
            pagina: "Cargo",
            descricao: "Cadastro consulta cargos"
          },

          {
            nome: "Funcionários",
            pagina: "Funcionario",
            descricao: "Cadastro consulta funcionários"
          },

          {
            nome: "Movimentação",
            pagina: "Movimentação",
            descricao: "Movimentação de estoque"
          },

          {
            nome: "Inventário",
            pagina: "Inventário",
            descricao: "Controle de inventário estoque"
          },

          {
            nome: "Configuração",
            pagina: "Configuração",
            descricao: "Configurações identidade aparência"
          }

        ];


        // ADICIONAR TELAS À PESQUISA
        telas.forEach((tela, index) => {

          lista.push({

            id: `tela-${index}`,

            nome: tela.nome,

            categoria: "Tela do sistema",

            descricao: tela.descricao,

            pesquisa: `${tela.nome} ${tela.descricao}`,

            pagina: tela.pagina

          });

        });


        // =================================
        // PRODUTOS DA API
        // =================================

        produtos.forEach((produto) => {

          const nome = texto(produto.nome);

          const codigo = texto(
            produto.codigo ?? produto.codigo_produto
          );

          const id = texto(produto.id);

          lista.push({

            id: `produto-${id}`,

            nome,

            categoria: "Produto",

            descricao: `Código: ${codigo || id}`,

            pesquisa: `${nome} ${codigo} ${id}`,

            pagina: "Produtos"

          });

        });


        // =================================
        // CLIENTES DA API
        // =================================

        clientes.forEach((cliente) => {

          const nome = texto(cliente.nome);

          const cpf = texto(cliente.cpf);

          const id = texto(cliente.id);

          const contato = texto(
            cliente.contato ?? cliente.telefone
          );

          const email = texto(cliente.email);

          lista.push({

            id: `cliente-${id}`,

            nome,

            categoria: "Cliente",

            descricao: `CPF: ${cpf || "Não informado"}`,

            pesquisa: `${nome} ${cpf} ${contato} ${email} ${id}`,

            pagina: "Clientes"

          });

        });


        // =================================
        // PEDIDOS DA API
        // =================================

        vendas.forEach((venda) => {

          const id = texto(venda.id);

          const status = texto(
            venda.id_status ?? venda.status
          );

          lista.push({

            id: `venda-${id}`,

            nome: `Pedido ${id}`,

            categoria: "Pedido",

            descricao: `Status: ${status || "Não informado"}`,

            pesquisa: `${id} ${status} pedido venda`,

            pagina: "Atendimento"

          });

        });


        if (ativo) {
          setResultados(lista);
        }

      } catch (error) {

        console.error("Erro na pesquisa:", error);

        if (ativo) {
          setErro(true);
        }

      } finally {

        if (ativo) {
          setCarregando(false);
        }

      }

    }

    carregarDados();

    return () => {
      ativo = false;
    };

  }, []);


  // =================================
  // FILTRAR RESULTADOS
  // =================================

  const encontrados = useMemo(() => {

    if (!busca.trim()) {
      return [];
    }

    return resultados

      .filter((resultado) =>
        correspondePesquisa(
          resultado.pesquisa,
          busca
        )
      )

      .slice(0, 10);

  }, [busca, resultados]);


  // =================================
  // ABRIR TELA
  // =================================

  function selecionarResultado(resultado: Resultado) {

    aoMudarPagina(resultado.pagina);

    aoAlterarBusca("");

    setAberto(false);

  }


  // LIMPAR PESQUISA
  function limparPesquisa() {

    aoAlterarBusca("");

    setAberto(false);

  }


  // ABRIR / FECHAR MENU DO PERFIL
  function alternarMenuPerfil() {

    if (!menuPerfilAberto && botaoPerfilRef.current) {

      const caixa = botaoPerfilRef.current.getBoundingClientRect();

      setPosicaoMenu({
        top: caixa.bottom + 8,
        right: window.innerWidth - caixa.right,
      });

    }

    setMenuPerfilAberto((atual) => !atual);

  }


  // IR PARA CONFIGURAÇÃO PELO MENU DO PERFIL
  function abrirConfiguracao() {

    aoMudarPagina("Configuração");

    setMenuPerfilAberto(false);

  }


  // SAIR (ainda não existe login: ligar aqui quando existir)
  function sair() {

    setMenuPerfilAberto(false);

    // TODO: limpar sessão/token e voltar para a tela de login
    console.log("Sair clicado");

  }


  return (

    <div className="container">

      <header className="header">


        {/* LOGO */}
        <div className="logo">

          {identidade.logo && (

            <img
              src={identidade.logo}
              alt="Logo da empresa"
            />

          )}

        </div>


        {/* NOME DA EMPRESA */}
        <span className="nome-empresa">

          {identidade.nome || "Nome da empresa"}

        </span>


        {/* PESQUISA */}
        <div className="pesquisa-container">

          <Search
            className="icone-pesquisa"
            size={17}
          />

          <input

            className="pesquisa"

            type="search"

            placeholder="Pesquisar telas, produtos, clientes e pedidos..."

            value={busca}

            onChange={(e) => {

              aoAlterarBusca(e.target.value);

              setAberto(true);

            }}

            onFocus={() => setAberto(true)}

            onKeyDown={(e) => {

              if (e.key === "Escape") {
                limparPesquisa();
              }

              if (
                e.key === "Enter" &&
                encontrados.length > 0
              ) {

                selecionarResultado(encontrados[0]);

              }

            }}

          />


          {/* RESULTADOS */}
          {busca.trim() !== "" && aberto && (

            <div className="pesquisa-resultados">


              {carregando ? (

                <p className="pesquisa-mensagem">
                  Carregando dados...
                </p>

              ) : erro ? (

                <p className="pesquisa-mensagem">
                  Não foi possível carregar os dados da API.
                </p>

              ) : encontrados.length > 0 ? (

                encontrados.map((resultado) => (

                  <button

                    type="button"

                    className="pesquisa-item"

                    key={resultado.id}

                    onClick={() =>
                      selecionarResultado(resultado)
                    }

                  >

                    <span className="pesquisa-categoria">

                      {resultado.categoria}

                    </span>

                    <strong>

                      {resultado.nome}

                    </strong>

                    <small>

                      {resultado.descricao}

                    </small>

                  </button>

                ))

              ) : (

                <p className="pesquisa-mensagem">
                  Nenhum resultado encontrado.
                </p>

              )}

            </div>

          )}

        </div>


        {/* PERFIL COM MENU */}
        <button
          ref={botaoPerfilRef}
          className="perfil"
          type="button"
          title="Perfil"
          aria-haspopup="menu"
          aria-expanded={menuPerfilAberto}
          onClick={alternarMenuPerfil}
        >
          <User size={20} />
        </button>


      </header>

      {menuPerfilAberto &&

        createPortal(

          <div
            ref={menuPerfilRef}
            className="perfil-menu"
            role="menu"
            style={{
              top: posicaoMenu.top,
              right: posicaoMenu.right,
            }}
          >

            <div className="perfil-menu-usuario">
              <strong>{USUARIO_EXEMPLO.nome}</strong>
              <small>{USUARIO_EXEMPLO.cargo}</small>
            </div>

            <button
              type="button"
              role="menuitem"
              className="perfil-menu-item"
              onClick={abrirConfiguracao}
            >
              <Settings size={16} />
              Configuração
            </button>

            <button
              type="button"
              role="menuitem"
              className="perfil-menu-item perfil-menu-sair"
              onClick={sair}
            >
              <LogOut size={16} />
              Sair
            </button>

          </div>,

          document.body

        )}

    </div>

  );

}

export default Cabecalho;