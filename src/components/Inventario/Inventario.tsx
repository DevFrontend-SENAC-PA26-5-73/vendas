import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import axios from "axios";
import {
  AlertTriangle,
  Boxes,
  PackageSearch,
  RefreshCw,
  Search,
  Warehouse,
} from "lucide-react";

import "./Inventario.css";

const API_BASE_URL = "http://10.3.20.30:5001";

const API = {
  produtos: `${API_BASE_URL}/produtos`,
  estoque: `${API_BASE_URL}/estoque`,
};

type ProdutoApi = {
  id: number;
  nome: string;
  descricao?: string | null;
  codigo_barra?: string | null;
  quantidade: number;
  tipo: string;
  preco: number;
};

type EstoqueApi = {
  id: number;
  nome: string;
  quantidade: number;
  tipo: string;
  preco: number;
};

type ItemInventario = {
  id: number;
  nome: string;
  descricao: string;
  codigoBarra: string;
  tipo: string;
  preco: number;
  quantidade: number;
};

type FiltroSituacao =
  | "todos"
  | "normal"
  | "baixo"
  | "sem-estoque";

type Mensagem = {
  tipo: "erro" | "info";
  codigo: string;
  texto: string;
};

type ApiErro = {
  message?: string | string[];
  error?: string;
};

const LIMITE_ESTOQUE_BAIXO = 5;

function normalizarLista<T>(dados: unknown): T[] {
  if (Array.isArray(dados)) {
    return dados as T[];
  }

  if (dados && typeof dados === "object" && "data" in dados) {
    const data = (dados as { data?: unknown }).data;

    if (Array.isArray(data)) {
      return data as T[];
    }
  }

  return [];
}

function formatarNumero(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatarMoeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function obterMensagemApi(dados: unknown) {
  if (!dados) {
    return "";
  }

  if (typeof dados === "string") {
    return dados;
  }

  if (typeof dados !== "object") {
    return "";
  }

  const erro = dados as ApiErro;

  if (Array.isArray(erro.message)) {
    return erro.message.join(", ");
  }

  if (typeof erro.message === "string") {
    return erro.message;
  }

  if (typeof erro.error === "string") {
    return erro.error;
  }

  return "";
}

function diagnosticarErro(erro: unknown): Mensagem {
  if (!axios.isAxiosError(erro)) {
    return {
      tipo: "erro",
      codigo: "INV-U001",
      texto:
        erro instanceof Error
          ? erro.message
          : "Erro inesperado ao carregar o inventário.",
    };
  }

  if (!erro.response) {
    return {
      tipo: "erro",
      codigo: "INV-N001",
      texto:
        "A API não respondeu. Verifique a rede, o endereço local e o CORS.",
    };
  }

  const status = erro.response.status;
  const detalhe = obterMensagemApi(erro.response.data);

  return {
    tipo: "erro",
    codigo: `INV-A${status}`,
    texto:
      detalhe ||
      `A API respondeu com erro ${status} ao carregar o inventário.`,
  };
}

function Inventario() {
  const [itens, setItens] = useState<ItemInventario[]>([]);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [situacao, setSituacao] =
    useState<FiltroSituacao>("todos");
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] =
    useState<Mensagem | null>(null);

  function exibirErro(erro: Mensagem) {
    setMensagem(erro);
    window.alert(`${erro.codigo}: ${erro.texto}`);
  }

  const carregarInventario = useCallback(async () => {
    try {
      setCarregando(true);
      setMensagem(null);

      const [respostaProdutos, respostaEstoque] =
        await Promise.all([
          axios.get<unknown>(API.produtos, {
            headers: { Accept: "application/json" },
            timeout: 15000,
          }),
          axios.get<unknown>(API.estoque, {
            headers: { Accept: "application/json" },
            timeout: 15000,
          }),
        ]);

      const produtos = normalizarLista<ProdutoApi>(
        respostaProdutos.data,
      );

      const estoque = normalizarLista<EstoqueApi>(
        respostaEstoque.data,
      );

      const estoquePorProduto = new Map(
        estoque.map((registro) => [
          Number(registro.id),
          Number(registro.quantidade ?? 0),
        ]),
      );

      const inventario: ItemInventario[] = produtos.map(
        (produto) => ({
          id: Number(produto.id),
          nome: produto.nome,
          descricao: produto.descricao ?? "",
          codigoBarra:
            produto.codigo_barra ?? "Não informado",
          tipo: produto.tipo,
          preco: Number(produto.preco ?? 0),
          quantidade:
            estoquePorProduto.get(Number(produto.id)) ??
            Number(produto.quantidade ?? 0),
        }),
      );

      setItens(inventario);
    } catch (erro) {
      console.group("[INVENTARIO] Erro ao carregar dados");
      console.error(erro);

      if (axios.isAxiosError(erro)) {
        console.log("Método:", erro.config?.method);
        console.log("URL:", erro.config?.url);
        console.log("Status:", erro.response?.status);
        console.log("Resposta:", erro.response?.data);
      }

      console.groupEnd();
      setItens([]);
      exibirErro(diagnosticarErro(erro));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarInventario();
  }, [carregarInventario]);

  useEffect(() => {
    function atualizarInventario() {
      void carregarInventario();
    }

    window.addEventListener(
      "produtos-atualizados",
      atualizarInventario,
    );
    window.addEventListener(
      "estoque-atualizado",
      atualizarInventario,
    );

    return () => {
      window.removeEventListener(
        "produtos-atualizados",
        atualizarInventario,
      );
      window.removeEventListener(
        "estoque-atualizado",
        atualizarInventario,
      );
    };
  }, [carregarInventario]);

  const categorias = useMemo(() => {
    return Array.from(
      new Set(
        itens
          .map((item) => item.tipo.trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [itens]);

  const resumo = useMemo(() => {
    const unidades = itens.reduce(
      (total, item) => total + item.quantidade,
      0,
    );

    const valorEstoque = itens.reduce(
      (total, item) =>
        total + item.quantidade * item.preco,
      0,
    );

    const estoqueBaixo = itens.filter(
      (item) =>
        item.quantidade > 0 &&
        item.quantidade <= LIMITE_ESTOQUE_BAIXO,
    ).length;

    const semEstoque = itens.filter(
      (item) => item.quantidade === 0,
    ).length;

    return {
      produtos: itens.length,
      unidades,
      valorEstoque,
      estoqueBaixo,
      semEstoque,
    };
  }, [itens]);

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return itens.filter((item) => {
      const correspondeBusca =
        !termo ||
        [
          item.nome,
          item.codigoBarra,
          item.tipo,
          item.descricao,
        ].some((valor) =>
          String(valor ?? "")
            .toLowerCase()
            .includes(termo),
        );

      const correspondeCategoria =
        categoria === "todas" || item.tipo === categoria;

      let correspondeSituacao = true;

      if (situacao === "normal") {
        correspondeSituacao =
          item.quantidade > LIMITE_ESTOQUE_BAIXO;
      } else if (situacao === "baixo") {
        correspondeSituacao =
          item.quantidade > 0 &&
          item.quantidade <= LIMITE_ESTOQUE_BAIXO;
      } else if (situacao === "sem-estoque") {
        correspondeSituacao = item.quantidade === 0;
      }

      return (
        correspondeBusca &&
        correspondeCategoria &&
        correspondeSituacao
      );
    });
  }, [itens, busca, categoria, situacao]);

  return (
    <section className="inventario">
      <header className="inventario-cabecalho">
        <div className="inventario-cabecalho-conteudo">
          <span className="inventario-cabecalho-icone">
            <Boxes size={26} />
          </span>

          <div>
            <h1 className="medium-h1">
              Inventário de estoque
            </h1>

            <p className="light-h3">
              Consulte os produtos e as quantidades
              atualmente registradas no estoque.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="inventario-atualizar medium-h3"
          onClick={() => void carregarInventario()}
          disabled={carregando}
        >
          <RefreshCw
            size={17}
            className={
              carregando ? "inventario-girando" : ""
            }
          />

          {carregando
            ? "Atualizando..."
            : "Atualizar inventário"}
        </button>
      </header>

      {mensagem && (
        <div
          className="inventario-mensagem inventario-mensagem-erro"
          role="alert"
        >
          <strong>{mensagem.codigo}: </strong>
          {mensagem.texto}
        </div>
      )}

      <div className="inventario-resumo">
        <article className="inventario-card">
          <span className="inventario-card-icone">
            <PackageSearch size={20} />
          </span>

          <div>
            <span className="light-h3">
              Produtos cadastrados
            </span>
            <strong className="bold-h2">
              {formatarNumero(resumo.produtos)}
            </strong>
          </div>
        </article>

        <article className="inventario-card">
          <span className="inventario-card-icone">
            <Warehouse size={20} />
          </span>

          <div>
            <span className="light-h3">
              Unidades em estoque
            </span>
            <strong className="bold-h2">
              {formatarNumero(resumo.unidades)}
            </strong>
          </div>
        </article>

        <article className="inventario-card inventario-card-alerta">
          <span className="inventario-card-icone">
            <AlertTriangle size={20} />
          </span>

          <div>
            <span className="light-h3">
              Estoque baixo
            </span>
            <strong className="bold-h2">
              {formatarNumero(resumo.estoqueBaixo)}
            </strong>
            <small>
              Produtos com até {LIMITE_ESTOQUE_BAIXO}{" "}
              unidades
            </small>
          </div>
        </article>

        <article className="inventario-card inventario-card-alerta">
          <span className="inventario-card-icone">
            <AlertTriangle size={20} />
          </span>

          <div>
            <span className="light-h3">
              Sem estoque
            </span>
            <strong className="bold-h2">
              {formatarNumero(resumo.semEstoque)}
            </strong>
          </div>
        </article>

        <article className="inventario-card inventario-card-valor">
          <div>
            <span className="light-h3">
              Valor estimado do estoque
            </span>
            <strong className="bold-h2">
              {formatarMoeda(resumo.valorEstoque)}
            </strong>
          </div>
        </article>
      </div>

      <article className="inventario-painel">
        <div className="inventario-painel-topo">
          <div>
            <h2 className="medium-h2">
              Produtos no inventário
            </h2>

            <p className="light-h3">
              Tela somente para consulta. As quantidades
              devem ser alteradas pela área de movimentação.
            </p>
          </div>

          <span className="inventario-somente-leitura medium-h3">
            Somente leitura
          </span>
        </div>

        <div className="inventario-filtros">
          <div className="inventario-busca">
            <Search size={18} />
            <input
              type="search"
              value={busca}
              onChange={(evento) =>
                setBusca(evento.target.value)
              }
              placeholder="Buscar por produto ou código"
              aria-label="Buscar no inventário"
            />
          </div>

          <select
            className="inventario-select"
            value={categoria}
            onChange={(evento) =>
              setCategoria(evento.target.value)
            }
            aria-label="Filtrar por categoria"
          >
            <option value="todas">
              Todas as categorias
            </option>

            {categorias.map((itemCategoria) => (
              <option
                key={itemCategoria}
                value={itemCategoria}
              >
                {itemCategoria}
              </option>
            ))}
          </select>

          <select
            className="inventario-select"
            value={situacao}
            onChange={(evento) =>
              setSituacao(
                evento.target.value as FiltroSituacao,
              )
            }
            aria-label="Filtrar por situação"
          >
            <option value="todos">
              Todas as situações
            </option>
            <option value="normal">
              Estoque normal
            </option>
            <option value="baixo">
              Estoque baixo
            </option>
            <option value="sem-estoque">
              Sem estoque
            </option>
          </select>
        </div>

        <div className="inventario-tabela-container">
          <table className="inventario-tabela">
            <thead>
              <tr>
                <th>Código</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Quantidade</th>
                <th>Preço unitário</th>
                <th>Valor em estoque</th>
                <th>Situação</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td
                    colSpan={8}
                    className="inventario-sem-resultados"
                  >
                    Carregando inventário...
                  </td>
                </tr>
              ) : itensFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="inventario-sem-resultados"
                  >
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                itensFiltrados.map((item) => {
                  let situacaoItem = "Normal";
                  let classeSituacao =
                    "inventario-status-normal";

                  if (item.quantidade === 0) {
                    situacaoItem = "Sem estoque";
                    classeSituacao =
                      "inventario-status-sem-estoque";
                  } else if (
                    item.quantidade <=
                    LIMITE_ESTOQUE_BAIXO
                  ) {
                    situacaoItem = "Estoque baixo";
                    classeSituacao =
                      "inventario-status-baixo";
                  }

                  return (
                    <tr key={item.id}>
                      <td className="inventario-codigo">
                        {item.codigoBarra}
                      </td>

                      <td>
                        <div className="inventario-produto">
                          <span className="inventario-produto-avatar">
                            {item.nome
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                          <strong>{item.nome}</strong>
                        </div>
                      </td>

                      <td>{item.tipo}</td>

                      <td
                        className="inventario-descricao"
                        title={item.descricao}
                      >
                        {item.descricao || "Sem descrição"}
                      </td>

                      <td className="inventario-quantidade">
                        {formatarNumero(item.quantidade)} un.
                      </td>

                      <td>{formatarMoeda(item.preco)}</td>

                      <td className="inventario-valor">
                        {formatarMoeda(
                          item.quantidade * item.preco,
                        )}
                      </td>

                      <td>
                        <span
                          className={`inventario-status ${classeSituacao}`}
                        >
                          {situacaoItem}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

export default Inventario;