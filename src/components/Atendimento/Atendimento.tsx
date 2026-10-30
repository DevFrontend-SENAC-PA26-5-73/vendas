import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, API_BASE_URL, descreverErro } from "../../lib/api";
import SortableHeader from "../SortableHeader/SortableHeader";
import { ordenarLista } from "../../lib/ordenacao";
import type { DirecaoOrdenacao } from "../../lib/ordenacao";
import "./Atendimento.css";
import Button from "../Button/Button";

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
const API_TRANSPORTADORAS_URL = "/transportadoras";
const API_PRODUTOS_URL = "/produtos";
const API_VENDAS_URL = "/vendas";
const API_ITENS_VENDA_URL = "/itemvenda";
const API_PAGAMENTOS_URL = "/pagamentos";
const CHAVE_FALHA_FECHAMENTO = "vendas:atendimento:falha-fechamento";

function lerFalhaFechamentoSalva() {
  try {
    return sessionStorage.getItem(CHAVE_FALHA_FECHAMENTO) ?? "";
  } catch {
    return "";
  }
}

function salvarFalhaFechamento(texto: string) {
  try {
    sessionStorage.setItem(CHAVE_FALHA_FECHAMENTO, texto);
  } catch {
    return;
  }
}

function limparFalhaFechamentoSalva() {
  try {
    sessionStorage.removeItem(CHAVE_FALHA_FECHAMENTO);
  } catch {
    return;
  }
}

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

function paraValorMonetario(valor: string): number {
  const numero = Number(valor.replace(",", "."));

  return Number.isFinite(numero) && numero > 0 ? numero : 0;
}

function normalizarBusca(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function Atendimento({ buscaGlobal }: { buscaGlobal: string }) {
  const [clientesCadastrados, setClientesCadastrados] = useState<Cliente[]>([]);
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState("");
  const [buscaCliente, setBuscaCliente] = useState("");
  const [funcionariosCadastrados, setFuncionariosCadastrados] = useState<Funcionario[]>([]);
  const [transportadorasCadastradas, setTransportadorasCadastradas] = useState<Transportadora[]>([]);
  const [produtosCadastrados, setProdutosCadastrados] = useState<Produto[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(true);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState("");
  const [buscaProduto, setBuscaProduto] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([]);
    const [ordenacaoItens, setOrdenacaoItens] = useState<{
      coluna: ColunaOrdenacaoItemPedido;
      direcao: DirecaoOrdenacao;
    } | null>(null);
  const [desconto, setDesconto] = useState(0);
  const [frete, setFrete] = useState(0);
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
  const [falhaFechamento, setFalhaFechamento] = useState(
    lerFalhaFechamentoSalva,
  );
  const proximoItemId = useRef(1);

  /**
   * Todas as listas vêm do mesmo servidor (VITE_API_URL). As respostas são
   * normalizadas porque a API pode devolver campos com nomes diferentes.
   */
  const carregarCadastros = useCallback(async () => {
    setCarregandoProdutos(true);

    const [clientes, funcionarios, transportadoras, produtos, vendas] =
      await Promise.allSettled([
        apiRequest<unknown>(API_CLIENTES_URL),
        apiRequest<unknown>(API_FUNCIONARIOS_URL),
        apiRequest<unknown>(API_TRANSPORTADORAS_URL),
        apiRequest<unknown>(API_PRODUTOS_URL),
        apiRequest<unknown>(API_VENDAS_URL),
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
      // Rota opcional: sem lista o campo vira um ID digitado.
      setTransportadorasCadastradas([]);
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
    const termo = normalizarBusca(buscaCliente);
    const termoGlobal = normalizarBusca(buscaGlobal);
    return clientesCadastrados.filter((cliente) =>
      cliente.id === Number(clienteSelecionadoId) ||
      ((!termo || normalizarBusca(
          `${cliente.id} ${cliente.nome} ${cliente.cpf} ${cliente.contato} ${cliente.email}`,
        ).includes(termo)) &&
        (!termoGlobal || normalizarBusca(
          `${cliente.id} ${cliente.nome} ${cliente.cpf} ${cliente.contato} ${cliente.email}`,
        ).includes(termoGlobal))),
    );
  }, [buscaGlobal, buscaCliente, clienteSelecionadoId, clientesCadastrados]);
  const produtosParaSelecionar = useMemo(() => {
    const termo = normalizarBusca(buscaProduto);
    const termoGlobal = normalizarBusca(buscaGlobal);
    return produtosCadastrados.filter((produto) =>
      produto.id === Number(produtoSelecionadoId) ||
      ((!termo || normalizarBusca(
          `${produto.id} ${produto.nome} ${produto.codigo} ${produto.estoque ?? ""}`,
        ).includes(termo)) &&
        (!termoGlobal || normalizarBusca(
          `${produto.id} ${produto.nome} ${produto.codigo} ${produto.estoque ?? ""}`,
        ).includes(termoGlobal))),
    );
  }, [buscaGlobal, buscaProduto, produtoSelecionadoId, produtosCadastrados]);
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
  const totalPedido = Math.max(subtotalPedido - desconto + frete, 0);
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

  function adicionarProduto() {
    if (!produtoSelecionado) {
      alert("Selecione um produto cadastrado.");
      return;
    }
    if (!Number.isInteger(quantidade) || quantidade < 1) {
      alert("Informe uma quantidade válida.");
      return;
    }

    const itemExistente = itensPedido.find((item) => item.produtoId === produtoSelecionado.id);
    const quantidadeAtual = itemExistente?.quantidade ?? 0;
    const quantidadeTotal = quantidadeAtual + quantidade;

    if (produtoSelecionado.estoque !== null && quantidadeTotal > produtoSelecionado.estoque) {
      alert(`Estoque disponível para ${produtoSelecionado.nome}: ${produtoSelecionado.estoque}. Já adicionado ao pedido: ${quantidadeAtual}.`);
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
    setQuantidade(1);
  }

  function removerProduto(itemId: number) {
    setItensPedido((itensAtuais) => itensAtuais.filter((item) => item.id !== itemId));
  }

  function limparAtendimento() {
    setClienteSelecionadoId("");
    setProdutoSelecionadoId("");
    setQuantidade(1);
    setItensPedido([]);
    setDesconto(0);
    setFrete(0);
    setFormaPagamento("");
    setTransportadoraId("");
    setFuncionarioId("");
    setDataEmissao(hojeISO());
    setDataEntrega("");
    setParcelas(1);
    setObservacoes("");
  }

  async function finalizarPedido() {
    if (salvando || falhaFechamento) {
      return;
    }

    if (!clienteSelecionado) {
      alert("Selecione um cliente.");
      return;
    }
    if (itensPedido.length === 0) {
      alert("Adicione pelo menos um produto.");
      return;
    }
    if (!formaPagamento) {
      alert("Selecione a forma de pagamento.");
      return;
    }
    if (!funcionarioId) {
      alert("Selecione o funcionário responsável.");
      return;
    }
    if (!transportadoraId || !Number.isInteger(Number(transportadoraId)) || Number(transportadoraId) <= 0) {
      alert("Informe um ID de transportadora válido.");
      return;
    }
    if (!dataEmissao) {
      alert("Informe a data de emissão.");
      return;
    }
    if (dataEntrega && dataEntrega < dataEmissao) {
      alert("A data de entrega não pode ser anterior à data de emissão.");
      return;
    }
    if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 12) {
      alert("O parcelamento deve ser entre 1 e 12 vezes.");
      return;
    }
    if (desconto > subtotalPedido) {
      alert("O desconto não pode ser maior que o subtotal dos itens.");
      return;
    }
    if (!Number.isFinite(totalPedido) || totalPedido <= 0) {
      alert("O total do pedido precisa ser maior que zero.");
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
        alert(
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
      const respostaVenda = await apiRequest<unknown>(API_VENDAS_URL, {
        method: "POST",
        body: JSON.stringify({
          id_status: "pendente",
          cliente_id: clienteSelecionado.id,
          transportadoras_id: Number(transportadoraId),
          funcionarios_id: Number(funcionarioId),
        }),
      });

      const corpoVenda = comoObjeto(respostaVenda);
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
        await apiRequest<unknown>(API_ITENS_VENDA_URL, {
          method: "POST",
          body: JSON.stringify({
            quantidade: item.quantidade,
            preco: Number(item.precoUnitario.toFixed(2)),
            vendas_id: vendaId,
            produtos_id: item.produtoId,
          }),
        });

        await apiRequest<unknown>("/fluxo-caixa", {
          method: "POST",
          body: JSON.stringify({
            tipo: "saida",
            produto_id: item.produtoId,
            quantidade: item.quantidade,
            preco_unitario: Number(item.precoUnitario.toFixed(2)),
            descricao: `Venda ${formatarCodigoPedido(vendaId, anoEmissao)} — ${clienteSelecionado.nome}`,
            venda_id: vendaId,
          }),
        });
      }

      // Cada parcela vira um pagamento com vencimento mensal a partir da emissão
      const statusPagamento =
        formaPagamento === "boleto" ? "pendente" : "aprovado";

      for (const [indice, valor] of valoresParcelas.entries()) {
        await apiRequest<unknown>(API_PAGAMENTOS_URL, {
          method: "POST",
          body: JSON.stringify({
            metodo_pagamento: formaPagamento,
            valo_pagamento: valor,
            status_pagamento: statusPagamento,
            data_pagamento: somarMeses(dataEmissao, indice),
            vendas_id: vendaId,
          }),
        });
      }

      const funcionario = funcionariosCadastrados.find(
        (item) => item.id === Number(funcionarioId),
      );
      const transportadora = transportadorasCadastradas.find(
        (item) => item.id === Number(transportadoraId),
      );

      setComprovante({
        vendaId,
        codigo: formatarCodigoPedido(vendaId, anoEmissao),
        dataEmissao,
        dataEntrega,
        cliente: clienteSelecionado,
        funcionarioNome: funcionario?.nome || `Funcionário #${funcionarioId}`,
        transportadoraNome:
          transportadora?.nome || `Transportadora #${transportadoraId}`,
        itens: [...itensPedido],
        subtotal: subtotalPedido,
        desconto,
        frete,
        total: totalPedido,
        formaPagamento,
        parcelas: valoresParcelas,
        observacoes: observacoes.trim(),
      });

      setProximoPedidoId(vendaId + 1);
      setFalhaFechamento("");
      limparFalhaFechamentoSalva();
      limparAtendimento();
      void carregarCadastros();
    } catch (erro: unknown) {
      console.error("Erro ao registrar venda, itens ou pagamento:", erro);

      if (envioIniciado) {
        const identificacao = vendaCriadaId
          ? `A venda #${vendaCriadaId} foi criada, mas uma etapa posterior falhou.`
          : "Não foi possível confirmar se a API criou a venda.";

        const aviso = `${identificacao} ${descreverErro(erro)} Consulte a venda, os itens, o estoque e os pagamentos na API antes de liberar um novo pedido. Não reenvie esta operação.`;
        setFalhaFechamento(aviso);
        salvarFalhaFechamento(aviso);
      } else {
        alert(descreverErro(erro));
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
              <small>Servidor: {API_BASE_URL}</small>
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
            <button
              type="button"
              className="atendimento-aviso-acao"
              onClick={() => {
                const confirmou = window.confirm(
                  "Só libere um novo pedido depois de conferir e reconciliar a venda anterior na API. Deseja continuar?",
                );

                if (confirmou) {
                  limparAtendimento();
                  setFalhaFechamento("");
                  limparFalhaFechamentoSalva();
                }
              }}
            >
              Já conferi; novo pedido
            </button>
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
              <label className="medium-h3" htmlFor="transportadora">ID da transportadora</label>
              {transportadorasCadastradas.length > 0 ? (
                <select id="transportadora" value={transportadoraId} onChange={(evento) => setTransportadoraId(evento.target.value)}>
                  <option value="">Selecione o ID da transportadora</option>
                  {transportadorasCadastradas.map((transportadora) => (
                    <option key={transportadora.id} value={transportadora.id}>{transportadora.id} — {transportadora.nome}</option>
                  ))}
                </select>
              ) : (
                <input id="transportadora" type="number" min="1" value={transportadoraId} onChange={(evento) => setTransportadoraId(evento.target.value)} placeholder="ID da transportadora" />
              )}
            </div>
          </div>
        </div>

        <div className="atendimento-secao">
          <h2 className="medium-h2">Cliente</h2>
          <div className="atendimento-grid atendimento-grid-cliente">
            <div className="atendimento-campo">
              <label className="medium-h3" htmlFor="cliente">Selecionar cliente</label>
              <input
                id="buscar-cliente"
                type="search"
                value={buscaCliente}
                onChange={(evento) => setBuscaCliente(evento.target.value)}
                placeholder="Buscar por nome, CPF, telefone ou e-mail"
                aria-label="Buscar cliente"
              />
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
              <input
                id="buscar-produto"
                type="search"
                value={buscaProduto}
                onChange={(evento) => setBuscaProduto(evento.target.value)}
                placeholder="Buscar por produto ou código"
                aria-label="Buscar produto"
                disabled={carregandoProdutos}
              />
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
                  A API {API_BASE_URL} não retornou produtos. Cadastre um produto ou ajuste VITE_API_URL.
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
              <input id="quantidade" type="number" min="1" max={estoqueSelecionado ?? undefined} value={quantidade} onChange={(evento) => setQuantidade(Number(evento.target.value))} />
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
            <div className="atendimento-resumo-campo"><label className="light-h3" htmlFor="desconto">Desconto</label><input id="desconto" type="number" min="0" step="0.01" value={desconto} onChange={(evento) => setDesconto(paraValorMonetario(evento.target.value))} /></div>
            <div className="atendimento-resumo-campo"><label className="light-h3" htmlFor="frete">Frete</label><input id="frete" type="number" min="0" step="0.01" value={frete} onChange={(evento) => setFrete(paraValorMonetario(evento.target.value))} /></div>
            <div className="atendimento-resumo-linha"><span className="light-h3">Parcelas</span><strong className="medium-h3">{parcelas === 1 ? "À vista" : `${parcelas}x de ${formatarDinheiro(valoresParcelas[0] ?? 0)}`}</strong></div>
            <div className="atendimento-resumo-total"><span className="medium-h2">Total</span><strong className="bold-h1">{formatarDinheiro(totalPedido)}</strong></div>
          </aside>
        </div>

        <div className="atendimento-acoes">
          <div onClick={salvando ? undefined : limparAtendimento} aria-disabled={salvando}>
            <Button texto="Cancelar" cor="btn-secundaria" />
          </div>
          <div
            className={
              salvando || falhaFechamento
                ? "atendimento-acao-bloqueada"
                : ""
            }
            onClick={
              salvando || falhaFechamento
                ? undefined
                : () => void finalizarPedido()
            }
            aria-disabled={salvando || Boolean(falhaFechamento)}
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
              <div><span>Desconto</span><strong>− {formatarDinheiro(comprovante.desconto)}</strong></div>
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
    </section>
  );
}

export default Atendimento;