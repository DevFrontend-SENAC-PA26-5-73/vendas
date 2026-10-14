import { useMemo, useState } from "react";

import "./Atendimento.css";

import Button from "../Button/Button";

type Cliente = {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
};

type Produto = {
  id: number;
  nome: string;
  codigo: string;
  preco: number;
  estoque: number;
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

const clientesCadastrados: Cliente[] = [
  {
    id: 1,
    nome: "João da Silva",
    cpf: "543.387.398-23",
    telefone: "(91) 98888-7777",
    email: "joao@email.com",
  },
  {
    id: 2,
    nome: "Maria Oliveira",
    cpf: "421.785.963-10",
    telefone: "(91) 97777-6666",
    email: "maria@email.com",
  },
  {
    id: 3,
    nome: "Carlos Souza",
    cpf: "385.741.269-55",
    telefone: "(91) 96666-5555",
    email: "carlos@email.com",
  },
];

const produtosCadastrados: Produto[] = [
  {
    id: 1,
    nome: "Notebook empresarial",
    codigo: "PROD-001",
    preco: 3499,
    estoque: 15,
  },
  {
    id: 2,
    nome: "Monitor LED 24 polegadas",
    codigo: "PROD-002",
    preco: 899,
    estoque: 32,
  },
  {
    id: 3,
    nome: "Cadeira de escritório",
    codigo: "PROD-003",
    preco: 780,
    estoque: 20,
  },
  {
    id: 4,
    nome: "Impressora térmica",
    codigo: "PROD-004",
    preco: 650,
    estoque: 12,
  },
];

function Atendimento() {
  const [clienteSelecionadoId, setClienteSelecionadoId] =
    useState("");

  const [produtoSelecionadoId, setProdutoSelecionadoId] =
    useState("");

  const [quantidade, setQuantidade] = useState(1);
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([]);

  const [desconto, setDesconto] = useState(0);
  const [frete, setFrete] = useState(0);

  const clienteSelecionado = clientesCadastrados.find(
    (cliente) => cliente.id === Number(clienteSelecionadoId)
  );

  const produtoSelecionado = produtosCadastrados.find(
    (produto) => produto.id === Number(produtoSelecionadoId)
  );

  const subtotalProduto =
    (produtoSelecionado?.preco ?? 0) * quantidade;

  const subtotalPedido = useMemo(() => {
    return itensPedido.reduce(
      (total, item) => total + item.subtotal,
      0
    );
  }, [itensPedido]);

  const totalPedido = Math.max(
    subtotalPedido - desconto + frete,
    0
  );

  function formatarDinheiro(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function adicionarProduto() {
    if (!produtoSelecionado || quantidade < 1) {
      return;
    }

    const itemExistente = itensPedido.find(
      (item) => item.produtoId === produtoSelecionado.id
    );

    if (itemExistente) {
      setItensPedido((itensAtuais) =>
        itensAtuais.map((item) => {
          if (item.produtoId !== produtoSelecionado.id) {
            return item;
          }

          const novaQuantidade =
            item.quantidade + quantidade;

          return {
            ...item,
            quantidade: novaQuantidade,
            subtotal:
              novaQuantidade * item.precoUnitario,
          };
        })
      );
    } else {
      const novoItem: ItemPedido = {
        id: Date.now(),
        produtoId: produtoSelecionado.id,
        nome: produtoSelecionado.nome,
        codigo: produtoSelecionado.codigo,
        quantidade,
        precoUnitario: produtoSelecionado.preco,
        subtotal:
          quantidade * produtoSelecionado.preco,
      };

      setItensPedido((itensAtuais) => [
        ...itensAtuais,
        novoItem,
      ]);
    }

    setProdutoSelecionadoId("");
    setQuantidade(1);
  }

  function removerProduto(itemId: number) {
    setItensPedido((itensAtuais) =>
      itensAtuais.filter((item) => item.id !== itemId)
    );
  }

  function limparAtendimento() {
    setClienteSelecionadoId("");
    setProdutoSelecionadoId("");
    setQuantidade(1);
    setItensPedido([]);
    setDesconto(0);
    setFrete(0);
  }

  function finalizarPedido() {
    if (!clienteSelecionado) {
      alert("Selecione um cliente.");
      return;
    }

    if (itensPedido.length === 0) {
      alert("Adicione pelo menos um produto.");
      return;
    }

    alert("Pedido confirmado com sucesso.");
  }

  return (
    <section className="atendimento">
      <div className="atendimento-principal">
        <div className="atendimento-cabecalho">
          <div>
            <h1 className="medium-h1">
              Novo pedido
            </h1>

            <p className="light-h3">
              Selecione o cliente e adicione os produtos da venda.
            </p>
          </div>

          <span className="atendimento-status medium-h3">
            Em preenchimento
          </span>
        </div>

        {/* Informações do pedido */}

        <div className="atendimento-secao">
          <h2 className="medium-h2">
            Informações do pedido
          </h2>

          <div className="atendimento-grid atendimento-grid-quatro">
            <div className="atendimento-campo">
              <label className="medium-h3">
                Código do pedido
              </label>

              <input
                type="text"
                value="PED-2026-001"
                readOnly
              />
            </div>

            <div className="atendimento-campo">
              <label className="medium-h3">
                Data de emissão
              </label>

              <input
                type="date"
                defaultValue="2026-10-14"
              />
            </div>

            <div className="atendimento-campo">
              <label className="medium-h3">
                Data de entrega
              </label>

              <input type="date" />
            </div>

            <div className="atendimento-campo">
              <label className="medium-h3">
                Vendedor
              </label>

              <input
                type="text"
                placeholder="Ex: Maria Oliveira"
              />
            </div>
          </div>
        </div>

        {/* Cliente */}

        <div className="atendimento-secao">
          <h2 className="medium-h2">
            Cliente
          </h2>

          <div className="atendimento-grid atendimento-grid-cliente">
            <div className="atendimento-campo">
              <label
                className="medium-h3"
                htmlFor="cliente"
              >
                Selecionar cliente
              </label>

              <select
                id="cliente"
                value={clienteSelecionadoId}
                onChange={(evento) =>
                  setClienteSelecionadoId(
                    evento.target.value
                  )
                }
              >
                <option value="">
                  Selecione um cliente
                </option>

                {clientesCadastrados.map((cliente) => (
                  <option
                    key={cliente.id}
                    value={cliente.id}
                  >
                    {cliente.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="atendimento-campo">
              <label className="medium-h3">
                CPF
              </label>

              <input
                type="text"
                value={clienteSelecionado?.cpf ?? ""}
                placeholder="CPF do cliente"
                readOnly
              />
            </div>

            <div className="atendimento-campo">
              <label className="medium-h3">
                Telefone
              </label>

              <input
                type="text"
                value={
                  clienteSelecionado?.telefone ?? ""
                }
                placeholder="Telefone do cliente"
                readOnly
              />
            </div>

            <div className="atendimento-campo">
              <label className="medium-h3">
                E-mail
              </label>

              <input
                type="text"
                value={clienteSelecionado?.email ?? ""}
                placeholder="E-mail do cliente"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Produto */}

        <div className="atendimento-secao">
          <h2 className="medium-h2">
            Adicionar produto
          </h2>

          <div className="atendimento-produto">
            <div className="atendimento-campo">
              <label
                className="medium-h3"
                htmlFor="produto"
              >
                Produto
              </label>

              <select
                id="produto"
                value={produtoSelecionadoId}
                onChange={(evento) =>
                  setProdutoSelecionadoId(
                    evento.target.value
                  )
                }
              >
                <option value="">
                  Selecione um produto
                </option>

                {produtosCadastrados.map((produto) => (
                  <option
                    key={produto.id}
                    value={produto.id}
                  >
                    {produto.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="atendimento-campo">
              <label className="medium-h3">
                Código
              </label>

              <input
                type="text"
                value={produtoSelecionado?.codigo ?? ""}
                placeholder="Código"
                readOnly
              />
            </div>

            <div className="atendimento-campo">
              <label className="medium-h3">
                Preço unitário
              </label>

              <input
                type="text"
                value={
                  produtoSelecionado
                    ? formatarDinheiro(
                        produtoSelecionado.preco
                      )
                    : ""
                }
                placeholder="R$ 0,00"
                readOnly
              />
            </div>

            <div className="atendimento-campo">
              <label
                className="medium-h3"
                htmlFor="quantidade"
              >
                Quantidade
              </label>

              <input
                id="quantidade"
                type="number"
                min="1"
                max={produtoSelecionado?.estoque}
                value={quantidade}
                onChange={(evento) =>
                  setQuantidade(
                    Math.max(
                      1,
                      Number(evento.target.value)
                    )
                  )
                }
              />
            </div>

            <div className="atendimento-campo">
              <label className="medium-h3">
                Subtotal
              </label>

              <input
                type="text"
                value={formatarDinheiro(
                  subtotalProduto
                )}
                readOnly
              />
            </div>

            <button
              type="button"
              className="atendimento-adicionar medium-h3"
              onClick={adicionarProduto}
              disabled={!produtoSelecionado}
            >
              Adicionar
            </button>
          </div>
        </div>

        {/* Itens do pedido */}

        <div className="atendimento-secao">
          <div className="atendimento-secao-topo">
            <h2 className="medium-h2">
              Itens do pedido
            </h2>

            <span className="light-h3">
              {itensPedido.length} item(ns)
            </span>
          </div>

          <div className="atendimento-tabela-container">
            <table className="atendimento-tabela">
              <thead>
                <tr>
                  <th className="medium-h3">
                    Produto
                  </th>

                  <th className="medium-h3">
                    Código
                  </th>

                  <th className="medium-h3">
                    Quantidade
                  </th>

                  <th className="medium-h3">
                    Preço unitário
                  </th>

                  <th className="medium-h3">
                    Subtotal
                  </th>

                  <th aria-label="Ações" />
                </tr>
              </thead>

              <tbody>
                {itensPedido.length === 0 ? (
                  <tr>
                    <td
                      className="atendimento-sem-itens light-h3"
                      colSpan={6}
                    >
                      Nenhum produto adicionado.
                    </td>
                  </tr>
                ) : (
                  itensPedido.map((item) => (
                    <tr key={item.id}>
                      <td className="medium-h3">
                        {item.nome}
                      </td>

                      <td className="light-h3">
                        {item.codigo}
                      </td>

                      <td className="light-h3">
                        {item.quantidade}
                      </td>

                      <td className="light-h3">
                        {formatarDinheiro(
                          item.precoUnitario
                        )}
                      </td>

                      <td className="medium-h3">
                        {formatarDinheiro(
                          item.subtotal
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="atendimento-remover"
                          onClick={() =>
                            removerProduto(item.id)
                          }
                          aria-label={`Remover ${item.nome}`}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Informações fiscais e pagamento */}

        <div className="atendimento-informacoes-finais">
          <div className="atendimento-secao atendimento-pagamento">
            <h2 className="medium-h2">
              Pagamento e informações fiscais
            </h2>

            <div className="atendimento-grid atendimento-grid-dois">
              <div className="atendimento-campo">
                <label className="medium-h3">
                  Forma de pagamento
                </label>

                <select defaultValue="">
                  <option value="" disabled>
                    Selecione
                  </option>

                  <option value="pix">Pix</option>
                  <option value="dinheiro">
                    Dinheiro
                  </option>
                  <option value="credito">
                    Cartão de crédito
                  </option>
                  <option value="debito">
                    Cartão de débito
                  </option>
                  <option value="boleto">
                    Boleto
                  </option>
                </select>
              </div>

              <div className="atendimento-campo">
                <label className="medium-h3">
                  Parcelamento
                </label>

                <select defaultValue="1">
                  <option value="1">À vista</option>
                  <option value="2">2 parcelas</option>
                  <option value="3">3 parcelas</option>
                  <option value="4">4 parcelas</option>
                  <option value="5">5 parcelas</option>
                  <option value="6">6 parcelas</option>
                </select>
              </div>
            </div>

            <div className="atendimento-campo">
              <label className="medium-h3">
                Observações
              </label>

              <textarea
                rows={4}
                placeholder="Informações adicionais do pedido ou da nota fiscal"
              />
            </div>
          </div>

          {/* Resumo */}

          <aside className="atendimento-resumo">
            <h2 className="medium-h2">
              Resumo do pedido
            </h2>

            <div className="atendimento-resumo-linha">
              <span className="light-h3">
                Subtotal
              </span>

              <strong className="medium-h3">
                {formatarDinheiro(subtotalPedido)}
              </strong>
            </div>

            <div className="atendimento-resumo-campo">
              <label className="light-h3">
                Desconto
              </label>

              <input
                type="number"
                min="0"
                value={desconto}
                onChange={(evento) =>
                  setDesconto(
                    Number(evento.target.value)
                  )
                }
              />
            </div>

            <div className="atendimento-resumo-campo">
              <label className="light-h3">
                Frete
              </label>

              <input
                type="number"
                min="0"
                value={frete}
                onChange={(evento) =>
                  setFrete(
                    Number(evento.target.value)
                  )
                }
              />
            </div>

            <div className="atendimento-resumo-total">
              <span className="medium-h2">
                Total
              </span>

              <strong className="bold-h1">
                {formatarDinheiro(totalPedido)}
              </strong>
            </div>
          </aside>
        </div>

        {/* Ações */}

        <div className="atendimento-acoes">
          <div onClick={limparAtendimento}>
            <Button
              texto="Cancelar"
              cor="btn-secundaria"
            />
          </div>

          <div onClick={finalizarPedido}>
            <Button
              texto="Confirmar"
              cor="btn-primaria"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Atendimento;