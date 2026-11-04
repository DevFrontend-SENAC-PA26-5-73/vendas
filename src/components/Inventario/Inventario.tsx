import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import axios from "axios";
import {
  PackageX,
  RefreshCw,
  Search,
} from "lucide-react";

import "./Inventario.css";

import { API_BASE_URL } from "../../lib/api";
import { ordenarLista } from "../../lib/ordenacao";
import type { DirecaoOrdenacao } from "../../lib/ordenacao";
import SortableHeader from "../SortableHeader/SortableHeader";

const API = {
  produtos: `${API_BASE_URL}/produtos`,
  estoque: `${API_BASE_URL}/estoque`,
  fluxoCaixa: `${API_BASE_URL}/fluxo-caixa`,
};

const ESTOQUE_MINIMO = 5;

type ProdutoInventario = {
  id: number;
  nome: string;
  descricao: string;
  codigoBarra: string;
  tipo: string;
  quantidade: number;
  preco: number;
};

type Situacao = "disponivel" | "baixo" | "esgotado";
type FiltroSituacao = "todas" | Situacao;
type ColunaOrdenacao =
  | "codigo"
  | "nome"
  | "categoria"
  | "descricao"
  | "quantidade"
  | "preco"
  | "valor"
  | "situacao";

type Mensagem = {
  tipo: "erro" | "info" | "sucesso";
  codigo: string;
  texto: string;
};

type Registro = Record<string, unknown>;

const rotuloSituacao: Record<Situacao, string> = {
  disponivel: "Disponível",
  baixo: "Estoque baixo",
  esgotado: "Esgotado",
};

function normalizarLista(dados: unknown): Registro[] {
  if (Array.isArray(dados)) {
    return dados.filter(
      (item): item is Registro =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
  }

  if (!dados || typeof dados !== "object") {
    return [];
  }

  const objeto = dados as Registro;
  for (const chave of ["data", "produtos", "estoque", "items", "itens"]) {
    if (objeto[chave] !== undefined) {
      const lista = normalizarLista(objeto[chave]);
      if (lista.length > 0) return lista;
    }
  }

  return [];
}

function texto(valor: unknown, padrao = ""): string {
  return valor === null || valor === undefined || valor === ""
    ? padrao
    : String(valor);
}

function numero(valor: unknown): number {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatarNumero(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function classificarEstoque(quantidade: number): Situacao {
  if (quantidade <= 0) return "esgotado";
  if (quantidade <= ESTOQUE_MINIMO) return "baixo";
  return "disponivel";
}

function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function diagnosticarErro(erro: unknown): Mensagem {
  if (axios.isAxiosError(erro)) {
    if (!erro.response) {
      return {
        tipo: "erro",
        codigo: "INV-N001",
        texto: "A API não respondeu. Verifique a rede e tente novamente.",
      };
    }

    const resposta = erro.response.data as
      | { message?: unknown; error?: unknown }
      | string
      | null;
    const detalhe =
      typeof resposta === "string"
        ? resposta
        : resposta && typeof resposta === "object"
          ? resposta.message ?? resposta.error
          : undefined;

    return {
      tipo: "erro",
      codigo: `INV-A${erro.response.status}`,
      texto:
        Array.isArray(detalhe)
          ? detalhe.map(String).join(", ")
          : typeof detalhe === "string"
            ? detalhe
            : `A API respondeu com erro ${erro.response.status}.`,
    };
  }

  return {
    tipo: "erro",
    codigo: "INV-U001",
    texto:
      erro instanceof Error
        ? erro.message
        : "Erro inesperado ao carregar o inventário.",
  };
}

function Inventario({ buscaGlobal }: { buscaGlobal: string }) {
  const [itens, setItens] = useState<ProdutoInventario[]>([]);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [filtroSituacao, setFiltroSituacao] =
    useState<FiltroSituacao>("todas");
  const [carregando, setCarregando] = useState(true);
  const [zerandoProdutoId, setZerandoProdutoId] = useState<number | null>(null);
  const [ordenacao, setOrdenacao] = useState<{
    coluna: ColunaOrdenacao;
    direcao: DirecaoOrdenacao;
  } | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const atualizacaoLocal = useRef(false);

  const carregarInventario = useCallback(async (): Promise<boolean> => {
    try {
      const [respostaProdutos, respostaEstoque] = await Promise.allSettled([
        axios.get<unknown>(API.produtos, { timeout: 15000 }),
        axios.get<unknown>(API.estoque, { timeout: 15000 }),
      ]);

      if (respostaProdutos.status === "rejected") {
        throw respostaProdutos.reason;
      }

      const produtos = normalizarLista(respostaProdutos.value.data);
      const estoque =
        respostaEstoque.status === "fulfilled"
          ? normalizarLista(respostaEstoque.value.data)
          : [];
      const quantidadesEstoque = new Map<number, number>();

      for (const registro of estoque) {
        const id = numero(registro.produto_id ?? registro.id_produto ?? registro.id);
        const quantidade = numero(registro.quantidade);
        if (id > 0) quantidadesEstoque.set(id, quantidade);
      }

      const inventario = produtos.map((produto): ProdutoInventario => {
        const id = numero(produto.id);
        return {
          id,
          nome: texto(produto.nome, "Produto sem nome"),
          descricao: texto(produto.descricao),
          codigoBarra: texto(
            produto.codigo_barra ?? produto.codigoBarra,
            "Não informado",
          ),
          tipo: texto(produto.tipo, "Não informada"),
          quantidade:
            quantidadesEstoque.get(id) ?? numero(produto.quantidade),
          preco: numero(produto.preco),
        };
      });

      inventario.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      setItens(inventario);
      setMensagem(null);
      return true;
    } catch (erro) {
      console.error("Erro ao carregar inventário:", erro);
      setMensagem(diagnosticarErro(erro));
      return false;
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void carregarInventario();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [carregarInventario]);

  useEffect(() => {
    const atualizar = () => {
      if (atualizacaoLocal.current) return;
      void carregarInventario();
    };
    window.addEventListener("produtos-atualizados", atualizar);
    window.addEventListener("estoque-atualizado", atualizar);

    return () => {
      window.removeEventListener("produtos-atualizados", atualizar);
      window.removeEventListener("estoque-atualizado", atualizar);
    };
  }, [carregarInventario]);

  const categorias = useMemo(
    () =>
      Array.from(new Set(itens.map((item) => item.tipo.trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [itens],
  );

  const resumo = useMemo(
    () =>
      itens.reduce(
        (total, item) => {
          const situacao = classificarEstoque(item.quantidade);
          return {
            unidades: total.unidades + item.quantidade,
            valor: total.valor + item.quantidade * item.preco,
            alertas: total.alertas + (situacao === "disponivel" ? 0 : 1),
          };
        },
        { unidades: 0, valor: 0, alertas: 0 },
      ),
    [itens],
  );

  const itensFiltrados = useMemo(() => {
    const termos = [busca, buscaGlobal]
      .map(normalizarTexto)
      .filter(Boolean);

    return itens.filter((item) => {
      const campos = [
        item.nome,
        item.codigoBarra,
        item.tipo,
        item.descricao,
      ].map(normalizarTexto);
      const correspondeBusca = termos.every((termoAtual) =>
        campos.some((campo) => campo.includes(termoAtual)),
      );
      const correspondeCategoria =
        categoria === "todas" || item.tipo === categoria;
      const correspondeSituacao =
        filtroSituacao === "todas" ||
        classificarEstoque(item.quantidade) === filtroSituacao;

      return (
        correspondeBusca && correspondeCategoria && correspondeSituacao
      );
    });
  }, [itens, busca, buscaGlobal, categoria, filtroSituacao]);

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
          case "situacao": return classificarEstoque(item.quantidade);
        }
      },
      ordenacao.direcao,
    );
  }, [itensFiltrados, ordenacao]);

  function alternarOrdenacao(coluna: ColunaOrdenacao) {
    setOrdenacao((atual) => ({
      coluna,
      direcao:
        atual?.coluna === coluna && atual.direcao === "desc" ? "asc" : "desc",
    }));
  }

  async function zerarEstoque(item: ProdutoInventario) {
    if (item.quantidade <= 0 || zerandoProdutoId !== null) return;

    const confirmado = window.confirm(
      `Registrar a saída de ${formatarNumero(item.quantidade)} unidade(s) de "${item.nome}" e zerar o estoque?`,
    );
    if (!confirmado) return;

    setZerandoProdutoId(item.id);
    setMensagem(null);

    try {
      await axios.post(API.fluxoCaixa, {
        tipo: "saida",
        produto_id: item.id,
        quantidade: item.quantidade,
        preco_unitario: item.preco,
        descricao: "Ajuste negativo realizado pelo inventário",
      });
      atualizacaoLocal.current = true;
      try {
        window.dispatchEvent(new CustomEvent("estoque-atualizado"));
        if (await carregarInventario()) {
          setMensagem({
            tipo: "sucesso",
            codigo: "INV-S001",
            texto: `O estoque de "${item.nome}" foi zerado.`,
          });
        }
      } finally {
        atualizacaoLocal.current = false;
      }
    } catch (erro) {
      setMensagem(diagnosticarErro(erro));
    } finally {
      setZerandoProdutoId(null);
    }
  }

  return (
    <section className="inventario">
      <header className="inventario-cabecalho">
        <div className="inventario-cabecalho-texto">
          <span className="inventario-cabecalho-icone" aria-hidden="true">
            ▦
          </span>
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
          className="inventario-botao-atualizar medium-h3"
          onClick={() => {
            setCarregando(true);
            void carregarInventario();
          }}
          disabled={carregando}
        >
          <RefreshCw size={17} aria-hidden="true" />
          {carregando ? "Atualizando..." : "Atualizar inventário"}
        </button>
      </header>

      {mensagem && (
        <div
          className={`inventario-mensagem ${
            mensagem.tipo === "sucesso" ? "inventario-mensagem-sucesso" : ""
          }`}
          role={mensagem.tipo === "erro" ? "alert" : "status"}
        >
          <strong>{mensagem.codigo}: </strong>
          {mensagem.texto}
        </div>
      )}

      <div className="inventario-resumo">
        <article className="inventario-resumo-card">
          <span className="light-h3">Produtos cadastrados</span>
          <strong className="bold-h2">{formatarNumero(itens.length)}</strong>
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
          <strong className="bold-h2">{formatarNumero(resumo.alertas)}</strong>
          <small>Esgotados ou com {ESTOQUE_MINIMO} unidades ou menos</small>
        </article>
      </div>

      <article className="inventario-painel">
        <div className="inventario-painel-topo">
          <div>
            <h2 className="medium-h2">Posição de estoque</h2>
            <p className="light-h3">
              Consulte os saldos e zere o estoque de produtos descontinuados.
            </p>
          </div>
          <div className="inventario-filtros">
            <label className="inventario-busca">
              <Search
                className="inventario-busca-icone"
                size={17}
                aria-hidden="true"
              />
              <input
                type="search"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Pesquisar produtos..."
                aria-label="Pesquisar produtos no inventário"
              />
            </label>
            <select
              value={categoria}
              onChange={(evento) => setCategoria(evento.target.value)}
              aria-label="Filtrar por categoria"
            >
              <option value="todas">Todas as categorias</option>
              {categorias.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <select
              value={filtroSituacao}
              onChange={(evento) =>
                setFiltroSituacao(evento.target.value as FiltroSituacao)
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
                  <td colSpan={9} className="inventario-tabela-vazia">
                    Carregando inventário...
                  </td>
                </tr>
              ) : itensOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="inventario-tabela-vazia">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                itensOrdenados.map((item) => {
                  const situacao = classificarEstoque(item.quantidade);
                  return (
                    <tr key={item.id}>
                      <td className="inventario-codigo">{item.codigoBarra}</td>
                      <td>
                        <div className="inventario-produto">
                          <span className="inventario-produto-avatar">
                            {item.nome.charAt(0).toUpperCase()}
                          </span>
                          <div className="inventario-produto-texto">
                            <strong>{item.nome}</strong>
                            {item.descricao && <small title={item.descricao}>{item.descricao}</small>}
                          </div>
                        </div>
                      </td>
                      <td>{item.tipo}</td>
                      <td title={item.descricao}>{item.descricao || "Sem descrição"}</td>
                      <td className="inventario-quantidade">{formatarNumero(item.quantidade)} un.</td>
                      <td>{formatarMoeda(item.preco)}</td>
                      <td className="inventario-valor">{formatarMoeda(item.quantidade * item.preco)}</td>
                      <td>
                        <span className={`inventario-situacao inventario-situacao-${situacao}`}>
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
                          title={item.quantidade <= 0 ? "Produto já está sem estoque" : "Registrar saída e zerar estoque"}
                        >
                          <PackageX size={15} aria-hidden="true" />
                          {zerandoProdutoId === item.id ? "Zerando..." : "Zerar estoque"}
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
