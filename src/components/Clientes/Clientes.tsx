import { useMemo, useState } from "react";
import { Pencil, Search, Trash2 } from "lucide-react";

import Button from "../Button/Button";
import "./Clientes.css";

type Cliente = {
  id: number;
  cpf: string;
  nome: string;
  contato: string;
  rua: string;
  numero: string;
  complemento: string;
  cidade: string;
  estado: string;
  email: string;
};

type FormularioCliente = {
  cpf: string;
  nome: string;
  contato: string;
  rua: string;
  numero: string;
  complemento: string;
  cidade: string;
  estado: string;
  email: string;
};

const formularioInicial: FormularioCliente = {
  cpf: "",
  nome: "",
  contato: "",
  rua: "",
  numero: "",
  complemento: "",
  cidade: "",
  estado: "",
  email: "",
};

// Formata o CPF: 123.456.789-00
function formatarCPF(valor: string): string {
  return valor
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

// Formata o telefone: (11) 98765-4321
function formatarContato(valor: string): string {
  const numeros = valor.replace(/\D/g, "").slice(0, 11);

  if (numeros.length === 0) return "";

  if (numeros.length <= 2) {
    return `(${numeros}`;
  }

  if (numeros.length <= 6) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  }

  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

// Permite apenas letras, acentos e espaços no nome
function formatarNome(valor: string): string {
  return valor.replace(/[^a-zA-ZÀ-ÿ\s]/g, "");
}

// Permite apenas letras, acentos e espaços na cidade
function formatarCidade(valor: string): string {
  return valor.replace(/[^a-zA-ZÀ-ÿ\s]/g, "");
}

// Permite apenas duas letras no estado
function formatarEstado(valor: string): string {
  return valor
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase();
}

// Monta o endereço completo para a tabela
function montarEndereco(cliente: FormularioCliente): string {
  const parteRua = cliente.numero
    ? `${cliente.rua}, ${cliente.numero}`
    : cliente.rua;

  const partes = [
    parteRua,
    cliente.complemento,
    cliente.cidade,
    cliente.estado,
  ].filter((parte) => parte.trim() !== "");

  if (cliente.cidade && cliente.estado) {
    return [
      parteRua,
      cliente.complemento,
      `${cliente.cidade}/${cliente.estado}`,
    ]
      .filter((parte) => parte.trim() !== "")
      .join(" - ");
  }

  return partes.join(" - ");
}

const clientesIniciais: Cliente[] = [
  {
    id: 1,
    cpf: "123.456.789-00",
    nome: "Maria Silva",
    contato: "(11) 98765-4321",
    rua: "Rua das Flores",
    numero: "123",
    complemento: "Apto 101",
    cidade: "São Paulo",
    estado: "SP",
    email: "maria.silva@email.com",
  },
  {
    id: 2,
    cpf: "987.654.321-00",
    nome: "João da Silva",
    contato: "(91) 98888-7777",
    rua: "Av. Barão do Rio Branco",
    numero: "245",
    complemento: "",
    cidade: "Castanhal",
    estado: "PA",
    email: "joao.silva@email.com",
  },
  {
    id: 3,
    cpf: "456.789.123-10",
    nome: "Carlos Oliveira",
    contato: "(91) 97777-6666",
    rua: "Travessa Primeiro de Maio",
    numero: "400",
    complemento: "",
    cidade: "Castanhal",
    estado: "PA",
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
      const endereco = montarEndereco(cliente).toLowerCase();

      return (
        cliente.nome.toLowerCase().includes(termo) ||
        cliente.cpf.includes(termo) ||
        cliente.contato.includes(termo) ||
        endereco.includes(termo) ||
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
      [campo]: valor,
    }));
  }

  function limparFormulario() {
    setFormulario(formularioInicial);
    setClienteEmEdicao(null);
  }

  function salvarCliente() {
    // Verifica se todos os campos obrigatórios foram preenchidos
    const camposPreenchidos =
      formulario.cpf.trim() &&
      formulario.nome.trim() &&
      formulario.contato.trim() &&
      formulario.rua.trim() &&
      formulario.numero.trim() &&
      formulario.cidade.trim() &&
      formulario.estado.trim() &&
      formulario.email.trim();

    if (!camposPreenchidos) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    // Verifica se o CPF possui 11 números
    if (formulario.cpf.replace(/\D/g, "").length !== 11) {
      alert("Digite um CPF com 11 números.");
      return;
    }

    // Verifica se o contato possui 10 ou 11 números
    const numerosContato = formulario.contato.replace(/\D/g, "");

    if (
      numerosContato.length !== 10 &&
      numerosContato.length !== 11
    ) {
      alert("Digite um telefone válido com DDD.");
      return;
    }

    // Verifica se o e-mail tem um formato válido
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      formulario.email.trim()
    );

    if (!emailValido) {
      alert("Digite um e-mail válido. Exemplo: nome@email.com");
      return;
    }

    if (clienteEmEdicao !== null) {
      setClientes((clientesAtuais) =>
        clientesAtuais.map((cliente) =>
          cliente.id === clienteEmEdicao
            ? {
                id: cliente.id,
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
      rua: cliente.rua,
      numero: cliente.numero,
      complemento: cliente.complemento,
      cidade: cliente.cidade,
      estado: cliente.estado,
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
          {/* Nome */}
          <div className="cliente-campo cliente-campo-nome">
            <label className="medium-h3" htmlFor="cliente-nome">
              Nome completo
            </label>

          <input
              id="cliente-nome"
              type="text"
              placeholder="Ex: Maria Silva"
              value={formulario.nome}
              onChange={(evento) =>
                alterarCampo(
                  "nome",
                  formatarNome(evento.target.value)
                )
              }
              autoComplete="name"
            />
          </div>

          {/* CPF */}
          <div className="cliente-campo">
            <label className="medium-h3" htmlFor="cliente-cpf">
              CPF
            </label>

         <input
              id="cliente-cpf"
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              maxLength={14}
              value={formulario.cpf}
              onChange={(evento) =>
                alterarCampo(
                  "cpf",
                  formatarCPF(evento.target.value)
                )
              }
            />
          </div>

          {/* Contato */}
          <div className="cliente-campo">
            <label className="medium-h3" htmlFor="cliente-contato">
              Contato
            </label>

            <input
              id="cliente-contato"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="(11) 98765-4321"
              maxLength={15}
              value={formulario.contato}
              onChange={(evento) =>
                alterarCampo(
                  "contato",
                  formatarContato(evento.target.value)
                )
              }
            />
          </div>

          {/* Rua */}
          <div className="cliente-campo cliente-campo-endereco">
            <label className="medium-h3" htmlFor="cliente-rua">
              Rua
            </label>

            <input
              id="cliente-rua"
              type="text"
              placeholder="Ex: Rua das Flores"
              autoComplete="address-line1"
              value={formulario.rua}
              onChange={(evento) =>
                alterarCampo("rua", evento.target.value)
              }
            />
          </div>

          {/* Número */}
          <div className="cliente-campo">
            <label className="medium-h3" htmlFor="cliente-numero">
              Número
            </label>

            <input
              id="cliente-numero"
              type="text"
              inputMode="numeric"
              placeholder="Ex: 123"
              value={formulario.numero}
              onChange={(evento) =>
                alterarCampo(
                  "numero",
                  evento.target.value.replace(/\D/g, "").slice(0, 10)
                )
              }
            />
          </div>

          {/* Complemento */}
     <div className="cliente-campo">
     <label
              className="medium-h3"
              htmlFor="cliente-complemento"
            >
              Complemento
      </label>

             <input
              id="cliente-complemento"
              type="text"
              placeholder="Ex: Apto 101"
              value={formulario.complemento}
              onChange={(evento) =>
                alterarCampo("complemento", evento.target.value)
              }
            />
      </div>

          {/* Cidade */}
      <div className="cliente-campo">
            <label className="medium-h3" htmlFor="cliente-cidade">
              Cidade
            </label>

            <input
              id="cliente-cidade"
              type="text"
              placeholder="Ex: São Paulo"
              autoComplete="address-level2"
              value={formulario.cidade}
              onChange={(evento) =>
               alterarCampo(
                 "cidade",
                formatarCidade(evento.target.value)
                )
              }
            />
          </div>

          {/* Estado */}
          <div className="cliente-campo">
            <label className="medium-h3" htmlFor="cliente-estado">
              Estado
            </label>

            <input
              id="cliente-estado"
              type="text"
              placeholder="Ex: SP"
              maxLength={2}
              autoComplete="address-level1"
              value={formulario.estado}
              onChange={(evento) =>
                alterarCampo(
                  "estado",
                  formatarEstado(evento.target.value)
                )
              }
            />
          </div>

          {/* E-mail */}
          <div className="cliente-campo cliente-campo-email">
            <label className="medium-h3" htmlFor="cliente-email">
              E-mail
            </label>

            <input
              id="cliente-email"
              type="email"
              autoComplete="email"
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
            <Button texto="Cancelar" cor="btn-secundaria" />
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
                      {montarEndereco(cliente)}
                </td>

                <td className="light-h3">
                      {cliente.email}
                </td>

                 <td>
                  <div className="clientes-acoes-linha">
                    <button
                      type="button"
                       className="cliente-acao cliente-editar"
                       onClick={() => editarCliente(cliente)}
                      aria-label={`Editar ${cliente.nome}`}
                      title="Editar cliente"
                        >
                      <Pencil size={16} />
                      </button>

                      <button
                          type="button"
                          className="cliente-acao cliente-excluir"
                          onClick={() => excluirCliente(cliente.id)}
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