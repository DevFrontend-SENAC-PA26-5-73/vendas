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
  PackageX,
  RefreshCw,
  Search,
  Warehouse,
} from "lucide-react";

import "./Inventario.css";

import { API_BASE_URL } from "../../lib/api";
import SortableHeader from "../SortableHeader/SortableHeader";
import { ordenarLista } from "../../lib/ordenacao";
import type { DirecaoOrdenacao } from "../../lib/ordenacao";

const API = {
  produtos: `${API_BASE_URL}/produtos`,
  estoque: `${API_BASE_URL}/estoque`,
  fluxoCaixa: `${API_BASE_URL}/fluxo-caixa`,
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

const ESTOQUE_MINIMO = 5;

type Produto = {
  id: number;
  nome: string;
  descricao: string;
  codigo_barra: string;
  quantidade: number;
  tipo: string;
  preco: number;
};

type Situacao = "disponivel" | "baixo" | "esgotado";

type ColunaOrdenacaoInventario =
  | "codigo" | "nome" | "categoria" | "descricao" | "quantidade"
  | "preco" | "valor" | "situacao";

type Mensagem = {
  tipo: "erro" | "info" | "sucesso";
  codigo: string;
  texto: string;
};

/* =========================
   Normalização dos dados

function formatarMoeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatarNumero(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function classificarEstoque(quantidade: number): Situacao {
  if (quantidade <= 0) return "esgotado";
  if (quantidade <= ESTOQUE_MINIMO) return "baixo";
  return "disponivel";
}

function Inventario({ buscaGlobal }: { buscaGlobal: string }) {
  const [itens, setItens] = useState<ItemInventario[]>([]);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [situacao, setSituacao] =
    useState<FiltroSituacao>("todos");
  const [carregando, setCarregando] = useState(true);
  const [zerandoProdutoId, setZerandoProdutoId] = useState<number | null>(null);
  const [ordenacao, setOrdenacao] = useState<{
    coluna: ColunaOrdenacaoInventario;
    direcao: DirecaoOrdenacao;
  } | null>(null);
  const [mensagem, setMensagem] =
    useState<Mensagem | null>(null);

  function exibirErro(erro: Mensagem) {
    setMensagem(erro);
    window.alert(`${erro.codigo}: ${erro.texto}`);
  }

  const carregarInventario = useCallback(async () => {
    try {
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

      const listaProdutos = normalizarProdutos(
        await respostaProdutos.value.json(),
      );

      // A rota /estoque é opcional: quando responde, a quantidade dela
      // tem prioridade sobre a quantidade cadastrada no produto.
      let quantidadesEstoque = new Map<number, number>();

      if (respostaEstoque.status === "fulfilled" && respostaEstoque.value.ok) {
        quantidadesEstoque = normalizarEstoque(
          await respostaEstoque.value.json(),
        );
      }

      setItens(inventario);
      setMensagem(null);
    } catch (erro) {
      console.group("[INVENTARIO] Erro ao carregar dados");
      console.error(erro);

      listaCompleta.sort((primeiro, segundo) =>
        primeiro.nome.localeCompare(segundo.nome, "pt-BR"),
      );

      setProdutos(listaCompleta);
      setAtualizadoEm(new Date());
    } catch (erroDesconhecido) {
      console.error("Erro ao carregar inventário:", erroDesconhecido);

      setProdutos([]);
      setErro(
        erroDesconhecido instanceof Error
          ? erroDesconhecido.message
          : "Não foi possível carregar o inventário.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    async function iniciar() {
      await carregarInventario();
    }

    void iniciar();
  }, [carregarInventario]);

  useEffect(() => {
    function atualizar() {
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
      window.removeEventListener("estoque-atualizado", atualizar);
      window.removeEventListener("produtos-atualizados", atualizar);
    };
  }, [carregarInventario]);

  function atualizarManual() {
    setCarregando(true);
    setMensagem(null);
    void carregarInventario();
  }

  async function zerarEstoque(item: ItemInventario) {
    if (item.quantidade <= 0 || zerandoProdutoId !== null) return;

    const confirmado = window.confirm(
      `Registrar a saída de ${formatarNumero(item.quantidade)} unidade(s) de "${item.nome}" e zerar o estoque? O produto continuará no catálogo para preservar o histórico.`,
    );
    if (!confirmado) return;

    setZerandoProdutoId(item.id);
    setMensagem(null);

    try {
      await axios.post(API.fluxoCaixa, {
        tipo: "saida",
        produto_id: item.id,
        quantidade: item.quantidade,
        preco_unitario: Number(item.preco || 0),
        descricao: "Ajuste negativo realizado pelo inventário",
      });

      await carregarInventario();
      setMensagem({
        tipo: "sucesso",
        codigo: "INV-S001",
        texto: `O estoque de "${item.nome}" foi zerado. O produto continua cadastrado no catálogo.`,
      });
      window.dispatchEvent(new CustomEvent("estoque-atualizado"));
    } catch (erro) {
      exibirErro(diagnosticarErro(erro));
    } finally {
      setZerandoProdutoId(null);
    }
  }

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
    return produtos.reduce(
      (total, produto) => {
        const situacao = classificarEstoque(produto.quantidade);

        return {
          unidades: total.unidades + produto.quantidade,
          valor: total.valor + produto.quantidade * produto.preco,
          disponiveis:
            total.disponiveis + (situacao === "disponivel" ? 1 : 0),
          alertas:
            total.alertas + (situacao === "disponivel" ? 0 : 1),
        };
      },
      {
        unidades: 0,
        valor: 0,
        disponiveis: 0,
        alertas: 0,
      },
    );
  }, [produtos]);

  const categorias = useMemo(() => {
    const valores = new Set(
      produtos.map((produto) => produto.tipo.trim()).filter(Boolean),
    );

    return Array.from(valores).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [produtos]);

  const itensFiltrados = useMemo(() => {
    const termos = [busca, buscaGlobal]
      .map((valor) => valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase(),
      )
      .filter(Boolean);

    return itens.filter((item) => {
      const camposBusca = [
          item.nome,
          item.codigoBarra,
          item.tipo,
          item.descricao,
        ]
        .map((valor) => String(valor ?? "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase(),
        );
      const correspondeBusca = termos.every((termo) =>
        camposBusca.some((campo) => campo.includes(termo)),
      );

      const correspondeCategoria =
        filtroCategoria === "todas" ||
        produto.tipo.toLowerCase() === filtroCategoria.toLowerCase();

      const correspondeSituacao =
        filtroSituacao === "todas" ||
        classificarEstoque(produto.quantidade) === filtroSituacao;

      return (
        correspondeBusca && correspondeCategoria && correspondeSituacao
      );
    });
  }, [itens, busca, buscaGlobal, categoria, situacao]);

  const itensOrdenados = useMemo(() => {
    if (!ordenacao) return itensFiltrados;
    return ordenarLista(
      itensFiltrados,
      (item) => {
        switch (ordenacao.coluna) {
          case "codigo": return item.codigoBarra;
          case "nome": return item.nome;
          case "categoria": return item.tipo;
          case "descricao": return item.descricao;
          case "quantidade": return item.quantidade;
          case "preco": return item.preco;
          case "valor": return item.quantidade * item.preco;
          case "situacao": return item.quantidade === 0 ? 0 : item.quantidade <= LIMITE_ESTOQUE_BAIXO ? 1 : 2;
        }
      },
      ordenacao.direcao,
    );
  }, [itensFiltrados, ordenacao]);

  function alternarOrdenacao(coluna: ColunaOrdenacaoInventario) {
    setOrdenacao((atual) => ({
      coluna,
      direcao: atual?.coluna === coluna && atual.direcao === "desc" ? "asc" : "desc",
    }));
  }

  return (
    <section className="inventario">
      <header className="inventario-cabecalho">
        <div className="inventario-cabecalho-texto">
          <span className="inventario-cabecalho-icone">▦</span>

          <div>
            <h1 className="medium-h1">Inventário</h1>

            <p className="light-h3">
              Consulte a quantidade, o valor e a situação de cada produto em
              estoque.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="inventario-atualizar medium-h3"
          onClick={atualizarManual}
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
          className={`inventario-mensagem inventario-mensagem-${mensagem.tipo}`}
          role={mensagem.tipo === "erro" ? "alert" : "status"}
        >
          <strong>{mensagem.codigo}: </strong>
          {mensagem.texto}
        </div>
      </header>

      <div className="inventario-resumo">
        <article className="inventario-resumo-card">
          <span className="light-h3">Produtos cadastrados</span>
          <strong className="bold-h2">
            {formatarNumero(produtos.length)}
          </strong>
          <small>Itens diferentes no catálogo</small>
        </article>

        <article className="inventario-resumo-card">
          <span className="light-h3">Unidades em estoque</span>
          <strong className="bold-h2">{formatarNumero(resumo.unidades)}</strong>
          <small>Soma das quantidades disponíveis</small>
        </article>

        <article className="inventario-resumo-card">
          <span className="light-h3">Valor do inventário</span>
          <strong className="bold-h2">{formatarMoeda(resumo.valor)}</strong>
          <small>Quantidade × preço unitário</small>
        </article>

        <article
          className={`inventario-resumo-card inventario-resumo-alerta ${
            resumo.alertas > 0 ? "inventario-resumo-alerta-ativo" : ""
          }`}
        >
          <span className="light-h3">Itens em alerta</span>
          <strong className="bold-h2">
            {formatarNumero(resumo.alertas)}
          </strong>
          <small>Esgotados ou com {ESTOQUE_MINIMO} unidades ou menos</small>
        </article>
      </div>

      {erro && (
        <div className="inventario-mensagem" role="alert">
          {erro}
        </div>
      )}

      <article className="inventario-painel">
        <div className="inventario-painel-topo">
          <div>
            <h2 className="medium-h2">Posição de estoque</h2>

            <p className="light-h3">
              Consulte os saldos e zere o estoque de produtos descontinuados. O cadastro e o histórico de vendas serão preservados.
            </p>
          </div>
        </div>

        <div className="inventario-filtros">
          <div className="inventario-busca">
            <Search size={18} />
            <input
              type="search"
              value={busca}
              onChange={(evento) =>
                setFiltroSituacao(evento.target.value as "todas" | Situacao)
              }
              aria-label="Filtrar por situação"
            >
              <option value="todas">Todas as situações</option>
              <option value="disponivel">Disponível</option>
              <option value="baixo">Estoque baixo</option>
              <option value="esgotado">Esgotado</option>
            </select>
          </div>
        </div>

        <div className="inventario-tabela-container">
          <table className="inventario-tabela">
            <thead>
              <tr>
                <SortableHeader label="Código" active={ordenacao?.coluna === "codigo"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("codigo")} />
                <SortableHeader label="Produto" active={ordenacao?.coluna === "nome"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("nome")} />
                <SortableHeader label="Categoria" active={ordenacao?.coluna === "categoria"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("categoria")} />
                <SortableHeader label="Descrição" active={ordenacao?.coluna === "descricao"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("descricao")} />
                <SortableHeader label="Quantidade" active={ordenacao?.coluna === "quantidade"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("quantidade")} />
                <SortableHeader label="Preço unitário" active={ordenacao?.coluna === "preco"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("preco")} />
                <SortableHeader label="Valor em estoque" active={ordenacao?.coluna === "valor"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("valor")} />
                <SortableHeader label="Situação" active={ordenacao?.coluna === "situacao"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("situacao")} />
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td
                    colSpan={9}
                    className="inventario-sem-resultados"
                  >
                    Carregando inventário...
                  </td>
                </tr>
              ) : itensOrdenados.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="inventario-sem-resultados"
                  >
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                itensOrdenados.map((item) => {
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
                    <tr key={produto.id}>
                      <td>
                        <div className="inventario-produto">
                          <span className="inventario-produto-avatar">
                            {produto.nome.charAt(0).toUpperCase()}
                          </span>

                          <div className="inventario-produto-texto">
                            <strong>{produto.nome}</strong>

                            {produto.descricao && (
                              <small title={produto.descricao}>
                                {produto.descricao}
                              </small>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>{produto.tipo || "Não informada"}</td>
                      <td>{produto.codigo_barra || "Não informado"}</td>
                      <td className="inventario-quantidade">
                        {formatarNumero(produto.quantidade)} un.
                      </td>
                      <td>{formatarMoeda(produto.preco)}</td>
                      <td className="inventario-valor">
                        {formatarMoeda(produto.quantidade * produto.preco)}
                      </td>
                      <td>
                        <span
                          className={`inventario-situacao inventario-situacao-${situacao}`}
                        >
                          {rotuloSituacao[situacao]}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="inventario-zerar"
                          onClick={() => void zerarEstoque(item)}
                          disabled={item.quantidade <= 0 || zerandoProdutoId !== null}
                          aria-label={`Zerar estoque de ${item.nome}`}
                          title={
                            item.quantidade <= 0
                              ? "Produto já está sem estoque"
                              : "Registrar saída e zerar estoque"
                          }
                        >
                          <PackageX size={15} />
                          {zerandoProdutoId === item.id
                            ? "Zerando..."
                            : "Zerar estoque"}
                        </button>
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
