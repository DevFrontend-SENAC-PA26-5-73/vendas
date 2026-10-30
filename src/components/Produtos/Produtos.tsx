import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Pencil,
  Search,
  Trash2,
} from "lucide-react";

import Button from "../Button/Button";
import "./Produtos.css";

import { API_BASE_URL } from "../../lib/api";
import {
  CATEGORIAS_PRODUTOS,
  lerMargensCategoriasProdutos,
  normalizarCategoriaProduto,
  obterCategoriaProduto,
  removerMargemCategoriaProduto,
  salvarMargemCategoriaProduto,
} from "../../lib/margensProdutos";
import SortableHeader from "../SortableHeader/SortableHeader";
import { ordenarLista } from "../../lib/ordenacao";
import type { DirecaoOrdenacao } from "../../lib/ordenacao";

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
  tipo: string;
  preco: string;
  margem_minima: string;
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

type FiltroEstoqueProduto = "todos" | "com-estoque" | "sem-estoque";
type ColunaOrdenacaoProduto = "codigo" | "nome" | "categoria" | "descricao" | "margem" | "preco";

type ApiErro = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

const API_URL = API_BASE_URL;
const API_PRODUTOS = `${API_URL}/produtos`;

const formularioInicial: FormularioProduto = {
  nome: "",
  descricao: "",
  codigo_barra: "",
  tipo: "",
  preco: "",
  margem_minima: "0",
};

function normalizarTextoBusca(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizarProduto(
  dado: unknown,
): IProduto | null {
  if (!dado || typeof dado !== "object") {
    return null;
  }

  const produto = dado as Partial<IProduto>;
  const id = Number(produto.id);

  if (
    !Number.isFinite(id) ||
    typeof produto.nome !== "string"
  ) {
    return null;
  }

  return {
    id,
    nome: produto.nome,
    descricao:
      typeof produto.descricao === "string"
        ? produto.descricao
        : "",
    codigo_barra:
      typeof produto.codigo_barra === "string"
        ? produto.codigo_barra
        : produto.codigo_barra != null
          ? String(produto.codigo_barra)
          : "",
    quantidade: Number(produto.quantidade ?? 0),
    tipo:
      typeof produto.tipo === "string"
        ? produto.tipo
        : "",
    preco: Number(produto.preco ?? 0),
  };
}

function normalizarProdutos(
  dados: unknown,
): IProduto[] {
  let lista: unknown[] = [];

  if (Array.isArray(dados)) {
    lista = dados;
  } else if (
    dados &&
    typeof dados === "object" &&
    "produtos" in dados
  ) {
    const resposta = dados as {
      produtos?: unknown;
    };

    if (Array.isArray(resposta.produtos)) {
      lista = resposta.produtos;
    }
  } else if (
    dados &&
    typeof dados === "object" &&
    "data" in dados
  ) {
    const resposta = dados as {
      data?: unknown;
    };

    if (Array.isArray(resposta.data)) {
      lista = resposta.data;
    }
  }

  return lista
    .map(normalizarProduto)
    .filter(
      (
        produto,
      ): produto is IProduto =>
        produto !== null,
    );
}

function obterPrefixoCategoria(
  categoria: string,
  nome?: string,
) {
  const categoriaSelecionada =
    obterCategoriaProduto(categoria) ??
    CATEGORIAS_PRODUTOS.find(
      (item) => item.valor === "outro",
    );

  if (!categoriaSelecionada && nome) {
    return "900";
  }

  return categoriaSelecionada?.prefixo ?? "900";
}

function gerarDigitosAleatorios(
  quantidade: number,
) {
  const valores = new Uint32Array(
    quantidade,
  );

  if (
    typeof crypto !== "undefined" &&
    crypto.getRandomValues
  ) {
    crypto.getRandomValues(valores);

    return Array.from(
      valores,
      (valor) => String(valor % 10),
    ).join("");
  }

  return Array.from(
    { length: quantidade },
    () =>
      String(
        Math.floor(Math.random() * 10),
      ),
  ).join("");
}

function gerarCodigoUnico(
  categoria: string,
  nome: string,
  produtos: IProduto[],
) {
  const prefixo = obterPrefixoCategoria(
    categoria,
    nome,
  );

  for (
    let tentativa = 0;
    tentativa < 100;
    tentativa += 1
  ) {
    const codigo =
      `${prefixo}${gerarDigitosAleatorios(10)}`;

    const existe = produtos.some(
      (produto) =>
        String(
          produto.codigo_barra ?? "",
        ) === codigo,
    );

    if (!existe) {
      return codigo;
    }
  }

  return `${prefixo}${Date.now()
    .toString()
    .slice(-10)
    .padStart(10, "0")}`;
}

function formatarMoeda(valor: number) {
  return Number(valor || 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

async function lerResposta(
  resposta: Response,
): Promise<unknown> {
  const texto = await resposta.text();

  if (!texto) {
    return null;
  }

  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}

function lerMensagemApi(dados: unknown) {
  if (typeof dados === "string") {
    return dados;
  }

  if (!dados || typeof dados !== "object") {
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

function criarErroApi(
  status: number,
  dados: unknown,
) {
  const mensagemApi = lerMensagemApi(dados);

  if (status === 400) {
    return Object.assign(
      new Error(
        mensagemApi ||
          "A API recusou os dados do produto.",
      ),
      { codigo: "PROD-A400" },
    );
  }

  if (status === 404) {
    return Object.assign(
      new Error(
        mensagemApi ||
          "Produto ou rota não encontrado.",
      ),
      { codigo: "PROD-A404" },
    );
  }

  if (status === 409) {
    return Object.assign(
      new Error(
        mensagemApi ||
          "Já existe um produto com os mesmos dados ou código.",
      ),
      { codigo: "PROD-A409" },
    );
  }

  if (status >= 500) {
    return Object.assign(
      new Error(
        mensagemApi ||
          "O servidor apresentou uma falha interna.",
      ),
      { codigo: "PROD-A500" },
    );
  }

  return Object.assign(
    new Error(
      mensagemApi ||
        `A API respondeu com o status ${status}.`,
    ),
    { codigo: `PROD-A${status}` },
  );
}

function avisarOutrasAbas() {
  window.dispatchEvent(
    new CustomEvent(
      "produtos-atualizados",
    ),
  );

  window.dispatchEvent(
    new CustomEvent(
      "estoque-atualizado",
    ),
  );
}

async function verificarVinculosProduto(
  produtoId: number,
): Promise<{
  temVinculo: boolean;
  motivo: string;
}> {
  try {
    const [itensVendaResposta, fluxoResposta] =
      await Promise.all([
        fetch(`${API_URL}/itemvenda`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }),
        fetch(`${API_URL}/fluxo-caixa`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }),
      ]);

    const itensVenda =
      itensVendaResposta.ok
        ? await lerResposta(itensVendaResposta)
        : [];

    const fluxoCaixa =
      fluxoResposta.ok
        ? await lerResposta(fluxoResposta)
        : [];

    const itensVinculados = Array.isArray(itensVenda)
      ? itensVenda.some((item) => {
          const itemVenda = item as Partial<{
            produtos_id?: number;
            produto_id?: number;
          }>;

          return (
            Number(
              itemVenda.produtos_id ??
                itemVenda.produto_id,
            ) === produtoId
          );
        })
      : false;

    const fluxoVinculado = Array.isArray(fluxoCaixa)
      ? fluxoCaixa.some((item) => {
          const movimento = item as Partial<{
            produto_id?: number;
            produtos_id?: number;
          }>;

          return (
            Number(
              movimento.produto_id ??
                movimento.produtos_id,
            ) === produtoId
          );
        })
      : false;

    if (itensVinculados || fluxoVinculado) {
      return {
        temVinculo: true,
        motivo:
          itensVinculados && fluxoVinculado
            ? "itens de venda e movimentações de estoque/caixa"
            : itensVinculados
              ? "itens de venda"
              : "movimentações de estoque/caixa",
      };
    }
  } catch {
    // A verificação de vínculos não deve bloquear a exclusão quando a API estiver indisponível;
    // em caso de falha, a operação continua e a API responde com a mensagem real do backend.
  }

  return {
    temVinculo: false,
    motivo: "",
  };
}

function Produtos({ buscaGlobal }: { buscaGlobal: string }) {
  const [produtos, setProdutos] =
    useState<IProduto[]>([]);
  const [margensCategorias, setMargensCategorias] =
    useState(lerMargensCategoriasProdutos);

  const [formulario, setFormulario] =
    useState<FormularioProduto>({
      ...formularioInicial,
    });

  const [produtoEmEdicao, setProdutoEmEdicao] =
    useState<number | null>(null);

  const [produtoEmExclusao, setProdutoEmExclusao] =
    useState<number | null>(null);

  const [quantidadePreservada, setQuantidadePreservada] =
    useState(0);

  const [filtro, setFiltro] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [estoqueFiltro, setEstoqueFiltro] =
    useState<FiltroEstoqueProduto>("todos");
  const [ordenacao, setOrdenacao] = useState<{
    coluna: ColunaOrdenacaoProduto;
    direcao: DirecaoOrdenacao;
  } | null>(null);
  const [carregando, setCarregando] =
    useState(true);
  const [salvando, setSalvando] =
    useState(false);
  const [mensagem, setMensagem] =
    useState<Mensagem | null>(null);

  function mostrarMensagem(
    novaMensagem: Mensagem,
  ) {
    setMensagem(novaMensagem);

    if (novaMensagem.tipo === "erro") {
      window.alert(
        `${novaMensagem.codigo ?? "PROD-E000"}: ${novaMensagem.texto}`,
      );
    }
  }

  const buscarProdutos = useCallback(
    async () => {
      try {
        const resposta = await fetch(
          `${API_PRODUTOS}?atualizacao=${Date.now()}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          },
        );

        const dados = await lerResposta(
          resposta,
        );

        if (!resposta.ok) {
          throw criarErroApi(
            resposta.status,
            dados,
          );
        }

        setProdutos(
          normalizarProdutos(dados),
        );
      } catch (erro) {
        console.group(
          "[PRODUTOS] Falha no GET /produtos",
        );
        console.error(erro);
        console.log(
          "URL testada:",
          API_PRODUTOS,
        );
        console.groupEnd();

        setProdutos([]);

        if (
          erro instanceof TypeError
        ) {
          mostrarMensagem({
            tipo: "erro",
            codigo: "PROD-N001",
            texto:
              `A API não respondeu. Confirme se o servidor ${API_BASE_URL} está acessível neste computador e se o front-end não está em HTTPS.`,
          });
        } else if (
          erro instanceof Error &&
          "codigo" in erro
        ) {
          mostrarMensagem({
            tipo: "erro",
            codigo: String(
              (
                erro as Error & {
                  codigo: string;
                }
              ).codigo,
            ),
            texto: erro.message,
          });
        } else {
          mostrarMensagem({
            tipo: "erro",
            codigo: "PROD-U001",
            texto:
              erro instanceof Error
                ? erro.message
                : "Erro inesperado ao carregar o catálogo.",
          });
        }
      } finally {
        setCarregando(false);
      }
    },
    [],
  );

  useEffect(() => {
    async function iniciar() {
      await buscarProdutos();
    }

    void iniciar();
  }, [buscarProdutos]);

  useEffect(() => {
    function atualizarProdutos() {
      void buscarProdutos();
    }

    window.addEventListener(
      "produtos-atualizados",
      atualizarProdutos,
    );

    window.addEventListener(
      "estoque-atualizado",
      atualizarProdutos,
    );

    return () => {
      window.removeEventListener(
        "produtos-atualizados",
        atualizarProdutos,
      );

      window.removeEventListener(
        "estoque-atualizado",
        atualizarProdutos,
      );
    };
  }, [buscarProdutos]);

  const produtosFiltrados = useMemo(() => {
    const termo = normalizarTextoBusca(filtro);
    const termoGlobal = normalizarTextoBusca(buscaGlobal);

    return produtos.filter((produto) => {
      const camposBusca = [
        produto.id,
        produto.nome,
        produto.descricao,
        produto.codigo_barra,
        produto.tipo,
        produto.preco,
      ].map(normalizarTextoBusca);
      const correspondeBusca =
        (!termo || camposBusca.some((campo) => campo.includes(termo))) &&
        (!termoGlobal || camposBusca.some((campo) => campo.includes(termoGlobal)));

      const correspondeCategoria =
        categoriaFiltro === "todas" ||
        normalizarTextoBusca(produto.tipo) ===
          normalizarTextoBusca(categoriaFiltro);

      const temEstoque = Number(produto.quantidade || 0) > 0;
      const correspondeEstoque =
        estoqueFiltro === "todos" ||
        (estoqueFiltro === "com-estoque" && temEstoque) ||
        (estoqueFiltro === "sem-estoque" && !temEstoque);

      return correspondeBusca && correspondeCategoria && correspondeEstoque;
    });
  }, [buscaGlobal, categoriaFiltro, estoqueFiltro, filtro, produtos]);

  const categoriasDisponiveis = useMemo(
    () =>
      Array.from(new Set(produtos.map((produto) => produto.tipo.trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [produtos],
  );

  const produtosOrdenados = useMemo(() => {
    if (!ordenacao) return produtosFiltrados;
    return ordenarLista(
      produtosFiltrados,
      (produto) => {
        switch (ordenacao.coluna) {
          case "codigo": return produto.codigo_barra ?? "";
          case "nome": return produto.nome;
          case "categoria": return produto.tipo;
          case "descricao": return produto.descricao ?? "";
          case "margem": return margensCategorias[normalizarCategoriaProduto(produto.tipo)] ?? -1;
          case "preco": return Number(produto.preco || 0);
        }
      },
      ordenacao.direcao,
    );
  }, [margensCategorias, ordenacao, produtosFiltrados]);

  function alternarOrdenacao(coluna: ColunaOrdenacaoProduto) {
    setOrdenacao((atual) => ({
      coluna,
      direcao: atual?.coluna === coluna && atual.direcao === "desc" ? "asc" : "desc",
    }));
  }

  function alterarCampo(
    campo: keyof FormularioProduto,
    valor: string,
  ) {
    if (campo === "tipo") {
      const categoria = obterCategoriaProduto(valor);
      setFormulario((atual) => ({
        ...atual,
        tipo: valor,
        margem_minima: String(
          categoria?.margemBase ?? atual.margem_minima ?? 0,
        ),
      }));
      setMensagem(null);
      return;
    }

    setFormulario((atual) => ({
      ...atual,
      [campo]: valor,
    }));

    setMensagem(null);
  }

  function limparFormulario() {
    setFormulario({
      ...formularioInicial,
    });

    setProdutoEmEdicao(null);
    setQuantidadePreservada(0);
    setMensagem(null);
  }

  function editarProduto(
    produto: IProduto,
  ) {
    setFormulario({
      nome: produto.nome ?? "",
      descricao:
        produto.descricao ?? "",
      codigo_barra:
        produto.codigo_barra ?? "",
      tipo: produto.tipo ?? "",
      margem_minima: String(
        margensCategorias[
          normalizarCategoriaProduto(produto.tipo ?? "")
        ] ?? 0,
      ),
      preco: String(
        Number(
          produto.preco ?? 0,
        ).toFixed(2),
      ),
    });

    setQuantidadePreservada(
      Number(produto.quantidade ?? 0),
    );

    setProdutoEmEdicao(produto.id);
    setMensagem(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function criarPayload(): PayloadProduto {
    const nome = formulario.nome.trim();
    const descricao =
      formulario.descricao.trim();
    const tipo = formulario.tipo.trim();
    const preco = Number(
      formulario.preco.replace(",", "."),
    );

    if (!nome) {
      throw Object.assign(
        new Error(
          "Informe o nome do produto.",
        ),
        { codigo: "PROD-E001" },
      );
    }

    if (!descricao) {
      throw Object.assign(
        new Error(
          "Informe a descrição do produto.",
        ),
        { codigo: "PROD-E002" },
      );
    }

    if (!tipo) {
      throw Object.assign(
        new Error(
          "Informe a categoria do produto.",
        ),
        { codigo: "PROD-E003" },
      );
    }

    if (
      !Number.isFinite(preco) ||
      preco <= 0
    ) {
      throw Object.assign(
        new Error(
          "Informe um preço maior que zero.",
        ),
        { codigo: "PROD-E005" },
      );
    }

    const categoriaSelecionada =
      obterCategoriaProduto(formulario.tipo) ??
      CATEGORIAS_PRODUTOS.find(
        (item) => item.valor === "outro",
      );

    const margemMinima = categoriaSelecionada
      ? categoriaSelecionada.margemBase
      : Number(
          formulario.margem_minima.replace(",", "."),
        );

    if (
      !Number.isFinite(margemMinima) ||
      margemMinima < 0 ||
      margemMinima > 500
    ) {
      throw Object.assign(
        new Error(
          "Informe uma margem mínima entre 0% e 500%.",
        ),
        { codigo: "PROD-E007" },
      );
    }

    const codigoExistente =
      formulario.codigo_barra.trim();

    const codigoBarra =
      produtoEmEdicao !== null &&
      codigoExistente
        ? codigoExistente
        : gerarCodigoUnico(
            tipo,
            nome,
            produtos,
          );

    if (!/^\d{13}$/.test(codigoBarra)) {
      throw Object.assign(
        new Error(
          "O código interno precisa ter 13 dígitos.",
        ),
        { codigo: "PROD-E006" },
      );
    }

    return {
      nome,
      descricao,
      codigo_barra: codigoBarra,
      quantidade:
        produtoEmEdicao !== null
          ? quantidadePreservada
          : 0,
      tipo,
      preco: Number(preco.toFixed(2)),
    };
  }

  async function enviarProduto(
    metodo: "POST" | "PATCH",
    url: string,
    payload: PayloadProduto,
  ) {
    const resposta = await fetch(url, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const dados = await lerResposta(
      resposta,
    );

    if (!resposta.ok) {
      throw criarErroApi(
        resposta.status,
        dados,
      );
    }

    return dados;
  }

  async function salvarProduto() {
    if (salvando) {
      return;
    }

    try {
      const payload = criarPayload();
      const editando =
        produtoEmEdicao !== null;
      const url = editando
        ? `${API_PRODUTOS}/${produtoEmEdicao}`
        : API_PRODUTOS;

      setSalvando(true);
      setMensagem(null);

      console.group(
        `[CATÁLOGO] ${editando ? "PATCH" : "POST"} ${url}`,
      );
      console.log("Payload:", payload);
      console.groupEnd();

      const respostaSalvamento = await enviarProduto(
        editando ? "PATCH" : "POST",
        url,
        payload,
      );

      const produtoSalvo = normalizarProduto(
        respostaSalvamento,
      );

      if (produtoSalvo) {
        const categoriaSelecionada =
          obterCategoriaProduto(formulario.tipo) ??
          CATEGORIAS_PRODUTOS.find(
            (item) => item.valor === "outro",
          );

        const margemCategoria = categoriaSelecionada
          ? categoriaSelecionada.margemBase
          : Number(
              formulario.margem_minima.replace(",", "."),
            );

        setMargensCategorias(
          salvarMargemCategoriaProduto(
            formulario.tipo,
            margemCategoria,
          ),
        );
      }

      limparFormulario();
      await buscarProdutos();
      avisarOutrasAbas();

      setMensagem({
        tipo: "sucesso",
        codigo: editando
          ? "PROD-S002"
          : "PROD-S001",
        texto: editando
          ? "Dados do produto atualizados sem alterar o estoque."
          : "Produto adicionado ao catálogo com estoque inicial zero.",
      });
    } catch (erro) {
      console.group(
        "[CATÁLOGO] Erro ao salvar produto",
      );
      console.error(erro);
      console.groupEnd();

      if (erro instanceof TypeError) {
        mostrarMensagem({
          tipo: "erro",
          codigo: "PROD-N001",
          texto:
            "A API não respondeu. Confirme se o servidor está acessível na mesma rede e se o navegador não bloqueou HTTP em uma página HTTPS.",
        });
      } else if (
        erro instanceof Error &&
        "codigo" in erro
      ) {
        mostrarMensagem({
          tipo: "erro",
          codigo: String(
            (
              erro as Error & {
                codigo: string;
              }
            ).codigo,
          ),
          texto: erro.message,
        });
      } else {
        mostrarMensagem({
          tipo: "erro",
          codigo: "PROD-U001",
          texto:
            erro instanceof Error
              ? erro.message
              : "Não foi possível salvar o produto.",
        });
      }
    } finally {
      setSalvando(false);
    }
  }

  async function excluirProduto(
    produto: IProduto,
  ) {
    const confirmou = window.confirm(
      [
        `Excluir "${produto.nome}" do catálogo?`,
        "",
        "A exclusão pode falhar se o produto estiver relacionado a vendas ou movimentações.",
      ].join("\n"),
    );

    if (!confirmou) {
      return;
    }

    try {
      setProdutoEmExclusao(produto.id);
      setMensagem(null);

      const vinculos = await verificarVinculosProduto(
        produto.id,
      );

      if (vinculos.temVinculo) {
        mostrarMensagem({
          tipo: "erro",
          codigo: "PROD-E010",
          texto:
            `Não foi possível excluir "${produto.nome}" porque ele está vinculado a ${vinculos.motivo}. Remova os registros relacionados antes de tentar novamente.`,
        });
        return;
      }

      const resposta = await fetch(
        `${API_PRODUTOS}/${produto.id}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const dados = await lerResposta(
        resposta,
      );

      if (!resposta.ok) {
        throw criarErroApi(
          resposta.status,
          dados,
        );
      }

      if (produtoEmEdicao === produto.id) {
        limparFormulario();
      }

      setMargensCategorias(
        removerMargemCategoriaProduto(produto.tipo),
      );

      await buscarProdutos();
      avisarOutrasAbas();

      setMensagem({
        tipo: "sucesso",
        codigo: "PROD-S003",
        texto:
          "Produto removido do catálogo.",
      });
    } catch (erro) {
      console.error(
        "[CATÁLOGO] Erro ao excluir:",
        erro,
      );

      const mensagemErro =
        erro instanceof Error
          ? erro.message
          : "Não foi possível excluir o produto.";

      if (erro instanceof TypeError) {
        mostrarMensagem({
          tipo: "erro",
          codigo: "PROD-N001",
          texto:
            "A API não respondeu durante a exclusão.",
        });
      } else if (
        erro instanceof Error &&
        "codigo" in erro
      ) {
        const codigo = String(
          (
            erro as Error & {
              codigo: string;
            }
          ).codigo,
        );

        const texto =
          codigo === "PROD-A500"
            ? `${mensagemErro}. Isso normalmente acontece quando o produto já está associado a vendas ou movimentações e o backend não permite a remoção por integridade.`
            : mensagemErro;

        mostrarMensagem({
          tipo: "erro",
          codigo,
          texto,
        });
      } else {
        mostrarMensagem({
          tipo: "erro",
          codigo: "PROD-U001",
          texto: mensagemErro,
        });
      }
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
              {produtoEmEdicao !== null
                ? "Editar produto do catálogo"
                : "Adicionar produto ao catálogo"}
            </h1>

            <p className="light-h3">
              {produtoEmEdicao !== null
                ? "Altere nome, descrição, categoria ou preço. O estoque será preservado."
                : "Cadastre os dados comerciais. A entrada de quantidade será feita em Movimentação."}
            </p>
          </div>

          <span className="produtos-status medium-h3">
            {produtoEmEdicao !== null
              ? "Em edição"
              : "Novo produto"}
          </span>
        </header>

        <div className="produtos-aviso-catalogo">
          <strong>
            Catálogo sem estoque:
          </strong>{" "}
          produtos novos são cadastrados com quantidade
          zero. Use a aba Movimentação para registrar a
          primeira entrada.
        </div>

        <div className="produtos-formulario">
          <div className="produto-campo produto-campo-nome">
            <label
              className="medium-h3"
              htmlFor="produto-nome"
            >
              Nome do produto
            </label>

            <input
              id="produto-nome"
              value={formulario.nome}
              onChange={(evento) =>
                alterarCampo(
                  "nome",
                  evento.target.value,
                )
              }
              placeholder="Ex.: Camisa polo"
            />
          </div>

          <div className="produto-campo">
            <label
              className="medium-h3"
              htmlFor="produto-codigo"
            >
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
              Prefixos: camisa 110, calça 120,
              calçado 130, acessório 140.
            </small>
          </div>

          <div className="produto-campo">
            <label
              className="medium-h3"
              htmlFor="produto-categoria"
            >
              Categoria
            </label>

            <select
              id="produto-categoria"
              value={formulario.tipo}
              onChange={(evento) =>
                alterarCampo(
                  "tipo",
                  evento.target.value,
                )
              }
            >
              <option value="">
                Selecione uma categoria
              </option>
              {CATEGORIAS_PRODUTOS.map((categoria) => (
                <option
                  key={categoria.valor}
                  value={categoria.valor}
                >
                  {categoria.label}
                </option>
              ))}
            </select>
          </div>

          <div className="produto-campo">
            <label
              className="medium-h3"
              htmlFor="produto-preco"
            >
              Preço de compra
            </label>

            <div className="produto-campo-moeda">
              <span>R$</span>

              <input
                id="produto-preco"
                type="number"
                min="0.01"
                step="0.01"
                value={formulario.preco}
                onChange={(evento) =>
                  alterarCampo(
                    "preco",
                    evento.target.value,
                  )
                }
                placeholder="0,00"
              />
            </div>

            <small
              id="produto-preco-ajuda"
              className="produto-codigo-ajuda"
            >
              Esse valor é o custo do produto e será usado para calcular o preço mínimo de venda pela categoria.
            </small>
          </div>

          <div className="produto-campo">
            <label
              className="medium-h3"
              htmlFor="produto-margem-minima"
            >
              Margem mínima da categoria
            </label>

            <div className="produto-campo-percentual">
              <input
                id="produto-margem-minima"
                type="number"
                min="0"
                max="500"
                step="0.1"
                value={formulario.margem_minima}
                readOnly
                aria-describedby="produto-margem-ajuda"
              />
              <span>%</span>
            </div>

            <small
              id="produto-margem-ajuda"
              className="produto-codigo-ajuda"
            >
              A margem é definida pela categoria escolhida e aplicada ao custo de compra para calcular o preço mínimo de venda.
            </small>
          </div>

          <div className="produto-campo produto-campo-descricao">
            <label
              className="medium-h3"
              htmlFor="produto-descricao"
            >
              Descrição
            </label>

            <textarea
              id="produto-descricao"
              rows={3}
              value={formulario.descricao}
              onChange={(evento) =>
                alterarCampo(
                  "descricao",
                  evento.target.value,
                )
              }
              placeholder="Ex.: Camisa polo de algodão, cor preta"
            />
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
                {mensagem.codigo}:{" "}
              </strong>
            )}
            {mensagem.texto}
          </div>
        )}

        <div className="produtos-acoes">
          <div
            className="produto-acao-esquerda"
            onClick={limparFormulario}
          >
            <Button
              texto={
                produtoEmEdicao !== null
                  ? "Cancelar edição"
                  : "Limpar"
              }
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
              salvando
                ? "produto-acao-desabilitada"
                : ""
            }`}
            onClick={() => {
              if (!salvando) {
                void salvarProduto();
              }
            }}
          >
            <Button
              texto={
                salvando
                  ? "Salvando..."
                  : produtoEmEdicao !== null
                    ? "Atualizar catálogo"
                    : "Adicionar ao catálogo"
              }
              cor="btn-primaria"
            />
          </div>
        </div>
      </div>

      <div className="produtos-listagem">
        <div className="produtos-listagem-cabecalho">
          <div>
            <h2 className="medium-h1">
              Catálogo de produtos
            </h2>

            <p className="light-h3">
              {carregando
                ? "Carregando catálogo..."
                : `${produtosFiltrados.length} de ${produtos.length} produto(s)`}
            </p>
          </div>

          <div className="produtos-filtros">
            <div className="produtos-filtro">
              <Search
                className="produtos-filtro-icone"
                size={18}
              />

              <input
                type="search"
                value={filtro}
                onChange={(evento) => setFiltro(evento.target.value)}
                placeholder="Nome, código ou descrição"
                aria-label="Pesquisar produtos por nome, código, categoria ou descrição"
              />
            </div>

            <select
              className="produtos-filtro-select"
              value={categoriaFiltro}
              onChange={(evento) => setCategoriaFiltro(evento.target.value)}
              aria-label="Filtrar produtos por categoria"
            >
              <option value="todas">Todas as categorias</option>
              {categoriasDisponiveis.map((categoria) => (
                <option key={categoria} value={categoria}>{categoria}</option>
              ))}
            </select>

            <select
              className="produtos-filtro-select"
              value={estoqueFiltro}
              onChange={(evento) =>
                setEstoqueFiltro(evento.target.value as FiltroEstoqueProduto)
              }
              aria-label="Filtrar produtos por estoque"
            >
              <option value="todos">Qualquer estoque</option>
              <option value="com-estoque">Com estoque</option>
              <option value="sem-estoque">Sem estoque</option>
            </select>
          </div>
        </div>

        <div className="produtos-tabela-container">
          <table className="produtos-tabela">
            <thead>
              <tr>
                <SortableHeader label="Código interno" active={ordenacao?.coluna === "codigo"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("codigo")} />
                <SortableHeader label="Produto" active={ordenacao?.coluna === "nome"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("nome")} />
                <SortableHeader label="Categoria" active={ordenacao?.coluna === "categoria"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("categoria")} />
                <SortableHeader label="Descrição" active={ordenacao?.coluna === "descricao"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("descricao")} />
                <SortableHeader label="Margem mínima" active={ordenacao?.coluna === "margem"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("margem")} />
                <SortableHeader label="Preço de venda" active={ordenacao?.coluna === "preco"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("preco")} />
                <th className="produtos-coluna-acoes medium-h3">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {produtosOrdenados.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="produtos-sem-resultados"
                  >
                    {carregando
                      ? "Carregando..."
                      : "Nenhum produto encontrado no catálogo."}
                  </td>
                </tr>
              ) : (
                produtosOrdenados.map(
                  (produto) => (
                    <tr
                      key={produto.id}
                      className={
                        produtoEmEdicao ===
                        produto.id
                          ? "produto-linha-em-edicao"
                          : ""
                      }
                    >
                      <td className="light-h3">
                        {produto.codigo_barra ||
                          "Não informado"}
                      </td>

                      <td className="medium-h3">
                        {produto.nome}
                      </td>

                      <td className="light-h3">
                        {produto.tipo}
                      </td>

                      <td
                        className="light-h3 produto-descricao-tabela"
                        title={
                          produto.descricao ?? ""
                        }
                      >
                        {produto.descricao ||
                          "Sem descrição"}
                      </td>

                      <td className="light-h3">
                        {margensCategorias[
                          normalizarCategoriaProduto(produto.tipo)
                        ] === undefined
                          ? "Não definida"
                          : `${margensCategorias[normalizarCategoriaProduto(produto.tipo)]}%`}
                      </td>

                      <td className="medium-h3">
                        {formatarMoeda(
                          produto.preco,
                        )}
                      </td>

                      <td>
                        <div className="produtos-acoes-linha">
                          <button
                            type="button"
                            className="produto-acao produto-editar"
                            onClick={() =>
                              editarProduto(produto)
                            }
                            aria-label={`Editar ${produto.nome}`}
                            title="Editar dados do produto"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            className="produto-acao produto-excluir"
                            onClick={() =>
                              void excluirProduto(
                                produto,
                              )
                            }
                            disabled={
                              produtoEmExclusao ===
                              produto.id
                            }
                            aria-label={`Excluir ${produto.nome}`}
                            title="Excluir do catálogo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default Produtos;