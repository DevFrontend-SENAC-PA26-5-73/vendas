import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

import { API_BASE_URL } from "../../lib/api";
import {
  apenasEndereco,
  apenasLetras,
  apenasUf,
  cpfValido,
  emailValido,
  limparEmail,
  mascararCep,
  mascararCpf,
  mascararTelefone,
  nomeCompletoValido,
  somenteDigitos,
  telefoneValido,
  ufValida,
} from "../../lib/mascaras";
import { Pencil, Search, Trash2 } from "lucide-react";
import SortableHeader from "../SortableHeader/SortableHeader";
import { ordenarLista } from "../../lib/ordenacao";
import type { DirecaoOrdenacao } from "../../lib/ordenacao";

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

type ColunaOrdenacaoCliente = "nome" | "cpf" | "contato" | "endereco" | "email";

// O CEP só auxilia no preenchimento: não faz parte do payload da API
type CampoValidavel = keyof FormularioCliente | "cep";
type Erros = Partial<Record<CampoValidavel, string>>;

type ViaCepResposta = {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
};

const API_URL = `${API_BASE_URL}/clientes`;
const COR_ERRO = "#d32f2f";

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

/** Regras de cada campo. Devolve só os campos com problema. */
function validarFormulario(
  f: FormularioCliente,
  cep: string,
  editando: boolean
): Erros {
  const erros: Erros = {};

  if (!f.nome.trim()) {
    erros.nome = "Informe o nome.";
  } else if (!nomeCompletoValido(f.nome)) {
    erros.nome = "Informe nome e sobrenome.";
  }

  // Na edição o CPF fica bloqueado e não é enviado
  if (!editando) {
    const digitosCpf = somenteDigitos(f.cpf);

    if (digitosCpf.length === 0) {
      erros.cpf = "Informe o CPF.";
    } else if (digitosCpf.length < 11) {
      erros.cpf = "CPF incompleto.";
    } else if (!cpfValido(f.cpf)) {
      erros.cpf = "CPF inválido. Confira os números.";
    }
  }

  if (!somenteDigitos(f.contato)) {
    erros.contato = "Informe o telefone.";
  } else if (!telefoneValido(f.contato)) {
    erros.contato = "Telefone inválido. Use DDD + número.";
  }

  const digitosCep = somenteDigitos(cep);

  if (digitosCep.length > 0 && digitosCep.length < 8) {
    erros.cep = "CEP incompleto.";
  }

  if (!f.rua.trim()) {
    erros.rua = "Informe a rua.";
  } else if (f.rua.trim().length < 3) {
    erros.rua = "Nome da rua muito curto.";
  }

  if (!Number.isInteger(f.numero) || f.numero <= 0) {
    erros.numero = "Informe o número.";
  }

  if (!f.cidade.trim()) {
    erros.cidade = "Informe a cidade.";
  } else if (f.cidade.trim().length < 2) {
    erros.cidade = "Nome da cidade muito curto.";
  }

  if (!f.estado) {
    erros.estado = "Informe o estado.";
  } else if (!ufValida(f.estado)) {
    erros.estado = "Sigla de estado inexistente.";
  }

  if (!f.email) {
    erros.email = "Informe o e-mail.";
  } else if (!emailValido(f.email)) {
    erros.email = "E-mail inválido. Ex.: nome@dominio.com";
  }

  return erros;
}

function Clientes({ buscaGlobal }: { buscaGlobal: string }) {
  const [clientes, setClientes] = useState<ICliente[]>([]);
  const [formulario, setFormulario] =
    useState<FormularioCliente>(formularioInicial);
  const [filtro, setFiltro] = useState("");
  const [ordenacao, setOrdenacao] = useState<{
    coluna: ColunaOrdenacaoCliente;
    direcao: DirecaoOrdenacao;
  } | null>(null);
  const [clienteEmEdicao, setClienteEmEdicao] =
    useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [cep, setCep] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [avisoCep, setAvisoCep] = useState("");
  const consultaCep = useRef<AbortController | null>(null);

  // Os erros só aparecem depois que o campo foi visitado ou ao tentar salvar
  const [tocados, setTocados] = useState<
    Partial<Record<CampoValidavel, boolean>>
  >({});
  const [tentouSalvar, setTentouSalvar] = useState(false);

  // GET: listar todos os clientes
  async function buscarClientes() {
    try {
      const resposta = await axios.get<unknown>(API_URL);

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
    async function iniciar() {
      await buscarClientes();
    }

    void iniciar();
  }, []);

  // Pesquisa os clientes pelo nome, CPF, endereço e outros campos
  const clientesFiltrados = useMemo(() => {
    const lista = Array.isArray(clientes) ? clientes : [];
    const termos = [filtro, buscaGlobal]
      .map((valor) => valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase(),
      )
      .filter(Boolean);

    if (termos.length === 0) {
      return lista;
    }

    return lista.filter((cliente) => {
      const campos = [
        cliente.nome,
        cliente.cpf,
        cliente.contato,
        cliente.rua,
        cliente.numero,
        cliente.complemento,
        cliente.cidade,
        cliente.estado,
        cliente.email,
      ].map((valor) =>
        String(valor ?? "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase(),
      );

      return termos.every((termo) => campos.some((campo) => campo.includes(termo)));
    });
  }, [buscaGlobal, clientes, filtro]);

  const clientesOrdenados = useMemo(() => {
    if (!ordenacao) return clientesFiltrados;
    return ordenarLista(
      clientesFiltrados,
      (cliente) => {
        switch (ordenacao.coluna) {
          case "nome": return cliente.nome;
          case "cpf": return cliente.cpf;
          case "contato": return cliente.contato;
          case "endereco": return `${cliente.rua} ${cliente.numero} ${cliente.complemento ?? ""} ${cliente.cidade} ${cliente.estado}`;
          case "email": return cliente.email;
        }
      },
      ordenacao.direcao,
    );
  }, [clientesFiltrados, ordenacao]);

  function alternarOrdenacao(coluna: ColunaOrdenacaoCliente) {
    setOrdenacao((atual) => ({
      coluna,
      direcao: atual?.coluna === coluna && atual.direcao === "desc" ? "asc" : "desc",
    }));
  }

  const erros = useMemo(
    () => validarFormulario(formulario, cep, clienteEmEdicao !== null),
    [formulario, cep, clienteEmEdicao]
  );

  // Erro que deve aparecer na tela para o campo
  function erroVisivel(campo: CampoValidavel) {
    const cpfCompleto =
      campo === "cpf" && somenteDigitos(formulario.cpf).length === 11;

    return tentouSalvar || tocados[campo] || cpfCompleto
      ? erros[campo]
      : undefined;
  }

  function tocar(campo: CampoValidavel) {
    setTocados((atual) =>
      atual[campo] ? atual : { ...atual, [campo]: true }
    );
  }

  // Propriedades comuns a todo input validado
  function propsValidacao(campo: CampoValidavel) {
    const erro = erroVisivel(campo);

    return {
      "aria-invalid": Boolean(erro),
      onBlur: () => tocar(campo),
      style: erro ? { borderColor: COR_ERRO } : undefined,
    };
  }

  function mensagemErro(campo: CampoValidavel) {
    const erro = erroVisivel(campo);

    if (!erro) {
      return null;
    }

    return (
      <small className="light-3" style={{ color: COR_ERRO }}>
        {erro}
      </small>
    );
  }

  // Atualiza os campos do formulário (o valor já chega filtrado/mascarado)
  function alterarCampo(
    campo: keyof FormularioCliente,
    valor: string
  ) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: campo === "numero" ? Number(valor) : valor,
    }));
  }

  /**
   * ViaCEP é opcional: se o CEP não for informado, não existir ou a
   * consulta falhar, o usuário continua digitando o endereço à mão.
   */
  async function buscarCep(digitos: string) {
    consultaCep.current?.abort();

    const controller = new AbortController();
    consultaCep.current = controller;

    try {
      setBuscandoCep(true);
      setAvisoCep("");

      const resposta = await fetch(
        `https://viacep.com.br/ws/${digitos}/json/`,
        { signal: controller.signal }
      );

      if (!resposta.ok) {
        throw new Error(`ViaCEP respondeu ${resposta.status}`);
      }

      const dados = (await resposta.json()) as ViaCepResposta;

      if (dados.erro) {
        setAvisoCep("CEP não encontrado. Preencha o endereço manualmente.");
        return;
      }

      setFormulario((atual) => ({
        ...atual,
        rua: dados.logradouro || atual.rua,
        cidade: dados.localidade || atual.cidade,
        estado: apenasUf(dados.uf || atual.estado),
      }));
    } catch (erro) {
      if (controller.signal.aborted) {
        return;
      }

      console.error("Erro ao consultar o ViaCEP:", erro);
      setAvisoCep(
        "Não foi possível consultar o CEP. Preencha o endereço manualmente."
      );
    } finally {
      if (consultaCep.current === controller) {
        setBuscandoCep(false);
      }
    }
  }

  function alterarCep(valor: string) {
    const mascarado = mascararCep(valor);
    const digitos = somenteDigitos(mascarado);

    setCep(mascarado);
    setAvisoCep("");

    if (digitos.length === 8) {
      void buscarCep(digitos);
    } else {
      consultaCep.current?.abort();
      setBuscandoCep(false);
    }
  }

  // Limpa o formulário e sai do modo de edição
  function limparFormulario() {
    consultaCep.current?.abort();

    setFormulario({ ...formularioInicial });
    setClienteEmEdicao(null);
    setCep("");
    setBuscandoCep(false);
    setAvisoCep("");
    setTocados({});
    setTentouSalvar(false);
  }

  // POST: cadastrar | PATCH: atualizar
  async function salvarCliente() {
    setTentouSalvar(true);

    // O CEP é opcional e não vai para a API, então não bloqueia o envio
    const temErroBloqueante = Object.keys(erros).some(
      (campo) => campo !== "cep"
    );

    if (temErroBloqueante) {
      alert("Corrija os campos destacados em vermelho.");
      return;
    }

    try {
      setSalvando(true);

      if (clienteEmEdicao !== null) {
        // O CPF é o identificador único e fica bloqueado na edição,
        // então não vai no corpo da atualização
        const dadosAtualizacao: Partial<FormularioCliente> = {
          ...formulario,
        };
        delete dadosAtualizacao.cpf;

        await axios.patch(
          `${API_URL}/${clienteEmEdicao}`,
          dadosAtualizacao
        );
      } else {
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
    consultaCep.current?.abort();

    setFormulario({
      cpf: mascararCpf(cliente.cpf),
      nome: cliente.nome,
      contato: mascararTelefone(cliente.contato),
      rua: cliente.rua,
      numero: cliente.numero,
      complemento: cliente.complemento ?? "",
      cidade: cliente.cidade,
      estado: cliente.estado,
      email: cliente.email,
    });

    setCep("");
    setBuscandoCep(false);
    setAvisoCep("");
    setTocados({});
    setTentouSalvar(false);
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
              autoComplete="name"
              maxLength={100}
              value={formulario.nome}
              onChange={(e) =>
                alterarCampo("nome", apenasLetras(e.target.value))
              }
              placeholder="Nome completo"
              {...propsValidacao("nome")}
            />
            {mensagemErro("nome")}
          </div>

          <div className="cliente-campo">
            <label className="medium-h3" htmlFor="cpf">
              CPF
            </label>
            <input
              id="cpf"
              inputMode="numeric"
              maxLength={14}
              value={formulario.cpf}
              disabled={clienteEmEdicao !== null}
              onChange={(e) =>
                alterarCampo("cpf", mascararCpf(e.target.value))
              }
              placeholder="000.000.000-00"
              {...propsValidacao("cpf")}
            />
            {mensagemErro("cpf")}
          </div>

          <div className="cliente-campo">
            <label className="medium-h3" htmlFor="contato">
              Contato
            </label>
            <input
              id="contato"
              type="tel"
              inputMode="numeric"
              maxLength={15}
              value={formulario.contato}
              onChange={(e) =>
                alterarCampo(
                  "contato",
                  mascararTelefone(e.target.value)
                )
              }
              placeholder="(11) 98765-4321"
              {...propsValidacao("contato")}
            />
            {mensagemErro("contato")}
          </div>

          <div className="cliente-campo">
            <label className="medium-h3" htmlFor="cep">
              CEP <span className="light-3">(opcional)</span>
            </label>
            <input
              id="cep"
              inputMode="numeric"
              maxLength={9}
              value={cep}
              onChange={(e) => alterarCep(e.target.value)}
              placeholder="00000-000"
              {...propsValidacao("cep")}
            />
            {buscandoCep && (
              <small className="light-3">Buscando endereço...</small>
            )}
            {avisoCep && <small className="light-3">{avisoCep}</small>}
            {mensagemErro("cep")}
          </div>

          <div className="cliente-campo">
            <label className="medium-h3" htmlFor="rua">
              Rua
            </label>
            <input
              id="rua"
              maxLength={100}
              value={formulario.rua}
              onChange={(e) =>
                alterarCampo("rua", apenasEndereco(e.target.value))
              }
              placeholder="Rua das Flores"
              {...propsValidacao("rua")}
            />
            {mensagemErro("rua")}
          </div>

          <div className="cliente-campo">
            <label className="medium-h3" htmlFor="numero">
              Número
            </label>
            <input
              id="numero"
              inputMode="numeric"
              maxLength={6}
              value={formulario.numero || ""}
              onChange={(e) =>
                alterarCampo(
                  "numero",
                  somenteDigitos(e.target.value).slice(0, 6)
                )
              }
              placeholder="123"
              {...propsValidacao("numero")}
            />
            {mensagemErro("numero")}
          </div>

          <div className="cliente-campo">
            <label className="medium-h3" htmlFor="complemento">
              Complemento <span className="light-3">(opcional)</span>
            </label>
            <input
              id="complemento"
              maxLength={60}
              value={formulario.complemento}
              onChange={(e) =>
                alterarCampo(
                  "complemento",
                  apenasEndereco(e.target.value)
                )
              }
              placeholder="Apto 101"
              {...propsValidacao("complemento")}
            />
            {mensagemErro("complemento")}
          </div>

          <div className="cliente-campo">
            <label className="medium-h3" htmlFor="cidade">
              Cidade
            </label>
            <input
              id="cidade"
              maxLength={60}
              value={formulario.cidade}
              onChange={(e) =>
                alterarCampo("cidade", apenasLetras(e.target.value))
              }
              placeholder="São Paulo"
              {...propsValidacao("cidade")}
            />
            {mensagemErro("cidade")}
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
                alterarCampo("estado", apenasUf(e.target.value))
              }
              placeholder="SP"
              {...propsValidacao("estado")}
            />
            {mensagemErro("estado")}
          </div>

          <div className="cliente-campo cliente-campo-email">
            <label className="medium-h3" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              maxLength={100}
              value={formulario.email}
              onChange={(e) =>
                alterarCampo("email", limparEmail(e.target.value))
              }
              placeholder="email@exemplo.com"
              {...propsValidacao("email")}
            />
            {mensagemErro("email")}
          </div>
        </div>

        <div className="clientes-acoes">
          <div onClick={limparFormulario}>
            <Button texto="Cancelar" cor="btn-secundaria" />
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
            <h2 className="medium-h1">Clientes cadastrados</h2>

            <p className="light-h3">
              {carregando
                ? "Carregando clientes..."
                : `${clientesFiltrados.length} cliente(s) encontrado(s)`}
            </p>
          </div>

          <div className="clientes-filtro">
            <Search className="clientes-filtro-icone" size={18} />

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
                <SortableHeader label="Nome" active={ordenacao?.coluna === "nome"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("nome")} />
                <SortableHeader label="CPF" active={ordenacao?.coluna === "cpf"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("cpf")} />
                <SortableHeader label="Contato" active={ordenacao?.coluna === "contato"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("contato")} />
                <SortableHeader label="Endereço" active={ordenacao?.coluna === "endereco"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("endereco")} />
                <SortableHeader label="E-mail" active={ordenacao?.coluna === "email"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("email")} />
                <th className="clientes-coluna-acoes">Ações</th>
              </tr>
            </thead>

            <tbody>
              {clientesOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="clientes-sem-resultados">
                    {carregando
                      ? "Carregando..."
                      : "Nenhum cliente encontrado."}
                  </td>
                </tr>
              ) : (
                clientesOrdenados.map((cliente) => (
                  <tr key={cliente.id}>
                    <td className="medium-h3">{cliente.nome}</td>

                    <td className="light-h3">{cliente.cpf}</td>

                    <td className="light-h3">{cliente.contato}</td>

                    <td className="light-h3">
                      {`${cliente.rua}, ${cliente.numero}${
                        cliente.complemento
                          ? ` - ${cliente.complemento}`
                          : ""
                      } - ${cliente.cidade}/${cliente.estado}`}
                    </td>

                    <td className="light-h3">{cliente.email}</td>

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