
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Pencil, Search, Trash2 } from "lucide-react";

import Button from "../Button/Button";
import "./Clientes.css";

interface ICliente {
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

type FormularioCliente = Omit<ICliente, "id"> & {
  complemento: string;
};

const API_URL = "https://vendas.gabrielpimentel.com.br/clientes";

const formularioInicial: FormularioCliente = {
  cpf: "",
  nome: "",
  contato: "",
  rua: "",
  numero: 0,
  complemento: "",
  cidade: "",
  estado: "",
  email: "",
};

function normalizarClientes(dados: unknown): ICliente[] {
  if (!Array.isArray(dados)) {
    return [];
  }

  return dados.map((item) => {
    const cliente = item as ICliente;

    return {
      ...cliente,
      complemento: cliente.complemento ?? "",
    };
  });
}

function Clientes() {
  const [clientes, setClientes] = useState<ICliente[]>([]);
  const [formulario, setFormulario] =
    useState<FormularioCliente>(formularioInicial);
  const [filtro, setFiltro] = useState("");
  const [clienteEmEdicao, setClienteEmEdicao] =
    useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // GET: listar todos os clientes
  async function buscarClientes() {
    try {
      setCarregando(true);

      const resposta = await axios.get<unknown>(API_URL);

      console.log("Clientes recebidos da API:", resposta.data);

      setClientes(normalizarClientes(resposta.data));
    } catch (erro) {
      console.error("Erro ao buscar clientes:", erro);
      setClientes([]);

      alert("Não foi possível carregar os clientes.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void buscarClientes();
  }, []);

  // Pesquisa os clientes pelo nome, CPF, endereço e outros campos
  const clientesFiltrados = useMemo(() => {
    const lista = Array.isArray(clientes) ? clientes : [];
    const termo = filtro.trim().toLowerCase();

    if (!termo) {
      return lista;
    }

    return lista.filter((cliente) =>
      [
        cliente.nome,
        cliente.cpf,
        cliente.contato,
        cliente.rua,
        cliente.numero,
        cliente.complemento,
        cliente.cidade,
        cliente.estado,
        cliente.email,
      ].some((valor) =>
        String(valor ?? "").toLowerCase().includes(termo)
      )
    );
  }, [clientes, filtro]);

  // Atualiza os campos do formulário
  function alterarCampo(
    campo: keyof FormularioCliente,
    valor: string
  ) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: campo === "numero" ? Number(valor) : valor,
    }));
  }

  // Limpa o formulário e sai do modo de edição
  function limparFormulario() {
    setFormulario({ ...formularioInicial });
    setClienteEmEdicao(null);
  }

  // POST: cadastrar | PATCH: atualizar
  async function salvarCliente() {
    const obrigatorios = [
      formulario.cpf,
      formulario.nome,
      formulario.contato,
      formulario.rua,
      formulario.cidade,
      formulario.estado,
      formulario.email,
    ];

    if (
      obrigatorios.some((campo) => !campo.trim()) ||
      !Number.isInteger(formulario.numero) ||
      formulario.numero <= 0
    ) {
      alert("Preencha corretamente os campos obrigatórios.");
      return;
    }

    try {
      setSalvando(true);

      if (clienteEmEdicao !== null) {
        // Atualiza o cliente pelo ID
        await axios.patch(
          `${API_URL}/${clienteEmEdicao}`,
          formulario
        );
      } else {
        // Cadastra um novo cliente
        await axios.post(API_URL, formulario);
      }

      const estavaEditando = clienteEmEdicao !== null;

      limparFormulario();
      await buscarClientes();

      alert(
        estavaEditando
          ? "Cliente atualizado com sucesso!"
          : "Cliente cadastrado com sucesso!"
      );
    } catch (erro) {
      console.error("Erro ao salvar cliente:", erro);

      if (axios.isAxiosError(erro) && erro.response?.status === 409) {
        alert("Já existe um cliente cadastrado com esse CPF.");
      } else if (
        axios.isAxiosError(erro) &&
        erro.response?.status === 400
      ) {
        alert("Confira os campos obrigatórios e tente novamente.");
      } else {
        alert(
          "Não foi possível salvar o cliente. Confira o console."
        );
      }
    } finally {
      setSalvando(false);
    }
  }

  // Preenche o formulário com os dados do cliente selecionado
  function editarCliente(cliente: ICliente) {
    setFormulario({
      cpf: cliente.cpf,
      nome: cliente.nome,
      contato: cliente.contato,
      rua: cliente.rua,
      numero: cliente.numero,
      complemento: cliente.complemento ?? "",
      cidade: cliente.cidade,
      estado: cliente.estado,
      email: cliente.email,
    });

    setClienteEmEdicao(cliente.id);
  }

  // DELETE: excluir cliente pelo ID
  async function excluirCliente(id: number) {
    const confirmar = window.confirm(
      "Deseja realmente excluir este cliente?"
    );

    if (!confirmar) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/${id}`);

      if (clienteEmEdicao === id) {
        limparFormulario();
      }

      await buscarClientes();

      alert("Cliente excluído com sucesso!");
    } catch (erro) {
      console.error("Erro ao excluir cliente:", erro);

      alert(
        "Não foi possível excluir o cliente. Confira o console."
      );
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
              Preencha as informações do cliente.
            </p>
          </div>

          <span className="clientes-status medium-h3">
            {clienteEmEdicao !== null ? "Em edição" : "Novo cliente"}
          </span>
        </header>

        <div className="clientes-formulario">
          <div className="cliente-campo">
            <label className="medium-h3" htmlFor="nome">
              Nome completo
            </label>
            <input
              id="nome"
              value={formulario.nome}
              onChange={(e) =>
                alterarCampo("nome", e.target.value)
              }
              placeholder="Nome completo"
            />
          </div>

          <div className="cliente-campo">
            <label className="medium-h3" htmlFor="cpf">
              CPF
            </label>
            <input
              id="cpf"
              value={formulario.cpf}
              disabled={clienteEmEdicao !== null}
              onChange={(e) =>
                alterarCampo("cpf", e.target.value)
              }
              placeholder="000.000.000-00"
            />
          </div>

          <div className="cliente-campo">
            <label className="medium-h3" htmlFor="contato">
              Contato
            </label>
            <input
              id="contato"
              type="tel"
              value={formulario.contato}
              onChange={(e) =>
                alterarCampo("contato", e.target.value)
              }
              placeholder="(11) 98765-4321"
            />
          </div>

          <div className="cliente-campo">
            <label className="medium-h3" htmlFor="rua">
              Rua
            </label>
            <input
              id="rua"
              value={formulario.rua}
              onChange={(e) =>
                alterarCampo("rua", e.target.value)
              }
              placeholder="Rua das Flores"
            />
          </div>

          <div className="cliente-campo">
            <label className="medium-h3" htmlFor="numero">
              Número
            </label>
            <input
              id="numero"
              type="number"
              min="1"
              value={formulario.numero || ""}
              onChange={(e) =>
                alterarCampo("numero", e.target.value)
              }
              placeholder="123"
            />
          </div>

          <div className="cliente-campo">
            <label className="medium-h3" htmlFor="complemento">
              Complemento
            </label>
            <input
              id="complemento"
              value={formulario.complemento}
              onChange={(e) =>
                alterarCampo("complemento", e.target.value)
              }
              placeholder="Apto 101"
            />
          </div>

          <div className="cliente-campo">
            <label className="medium-h3" htmlFor="cidade">
              Cidade
            </label>
            <input
              id="cidade"
              value={formulario.cidade}
              onChange={(e) =>
                alterarCampo("cidade", e.target.value)
              }
              placeholder="São Paulo"
            />
          </div>

          <div className="cliente-campo">
            <label className="medium-h3" htmlFor="estado">
              Estado
            </label>
            <input
              id="estado"
              maxLength={2}
              value={formulario.estado}
              onChange={(e) =>
                alterarCampo("estado", e.target.value.toUpperCase())
              }
              placeholder="SP"
            />
          </div>

          <div className="cliente-campo cliente-campo-email">
            <label className="medium-h3" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={formulario.email}
              onChange={(e) =>
                alterarCampo("email", e.target.value)
              }
              placeholder="email@exemplo.com"
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

          <div onClick={() => void salvarCliente()}>
            <Button
              texto={
                salvando
                  ? "Salvando..."
                  : clienteEmEdicao !== null
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
              {carregando
                ? "Carregando clientes..."
                : `${clientesFiltrados.length} cliente(s) encontrado(s)`}
            </p>
          </div>

          <div className="clientes-filtro">
            <Search
              className="clientes-filtro-icone"
              size={18}
            />

            <input
              type="search"
              placeholder="Pesquisar clientes"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
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
                <th className="clientes-coluna-acoes">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="clientes-sem-resultados"
                  >
                    {carregando
                      ? "Carregando..."
                      : "Nenhum cliente encontrado."}
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
                      {`${cliente.rua}, ${cliente.numero}${
                        cliente.complemento
                      ? ` - ${cliente.complemento}`
                          : ""
                      } - ${cliente.cidade}/${cliente.estado}`}
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
                          onClick={() =>
                            void excluirCliente(cliente.id)
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
