import { useMemo, useState } from "react";
import { Pencil, Search, Trash2 } from "lucide-react";

import Button from "../Button/Button";

import "./Clientes.css";

type Cliente = {
  id: number;
  cpf: string;
  nome: string;
  contato: string;
  endereco: string;
  email: string;
};

type FormularioCliente = {
  cpf: string;
  nome: string;
  contato: string;
  endereco: string;
  email: string;
};

const formularioInicial: FormularioCliente = {
  cpf: "",
  nome: "",
  contato: "",
  endereco: "",
  email: "",
};

const clientesIniciais: Cliente[] = [
  {
    id: 1,
    cpf: "123.456.789-00",
    nome: "Maria Silva",
    contato: "(11) 98765-4321",
    endereco: "Rua das Flores, 123 - São Paulo/SP",
    email: "maria.silva@email.com",
  },
  {
    id: 2,
    cpf: "987.654.321-00",
    nome: "João da Silva",
    contato: "(91) 98888-7777",
    endereco: "Av. Barão do Rio Branco, 245 - Castanhal/PA",
    email: "joao.silva@email.com",
  },
  {
    id: 3,
    cpf: "456.789.123-10",
    nome: "Carlos Oliveira",
    contato: "(91) 97777-6666",
    endereco: "Travessa Primeiro de Maio, 400 - Castanhal/PA",
    email: "carlos.oliveira@email.com",
  },
];

function Clientes() {
  const [clientes, setClientes] =
    useState<Cliente[]>(clientesIniciais);

  const [formulario, setFormulario] =
    useState<FormularioCliente>(formularioInicial);

  const [filtro, setFiltro] = useState("");
  const [clienteEmEdicao, setClienteEmEdicao] =
    useState<number | null>(null);

  const clientesFiltrados = useMemo(() => {
    const termo = filtro.trim().toLowerCase();

    if (!termo) {
      return clientes;
    }

    return clientes.filter((cliente) => {
      return (
        cliente.nome.toLowerCase().includes(termo) ||
        cliente.cpf.toLowerCase().includes(termo) ||
        cliente.contato.toLowerCase().includes(termo) ||
        cliente.endereco.toLowerCase().includes(termo) ||
        cliente.email.toLowerCase().includes(termo)
      );
    });
  }, [clientes, filtro]);

  function alterarCampo(
    campo: keyof FormularioCliente,
    valor: string
  ) {
    setFormulario((dadosAtuais) => ({
      ...dadosAtuais,
      valor,
    }));
  }

  function limparFormulario() {
    setFormulario(formularioInicial);
    setClienteEmEdicao(null);
  }

  function salvarCliente() {
    const camposPreenchidos =
      formulario.nome.trim() &&
      formulario.cpf.trim() &&
      formulario.contato.trim() &&
      formulario.endereco.trim() &&
      formulario.email.trim();

    if (!camposPreenchidos) {
      alert("Preencha todos os campos do cliente.");
      return;
    }

    if (clienteEmEdicao !== null) {
      setClientes((clientesAtuais) =>
        clientesAtuais.map((cliente) =>
          cliente.id === clienteEmEdicao
            ? {
                ...cliente,
                ...formulario,
              }
            : cliente
        )
      );

      limparFormulario();
      return;
    }

    const novoCliente: Cliente = {
      id: Date.now(),
      ...formulario,
    };

    setClientes((clientesAtuais) => [
      novoCliente,
      ...clientesAtuais,
    ]);

    limparFormulario();
  }

  function editarCliente(cliente: Cliente) {
    setFormulario({
      cpf: cliente.cpf,
      nome: cliente.nome,
      contato: cliente.contato,
      endereco: cliente.endereco,
      email: cliente.email,
    });

    setClienteEmEdicao(cliente.id);
  }

  function excluirCliente(clienteId: number) {
    setClientes((clientesAtuais) =>
      clientesAtuais.filter(
        (cliente) => cliente.id !== clienteId
      )
    );

    if (clienteEmEdicao === clienteId) {
      limparFormulario();
    }
  }

  return (
    <section className="pagina-clientes">
      <div className="clientes-cadastro">
        <header className="clientes-cabecalho">
          <div>
            <h1 className="medium-h1">
              {clienteEmEdicao !== null
                ? "Editar cliente"
                : "Cadastro de cliente"}
            </h1>

            <p className="light-h3">
              Preencha as informações para cadastrar um cliente.
            </p>
          </div>

          <span className="clientes-status medium-h3">
            {clienteEmEdicao !== null
              ? "Em edição"
              : "Novo cliente"}
          </span>
        </header>

        <div className="clientes-formulario">
          <div className="cliente-campo cliente-campo-nome">
            <label
              className="medium-h3"
              htmlFor="cliente-nome"
            >
              Nome completo
            </label>

            <input
              id="cliente-nome"
              type="text"
              placeholder="Ex: Maria Silva"
              value={formulario.nome}
              onChange={(evento) =>
                alterarCampo("nome", evento.target.value)
              }
            />
          </div>

          <div className="cliente-campo">
            <label
              className="medium-h3"
              htmlFor="cliente-cpf"
            >
              CPF
            </label>

            <input
              id="cliente-cpf"
              type="text"
              placeholder="Ex: 123.456.789-00"
              value={formulario.cpf}
              onChange={(evento) =>
                alterarCampo("cpf", evento.target.value)
              }
            />
          </div>

          <div className="cliente-campo">
            <label
              className="medium-h3"
              htmlFor="cliente-contato"
            >
              Contato
            </label>

            <input
              id="cliente-contato"
              type="tel"
              placeholder="Ex: (11) 98765-4321"
              value={formulario.contato}
              onChange={(evento) =>
                alterarCampo("contato", evento.target.value)
              }
            />
          </div>

          <div className="cliente-campo cliente-campo-endereco">
            <label
              className="medium-h3"
              htmlFor="cliente-endereco"
            >
              Endereço
            </label>

            <input
              id="cliente-endereco"
              type="text"
              placeholder="Ex: Rua das Flores, 123 - São Paulo/SP"
              value={formulario.endereco}
              onChange={(evento) =>
                alterarCampo("endereco", evento.target.value)
              }
            />
          </div>

          <div className="cliente-campo cliente-campo-email">
            <label
              className="medium-h3"
              htmlFor="cliente-email"
            >
              E-mail
            </label>

            <input
              id="cliente-email"
              type="email"
              placeholder="Ex: maria.silva@email.com"
              value={formulario.email}
              onChange={(evento) =>
                alterarCampo("email", evento.target.value)
              }
            />
          </div>
        </div>

        <div className="clientes-acoes">
          <div onClick={limparFormulario}>
            <Button
              texto="Cancelar"
              cor="btn-secundaria"
            />
          </div>

          <div onClick={salvarCliente}>
            <Button
              texto={
                clienteEmEdicao !== null
                  ? "Atualizar"
                  : "Salvar"
              }
              cor="btn-primaria"
            />
          </div>
        </div>
      </div>

      <div className="clientes-listagem">
        <div className="clientes-listagem-cabecalho">
          <div>
            <h2 className="medium-h1">
              Clientes cadastrados
            </h2>

            <p className="light-h3">
              {clientesFiltrados.length} cliente(s) encontrado(s)
            </p>
          </div>

          <div className="clientes-filtro">
            <Search
              className="clientes-filtro-icone"
              size={18}
            />

            <input
              type="search"
              placeholder="Pesquisar por nome, CPF, contato ou e-mail"
              value={filtro}
              onChange={(evento) =>
                setFiltro(evento.target.value)
              }
            />
          </div>
        </div>

        <div className="clientes-tabela-container">
          <table className="clientes-tabela">
            <thead>
              <tr>
                <th className="medium-h3">Nome</th>
                <th className="medium-h3">CPF</th>
                <th className="medium-h3">Contato</th>
                <th className="medium-h3">Endereço</th>
                <th className="medium-h3">E-mail</th>
                <th
                  className="clientes-coluna-acoes"
                  aria-label="Ações"
                />
              </tr>
            </thead>

            <tbody>
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td
                    className="clientes-sem-resultados light-h3"
                    colSpan={6}
                  >
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id}>
                    <td className="medium-h3">
                      {cliente.nome}
                    </td>

                    <td className="light-h3">
                      {cliente.cpf}
                    </td>

                    <td className="light-h3">
                      {cliente.contato}
                    </td>

                    <td className="light-h3">
                      {cliente.endereco}
                    </td>

                    <td className="light-h3">
                      {cliente.email}
                    </td>

                    <td>
                      <div className="clientes-acoes-linha">
                        <button
                          type="button"
                          className="cliente-acao cliente-editar"
                          onClick={() =>
                            editarCliente(cliente)
                          }
                          aria-label={`Editar ${cliente.nome}`}
                          title="Editar cliente"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          className="cliente-acao cliente-excluir"
                          onClick={() =>
                            excluirCliente(cliente.id)
                          }
                          aria-label={`Excluir ${cliente.nome}`}
                          title="Excluir cliente"
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

export default Clientes;