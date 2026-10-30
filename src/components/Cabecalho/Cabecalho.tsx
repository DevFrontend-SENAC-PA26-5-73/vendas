import { useEffect, useMemo, useState } from "react";
import { Heart, ShoppingCart, User, Search } from "lucide-react";

import "./Cabecalho.css";
import { lerIdentidade } from "../Configuracao/useIdentidade";

type Identidade = {
  nome: string;
  logo: string;
};

type Props = {
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

// EXTRAIR LISTAS DA API
function extrairLista(
  dados: unknown,
  chaves: string[]
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
function Cabecalho({ aoMudarPagina }: Props) {

  const [identidade, setIdentidade] =
    useState<Identidade>(lerIdentidade);

  const [termo, setTermo] = useState("");

  const [resultados, setResultados] =
    useState<Resultado[]>([]);

  const [carregando, setCarregando] = useState(false);

  const [erro, setErro] = useState(false);

  const [aberto, setAberto] = useState(false);


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

        console.log("PRODUTOS:", produtos);
        console.log("CLIENTES:", clientes);
        console.log("VENDAS:", vendas);


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

          console.log("TODOS OS RESULTADOS:", lista);

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

    if (!termo.trim()) {
      return [];
    }

    return resultados

      .filter((resultado) =>
        correspondePesquisa(
          resultado.pesquisa,
          termo
        )
      )

      .slice(0, 10);

  }, [termo, resultados]);


  // =================================
  // ABRIR TELA
  // =================================

  function selecionarResultado(resultado: Resultado) {

    aoMudarPagina(resultado.pagina);

    setTermo("");

    setAberto(false);

  }


  // LIMPAR PESQUISA
  function limparPesquisa() {

    setTermo("");

    setAberto(false);

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

            value={termo}

            onChange={(e) => {

              setTermo(e.target.value);

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
          {termo.trim() !== "" && aberto && (

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


        {/* FAVORITOS */}
        <button
          className="botao"
          type="button"
          title="Favoritos"
        >
          <Heart size={18} />
        </button>


        {/* CARRINHO */}
        <button
          className="botao"
          type="button"
          title="Carrinho"
        >
          <ShoppingCart size={18} />
        </button>


        {/* PERFIL */}
        <button
          className="perfil"
          type="button"
          title="Perfil"
        >
          <User size={20} />
        </button>


      </header>

    </div>

  );

}

export default Cabecalho;