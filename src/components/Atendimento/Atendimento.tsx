import { useEffect, useMemo, useState } from "react";
import axios from "axios";
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

const API_BASE = "https://vendas.gabrielpimentel.com.br";
const API_CLIENTES_URL = `${API_BASE}/clientes`;
const API_FUNCIONARIOS_URL = `${API_BASE}/funcionarios`;
const API_TRANSPORTADORAS_URL = `${API_BASE}/transportadoras`;
const API_PRODUTOS_URL = `${API_BASE}/produtos`;
const API_VENDAS_URL = `${API_BASE}/vendas`;
const API_ITENS_VENDA_URL = `${API_BASE}/itemvenda`;
const API_PAGAMENTOS_URL = `${API_BASE}/pagamentos`;

function hojeISO() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

// A API não tem coluna de código: o código do pedido é o ID da venda
function formatarCodigoPedido(id: number) {
  return `PED-${new Date().getFullYear()}-${String(id).padStart(3, "0")}`;
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
    .map((item: any) => ({
      id: Number(item.id ?? item.cliente_id),
      nome: String(item.nome ?? item.nome_cliente ?? ""),
      cpf: String(item.cpf ?? ""),
      contato: String(item.contato ?? item.telefone ?? item.celular ?? ""),
      email: String(item.email ?? ""),
    }))
    .filter((cliente) => Number.isFinite(cliente.id) && cliente.id > 0 && cliente.nome.trim() !== "");
}

function normalizarFuncionarios(dados: unknown): Funcionario[] {
  return extrairLista(dados)
    .map((item: any) => ({
      id: Number(item.id ?? item.funcionario_id),
      nome: String(item.nome ?? ""),
    }))
    .filter((f) => Number.isFinite(f.id) && f.id > 0 && f.nome.trim() !== "");
}

function normalizarTransportadoras(dados: unknown): Transportadora[] {
  return extrairLista(dados)
    .map((item: any) => {
      const id = Number(item.id ?? item.transportadora_id ?? item.transportadoras_id);
      return {
        id,
        nome: String(item.nome ?? item.razao_social ?? item.nome_fantasia ?? `Transportadora ${id}`),
      };
    })
    .filter((t) => Number.isFinite(t.id) && t.id > 0);
}

function normalizarProdutos(dados: unknown): Produto[] {
  return extrairLista(dados)
    .map((item: any) => {
      const estoqueBruto = item.quantidade ?? item.estoque ?? item.qtd_estoque;
      const estoque =
        estoqueBruto === undefined || estoqueBruto === null || estoqueBruto === ""
          ? null
          : Number(estoqueBruto);

      return {
        id: Number(item.id ?? item.produto_id),
        nome: String(item.nome ?? item.nome_produto ?? ""),
        codigo: String(item.codigo ?? item.codigo_produto ?? `PROD-${item.id ?? item.produto_id ?? ""}`),
        preco: Number(item.preco ?? item.valor ?? item.preco_unitario ?? 0),
        estoque: estoque !== null && Number.isFinite(estoque) ? estoque : null,
      };
    })
    .filter((produto) =>
      Number.isFinite(produto.id) &&
      produto.id > 0 &&
      produto.nome.trim() !== "" &&
      Number.isFinite(produto.preco) &&
      produto.preco >= 0
    );
}

function Atendimento() {
  const [clientesCadastrados, setClientesCadastrados] = useState<Cliente[]>([]);
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState("");
  const [funcionariosCadastrados, setFuncionariosCadastrados] = useState<Funcionario[]>([]);
  const [transportadorasCadastradas, setTransportadorasCadastradas] = useState<Transportadora[]>([]);
  const [produtosCadastrados, setProdutosCadastrados] = useState<Produto[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(true);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([]);
  const [desconto, setDesconto] = useState(0);
  const [frete, setFrete] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [transportadoraId, setTransportadoraId] = useState("");
  const [funcionarioId, setFuncionarioId] = useState("");
  const [dataEmissao, setDataEmissao] = useState(hojeISO());
  const [dataEntrega, setDataEntrega] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [proximoPedidoId, setProximoPedidoId] = useState<number | null>(null);

  useEffect(() => {
    async function buscarClientes() {
      try {
        const resposta = await axios.get<unknown>(API_CLIENTES_URL);
        const lista = normalizarClientes(resposta.data);
        setClientesCadastrados(lista);
        if (lista.length === 0) {
          console.warn("A API de clientes não retornou uma lista reconhecida:", resposta.data);
        }
      } catch (erro) {
        console.error("Erro ao buscar clientes da API:", erro);
        alert("Não foi possível carregar os clientes. Confira a API de clientes.");
      }
    }

    async function buscarProximoPedido() {
      try {
        const resposta = await axios.get<unknown>(API_VENDAS_URL);
        const ids = extrairLista(resposta.data)
          .map((venda: any) => Number(venda.id))
          .filter((id) => Number.isFinite(id));
        setProximoPedidoId(ids.length > 0 ? Math.max(...ids) + 1 : 1);
      } catch (erro) {
        console.error("Erro ao buscar vendas da API:", erro);
      }
    }

    async function buscarTransportadoras() {
      try {
        const resposta = await axios.get<unknown>(API_TRANSPORTADORAS_URL);
        setTransportadorasCadastradas(normalizarTransportadoras(resposta.data));
      } catch (erro) {
        // Se a rota não existir, o campo continua como ID digitado
        console.warn("Não foi possível carregar as transportadoras:", erro);
      }
    }

    async function buscarFuncionarios() {
      try {
        const resposta = await axios.get<unknown>(API_FUNCIONARIOS_URL);
        setFuncionariosCadastrados(normalizarFuncionarios(resposta.data));
      } catch (erro) {
        console.error("Erro ao buscar funcionários da API:", erro);
        alert("Não foi possível carregar os funcionários. Confira a API de funcionários.");
      }
    }

    async function buscarProdutos() {
      setCarregandoProdutos(true);
      try {
        const resposta = await axios.get<unknown>(API_PRODUTOS_URL);
        console.log("Produtos recebidos da API:", resposta.data);
        const lista = normalizarProdutos(resposta.data);
        setProdutosCadastrados(lista);
        if (lista.length === 0) {
          console.warn("Nenhum produto foi reconhecido na resposta da API:", resposta.data);
        }
      } catch (erro) {
        console.error("Erro ao buscar produtos da API:", erro);
        if (axios.isAxiosError(erro)) {
          alert(`Não foi possível carregar os produtos. ${erro.response?.status ? `Código HTTP: ${erro.response.status}` : erro.message}`);
        } else {
          alert("Não foi possível carregar os produtos cadastrados.");
        }
      } finally {
        setCarregandoProdutos(false);
      }
    }

    void buscarClientes();
    void buscarProximoPedido();
    void buscarTransportadoras();
    void buscarFuncionarios();
    void buscarProdutos();
  }, []);

  const clienteSelecionado = clientesCadastrados.find(
    (cliente) => cliente.id === Number(clienteSelecionadoId)
  );
  const produtoSelecionado = produtosCadastrados.find(
    (produto) => produto.id === Number(produtoSelecionadoId)
  );
  const estoqueSelecionado = produtoSelecionado?.estoque ?? null;
  const subtotalProduto = (produtoSelecionado?.preco ?? 0) * quantidade;
  const subtotalPedido = useMemo(
    () => itensPedido.reduce((total, item) => total + item.subtotal, 0),
    [itensPedido]
  );
  const totalPedido = Math.max(subtotalPedido - desconto + frete, 0);

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
        id: Date.now(),
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
  }

  async function finalizarPedido() {
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
    if (dataEntrega && dataEmissao && dataEntrega < dataEmissao) {
      alert("A data de entrega não pode ser anterior à data de emissão.");
      return;
    }
    if (!Number.isFinite(totalPedido) || totalPedido <= 0) {
      alert("O total do pedido precisa ser maior que zero.");
      return;
    }

    try {
      setSalvando(true);
      const respostaVenda = await axios.post(API_VENDAS_URL, {
        id_status: "pendente",
        cliente_id: clienteSelecionado.id,
        transportadoras_id: Number(transportadoraId),
        funcionarios_id: Number(funcionarioId),
      });

      const venda = respostaVenda.data?.data ?? respostaVenda.data;
      const vendaId = Number(venda?.id ?? venda?.venda?.id);
      if (!Number.isFinite(vendaId) || vendaId <= 0) {
        throw new Error("A API não retornou o ID da venda. Verifique a resposta do endpoint /vendas.");
      }

      // Registra cada produto do pedido ligado à venda criada
      for (const item of itensPedido) {
        await axios.post(API_ITENS_VENDA_URL, {
          quantidade: item.quantidade,
          preco: Number(item.precoUnitario.toFixed(2)),
          vendas_id: vendaId,
          produtos_id: item.produtoId,
        });
      }

      await axios.post(API_PAGAMENTOS_URL, {
        metodo_pagamento: formaPagamento,
        valo_pagamento: Number(totalPedido.toFixed(2)),
        status_pagamento: formaPagamento === "boleto" ? "pendente" : "aprovado",
        data_pagamento: hojeISO(),
        vendas_id: vendaId,
      });

      alert(
        `Pedido ${formatarCodigoPedido(vendaId)} registrado com sucesso!\nItens: ${itensPedido.length}\nFuncionário (ID): ${funcionarioId}\nTransportadora (ID): ${transportadoraId}`
      );
      setProximoPedidoId(vendaId + 1);
      limparAtendimento();
    } catch (erro: unknown) {
      console.error("Erro ao registrar venda, itens ou pagamento:", erro);
      if (axios.isAxiosError(erro)) {
        const dadosErro = erro.response?.data as any;
        const mensagemApi = typeof dadosErro === "string"
          ? dadosErro
          : dadosErro?.message || dadosErro?.mensagem || dadosErro?.error;
        alert(`A API não conseguiu concluir a operação.\n\n${mensagemApi || erro.message}\nCódigo HTTP: ${erro.response?.status ?? "sem resposta do servidor"}\n\nConfira se o ID da transportadora existe na API.`);
      } else {
        alert(`Não foi possível concluir a operação: ${erro instanceof Error ? erro.message : "Erro inesperado."}`);
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

        <div className="atendimento-secao">
          <h2 className="medium-h2">Informações do pedido</h2>
          <div className="atendimento-grid atendimento-grid-quatro">
            <div className="atendimento-campo">
              <label className="medium-h3">Código do pedido</label>
              <input
                type="text"
                value={proximoPedidoId !== null ? formatarCodigoPedido(proximoPedidoId) : "Carregando..."}
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
              <select id="funcionario" value={funcionarioId} onChange={(evento) => setFuncionarioId(evento.target.value)}>
                <option value="">Selecione o ID do funcionário</option>
                {funcionariosCadastrados.map((funcionario) => (
                  <option key={funcionario.id} value={funcionario.id}>{funcionario.id} — {funcionario.nome}</option>
                ))}
              </select>
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
              <select id="cliente" value={clienteSelecionadoId} onChange={(evento) => setClienteSelecionadoId(evento.target.value)}>
                <option value="">Selecione um cliente</option>
                {clientesCadastrados.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
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
                <option value="">{carregandoProdutos ? "Carregando produtos..." : produtosCadastrados.length === 0 ? "Nenhum produto cadastrado" : "Selecione um produto"}</option>
                {produtosCadastrados.map((produto) => (
                  <option key={produto.id} value={produto.id} disabled={produto.estoque !== null && produto.estoque <= 0}>
                    {produto.nome} — {formatarDinheiro(produto.preco)}
                    {produto.estoque !== null ? ` (estoque: ${produto.estoque})` : ""}
                  </option>
                ))}
              </select>
              {!carregandoProdutos && produtosCadastrados.length === 0 && <small>Verifique o retorno do GET /produtos no Console do navegador.</small>}
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
              <thead><tr><th className="medium-h3">Produto</th><th className="medium-h3">Código</th><th className="medium-h3">Quantidade</th><th className="medium-h3">Preço unitário</th><th className="medium-h3">Subtotal</th><th aria-label="Ações" /></tr></thead>
              <tbody>
                {itensPedido.length === 0 ? (
                  <tr><td className="atendimento-sem-itens light-h3" colSpan={6}>Nenhum produto adicionado.</td></tr>
                ) : itensPedido.map((item) => (
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
                <select value={formaPagamento} onChange={(evento) => setFormaPagamento(evento.target.value)}>
                  <option value="" disabled>Selecione</option>
                  <option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao_credito">Cartão de crédito</option><option value="cartao_debito">Cartão de débito</option><option value="boleto">Boleto</option>
                </select>
              </div>
              <div className="atendimento-campo">
                <label className="medium-h3">Parcelamento</label>
                <select defaultValue="1"><option value="1">À vista</option><option value="2">2 parcelas</option><option value="3">3 parcelas</option><option value="4">4 parcelas</option><option value="5">5 parcelas</option><option value="6">6 parcelas</option></select>
              </div>
            </div>
            <div className="atendimento-campo">
              <label className="medium-h3">Observações</label>
              <textarea rows={4} placeholder="Informações adicionais do pedido ou da nota fiscal" />
            </div>
          </div>

          <aside className="atendimento-resumo">
            <h2 className="medium-h2">Resumo do pedido</h2>
            <div className="atendimento-resumo-linha"><span className="light-h3">Subtotal</span><strong className="medium-h3">{formatarDinheiro(subtotalPedido)}</strong></div>
            <div className="atendimento-resumo-campo"><label className="light-h3">Desconto</label><input type="number" min="0" value={desconto} onChange={(evento) => setDesconto(Math.max(0, Number(evento.target.value)))} /></div>
            <div className="atendimento-resumo-campo"><label className="light-h3">Frete</label><input type="number" min="0" value={frete} onChange={(evento) => setFrete(Math.max(0, Number(evento.target.value)))} /></div>
            <div className="atendimento-resumo-total"><span className="medium-h2">Total</span><strong className="bold-h1">{formatarDinheiro(totalPedido)}</strong></div>
          </aside>
        </div>

        <div className="atendimento-acoes">
          <div onClick={salvando ? undefined : limparAtendimento} aria-disabled={salvando}>
            <Button texto="Cancelar" cor="btn-secundaria" />
          </div>
          <div onClick={salvando ? undefined : () => void finalizarPedido()} aria-disabled={salvando}>
            <Button texto={salvando ? "Salvando..." : "Confirmar"} cor="btn-primaria" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Atendimento;