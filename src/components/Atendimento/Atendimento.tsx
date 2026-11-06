import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api, { API_URL, descreverErro } from "../../Api/Api";
import SortableHeader from "../SortableHeader/SortableHeader";
import { ordenarLista } from "../../lib/ordenacao";
import type { DirecaoOrdenacao } from "../../lib/ordenacao";
import "./Atendimento.css";
import Button from "../Button/Button";
import CampoNumero from "../CampoNumero/CampoNumero";
import { useCampoNumero } from "../CampoNumero/useCampoNumero";
import Notificacao from "../Notificacao/Notificacao";
import { useNotificacoes } from "../Notificacao/useNotificacoes";

type Cliente = {
  id: number;
  nome: string;
  cpf: string;
  contato: string;
  email: string;
};

type Funcionario = {
  id: number;
  nome: string;
};

type Transportadora = {
  id: number;
  nome: string;
  contato: string;
};

type Produto = {
  id: number;
  nome: string;
  codigo: string;
  preco: number;
  // null = a API não informou estoque (não bloqueia a venda)
  estoque: number | null;
};

type ItemPedido = {
  id: number;
  produtoId: number;
  nome: string;
  codigo: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
};

type ColunaOrdenacaoItemPedido = "produto" | "codigo" | "quantidade" | "preco" | "subtotal";
const API_CLIENTES_URL = "/clientes";
const API_FUNCIONARIOS_URL = "/funcionarios";
const API_TRANSPORTADORAS_URL = "/transportadora";
const API_PRODUTOS_URL = "/produtos";
const API_VENDAS_URL = "/vendas";
const API_ITENS_VENDA_URL = "/itemvenda";
const API_PAGAMENTOS_URL = "/pagamentos";

function hojeISO() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

// A API não tem coluna de código: o código do pedido é o ID da venda
function formatarCodigoPedido(id: number, ano = new Date().getFullYear()) {
  return `PED-${ano}-${String(id).padStart(3, "0")}`;
}

function comoObjeto(valor: unknown): Record<string, unknown> | null {
  return valor !== null && typeof valor === "object"
    ? (valor as Record<string, unknown>)
    : null;
}

function lerTexto(
  registro: Record<string, unknown>,
  ...chaves: string[]
): string {
  for (const chave of chaves) {
    const valor = registro[chave];

    if (typeof valor === "string" && valor.trim() !== "") {
      return valor;
    }

    if (typeof valor === "number" && Number.isFinite(valor)) {
      return String(valor);
    }
  }

  return "";
}

function lerNumero(
  registro: Record<string, unknown>,
  ...chaves: string[]
): number {
  for (const chave of chaves) {
    const valor = registro[chave];

    if (valor === null || valor === undefined || valor === "") {
      continue;
    }

    const numero = Number(valor);

    if (Number.isFinite(numero)) {
      return numero;
    }
  }

  return Number.NaN;
}

function extrairLista(dados: unknown): unknown[] {
  let atual: unknown = dados;

  for (let i = 0; i < 4; i++) {
    if (Array.isArray(atual)) return atual;
    if (!atual || typeof atual !== "object") return [];

    const objeto = atual as Record<string, unknown>;
    if (Array.isArray(objeto.data)) atual = objeto.data;
    else if (Array.isArray(objeto.clientes)) atual = objeto.clientes;
    else if (Array.isArray(objeto.funcionarios)) atual = objeto.funcionarios;
    else if (Array.isArray(objeto.transportadoras)) atual = objeto.transportadoras;
    else if (Array.isArray(objeto.transportadora)) atual = objeto.transportadora;
    else if (Array.isArray(objeto.produtos)) atual = objeto.produtos;
    else if (Array.isArray(objeto.items)) atual = objeto.items;
    else if (objeto.data !== undefined) atual = objeto.data;
    else return [];
  }

  return Array.isArray(atual) ? atual : [];
}

function normalizarClientes(dados: unknown): Cliente[] {
  return extrairLista(dados)
    .map((item) => {
      const registro = comoObjeto(item);

      if (!registro) return null;

      return {
        id: lerNumero(registro, "id", "cliente_id"),
        nome: lerTexto(registro, "nome", "nome_cliente"),
        cpf: lerTexto(registro, "cpf"),
        contato: lerTexto(registro, "contato", "telefone", "celular"),
        email: lerTexto(registro, "email"),
      };
    })
    .filter(
      (cliente): cliente is Cliente =>
        cliente !== null &&
        Number.isFinite(cliente.id) &&
        cliente.id > 0 &&
        cliente.nome.trim() !== "",
    );
}

function normalizarFuncionarios(dados: unknown): Funcionario[] {
  return extrairLista(dados)
    .map((item) => {
      const registro = comoObjeto(item);

      if (!registro) return null;

      return {
        id: lerNumero(registro, "id", "funcionario_id"),
        nome: lerTexto(registro, "nome"),
      };
    })
    .filter(
      (funcionario): funcionario is Funcionario =>
        funcionario !== null &&
        Number.isFinite(funcionario.id) &&
        funcionario.id > 0 &&
        funcionario.nome.trim() !== "",
    );
}

function normalizarTransportadoras(dados: unknown): Transportadora[] {
  return extrairLista(dados)
    .map((item) => {
      const registro = comoObjeto(item);

      if (!registro) return null;

      const id = lerNumero(
        registro,
        "id",
        "transportadora_id",
        "transportadoras_id",
      );

      return {
        id,
        nome:
          lerTexto(registro, "nome", "razao_social", "nome_fantasia") ||
          `Transportadora ${id}`,
        contato: lerTexto(registro, "contato", "telefone", "celular"),
      };
    })
    .filter(
      (transportadora): transportadora is Transportadora =>
        transportadora !== null &&
        Number.isFinite(transportadora.id) &&
        transportadora.id > 0,
    );
}

function normalizarProdutos(dados: unknown): Produto[] {
  return extrairLista(dados)
    .map((item) => {
      const registro = comoObjeto(item);

      if (!registro) return null;

      const id = lerNumero(registro, "id", "produto_id");
      const estoqueBruto =
        registro.quantidade ?? registro.estoque ?? registro.qtd_estoque;
      const estoque =
        estoqueBruto === undefined || estoqueBruto === null || estoqueBruto === ""
          ? null
          : Number(estoqueBruto);

      return {
        id,
        nome: lerTexto(registro, "nome", "nome_produto"),
        codigo:
          lerTexto(registro, "codigo", "codigo_produto", "codigo_barra") ||
          `PROD-${id}`,
        preco: lerNumero(registro, "preco", "valor", "preco_unitario"),
        estoque: estoque !== null && Number.isFinite(estoque) ? estoque : null,
      };
    })
    .filter(
      (produto): produto is Produto =>
        produto !== null &&
        Number.isFinite(produto.id) &&
        produto.id > 0 &&
        produto.nome.trim() !== "" &&
        Number.isFinite(produto.preco) &&
        produto.preco >= 0,
    );
}

/* =========================
   Parcelamento e comprovante
========================= */

const ROTULOS_PAGAMENTO: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  boleto: "Boleto",
};

type ComprovantePedido = {
  vendaId: number;
  codigo: string;
  dataEmissao: string;
  dataEntrega: string;
  cliente: Cliente;
  funcionarioNome: string;
  transportadoraNome: string;
  itens: ItemPedido[];
  subtotal: number;
  descontoPercentual: number;
  desconto: number;
  frete: number;
  total: number;
  formaPagamento: string;
  parcelas: number[];
  observacoes: string;
};

/** Divide o total em centavos para que a soma das parcelas seja exata. */
function dividirEmParcelas(total: number, quantidade: number): number[] {
  const centavos = Math.round(total * 100);

  if (!Number.isInteger(quantidade) || quantidade < 1 || centavos <= 0) {
    return [];
  }

  const base = Math.floor(centavos / quantidade);
  const resto = centavos - base * quantidade;

  return Array.from(
    { length: quantidade },
    (_, indice) => (base + (indice < resto ? 1 : 0)) / 100,
  );
}

/** Soma meses a uma data ISO (YYYY-MM-DD) sem estourar o dia do mês. */
function somarMeses(dataISO: string, meses: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);

  if (!ano || !mes || !dia) {
    return hojeISO();
  }

  const mesAlvo = new Date(Date.UTC(ano, mes - 1 + meses, 1));
  const ultimoDia = new Date(
    Date.UTC(mesAlvo.getUTCFullYear(), mesAlvo.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const diaFinal = Math.min(dia, ultimoDia);

  return [
    mesAlvo.getUTCFullYear(),
    String(mesAlvo.getUTCMonth() + 1).padStart(2, "0"),
    String(diaFinal).padStart(2, "0"),
  ].join("-");
}

function formatarDataBr(dataISO: string): string {
  if (!dataISO) return "Não informada";

  const [ano, mes, dia] = dataISO.split("-");

  if (!ano || !mes || !dia) return "Não informada";

  return `${dia}/${mes}/${ano}`;
}

function normalizarBusca(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function Atendimento({ buscaGlobal }: { buscaGlobal: string }) {
  const { notificacoes, mostrar, fechar } = useNotificacoes();
  const [clientesCadastrados, setClientesCadastrados] = useState<Cliente[]>([]);
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState("");
  const [funcionariosCadastrados, setFuncionariosCadastrados] = useState<Funcionario[]>([]);
  const [transportadorasCadastradas, setTransportadorasCadastradas] = useState<Transportadora[]>([]);
  const [produtosCadastrados, setProdutosCadastrados] = useState<Produto[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(true);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState("");
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([]);
    const [ordenacaoItens, setOrdenacaoItens] = useState<{
      coluna: ColunaOrdenacaoItemPedido;
      direcao: DirecaoOrdenacao;
    } | null>(null);
  const quantidadeCampo = useCampoNumero(1);
  const descontoCampo = useCampoNumero(0);
  const freteCampo = useCampoNumero(0);
  const quantidade = quantidadeCampo.valor;
  const descontoPercentual = descontoCampo.valor;
  const frete = freteCampo.valor;
  const [formaPagamento, setFormaPagamento] = useState("");
  const [transportadoraId, setTransportadoraId] = useState("");
  const [funcionarioId, setFuncionarioId] = useState("");
  const [dataEmissao, setDataEmissao] = useState(hojeISO());
  const [dataEntrega, setDataEntrega] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [observacoes, setObservacoes] = useState("");
  const [comprovante, setComprovante] = useState<ComprovantePedido | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [proximoPedidoId, setProximoPedidoId] = useState<number | null>(null);
  const [erroCarregamento, setErroCarregamento] = useState("");
  const [falhaFechamento, setFalhaFechamento] = useState("");
  const proximoItemId = useRef(1);

  /**
   * Todas as listas vêm do mesmo servidor (src/Api/Api.ts). As respostas são
   * normalizadas porque a API pode devolver campos com nomes diferentes.
   */
  const carregarCadastros = useCallback(async () => {
    setCarregandoProdutos(true);

    const [clientes, funcionarios, transportadoras, produtos, vendas] =
      await Promise.allSettled([
        api.get<unknown>(API_CLIENTES_URL).then((r) => r.data),
        api.get<unknown>(API_FUNCIONARIOS_URL).then((r) => r.data),
        api.get<unknown>(API_TRANSPORTADORAS_URL).then((r) => r.data),
        api.get<unknown>(API_PRODUTOS_URL).then((r) => r.data),
        api.get<unknown>(API_VENDAS_URL).then((r) => r.data),
      ]);

    const falhas: string[] = [];

    if (clientes.status === "fulfilled") {
      setClientesCadastrados(normalizarClientes(clientes.value));
    } else {
      setClientesCadastrados([]);
      falhas.push("clientes");
    }

    if (funcionarios.status === "fulfilled") {
      setFuncionariosCadastrados(normalizarFuncionarios(funcionarios.value));
    } else {
      setFuncionariosCadastrados([]);
      falhas.push("funcionários");
    }

    if (transportadoras.status === "fulfilled") {
      setTransportadorasCadastradas(
        normalizarTransportadoras(transportadoras.value),
      );
    } else {
      // Sem lista o campo vira um ID digitado, mas a falha é avisada.
      setTransportadorasCadastradas([]);
      falhas.push("transportadoras");
    }

    if (produtos.status === "fulfilled") {
      setProdutosCadastrados(normalizarProdutos(produtos.value));
    } else {
      setProdutosCadastrados([]);
      falhas.push("produtos");
    }

    if (vendas.status === "fulfilled") {
      const ids = extrairLista(vendas.value)
        .map((venda) => lerNumero(comoObjeto(venda) ?? {}, "id"))
        .filter((id) => Number.isFinite(id));
      setProximoPedidoId(ids.length > 0 ? Math.max(...ids) + 1 : 1);
    } else {
      setProximoPedidoId(null);
    }

    setErroCarregamento(
      falhas.length > 0
        ? `Não foi possível carregar: ${falhas.join(", ")}.`
        : "",
    );
    setCarregandoProdutos(false);
  }, []);

  useEffect(() => {
    async function iniciar() {
      await carregarCadastros();
    }

    void iniciar();
  }, [carregarCadastros]);

  function tentarNovamente() {
    setErroCarregamento("");
    void carregarCadastros();
  }

  const clienteSelecionado = clientesCadastrados.find(
    (cliente) => cliente.id === Number(clienteSelecionadoId)
  );
  const produtoSelecionado = produtosCadastrados.find(
    (produto) => produto.id === Number(produtoSelecionadoId)
  );
  const clientesParaSelecionar = useMemo(() => {
    const termoGlobal = normalizarBusca(buscaGlobal);

    return clientesCadastrados.filter(
      (cliente) =>
        cliente.id === Number(clienteSelecionadoId) ||
        !termoGlobal ||
        normalizarBusca(
          `${cliente.id} ${cliente.nome} ${cliente.cpf} ${cliente.contato} ${cliente.email}`,
        ).includes(termoGlobal),
    );
  }, [buscaGlobal, clienteSelecionadoId, clientesCadastrados]);
  const produtosParaSelecionar = useMemo(() => {
    const termoGlobal = normalizarBusca(buscaGlobal);

    return produtosCadastrados.filter(
      (produto) =>
        produto.id === Number(produtoSelecionadoId) ||
        !termoGlobal ||
        normalizarBusca(
          `${produto.id} ${produto.nome} ${produto.codigo} ${produto.estoque ?? ""}`,
        ).includes(termoGlobal),
    );
  }, [buscaGlobal, produtoSelecionadoId, produtosCadastrados]);
  const estoqueSelecionado = produtoSelecionado?.estoque ?? null;
  const subtotalProduto = (produtoSelecionado?.preco ?? 0) * quantidade;
  const subtotalPedido = useMemo(
    () => itensPedido.reduce((total, item) => total + item.subtotal, 0),
    [itensPedido]
  );
  const itensPedidoOrdenados = useMemo(() => {
    if (!ordenacaoItens) return itensPedido;
    return ordenarLista(
      itensPedido,
      (item) => {
        switch (ordenacaoItens.coluna) {
          case "produto": return item.nome;
          case "codigo": return item.codigo;
          case "quantidade": return item.quantidade;
          case "preco": return item.precoUnitario;
          case "subtotal": return item.subtotal;
        }
      },
      ordenacaoItens.direcao,
    );
  }, [itensPedido, ordenacaoItens]);

  function alternarOrdenacaoItens(coluna: ColunaOrdenacaoItemPedido) {
    setOrdenacaoItens((atual) => ({
      coluna,
      direcao: atual?.coluna === coluna && atual.direcao === "desc" ? "asc" : "desc",
    }));
  }
  /** O desconto é informado em porcentagem e aplicado sobre o subtotal. */
  const valorDesconto = useMemo(
    () => (subtotalPedido * descontoPercentual) / 100,
    [descontoPercentual, subtotalPedido],
  );
  const totalPedido = Math.max(subtotalPedido - valorDesconto + frete, 0);
  const valoresParcelas = useMemo(
    () => dividirEmParcelas(totalPedido, parcelas),
    [parcelas, totalPedido],
  );
  const anoEmissao = Number(dataEmissao.slice(0, 4)) || new Date().getFullYear();
  const permiteParcelamento =
    formaPagamento === "cartao_credito" || formaPagamento === "boleto";

  function alterarFormaPagamento(valor: string) {
    setFormaPagamento(valor);

    if (valor !== "cartao_credito" && valor !== "boleto") {
      setParcelas(1);
    }
  }

  const quantidadeInvalida =
    quantidade < 1 || (estoqueSelecionado !== null && quantidade > estoqueSelecionado);

  function formatarDinheiro(valor: number) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  /** Notificação de erro exibida no canto da tela. */
  function avisarErro(mensagem: string) {
    mostrar("erro", "Deu erro", mensagem);
  }

  function adicionarProduto() {
    if (!produtoSelecionado) {
      avisarErro("Selecione um produto cadastrado.");
      return;
    }
    if (!Number.isInteger(quantidade) || quantidade < 1) {
      avisarErro("Informe uma quantidade válida.");
      return;
    }

    const itemExistente = itensPedido.find((item) => item.produtoId === produtoSelecionado.id);
    const quantidadeAtual = itemExistente?.quantidade ?? 0;
    const quantidadeTotal = quantidadeAtual + quantidade;

    if (produtoSelecionado.estoque !== null && quantidadeTotal > produtoSelecionado.estoque) {
      avisarErro(`Estoque disponível para ${produtoSelecionado.nome}: ${produtoSelecionado.estoque}. Já adicionado ao pedido: ${quantidadeAtual}.`);
      return;
    }

    if (itemExistente) {
      setItensPedido((itensAtuais) =>
        itensAtuais.map((item) =>
          item.produtoId === produtoSelecionado.id
            ? { ...item, quantidade: quantidadeTotal, subtotal: quantidadeTotal * item.precoUnitario }
            : item
        )
      );
    } else {
      const novoItem: ItemPedido = {
        id: proximoItemId.current++,
        produtoId: produtoSelecionado.id,
        nome: produtoSelecionado.nome,
        codigo: produtoSelecionado.codigo,
        quantidade,
        precoUnitario: produtoSelecionado.preco,
        subtotal: quantidade * produtoSelecionado.preco,
      };
      setItensPedido((itensAtuais) => [...itensAtuais, novoItem]);
    }

    setProdutoSelecionadoId("");
    quantidadeCampo.resetar();
  }

  function removerProduto(itemId: number) {
    setItensPedido((itensAtuais) => itensAtuais.filter((item) => item.id !== itemId));
  }

  function limparAtendimento() {
    setClienteSelecionadoId("");
    setProdutoSelecionadoId("");
    quantidadeCampo.resetar();
    setItensPedido([]);
    descontoCampo.resetar();
    freteCampo.resetar();
    setFormaPagamento("");
    setTransportadoraId("");
    setFuncionarioId("");
    setDataEmissao(hojeISO());
    setDataEntrega("");
    setParcelas(1);
    setObservacoes("");
  }

  async function finalizarPedido() {
    if (salvando) {
      return;
    }

    if (!clienteSelecionado) {
      avisarErro("Selecione um cliente.");
      return;
    }
    if (itensPedido.length === 0) {
      avisarErro("Adicione pelo menos um produto.");
      return;
    }
    if (!formaPagamento) {
      avisarErro("Selecione a forma de pagamento.");
      return;
    }
    if (!funcionarioId) {
      avisarErro("Selecione o funcionário responsável.");
      return;
    }
    if (!transportadoraId || !Number.isInteger(Number(transportadoraId)) || Number(transportadoraId) <= 0) {
      avisarErro(
        transportadorasCadastradas.length > 0
          ? "Selecione a transportadora."
          : "Informe um ID de transportadora válido.",
      );
      return;
    }
    if (!dataEmissao) {
      avisarErro("Informe a data de emissão.");
      return;
    }
    if (dataEntrega && dataEntrega < dataEmissao) {
      avisarErro("A data de entrega não pode ser anterior à data de emissão.");
      return;
    }
    if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 12) {
      avisarErro("O parcelamento deve ser entre 1 e 12 vezes.");
      return;
    }
    if (descontoPercentual < 0 || descontoPercentual > 100) {
      avisarErro("O desconto deve ser entre 0% e 100%.");
      return;
    }
    if (!Number.isFinite(totalPedido) || totalPedido <= 0) {
      avisarErro("O total do pedido precisa ser maior que zero.");
      return;
    }

    for (const item of itensPedido) {
      const produto = produtosCadastrados.find(
        (cadastrado) => cadastrado.id === item.produtoId,
      );

      if (
        produto &&
        produto.estoque !== null &&
        item.quantidade > produto.estoque
      ) {
        avisarErro(
          `Estoque insuficiente para ${item.nome}: disponível ${produto.estoque} un.`,
        );
        return;
      }
    }

    let envioIniciado = false;
    let vendaCriadaId: number | null = null;

    try {
      setSalvando(true);
      setErroCarregamento("");

      envioIniciado = true;
      const respostaVenda = await api.post<unknown>(API_VENDAS_URL, {
        id_status: "pendente",
        cliente_id: clienteSelecionado.id,
        transportadoras_id: Number(transportadoraId),
        funcionarios_id: Number(funcionarioId),
      });

      const corpoVenda = comoObjeto(respostaVenda.data);
      const venda =
        comoObjeto(corpoVenda?.data) ?? comoObjeto(corpoVenda?.venda) ?? corpoVenda;
      const vendaId = Number(venda?.id);
      if (!Number.isFinite(vendaId) || vendaId <= 0) {
        throw new Error(
          "A API não retornou o ID da venda. Verifique a resposta do endpoint /vendas.",
        );
      }
      vendaCriadaId = vendaId;

      // Registra cada produto do pedido e a saída correspondente no estoque
      for (const item of itensPedido) {
        await api.post<unknown>(API_ITENS_VENDA_URL, {
          quantidade: item.quantidade,
          preco: Number(item.precoUnitario.toFixed(2)),
          vendas_id: vendaId,
          produtos_id: item.produtoId,
        });

        await api.post<unknown>("/fluxo-caixa", {
          tipo: "saida",
          produto_id: item.produtoId,
          quantidade: item.quantidade,
          preco_unitario: Number(item.precoUnitario.toFixed(2)),
          descricao: `Venda ${formatarCodigoPedido(vendaId, anoEmissao)} — ${clienteSelecionado.nome}`,
          venda_id: vendaId,
        });
      }

      // Cada parcela vira um pagamento com vencimento mensal a partir da emissão
      const statusPagamento =
        formaPagamento === "boleto" ? "pendente" : "aprovado";

      for (const [indice, valor] of valoresParcelas.entries()) {
        await api.post<unknown>(API_PAGAMENTOS_URL, {
          metodo_pagamento: formaPagamento,
          valo_pagamento: valor,
          status_pagamento: statusPagamento,
          data_pagamento: somarMeses(dataEmissao, indice),
          vendas_id: vendaId,
        });
      }

      const funcionario = funcionariosCadastrados.find(
        (item) => item.id === Number(funcionarioId),
      );
      const transportadora = transportadorasCadastradas.find(
        (item) => item.id === Number(transportadoraId),
      );

      const codigoPedido = formatarCodigoPedido(vendaId, anoEmissao);

      setComprovante({
        vendaId,
        codigo: codigoPedido,
        dataEmissao,
        dataEntrega,
        cliente: clienteSelecionado,
        funcionarioNome: funcionario?.nome || `Funcionário #${funcionarioId}`,
        transportadoraNome:
          transportadora?.nome || `Transportadora #${transportadoraId}`,
        itens: [...itensPedido],
        subtotal: subtotalPedido,
        descontoPercentual,
        desconto: valorDesconto,
        frete,
        total: totalPedido,
        formaPagamento,
        parcelas: valoresParcelas,
        observacoes: observacoes.trim(),
      });

      setProximoPedidoId(vendaId + 1);
      setFalhaFechamento("");
      limparAtendimento();
      void carregarCadastros();

      mostrar(
        "sucesso",
        "Venda confirmada!",
        `${codigoPedido} foi registrado com sucesso.`,
      );
    } catch (erro: unknown) {
      console.error("Erro ao registrar venda, itens ou pagamento:", erro);

      if (envioIniciado) {
        const identificacao = vendaCriadaId
          ? `A venda #${vendaCriadaId} foi criada, mas uma etapa posterior falhou.`
          : "Não foi possível confirmar se a API criou a venda.";

        // O aviso é informativo: não bloqueia a abertura de uma nova venda.
        const aviso = `${identificacao} ${descreverErro(erro)} Confira na API o que já foi gravado antes de reenviar.`;
        setFalhaFechamento(aviso);
        avisarErro(aviso);
      } else {
        avisarErro(descreverErro(erro));
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="atendimento">
      <div className="atendimento-principal">
        <div className="atendimento-cabecalho">
          <div>
            <h1 className="medium-h1">Novo pedido</h1>
            <p className="light-h3">Selecione o cliente e adicione os produtos da venda.</p>
          </div>
          <span className="atendimento-status medium-h3">Em preenchimento</span>
        </div>

        {erroCarregamento && (
          <div className="atendimento-aviso atendimento-aviso-erro" role="alert">
            <div>
              <strong className="medium-h3">{erroCarregamento}</strong>
              <small>Servidor: {API_URL}</small>
            </div>
            <button
              type="button"
              className="atendimento-aviso-acao"
              onClick={tentarNovamente}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {falhaFechamento && (
          <div className="atendimento-aviso atendimento-aviso-erro" role="alert">
            <div>
              <strong className="medium-h3">Fechamento interrompido</strong>
              <small>{falhaFechamento}</small>
            </div>
            <div className="atendimento-aviso-acoes">
              <button
                type="button"
                className="atendimento-aviso-acao"
                onClick={() => {
                  limparAtendimento();
                  setFalhaFechamento("");
                }}
              >
                Iniciar nova venda
              </button>
              <button
                type="button"
                className="atendimento-aviso-acao"
                onClick={() => setFalhaFechamento("")}
              >
                Fechar aviso
              </button>
            </div>
          </div>
        )}

        <div className="atendimento-secao">
          <h2 className="medium-h2">Informações do pedido</h2>
          <div className="atendimento-grid atendimento-grid-quatro">
            <div className="atendimento-campo">
              <label className="medium-h3">Código do pedido</label>
              <input
                type="text"
                value={proximoPedidoId !== null ? formatarCodigoPedido(proximoPedidoId, anoEmissao) : "Carregando..."}
                readOnly
              />
            </div>
            <div className="atendimento-campo">
              <label className="medium-h3" htmlFor="data-emissao">Data de emissão</label>
              <input id="data-emissao" type="date" value={dataEmissao} onChange={(evento) => setDataEmissao(evento.target.value)} />
            </div>
            <div className="atendimento-campo">
              <label className="medium-h3" htmlFor="data-entrega">Data de entrega</label>
              <input id="data-entrega" type="date" min={dataEmissao} value={dataEntrega} onChange={(evento) => setDataEntrega(evento.target.value)} />
            </div>
            <div className="atendimento-campo">
              <label className="medium-h3" htmlFor="funcionario">ID do funcionário</label>
              {funcionariosCadastrados.length > 0 ? (
                <select id="funcionario" value={funcionarioId} onChange={(evento) => setFuncionarioId(evento.target.value)}>
                  <option value="">Selecione o ID do funcionário</option>
                  {funcionariosCadastrados.map((funcionario) => (
                    <option key={funcionario.id} value={funcionario.id}>{funcionario.id} — {funcionario.nome}</option>
                  ))}
                </select>
              ) : (
                <>
                  <input id="funcionario" type="number" min="1" value={funcionarioId} onChange={(evento) => setFuncionarioId(evento.target.value)} placeholder="ID do funcionário" />
                  <small className="atendimento-dica">Nenhum funcionário retornado pela API; informe o ID manualmente.</small>
                </>
              )}
            </div>
            <div className="atendimento-campo">
              <label className="medium-h3" htmlFor="transportadora">Transportadora</label>
              {transportadorasCadastradas.length > 0 ? (
                <select id="transportadora" value={transportadoraId} onChange={(evento) => setTransportadoraId(evento.target.value)}>
                  <option value="">Selecione a transportadora</option>
                  {transportadorasCadastradas.map((transportadora) => (
                    <option key={transportadora.id} value={transportadora.id}>
                      {transportadora.id} — {transportadora.nome}
                      {transportadora.contato ? ` · ${transportadora.contato}` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input id="transportadora" type="number" min="1" value={transportadoraId} onChange={(evento) => setTransportadoraId(evento.target.value)} placeholder="ID da transportadora" />
                  <small className="atendimento-dica">Nenhuma transportadora retornada pela API; informe o ID manualmente.</small>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="atendimento-secao">
          <h2 className="medium-h2">Cliente</h2>
          <div className="atendimento-grid atendimento-grid-cliente">
            <div className="atendimento-campo">
              <label className="medium-h3" htmlFor="cliente">Selecionar cliente</label>
              <select id="cliente" value={clienteSelecionadoId} onChange={(evento) => setClienteSelecionadoId(evento.target.value)}>
                <option value="">Selecione um cliente</option>
                {clientesParaSelecionar.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome} — {cliente.cpf}</option>)}
                {clientesParaSelecionar.length === 0 && <option disabled>Nenhum cliente encontrado</option>}
              </select>
            </div>
            <div className="atendimento-campo">
              <label className="medium-h3">CPF</label>
              <input type="text" value={clienteSelecionado?.cpf ?? ""} placeholder="CPF do cliente" readOnly />
            </div>
            <div className="atendimento-campo">
              <label className="medium-h3">Telefone</label>
              <input type="text" value={clienteSelecionado?.contato ?? ""} placeholder="Telefone do cliente" readOnly />
            </div>
            <div className="atendimento-campo">
              <label className="medium-h3">E-mail</label>
              <input type="text" value={clienteSelecionado?.email ?? ""} placeholder="E-mail do cliente" readOnly />
            </div>
          </div>
        </div>

        <div className="atendimento-secao">
          <h2 className="medium-h2">Adicionar produto</h2>
          <div className="atendimento-produto">
            <div className="atendimento-campo">
              <label className="medium-h3" htmlFor="produto">Produto</label>
              <select id="produto" value={produtoSelecionadoId} onChange={(evento) => setProdutoSelecionadoId(evento.target.value)} disabled={carregandoProdutos}>
                <option value="">{carregandoProdutos ? "Carregando produtos..." : produtosCadastrados.length === 0 ? "Nenhum produto cadastrado na API" : "Selecione um produto"}</option>
                {produtosParaSelecionar.map((produto) => (
                  <option key={produto.id} value={produto.id} disabled={produto.estoque !== null && produto.estoque <= 0}>
                    {produto.nome} — {formatarDinheiro(produto.preco)}
                    {produto.estoque === null ? "" : produto.estoque > 0 ? ` (estoque: ${produto.estoque})` : " (sem estoque)"}
                  </option>
                ))}
                {produtosParaSelecionar.length === 0 && <option disabled>Nenhum produto encontrado</option>}
              </select>
              {!carregandoProdutos && produtosCadastrados.length === 0 && (
                <small className="atendimento-dica">
                  A API {API_URL} não retornou produtos. Cadastre um produto ou ajuste o endereço em src/Api/Api.ts.
                </small>
              )}
              {!carregandoProdutos && produtosCadastrados.length > 0 && produtosCadastrados.every((produto) => produto.estoque !== null && produto.estoque <= 0) && (
                <small className="atendimento-dica">
                  Todos os produtos estão sem estoque. Reponha no Inventário para poder vender.
                </small>
              )}
            </div>
            <div className="atendimento-campo">
              <label className="medium-h3">Código</label>
              <input type="text" value={produtoSelecionado?.codigo ?? ""} placeholder="Código" readOnly />
            </div>
            <div className="atendimento-campo">
              <label className="medium-h3">Preço unitário</label>
              <input type="text" value={produtoSelecionado ? formatarDinheiro(produtoSelecionado.preco) : ""} placeholder="R$ 0,00" readOnly />
            </div>
            <div className="atendimento-campo">
              <label className="medium-h3" htmlFor="quantidade">Quantidade</label>
              <CampoNumero
                id="quantidade"
                texto={quantidadeCampo.texto}
                aoAlterar={quantidadeCampo.alterar}
                maximo={estoqueSelecionado ?? undefined}
                ariaLabel="Quantidade de produtos"
              />
            </div>
            <div className="atendimento-campo">
              <label className="medium-h3">Subtotal</label>
              <input type="text" value={formatarDinheiro(subtotalProduto)} readOnly />
            </div>
            <button type="button" className="atendimento-adicionar medium-h3" onClick={adicionarProduto} disabled={!produtoSelecionado || carregandoProdutos || quantidadeInvalida}>
              Adicionar
            </button>
          </div>
        </div>

        <div className="atendimento-secao">
          <div className="atendimento-secao-topo">
            <h2 className="medium-h2">Itens do pedido</h2>
            <span className="light-h3">{itensPedido.length} item(ns)</span>
          </div>
          <div className="atendimento-tabela-container">
            <table className="atendimento-tabela">
              <thead><tr>
                <SortableHeader label="Produto" active={ordenacaoItens?.coluna === "produto"} direction={ordenacaoItens?.direcao ?? "desc"} onClick={() => alternarOrdenacaoItens("produto")} />
                <SortableHeader label="Código" active={ordenacaoItens?.coluna === "codigo"} direction={ordenacaoItens?.direcao ?? "desc"} onClick={() => alternarOrdenacaoItens("codigo")} />
                <SortableHeader label="Quantidade" active={ordenacaoItens?.coluna === "quantidade"} direction={ordenacaoItens?.direcao ?? "desc"} onClick={() => alternarOrdenacaoItens("quantidade")} />
                <SortableHeader label="Preço unitário" active={ordenacaoItens?.coluna === "preco"} direction={ordenacaoItens?.direcao ?? "desc"} onClick={() => alternarOrdenacaoItens("preco")} />
                <SortableHeader label="Subtotal" active={ordenacaoItens?.coluna === "subtotal"} direction={ordenacaoItens?.direcao ?? "desc"} onClick={() => alternarOrdenacaoItens("subtotal")} />
                <th aria-label="Ações" />
              </tr></thead>
              <tbody>
                {itensPedido.length === 0 ? (
                  <tr><td className="atendimento-sem-itens light-h3" colSpan={6}>Nenhum produto adicionado.</td></tr>
                ) : itensPedidoOrdenados.map((item) => (
                  <tr key={item.id}>
                    <td className="medium-h3">{item.nome}</td><td className="light-h3">{item.codigo}</td><td className="light-h3">{item.quantidade}</td><td className="light-h3">{formatarDinheiro(item.precoUnitario)}</td><td className="medium-h3">{formatarDinheiro(item.subtotal)}</td>
                    <td><button type="button" className="atendimento-remover" onClick={() => removerProduto(item.id)} aria-label={`Remover ${item.nome}`}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="atendimento-informacoes-finais">
          <div className="atendimento-secao atendimento-pagamento">
            <h2 className="medium-h2">Pagamento e informações fiscais</h2>
            <div className="atendimento-grid atendimento-grid-dois">
              <div className="atendimento-campo">
                <label className="medium-h3">Forma de pagamento</label>
                <select value={formaPagamento} onChange={(evento) => alterarFormaPagamento(evento.target.value)}>
                  <option value="" disabled>Selecione</option>
                  <option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao_credito">Cartão de crédito</option><option value="cartao_debito">Cartão de débito</option><option value="boleto">Boleto</option>
                </select>
              </div>
              <div className="atendimento-campo">
                <label className="medium-h3" htmlFor="parcelamento">Parcelamento</label>
                <select
                  id="parcelamento"
                  value={parcelas}
                  disabled={!permiteParcelamento}
                  onChange={(evento) => setParcelas(Number(evento.target.value))}
                >
                  {Array.from({ length: 12 }, (_, indice) => indice + 1).map((opcao) => {
                    const valor = dividirEmParcelas(totalPedido, opcao)[0] ?? 0;
                    const rotulo =
                      opcao === 1
                        ? `À vista — ${formatarDinheiro(totalPedido)}`
                        : `${opcao}x de ${formatarDinheiro(valor)}`;

                    return (
                      <option key={opcao} value={opcao}>
                        {rotulo}
                      </option>
                    );
                  })}
                </select>
                {!permiteParcelamento && (
                  <small className="atendimento-dica">
                    Parcelamento disponível apenas para cartão de crédito e boleto.
                  </small>
                )}
              </div>
            </div>
            <div className="atendimento-campo">
              <label className="medium-h3" htmlFor="observacoes">Observações</label>
              <textarea
                id="observacoes"
                rows={4}
                value={observacoes}
                onChange={(evento) => setObservacoes(evento.target.value)}
                placeholder="Informações adicionais do pedido ou da nota fiscal"
              />
            </div>
          </div>

          <aside className="atendimento-resumo">
            <h2 className="medium-h2">Resumo do pedido</h2>
            <div className="atendimento-resumo-linha"><span className="light-h3">Subtotal</span><strong className="medium-h3">{formatarDinheiro(subtotalPedido)}</strong></div>
            <div className="atendimento-resumo-campo">
              <label className="light-h3" htmlFor="desconto">Desconto</label>
              <CampoNumero
                id="desconto"
                texto={descontoCampo.texto}
                aoAlterar={descontoCampo.alterar}
                sufixo="%"
                maximo={100}
                ariaLabel="Desconto em porcentagem"
              />
            </div>
            <div className="atendimento-resumo-linha"><span className="light-h3">Desconto aplicado</span><strong className="medium-h3">− {formatarDinheiro(valorDesconto)}</strong></div>
            <div className="atendimento-resumo-campo">
              <label className="light-h3" htmlFor="frete">Frete</label>
              <CampoNumero
                id="frete"
                texto={freteCampo.texto}
                aoAlterar={freteCampo.alterar}
                prefixo="R$"
                placeholder="0"
                ariaLabel="Frete em reais"
              />
            </div>
            <div className="atendimento-resumo-linha"><span className="light-h3">Parcelas</span><strong className="medium-h3">{parcelas === 1 ? "À vista" : `${parcelas}x de ${formatarDinheiro(valoresParcelas[0] ?? 0)}`}</strong></div>
            <div className="atendimento-resumo-total"><span className="medium-h2">Total</span><strong className="bold-h1">{formatarDinheiro(totalPedido)}</strong></div>
          </aside>
        </div>

        <div className="atendimento-acoes">
          <div onClick={salvando ? undefined : limparAtendimento} aria-disabled={salvando}>
            <Button texto="Cancelar" cor="btn-secundaria" />
          </div>
          <div
            className={salvando ? "atendimento-acao-bloqueada" : ""}
            onClick={salvando ? undefined : () => void finalizarPedido()}
            aria-disabled={salvando}
          >
            <Button texto={salvando ? "Salvando..." : "Confirmar"} cor="btn-primaria" />
          </div>
        </div>
      </div>

      {comprovante && (
        <div className="atendimento-comprovante-fundo">
          <article
            className="atendimento-comprovante"
            role="dialog"
            aria-modal="true"
            aria-labelledby="comprovante-titulo"
          >
            <header className="atendimento-comprovante-cabecalho">
              <div>
                <h2 id="comprovante-titulo" className="medium-h2">Comprovante do pedido</h2>
                <p className="light-h3">
                  {comprovante.codigo} · emitido em {formatarDataBr(comprovante.dataEmissao)}
                </p>
              </div>
              <button
                type="button"
                className="atendimento-comprovante-fechar"
                onClick={() => setComprovante(null)}
                aria-label="Fechar comprovante"
              >
                ×
              </button>
            </header>

            <div className="atendimento-comprovante-dados">
              <div>
                <span className="light-h3">Cliente</span>
                <strong className="medium-h3">{comprovante.cliente.nome}</strong>
                <small>{comprovante.cliente.cpf || "CPF não informado"}</small>
                <small>{comprovante.cliente.contato || "Telefone não informado"}</small>
              </div>
              <div>
                <span className="light-h3">Entrega</span>
                <strong className="medium-h3">{formatarDataBr(comprovante.dataEntrega)}</strong>
                <small>{comprovante.transportadoraNome}</small>
              </div>
              <div>
                <span className="light-h3">Responsável</span>
                <strong className="medium-h3">{comprovante.funcionarioNome}</strong>
                <small>Venda #{comprovante.vendaId}</small>
              </div>
            </div>

            <div className="atendimento-comprovante-tabela-container">
              <table className="atendimento-comprovante-tabela">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Código</th>
                    <th>Qtd.</th>
                    <th>Unitário</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {comprovante.itens.map((item) => (
                    <tr key={item.id}>
                      <td>{item.nome}</td>
                      <td>{item.codigo}</td>
                      <td>{item.quantidade}</td>
                      <td>{formatarDinheiro(item.precoUnitario)}</td>
                      <td>{formatarDinheiro(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="atendimento-comprovante-totais">
              <div><span>Subtotal</span><strong>{formatarDinheiro(comprovante.subtotal)}</strong></div>
              <div><span>Desconto ({comprovante.descontoPercentual}%)</span><strong>− {formatarDinheiro(comprovante.desconto)}</strong></div>
              <div><span>Frete</span><strong>{formatarDinheiro(comprovante.frete)}</strong></div>
              <div className="atendimento-comprovante-total"><span>Total</span><strong>{formatarDinheiro(comprovante.total)}</strong></div>
            </div>

            <div className="atendimento-comprovante-pagamento">
              <span className="light-h3">
                Pagamento · {ROTULOS_PAGAMENTO[comprovante.formaPagamento] ?? comprovante.formaPagamento}
              </span>
              <ul>
                {comprovante.parcelas.map((valor, indice) => (
                  <li key={indice}>
                    <span>
                      {comprovante.parcelas.length > 1
                        ? `${indice + 1}/${comprovante.parcelas.length} — vencimento ${formatarDataBr(somarMeses(comprovante.dataEmissao, indice))}`
                        : "À vista"}
                    </span>
                    <strong>{formatarDinheiro(valor)}</strong>
                  </li>
                ))}
              </ul>
            </div>

            {comprovante.observacoes && (
              <div className="atendimento-comprovante-observacoes">
                <span className="light-h3">Observações</span>
                <p>{comprovante.observacoes}</p>
              </div>
            )}

            <footer className="atendimento-comprovante-acoes">
              <button type="button" className="atendimento-comprovante-fechar-texto" onClick={() => setComprovante(null)}>
                Fechar
              </button>
              <button type="button" className="atendimento-comprovante-imprimir" onClick={() => window.print()}>
                Imprimir
              </button>
            </footer>
          </article>
        </div>
      )}

      <Notificacao notificacoes={notificacoes} aoFechar={fechar} />
    </section>
  );
}

export default Atendimento;