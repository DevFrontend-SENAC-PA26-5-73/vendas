import { useCallback, useEffect, useMemo, useState,} from "react";
import type { FormEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";

import "./Movimentacao.css";

const API_URL = "http://10.3.20.30:5001";
const CHAVE_HISTORICO = "historico-movimentacoes-estoque";

/* =========================
   Tipos
========================= */
  
type TipoMovimentacao = "entrada" | "saida";

type Produto = {
  id: number;
  nome: string;
  quantidade: number;
  tipo: string;
  preco: number;
};

type ItemVenda = {
  id: number;
  quantidade: number;
  preco: number;
  vendas_id: number;
  produtos_id: number;
};

type Pagamento = {
  id: number;
  vendas_id: number;
  data_pagamento?: string;
};

type FormularioEntrada = {
  produto_id: string;
  quantidade: string;
  descricao: string;
  data_movimentacao: string;
};

type MovimentacaoVisual = {
  id: string;
  tipo: TipoMovimentacao;
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
  descricao: string;
  data_movimentacao?: string;
  venda_id?: number;
};

type Mensagem = {
  tipo: "sucesso" | "erro";
  texto: string;
};

type RespostaErroApi = {
  message?: string | string[];
};

function obterDataAtual() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

const formularioInicial: FormularioEntrada = {
  produto_id: "",
  quantidade: "1",
  descricao: "",
  data_movimentacao: obterDataAtual(),
};

function carregarHistoricoLocal(): MovimentacaoVisual[] {
  try {
    const valor = localStorage.getItem(CHAVE_HISTORICO);
    if (!valor) return [];

    const dados: unknown = JSON.parse(valor);
    if (!Array.isArray(dados)) return [];

    return dados.filter((item): item is MovimentacaoVisual => {
      if (!item || typeof item !== "object") return false;
      const entrada = item as Partial<MovimentacaoVisual>;

      return (
        typeof entrada.id === "string" &&
        entrada.tipo === "entrada" &&
        typeof entrada.produto_id === "number" &&
        typeof entrada.quantidade === "number"
      );
    });
  } catch (erro) {
    console.error("Erro ao carregar histórico local:", erro);
    return [];
  }
}

function salvarHistoricoLocal(entradas: MovimentacaoVisual[]) {
  try {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(entradas));
  } catch (erro) {
    console.error("Erro ao salvar histórico local:", erro);
  }
}

function formatarNumero(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
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

function formatarData(data?: string) {
  if (!data) return "Não informada";

  const valor = data.includes("T") ? data : `${data}T00:00:00`;
  const dataConvertida = new Date(valor);

  if (Number.isNaN(dataConvertida.getTime())) return "Data inválida";

  return dataConvertida.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}


function obterProduto(produtoId: number, produtos: Produto[]) {
  return produtos.find((produto) => produto.id === produtoId);
}

async function lerResposta(resposta: Response): Promise<unknown> {
  const texto = await resposta.text();
  if (!texto) return null;

  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}

function obterMensagemErro(dados: unknown, status: number) {
  if (dados && typeof dados === "object" && "message" in dados) {
    const mensagem = (dados as RespostaErroApi).message;
    if (Array.isArray(mensagem)) return mensagem.join(", ");
    if (typeof mensagem === "string") return mensagem;
  }

  if (typeof dados === "string" && dados.trim()) return dados;
  return `Erro HTTP ${status}`;
}


function Movimentacao() {
  const [formulario, setFormulario] = useState<FormularioEntrada>({
    ...formularioInicial,
  });
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [estoque, setEstoque] = useState<Produto[]>([]);
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  const [entradasSalvas, setEntradasSalvas] =
    useState<MovimentacaoVisual[]>(carregarHistoricoLocal);
  const [entradaEmEdicao, setEntradaEmEdicao] =
    useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] =
    useState<"todos" | TipoMovimentacao>("todos");

  const produtoSelecionado = useMemo(() => {
    const id = Number(formulario.produto_id);
    return id ? produtos.find((produto) => produto.id === id) : undefined;
  }, [formulario.produto_id, produtos]);

  const precoUnitario = Number(produtoSelecionado?.preco ?? 0);
  const categoriaProduto = produtoSelecionado?.tipo ?? "Selecione um produto";
  const quantidadeInformada = Number(formulario.quantidade || 0);
  const valorTotalFormulario = Number(
    (quantidadeInformada * precoUnitario).toFixed(2),
  );

  const totalUnidadesEstoque = useMemo(
    () =>
      estoque.reduce(
        (total, produto) => total + Number(produto.quantidade || 0),
        0,
      ),
    [estoque],
  );

  const totalUnidadesVendidas = useMemo(
    () =>
      itensVenda.reduce(
        (total, item) => total + Number(item.quantidade || 0),
        0,
      ),
    [itensVenda],
  );

  const saidasAtendimento = useMemo<MovimentacaoVisual[]>(
    () =>
      itensVenda.map((item) => ({
        id: `saida-${item.id}`,
        tipo: "saida",
        produto_id: item.produtos_id,
        quantidade: Number(item.quantidade || 0),
        preco_unitario: Number(Number(item.preco || 0).toFixed(2)),
        descricao: `Saída gerada pela venda #${item.vendas_id}`,
        venda_id: item.vendas_id,
      })),
    [itensVenda],
  );

  const historicoCompleto = useMemo(
    () => [...entradasSalvas, ...saidasAtendimento],
    [entradasSalvas, saidasAtendimento],
  );

  const historicoFiltrado = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return historicoCompleto.filter((movimentacao) => {
      const produto = obterProduto(movimentacao.produto_id, produtos);
      const texto = [produto?.nome, produto?.tipo, movimentacao.descricao]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (filtroTipo === "todos" || movimentacao.tipo === filtroTipo) &&
        (!termo || texto.includes(termo))
      );
    });
  }, [busca, filtroTipo, historicoCompleto, produtos]);

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      setMensagem(null);

      const [respostaProdutos, respostaEstoque, respostaItens] =
        await Promise.all([
          fetch(`${API_URL}/produtos`),
          fetch(`${API_URL}/estoque`),
          fetch(`${API_URL}/itemvenda`),
        ]);

      if (!respostaProdutos.ok) {
        throw new Error("Não foi possível carregar os produtos.");
      }

      const dadosProdutos: unknown = await respostaProdutos.json();
      setProdutos(Array.isArray(dadosProdutos) ? (dadosProdutos as Produto[]) : []);

      if (respostaEstoque.ok) {
        const dadosEstoque: unknown = await respostaEstoque.json();
        setEstoque(Array.isArray(dadosEstoque) ? (dadosEstoque as Produto[]) : []);
      } else {
        setEstoque([]);
      }

      if (respostaItens.ok) {
        const dadosItens: unknown = await respostaItens.json();
        setItensVenda(Array.isArray(dadosItens) ? (dadosItens as ItemVenda[]) : []);
      } else {
        setItensVenda([]);
      }
    } catch (erro) {
      console.error("Erro ao carregar dados:", erro);
      setMensagem({
        tipo: "erro",
        texto:
          erro instanceof Error
            ? erro.message
            : "Não foi possível carregar os dados.",
      });
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    salvarHistoricoLocal(entradasSalvas);
  }, [entradasSalvas]);

  function alterarCampo(
    campo: keyof FormularioEntrada,
    novoValor: string,
  ) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: novoValor,
    }));
    setMensagem(null);
  }

  function limparFormulario() {
    setFormulario({
      ...formularioInicial,
      data_movimentacao: obterDataAtual(),
    });
    setEntradaEmEdicao(null);
    setMensagem(null);
  }

  function editarEntrada(movimentacao: MovimentacaoVisual) {
    if (movimentacao.tipo !== "entrada") return;

    setFormulario({
      produto_id: String(movimentacao.produto_id),
      quantidade: String(movimentacao.quantidade),
      descricao: movimentacao.descricao,
      data_movimentacao:
        movimentacao.data_movimentacao ?? obterDataAtual(),
    });
    setEntradaEmEdicao(movimentacao.id);
    setMensagem(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function excluirEntradaDoHistorico(movimentacao: MovimentacaoVisual) {
    if (movimentacao.tipo !== "entrada") return;

    const produto = obterProduto(movimentacao.produto_id, produtos);
    const nome = produto?.nome ?? `Produto #${movimentacao.produto_id}`;

    const confirmou = window.confirm(
      [
        `Excluir a entrada de ${nome} do histórico?`,
        "",
        `Quantidade registrada: ${movimentacao.quantidade}`,
        "",
        "Esta ação remove somente o registro salvo neste navegador.",
        "A quantidade do estoque na API não será alterada.",
      ].join("\n"),
    );

    if (!confirmou) return;

    setEntradasSalvas((atuais) =>
      atuais.filter((entrada) => entrada.id !== movimentacao.id),
    );

    if (entradaEmEdicao === movimentacao.id) {
      limparFormulario();
    }

    setMensagem({
      tipo: "sucesso",
      texto: "Entrada removida do histórico deste navegador.",
    });
  }

  async function cadastrarEntrada(produtoId: number, quantidade: number) {
    const resposta = await fetch(`${API_URL}/estoque`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ produto_id: produtoId, quantidade }),
    });

    const dados = await lerResposta(resposta);
    if (!resposta.ok) {
      throw new Error(obterMensagemErro(dados, resposta.status));
    }
  }

  async function atualizarEstoque(produtoId: number, quantidade: number) {
    const resposta = await fetch(`${API_URL}/estoque/${produtoId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ produto_id: produtoId, quantidade }),
    });

    const dados = await lerResposta(resposta);
    if (!resposta.ok) {
      throw new Error(obterMensagemErro(dados, resposta.status));
    }
  }

  async function salvarEntrada(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const produtoId = Number(formulario.produto_id);
    const quantidade = Number(formulario.quantidade);

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      setMensagem({ tipo: "erro", texto: "Selecione um produto." });
      return;
    }

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      setMensagem({
        tipo: "erro",
        texto: "Informe uma quantidade inteira maior que zero.",
      });
      return;
    }

    if (!produtoSelecionado) {
      setMensagem({
        tipo: "erro",
        texto: "O produto selecionado não foi encontrado.",
      });
      return;
    }

    try {
      setSalvando(true);
      setMensagem(null);

      if (entradaEmEdicao) {
        const anterior = entradasSalvas.find(
          (entrada) => entrada.id === entradaEmEdicao,
        );

        if (!anterior) {
          throw new Error("A entrada selecionada não foi encontrada.");
        }

        const estoqueAtual = Number(
          estoque.find((produto) => produto.id === produtoId)?.quantidade ?? 0,
        );
        const novaQuantidadeEstoque =
          estoqueAtual + (quantidade - anterior.quantidade);

        if (novaQuantidadeEstoque < 0) {
          throw new Error("A alteração deixaria o estoque negativo.");
        }

        await atualizarEstoque(produtoId, novaQuantidadeEstoque);

        setEntradasSalvas((atuais) =>
          atuais.map((entrada) =>
            entrada.id === entradaEmEdicao
              ? {
                  ...entrada,
                  quantidade,
                  preco_unitario: Number(precoUnitario.toFixed(2)),
                  descricao:
                    formulario.descricao.trim() ||
                    "Entrada de produto no estoque",
                  data_movimentacao: formulario.data_movimentacao,
                }
              : entrada,
          ),
        );

        setMensagem({
          tipo: "sucesso",
          texto: "Entrada atualizada com sucesso.",
        });
      } else {
        await cadastrarEntrada(produtoId, quantidade);

        const novaEntrada: MovimentacaoVisual = {
          id: `entrada-${Date.now()}`,
          tipo: "entrada",
          produto_id: produtoId,
          quantidade,
          preco_unitario: Number(precoUnitario.toFixed(2)),
          descricao:
            formulario.descricao.trim() ||
            "Entrada de produto no estoque",
          data_movimentacao: formulario.data_movimentacao,
        };

        setEntradasSalvas((atuais) => [novaEntrada, ...atuais]);
        setMensagem({
          tipo: "sucesso",
          texto: "Entrada registrada com sucesso.",
        });
      }

      await carregarDados();
      window.dispatchEvent(new CustomEvent("estoque-atualizado"));
      window.dispatchEvent(new CustomEvent("produtos-atualizados"));

      setFormulario({
        ...formularioInicial,
        data_movimentacao: obterDataAtual(),
      });
      setEntradaEmEdicao(null);
    } catch (erro) {
      console.error("Erro ao salvar entrada:", erro);
      setMensagem({
        tipo: "erro",
        texto:
          erro instanceof Error
            ? erro.message
            : "Não foi possível salvar a entrada.",
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="fluxo-caixa">
      <header className="fluxo-cabecalho">
        <div className="fluxo-cabecalho-texto">
          <span className="fluxo-cabecalho-icone">↕</span>
          <div>
            <h1 className="medium-h1">Movimentação de estoque</h1>
            <p className="light-h3">
              Registre entradas e acompanhe as saídas realizadas pelo
              atendimento.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="fluxo-botao-atualizar medium-h3"
          onClick={() => void carregarDados()}
          disabled={carregando || salvando}
        >
          {carregando ? "Atualizando..." : "Atualizar dados"}
        </button>
      </header>

      <div className="fluxo-resumo">
        <article className="fluxo-resumo-card fluxo-resumo-entrada">
          <div className="fluxo-resumo-topo">
            <span className="fluxo-resumo-icone">+</span>
            <span className="light-h3">Unidades em estoque</span>
          </div>
          <strong className="bold-h2">
            {formatarNumero(totalUnidadesEstoque)}
          </strong>
          <small>Soma atual das unidades disponíveis</small>
        </article>

        <article className="fluxo-resumo-card fluxo-resumo-saida">
          <div className="fluxo-resumo-topo">
            <span className="fluxo-resumo-icone">−</span>
            <span className="light-h3">Unidades vendidas</span>
          </div>
          <strong className="bold-h2">
            {formatarNumero(totalUnidadesVendidas)}
          </strong>
          <small>Saídas registradas pelo atendimento</small>
        </article>
      </div>

      <article className="fluxo-painel">
        <div className="fluxo-painel-cabecalho">
          <div>
            <h2 className="medium-h2">
              {entradaEmEdicao ? "Editar entrada" : "Nova entrada de produto"}
            </h2>
            <p className="light-h3">
              {entradaEmEdicao
                ? "Altere os dados da entrada selecionada."
                : "Selecione um produto e informe a quantidade recebida."}
            </p>
          </div>

          {entradaEmEdicao && (
            <span className="fluxo-status-edicao medium-h3">Em edição</span>
          )}
        </div>

        <form className="fluxo-formulario" onSubmit={salvarEntrada}>
          <div className="fluxo-campos">
            <label className="fluxo-campo">
              <span className="medium-h3">Produto</span>
              <select
                value={formulario.produto_id}
                onChange={(evento) =>
                  alterarCampo("produto_id", evento.target.value)
                }
                disabled={carregando || Boolean(entradaEmEdicao)}
                required
              >
                <option value="">
                  {carregando ? "Carregando produtos..." : "Selecione um produto"}
                </option>
                {produtos.map((produto) => (
                  <option key={produto.id} value={String(produto.id)}>
                    {produto.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="fluxo-campo">
              <span className="medium-h3">Quantidade recebida</span>
              <input
                type="number"
                min="1"
                step="1"
                value={formulario.quantidade}
                onChange={(evento) =>
                  alterarCampo("quantidade", evento.target.value)
                }
                required
              />
            </label>

            <label className="fluxo-campo">
              <span className="medium-h3">Data da entrada</span>
              <input
                type="date"
                value={formulario.data_movimentacao}
                onChange={(evento) =>
                  alterarCampo("data_movimentacao", evento.target.value)
                }
                required
              />
            </label>

            <div className="fluxo-campo">
              <span className="medium-h3">Categoria</span>
              <div className="fluxo-informacao">{categoriaProduto}</div>
            </div>

            <div className="fluxo-campo">
              <span className="medium-h3">Preço unitário</span>
              <div className="fluxo-informacao">
                {produtoSelecionado
                  ? formatarMoeda(precoUnitario)
                  : "Selecione um produto"}
              </div>
            </div>

            <div className="fluxo-campo">
              <span className="medium-h3">Valor total</span>
              <div className="fluxo-informacao fluxo-informacao-valor">
                {formatarMoeda(valorTotalFormulario)}
              </div>
            </div>

            <label className="fluxo-campo fluxo-campo-descricao">
              <span className="medium-h3">Descrição</span>
              <textarea
                rows={3}
                value={formulario.descricao}
                onChange={(evento) =>
                  alterarCampo("descricao", evento.target.value)
                }
                placeholder="Ex.: Reposição do estoque"
              />
            </label>
          </div>

          {mensagem && (
            <div
              className={`fluxo-mensagem ${
                mensagem.tipo === "sucesso"
                  ? "fluxo-mensagem-sucesso"
                  : "fluxo-mensagem-erro"
              }`}
              role="alert"
            >
              {mensagem.texto}
            </div>
          )}

          <div className="fluxo-acoes">
            <button
              type="button"
              className="fluxo-botao-cancelar medium-h3"
              onClick={limparFormulario}
              disabled={salvando}
            >
              {entradaEmEdicao ? "Cancelar edição" : "Limpar"}
            </button>

            <button
              type="submit"
              className="fluxo-botao-salvar medium-h3"
              disabled={salvando}
            >
              {salvando
                ? "Salvando..."
                : entradaEmEdicao
                  ? "Atualizar entrada"
                  : "Registrar entrada"}
            </button>
          </div>
        </form>
      </article>

      <article className="fluxo-painel">
        <div className="fluxo-historico-topo">
          <div>
            <h2 className="medium-h2">Histórico de movimentações</h2>
            <p className="light-h3">
              Entradas locais podem ser editadas ou removidas do histórico.
            </p>
          </div>

          <div className="fluxo-filtros">
            <input
              type="search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar produto"
            />
            <select
              value={filtroTipo}
              onChange={(evento) =>
                setFiltroTipo(evento.target.value as "todos" | TipoMovimentacao)
              }
            >
              <option value="todos">Todas</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas</option>
            </select>
          </div>
        </div>

        <div className="fluxo-tabela-container">
          <table className="fluxo-tabela">
            <thead>
              <tr>
                <th>Movimentação</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Data</th>
                <th>Quantidade</th>
                <th>Preço unitário</th>
                <th>Valor total</th>
                <th className="fluxo-coluna-acoes">Ações</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={9} className="fluxo-tabela-vazia">
                    Carregando dados...
                  </td>
                </tr>
              ) : historicoFiltrado.length === 0 ? (
                <tr>
                  <td colSpan={9} className="fluxo-tabela-vazia">
                    Nenhuma movimentação encontrada.
                  </td>
                </tr>
              ) : (
                historicoFiltrado.map((movimentacao) => {
                  const produto = obterProduto(movimentacao.produto_id, produtos);
                  const nome = produto?.nome ?? `Produto #${movimentacao.produto_id}`;
                  const categoria = produto?.tipo ?? "Não informada";
                  const total = movimentacao.quantidade * movimentacao.preco_unitario;

                  return (
                    <tr
                      key={movimentacao.id}
                      className={
                        entradaEmEdicao === movimentacao.id
                          ? "fluxo-linha-em-edicao"
                          : ""
                      }
                    >
                      <td>
                        <span className={`fluxo-status fluxo-status-${movimentacao.tipo}`}>
                          {movimentacao.tipo === "entrada" ? "Entrada" : "Saída"}
                        </span>
                      </td>
                      <td>
                        <div className="fluxo-produto">
                          <span className="fluxo-produto-avatar">
                            {nome.charAt(0).toUpperCase()}
                          </span>
                          <strong>{nome}</strong>
                        </div>
                      </td>
                      <td>{categoria}</td>
                      <td>{movimentacao.descricao}</td>
                      <td>{formatarData(movimentacao.data_movimentacao)}</td>
                      <td>{formatarNumero(movimentacao.quantidade)} un.</td>
                      <td>{formatarMoeda(movimentacao.preco_unitario)}</td>
                      <td className="fluxo-valor-total">{formatarMoeda(total)}</td>
                      <td>
                        <div className="fluxo-acoes-linha">
                          {movimentacao.tipo === "entrada" ? (
                            <>
                              <button
                                type="button"
                                className="fluxo-acao fluxo-editar"
                                onClick={() => editarEntrada(movimentacao)}
                                aria-label={`Editar entrada de ${nome}`}
                                title="Editar entrada"
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                type="button"
                                className="fluxo-acao fluxo-excluir"
                                onClick={() => excluirEntradaDoHistorico(movimentacao)}
                                aria-label={`Excluir entrada de ${nome}`}
                                title="Excluir do histórico"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <span className="fluxo-sem-acao">Automática</span>
                          )}
                        </div>
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

export default Movimentacao;