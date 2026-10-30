/**
 * Tipos espelhando o contrato da API de Vendas (OAS 3.0 / v1.1.2).
 *
 * Observações de contrato:
 * - `Pagamento.valo_pagamento` é escrito assim na API (sem "r"). Não corrigir no front.
 * - Na movimentação de fluxo de caixa a data chega como `data` (ISO 8601),
 *   diferente das telas antigas que usavam `data_movimentacao`.
 * - `codigo_barra` e `descricao` podem vir nulos.
 */

/* =========================
   Clientes
========================= */

export interface Cliente {
  id: number;
  cpf: string;
  nome: string;
  contato: string;
  rua: string;
  numero: number;
  complemento: string | null;
  cidade: string;
  estado: string;
  email: string;
}

export type ClientePayload = Omit<Cliente, "id">;

/* =========================
   Produtos
========================= */

export interface Produto {
  id: number;
  nome: string;
  descricao: string | null;
  codigo_barra: string | null;
  quantidade: number;
  tipo: string;
  preco: number;
}

export type ProdutoPayload = Omit<Produto, "id">;

/** Subconjunto de produto devolvido dentro de /fluxo-caixa. */
export interface ProdutoResumo {
  id: number;
  nome: string;
  preco: number;
}

/* =========================
   Funcionários e cargos
========================= */

export interface Cargo {
  id: number;
  nome: string;
}

export type CargoPayload = Omit<Cargo, "id">;

export interface Funcionario {
  id: number;
  nome: string;
  cpf: string;
  rg: string;
  data_nasc: string;
  estado_civil: string;
  contato: string;
  endereco_id: number;
  cargo_id: number;
  departamento_id: number;
}

export type FuncionarioPayload = Omit<Funcionario, "id">;

/* =========================
   Vendas
========================= */

export interface Venda {
  id: number;
  id_status: string;
  cliente_id: number;
  transportadoras_id: number;
  funcionarios_id: number;
  /** Presente quando a API expande o relacionamento. */
  cliente?: Cliente;
  pagamentos?: Pagamento[];
}

export type VendaPayload = Pick<
  Venda,
  "id_status" | "cliente_id" | "transportadoras_id" | "funcionarios_id"
>;

export interface ItemVenda {
  id: number;
  quantidade: number;
  preco: number;
  vendas_id: number;
  produtos_id: number;
}

export type ItemVendaPayload = Omit<ItemVenda, "id">;

export interface Pagamento {
  id: number;
  metodo_pagamento: string;
  /** Grafia do contrato: "valo_pagamento". */
  valo_pagamento: number;
  status_pagamento: string;
  data_pagamento: string;
  id_transa__o_operadora?: string | null;
  mensagem_retorno?: string | null;
  vendas_id: number;
}

export type PagamentoPayload = Omit<Pagamento, "id">;

/* =========================
   Estoque e fluxo de caixa
========================= */

export type TipoMovimentacao = "entrada" | "saida";

/** Item de `GET /fluxo-caixa` — o razão de entradas e saídas. */
export interface MovimentacaoEstoque {
  id: number;
  tipo: TipoMovimentacao;
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
  /** ISO 8601 gerado pelo servidor (ex.: "2026-10-28T17:57:14.000Z"). */
  data: string;
  descricao: string;
  venda_id: number | null;
  produto: ProdutoResumo | null;
  vendas: Venda | null;
}

/** Corpo de `POST /fluxo-caixa`. A data é gerada pelo servidor. */
export interface MovimentacaoPayload {
  tipo: TipoMovimentacao;
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
  descricao: string;
  venda_id?: number;
}

/* =========================
   Agregações
========================= */

export interface Relatorio {
  totalClientes: number;
  totalProdutos: number;
  totalVendas: number;
  totalPagamentos: number;
  valorTotalPagamentos: number;
}

export interface ProdutoBaixoEstoque {
  id: number;
  nome: string;
  quantidade: number;
  preco: number;
}

export interface Dashboard extends Relatorio {
  vendasRecentes: Venda[];
  produtosBaixoEstoque: ProdutoBaixoEstoque[];
}
