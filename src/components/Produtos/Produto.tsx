import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Pencil, Search, Trash2 } from "lucide-react";

import Button from "../Button/Button";
import "./Produtos.css";

interface IProduto {
  id: number;
  nome: string;
  descricao: string | null;
  codigo_barra: string | null;
  quantidade: number;
  tipo: string;
  preco: number;
}

type FormularioProduto = {
  nome: string;
  descricao: string;
  codigo_barra: string;
  quantidade: string;
  tipo: string;
  preco: string;
};

type PayloadProduto = {
  nome: string;
  descricao: string;
  codigo_barra: string;
  quantidade: number;
  tipo: string;
  preco: number;
};

type Mensagem = {
  tipo: "sucesso" | "erro" | "info";
  texto: string;
  codigo?: string;
};

type ApiErro = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

const API_URL = "http://10.3.20.30:5001/produtos";

const formularioInicial: FormularioProduto = {
  nome: "",
  descricao: "",
  codigo_barra: "",
  quantidade: "0",
  tipo: "",
  preco: "",
};

/* ============================================================
   Códigos de diagnóstico usados pela tela

   PROD-E001: nome vazio
   PROD-E002: descrição vazia
   PROD-E003: categoria vazia
   PROD-E004: quantidade inválida
   PROD-E005: preço inválido
   PROD-E006: código interno inválido
   PROD-A400: API recusou o corpo enviado
   PROD-A404: produto/rota não encontrado
   PROD-A409: conflito de código ou cadastro duplicado
   PROD-A500: falha interna no backend
   PROD-N001: erro de rede/CORS/servidor indisponível
   PROD-U001: erro inesperado no frontend
============================================================ */

function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

function normalizarProduto(dado: unknown): IProduto | null {
  if (!dado || typeof dado !== "object") return null;

  const produto = dado as Partial<IProduto>;
  const id = Number(produto.id);

  if (!Number.isFinite(id) || typeof produto.nome !== "string") {
    return null;
  }

  return {
    id,
    nome: produto.nome,
    descricao: typeof produto.descricao === "string" ? produto.descricao : "",
    codigo_barra:
      typeof produto.codigo_barra === "string"
        ? produto.codigo_barra
        : produto.codigo_barra != null
          ? String(produto.codigo_barra)
          : "",
    quantidade: Number(produto.quantidade ?? 0),
    tipo: typeof produto.tipo === "string" ? produto.tipo : "",
    preco: Number(produto.preco ?? 0),
  };
}

function normalizarProdutos(dados: unknown): IProduto[] {
  let lista: unknown[] = [];

  if (Array.isArray(dados)) {
    lista = dados;
  } else if (dados && typeof dados === "object" && "produtos" in dados) {
    const resposta = dados as { produtos?: unknown };
    if (Array.isArray(resposta.produtos)) lista = resposta.produtos;
  } else if (dados && typeof dados === "object" && "data" in dados) {
    const resposta = dados as { data?: unknown };
    if (Array.isArray(resposta.data)) lista = resposta.data;
  }

  return lista
    .map(normalizarProduto)
    .filter((produto): produto is IProduto => produto !== null);
}

function obterPrefixoCategoria(categoria: string, nome: string) {
  const texto = normalizarTexto(`${categoria} ${nome}`);

  if (texto.includes("camisa") || texto.includes("camiseta") || texto.includes("polo")) {
    return "110";
  }

  if (texto.includes("calca") || texto.includes("bermuda") || texto.includes("short")) {
    return "120";
  }

  if (
    texto.includes("tenis") ||
    texto.includes("sapato") ||
    texto.includes("sandalia") ||
    texto.includes("calcado") ||
    texto.includes("bota")
  ) {
    return "130";
  }

  if (
    texto.includes("bone") ||
    texto.includes("chapeu") ||
    texto.includes("cinto") ||
    texto.includes("bolsa") ||
    texto.includes("carteira") ||
    texto.includes("acessorio")
  ) {
    return "140";
  }

  if (texto.includes("vestido") || texto.includes("saia")) return "150";

  if (texto.includes("casaco") || texto.includes("jaqueta") || texto.includes("moletom")) {
    return "160";
  }

  if (texto.includes("roupa") || texto.includes("vestuario")) return "170";

  return "900";
}

function gerarDigitosAleatorios(quantidade: number) {
  const valores = new Uint32Array(quantidade);

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(valores);
    return Array.from(valores, (valor) => String(valor % 10)).join("");
  }

  return Array.from(
    { length: quantidade },
    () => String(Math.floor(Math.random() * 10)),
  ).join("");
}

function gerarCodigoUnico(categoria: string, nome: string, produtos: IProduto[]) {
  const prefixo = obterPrefixoCategoria(categoria, nome);

  // 3 dígitos do prefixo + 10 aleatórios = 13 dígitos.
  for (let tentativa = 0; tentativa < 100; tentativa += 1) {
    const codigo = `${prefixo}${gerarDigitosAleatorios(10)}`;
    const existe = produtos.some(
      (produto) => String(produto.codigo_barra ?? "") === codigo,
    );

    if (!existe) return codigo;
  }

  return `${prefixo}${Date.now().toString().slice(-10).padStart(10, "0")}`;
}

function formatarMoeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatarQuantidade(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function lerMensagemApi(dados: unknown) {
  if (!dados || typeof dados !== "object") {
    return typeof dados === "string" ? dados : "";
  }

  const erro = dados as ApiErro;

  if (Array.isArray(erro.message)) return erro.message.join(", ");
  if (typeof erro.message === "string") return erro.message;
  if (typeof erro.error === "string") return erro.error;

  return "";
}

function diagnosticarErro(erro: unknown, operacao: "listar" | "salvar" | "excluir"): Mensagem {
  if (!axios.isAxiosError(erro)) {
    return {
      tipo: "erro",
      codigo: "PROD-U001",
      texto: erro instanceof Error ? erro.message : "Erro inesperado no frontend.",
    };
  }

  if (!erro.response) {
    return {
      tipo: "erro",
      codigo: "PROD-N001",
      texto:
        "A API não respondeu. Verifique a conexão, o endereço da API e possíveis bloqueios de CORS.",
    };
  }

  const status = erro.response.status;
  const mensagemApi = lerMensagemApi(erro.response.data);

  if (status === 400) {
    return {
      tipo: "erro",
      codigo: "PROD-A400",
      texto: mensagemApi || "A API recusou os dados enviados.",
    };
  }

  if (status === 404) {
    return {
      tipo: "erro",
      codigo: "PROD-A404",
      texto: mensagemApi || "Produto ou rota da API não encontrado.",
    };
  }

  if (status === 409) {
    return {
      tipo: "erro",
      codigo: "PROD-A409",
      texto: mensagemApi || "Conflito ao salvar. Verifique se o código já existe.",
    };
  }

  if (status === 500) {
    return {
      tipo: "erro",
      codigo: "PROD-A500",
      texto:
        mensagemApi ||
        `O backend falhou ao ${operacao} o produto. O payload e a resposta foram registrados no console.`,
    };
  }

  return {
    tipo: "erro",
    codigo: `PROD-A${status}`,
    texto: mensagemApi || `A API respondeu com o status ${status}.`,
  };
}

function avisarOutrasAbas() {
  window.dispatchEvent(new CustomEvent("produtos-atualizados"));
  window.dispatchEvent(new CustomEvent("estoque-atualizado"));
}

function Produtos() {
  const [produtos, setProdutos] = useState<IProduto[]>([]);
  const [formulario, setFormulario] = useState<FormularioProduto>({
    ...formularioInicial,
  });
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<number | null>(null);
  const [produtoEmExclusao, setProdutoEmExclusao] = useState<number | null>(null);
  const [filtro, setFiltro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);

  const buscarProdutos = useCallback(async () => {
    try {
      setCarregando(true);

      const resposta = await axios.get<unknown>(API_URL, {
        headers: { Accept: "application/json" },
        timeout: 15000,
      });

      setProdutos(normalizarProdutos(resposta.data));
    } catch (erro) {
      console.group("[PRODUTOS] Falha no GET /produtos");
      console.error(erro);
      if (axios.isAxiosError(erro)) {
        console.log("URL:", erro.config?.url);
        console.log("Status:", erro.response?.status);
        console.log("Resposta:", erro.response?.data);
      }
      console.groupEnd();

      setProdutos([]);
      setMensagem(diagnosticarErro(erro, "listar"));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void buscarProdutos();
  }, [buscarProdutos]);

  useEffect(() => {
    function atualizarProdutos() {
      void buscarProdutos();
    }

    window.addEventListener("produtos-atualizados", atualizarProdutos);
    window.addEventListener("estoque-atualizado", atualizarProdutos);

    return () => {
      window.removeEventListener("produtos-atualizados", atualizarProdutos);
      window.removeEventListener("estoque-atualizado", atualizarProdutos);
    };
  }, [buscarProdutos]);

  const produtosFiltrados = useMemo(() => {
    const termo = filtro.trim().toLowerCase();

    if (!termo) return produtos;

    return produtos.filter((produto) =>
      [
        produto.id,
        produto.nome,
        produto.descricao,
        produto.codigo_barra,
        produto.tipo,
        produto.quantidade,
        produto.preco,
      ].some((campo) => String(campo ?? "").toLowerCase().includes(termo)),
    );
  }, [filtro, produtos]);

  // CORREÇÃO PRINCIPAL: o nome da propriedade precisa ser dinâmico.
  function alterarCampo(campo: keyof FormularioProduto, valor: string) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: valor,
    }));

    setMensagem(null);
  }

  function limparFormulario() {
    setFormulario({ ...formularioInicial });
    setProdutoEmEdicao(null);
    setMensagem(null);
  }

  function editarProduto(produto: IProduto) {
    setFormulario({
      nome: produto.nome ?? "",
      descricao: produto.descricao ?? "",
      codigo_barra: produto.codigo_barra ?? "",
      quantidade: String(produto.quantidade ?? 0),
      tipo: produto.tipo ?? "",
      preco: String(Number(produto.preco ?? 0).toFixed(2)),
    });

    setProdutoEmEdicao(produto.id);
    setMensagem(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function criarPayload(): PayloadProduto {
    const nome = formulario.nome.trim();
    const descricao = formulario.descricao.trim();
    const tipo = formulario.tipo.trim();
    const quantidade = Number(formulario.quantidade);
    const preco = Number(formulario.preco.replace(",", "."));

    if (!nome) throw Object.assign(new Error("Informe o nome do produto."), { codigo: "PROD-E001" });
    if (!descricao) throw Object.assign(new Error("Informe a descrição do produto."), { codigo: "PROD-E002" });
    if (!tipo) throw Object.assign(new Error("Informe a categoria do produto."), { codigo: "PROD-E003" });

    if (!Number.isInteger(quantidade) || quantidade < 0) {
      throw Object.assign(
        new Error("A quantidade deve ser inteira e igual ou maior que zero."),
        { codigo: "PROD-E004" },
      );
    }

    if (!Number.isFinite(preco) || preco <= 0) {
      throw Object.assign(new Error("Informe um preço maior que zero."), { codigo: "PROD-E005" });
    }

    const codigoExistente = formulario.codigo_barra.trim();
    const codigoBarra =
      produtoEmEdicao !== null && codigoExistente
        ? codigoExistente
        : gerarCodigoUnico(tipo, nome, produtos);

    if (!/^\d{13}$/.test(codigoBarra)) {
      throw Object.assign(new Error("O código interno precisa ter 13 dígitos."), { codigo: "PROD-E006" });
    }

    return {
      nome,
      descricao,
      codigo_barra: codigoBarra,
      quantidade,
      tipo,
      preco: Number(preco.toFixed(2)),
    };
  }

  async function salvarProduto() {
    if (salvando) return;

    try {
      const payload = criarPayload();
      const editando = produtoEmEdicao !== null;
      const metodo = editando ? "PATCH" : "POST";
      const url = editando ? `${API_URL}/${produtoEmEdicao}` : API_URL;

      setSalvando(true);
      setMensagem(null);

      console.group(`[PRODUTOS] ${metodo} ${url}`);
      console.log("Payload:", payload);
      console.log("Tipos:", {
        nome: typeof payload.nome,
        descricao: typeof payload.descricao,
        codigo_barra: typeof payload.codigo_barra,
        quantidade: typeof payload.quantidade,
        tipo: typeof payload.tipo,
        preco: typeof payload.preco,
      });
      console.groupEnd();

      const configuracao = {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 15000,
      };

      if (editando) {
        await axios.patch(url, payload, configuracao);
      } else {
        await axios.post(url, payload, configuracao);
      }

      setFormulario({ ...formularioInicial });
      setProdutoEmEdicao(null);
      await buscarProdutos();
      avisarOutrasAbas();

      setMensagem({
        tipo: "sucesso",
        codigo: editando ? "PROD-S002" : "PROD-S001",
        texto: editando
          ? "Produto atualizado com sucesso."
          : "Produto cadastrado com sucesso.",
      });
    } catch (erro) {
      console.group("[PRODUTOS] Erro ao salvar");
      console.error(erro);

      if (axios.isAxiosError(erro)) {
        console.log("Método:", erro.config?.method);
        console.log("URL:", erro.config?.url);
        console.log("Status:", erro.response?.status);
        console.log("Resposta:", erro.response?.data);
        console.log("Corpo enviado:", erro.config?.data);
      }
      console.groupEnd();

      if (erro instanceof Error && "codigo" in erro) {
        setMensagem({
          tipo: "erro",
          codigo: String((erro as Error & { codigo: string }).codigo),
          texto: erro.message,
        });
      } else {
        setMensagem(diagnosticarErro(erro, "salvar"));
      }
    } finally {
      setSalvando(false);
    }
  }

  async function excluirProduto(produto: IProduto) {
    const confirmou = window.confirm(
      `Deseja realmente excluir o produto "${produto.nome}"?`,
    );

    if (!confirmou) return;

    try {
      setProdutoEmExclusao(produto.id);
      setMensagem(null);

      await axios.delete(`${API_URL}/${produto.id}`, {
        headers: { Accept: "application/json" },
        timeout: 15000,
      });

      if (produtoEmEdicao === produto.id) limparFormulario();

      await buscarProdutos();
      avisarOutrasAbas();

      setMensagem({
        tipo: "sucesso",
        codigo: "PROD-S003",
        texto: "Produto excluído com sucesso.",
      });
    } catch (erro) {
      console.group("[PRODUTOS] Erro ao excluir");
      console.error(erro);
      if (axios.isAxiosError(erro)) {
        console.log("URL:", erro.config?.url);
        console.log("Status:", erro.response?.status);
        console.log("Resposta:", erro.response?.data);
      }
      console.groupEnd();

      setMensagem(diagnosticarErro(erro, "excluir"));
    } finally {
      setProdutoEmExclusao(null);
    }
  }

  return (
    <section className="produtos">
      <div className="produtos-cadastro">
        <header className="produtos-cabecalho">
          <div>
            <h1 className="medium-h1">
              {produtoEmEdicao !== null ? "Editar produto" : "Cadastro de produto"}
            </h1>
            <p className="light-h3">
              {produtoEmEdicao !== null
                ? "Altere as informações do produto selecionado."
                : "Preencha as informações para cadastrar um produto."}
            </p>
          </div>

          <span className="produtos-status medium-h3">
            {produtoEmEdicao !== null ? "Em edição" : "Novo produto"}
          </span>
        </header>

        <div className="produtos-formulario">
          <div className="produto-campo produto-campo-nome">
            <label className="medium-h3" htmlFor="produto-nome">
              Nome do produto
            </label>
            <input
              id="produto-nome"
              value={formulario.nome}
              onChange={(evento) => alterarCampo("nome", evento.target.value)}
              placeholder="Ex.: Camisa polo"
            />
          </div>

          <div className="produto-campo">
            <label className="medium-h3" htmlFor="produto-codigo">
              Código interno
            </label>
            <input
              id="produto-codigo"
              value={
                produtoEmEdicao !== null
                  ? formulario.codigo_barra
                  : "Gerado automaticamente ao salvar"
              }
              readOnly
            />
            <small className="produto-codigo-ajuda">
              Prefixos: camisa 110, calça 120, calçado 130, acessório 140.
            </small>
          </div>

          <div className="produto-campo">
            <label className="medium-h3" htmlFor="produto-categoria">
              Categoria
            </label>
            <input
              id="produto-categoria"
              value={formulario.tipo}
              onChange={(evento) => alterarCampo("tipo", evento.target.value)}
              placeholder="Ex.: Camisas"
            />
          </div>

          <div className="produto-campo">
            <label className="medium-h3" htmlFor="produto-quantidade">
              Quantidade
            </label>
            <input
              id="produto-quantidade"
              type="number"
              min="0"
              step="1"
              value={formulario.quantidade}
              onChange={(evento) => alterarCampo("quantidade", evento.target.value)}
              placeholder="Ex.: 100"
            />
          </div>

          <div className="produto-campo produto-campo-descricao">
            <label className="medium-h3" htmlFor="produto-descricao">
              Descrição
            </label>
            <textarea
              id="produto-descricao"
              rows={3}
              value={formulario.descricao}
              onChange={(evento) => alterarCampo("descricao", evento.target.value)}
              placeholder="Ex.: Camisa polo de algodão, cor preta"
            />
          </div>

          <div className="produto-campo">
            <label className="medium-h3" htmlFor="produto-preco">
              Valor
            </label>
            <div className="produto-campo-moeda">
              <span>R$</span>
              <input
                id="produto-preco"
                type="number"
                min="0.01"
                step="0.01"
                value={formulario.preco}
                onChange={(evento) => alterarCampo("preco", evento.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>
        </div>

        {mensagem && (
          <div
            className={`produtos-mensagem ${
              mensagem.tipo === "sucesso"
                ? "produtos-mensagem-sucesso"
                : mensagem.tipo === "info"
                  ? "produtos-mensagem-info"
                  : "produtos-mensagem-erro"
            }`}
            role="alert"
          >
            {mensagem.codigo && (
              <strong className="produtos-mensagem-codigo">
                {mensagem.codigo}: {" "}
              </strong>
            )}
            {mensagem.texto}
          </div>
        )}

        <div className="produtos-acoes">
          <div className="produto-acao-esquerda" onClick={limparFormulario}>
            <Button
              texto={produtoEmEdicao !== null ? "Cancelar edição" : "Limpar"}
              cor="btn-secundaria"
            />
          </div>

          <div className="produto-acao-centro">
            {produtoEmEdicao !== null && (
              <span className="produto-editando-aviso light-h3">
                Produto #{produtoEmEdicao}
              </span>
            )}
          </div>

          <div
            className={`produto-acao-direita ${
              salvando ? "produto-acao-desabilitada" : ""
            }`}
            onClick={() => {
              if (!salvando) void salvarProduto();
            }}
          >
            <Button
              texto={
                salvando
                  ? "Salvando..."
                  : produtoEmEdicao !== null
                    ? "Atualizar"
                    : "Salvar"
              }
              cor="btn-primaria"
            />
          </div>
        </div>
      </div>

      <div className="produtos-listagem">
        <div className="produtos-listagem-cabecalho">
          <div>
            <h2 className="medium-h1">Produtos cadastrados</h2>
            <p className="light-h3">
              {carregando
                ? "Carregando produtos..."
                : `${produtosFiltrados.length} produto(s) encontrado(s)`}
            </p>
          </div>

          <div className="produtos-filtro">
            <Search className="produtos-filtro-icone" size={18} />
            <input
              type="search"
              value={filtro}
              onChange={(evento) => setFiltro(evento.target.value)}
              placeholder="Pesquisar produtos"
              aria-label="Pesquisar produtos"
            />
          </div>
        </div>

        <div className="produtos-tabela-container">
          <table className="produtos-tabela">
            <thead>
              <tr>
                <th className="medium-h3">Código interno</th>
                <th className="medium-h3">Produto</th>
                <th className="medium-h3">Categoria</th>
                <th className="medium-h3">Descrição</th>
                <th className="medium-h3">Valor</th>
                <th className="medium-h3">Estoque</th>
                <th className="produtos-coluna-acoes medium-h3">Ações</th>
              </tr>
            </thead>

            <tbody>
              {produtosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="produtos-sem-resultados">
                    {carregando ? "Carregando..." : "Nenhum produto encontrado."}
                  </td>
                </tr>
              ) : (
                produtosFiltrados.map((produto) => (
                  <tr
                    key={produto.id}
                    className={
                      produtoEmEdicao === produto.id
                        ? "produto-linha-em-edicao"
                        : ""
                    }
                  >
                    <td className="light-h3">
                      {produto.codigo_barra || "Não informado"}
                    </td>
                    <td className="medium-h3">{produto.nome}</td>
                    <td className="light-h3">{produto.tipo}</td>
                    <td
                      className="light-h3 produto-descricao-tabela"
                      title={produto.descricao ?? ""}
                    >
                      {produto.descricao || "Sem descrição"}
                    </td>
                    <td className="medium-h3">{formatarMoeda(produto.preco)}</td>
                    <td className="light-h3">
                      {formatarQuantidade(produto.quantidade)} un.
                    </td>
                    <td>
                      <div className="produtos-acoes-linha">
                        <button
                          type="button"
                          className="produto-acao produto-editar"
                          onClick={() => editarProduto(produto)}
                          aria-label={`Editar ${produto.nome}`}
                          title="Editar produto"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          className="produto-acao produto-excluir"
                          onClick={() => void excluirProduto(produto)}
                          disabled={produtoEmExclusao === produto.id}
                          aria-label={`Excluir ${produto.nome}`}
                          title="Excluir produto"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default Produtos;