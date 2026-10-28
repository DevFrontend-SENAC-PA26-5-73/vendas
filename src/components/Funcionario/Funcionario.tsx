import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import "./Funcionario.css";

const API_BASE = "https://vendas.gabrielpimentel.com.br";
const API_FUNCIONARIOS = `${API_BASE}/funcionarios`;
const API_CARGOS = `${API_BASE}/cargo`;

interface Funcionario {
  id: number;
  nome: string;
  cpf: string;
  rg: string;
  data_nasc: string; // vem como "1990-05-15T00:00:00.000Z"
  estado_civil: string;
  contato: string;
  endereco_id: number;
  cargo_id: number;
  departamento_id: number;
}

interface Cargo {
  id: number;
  nome: string;
}

interface Aviso {
  tipo: "ok" | "erro";
  texto: string;
}

// Todos os campos do formulário ficam como texto; converte ao enviar
interface FormularioFuncionario {
  nome: string;
  cpf: string;
  rg: string;
  data_nasc: string; // "YYYY-MM-DD"
  estado_civil: string;
  contato: string;
  endereco_id: string;
  cargo_id: string;
  departamento_id: string;
}

const formularioVazio: FormularioFuncionario = {
  nome: "",
  cpf: "",
  rg: "",
  data_nasc: "",
  estado_civil: "Solteiro",
  contato: "",
  endereco_id: "",
  cargo_id: "",
  departamento_id: "",
};

const estadosCivis = ["Solteiro", "Casado", "Divorciado", "Viúvo"];

/* ---------- Utilitários ---------- */

function apenasDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

function mascararCpf(valor: string) {
  const d = apenasDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function mascararContato(valor: string) {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// "1990-05-15T00:00:00.000Z" -> "15/05/1990" (sem converter fuso horário)
function formatarData(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : "-";
}

async function requisicao<T = unknown>(
  url: string,
  opcoes: RequestInit = {}
): Promise<T | null> {
  const resposta = await fetch(url, {
    ...opcoes,
    headers: { "Content-Type": "application/json", ...opcoes.headers },
  });

  if (!resposta.ok) {
    let detalhe = "";
    try {
      const corpoErro = await resposta.json();
      detalhe = corpoErro.message ?? corpoErro.error ?? "";
    } catch {
      // resposta sem JSON
    }

    const mensagens: Record<number, string> = {
      400: "Dados inválidos. Confira os campos e tente novamente.",
      404: "Funcionário não encontrado.",
    };

    throw new Error(
      detalhe || mensagens[resposta.status] || `Erro inesperado (${resposta.status}).`
    );
  }

  const texto = await resposta.text();
  return texto ? (JSON.parse(texto) as T) : null;
}

function mensagemDeErro(e: unknown) {
  return e instanceof Error ? e.message : "Erro inesperado.";
}

/* ---------- Componente ---------- */

export default function Funcionario() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState("");

  const [form, setForm] = useState<FormularioFuncionario>(formularioVazio);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const editando = editandoId !== null;

  const formularioValido =
    form.nome.trim() !== "" &&
    apenasDigitos(form.cpf).length === 11 &&
    form.data_nasc !== "" &&
    form.cargo_id !== "" &&
    form.endereco_id !== "" &&
    form.departamento_id !== "";

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErroLista("");
    try {
      const [listaFuncionarios, listaCargos] = await Promise.all([
        requisicao<Funcionario[]>(API_FUNCIONARIOS),
        requisicao<Cargo[]>(API_CARGOS),
      ]);
      setFuncionarios(Array.isArray(listaFuncionarios) ? listaFuncionarios : []);
      setCargos(Array.isArray(listaCargos) ? listaCargos : []);
    } catch (e) {
      setErroLista(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  function nomeDoCargo(id: number) {
    return cargos.find((c) => c.id === id)?.nome ?? `Cargo ${id}`;
  }

  function alterarCampo(campo: keyof FormularioFuncionario) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      let valor = e.target.value;
      if (campo === "cpf") valor = mascararCpf(valor);
      if (campo === "contato") valor = mascararContato(valor);
      setForm((atual) => ({ ...atual, [campo]: valor }));
    };
  }

  function limparFormulario() {
    setForm(formularioVazio);
    setEditandoId(null);
  }

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formularioValido || salvando) return;

    const corpo = {
      nome: form.nome.trim(),
      cpf: form.cpf,
      rg: form.rg.trim(),
      data_nasc: form.data_nasc,
      estado_civil: form.estado_civil,
      contato: form.contato,
      endereco_id: Number(form.endereco_id),
      cargo_id: Number(form.cargo_id),
      departamento_id: Number(form.departamento_id),
    };

    setSalvando(true);
    setAviso(null);
    try {
      if (editando) {
        await requisicao(`${API_FUNCIONARIOS}/${editandoId}`, {
          method: "PATCH",
          body: JSON.stringify(corpo),
        });
        setAviso({ tipo: "ok", texto: "Funcionário atualizado com sucesso." });
      } else {
        await requisicao(API_FUNCIONARIOS, {
          method: "POST",
          body: JSON.stringify(corpo),
        });
        setAviso({ tipo: "ok", texto: "Funcionário criado com sucesso." });
      }
      limparFormulario();
      await carregarDados();
    } catch (e) {
      setAviso({ tipo: "erro", texto: mensagemDeErro(e) });
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(f: Funcionario) {
    setEditandoId(f.id);
    setForm({
      nome: f.nome,
      cpf: f.cpf,
      rg: f.rg ?? "",
      data_nasc: f.data_nasc.slice(0, 10),
      estado_civil: f.estado_civil,
      contato: f.contato ?? "",
      endereco_id: String(f.endereco_id),
      cargo_id: String(f.cargo_id),
      departamento_id: String(f.departamento_id),
    });
    setAviso(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remover(f: Funcionario) {
    if (!window.confirm(`Remover o funcionário "${f.nome}"?`)) return;

    setAviso(null);
    try {
      await requisicao(`${API_FUNCIONARIOS}/${f.id}`, { method: "DELETE" });
      if (editandoId === f.id) limparFormulario();
      setAviso({ tipo: "ok", texto: "Funcionário removido com sucesso." });
      await carregarDados();
    } catch (e) {
      setAviso({ tipo: "erro", texto: mensagemDeErro(e) });
    }
  }

  // Se o estado civil vindo da API não estiver na lista (ex.: "Casada"), mantém como opção
  const opcoesEstadoCivil = estadosCivis.includes(form.estado_civil)
    ? estadosCivis
    : [form.estado_civil, ...estadosCivis];

  return (
    <section className="func-page">
      {aviso && (
        <div
          role="status"
          className={`func-aviso ${aviso.tipo === "erro" ? "func-aviso-erro" : ""}`}
        >
          {aviso.texto}
        </div>
      )}

      {/* Formulário */}
      <div className="func-secao">
        <h2 className="func-titulo">
          {editando ? "Editar funcionário" : "Adicionar funcionário"}
        </h2>

        <form className="func-painel" onSubmit={salvar}>
          <div className="func-grade">
            <div className="func-campo func-campo-largo">
              <label htmlFor="func-nome">Nome</label>
              <input
                id="func-nome"
                className="func-input"
                type="text"
                placeholder="Nome completo"
                value={form.nome}
                onChange={alterarCampo("nome")}
                maxLength={120}
                autoComplete="off"
              />
            </div>

            <div className="func-campo">
              <label htmlFor="func-nasc">Data de nascimento</label>
              <input
                id="func-nasc"
                className="func-input"
                type="date"
                min="1900-01-01"
                max={new Date().toISOString().slice(0, 10)}
                value={form.data_nasc}
                onChange={alterarCampo("data_nasc")}
              />
            </div>

            <div className="func-campo">
              <label htmlFor="func-cpf">CPF</label>
              <input
                id="func-cpf"
                className="func-input"
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={alterarCampo("cpf")}
              />
            </div>

            <div className="func-campo">
              <label htmlFor="func-rg">RG</label>
              <input
                id="func-rg"
                className="func-input"
                type="text"
                placeholder="00.000.000-0"
                value={form.rg}
                onChange={alterarCampo("rg")}
                maxLength={12}
              />
            </div>

            <div className="func-campo">
              <label htmlFor="func-estado-civil">Estado civil</label>
              <select
                id="func-estado-civil"
                className="func-input"
                value={form.estado_civil}
                onChange={alterarCampo("estado_civil")}
              >
                {opcoesEstadoCivil.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            </div>

            <div className="func-campo">
              <label htmlFor="func-contato">Contato</label>
              <input
                id="func-contato"
                className="func-input"
                type="tel"
                inputMode="tel"
                placeholder="(00) 00000-0000"
                value={form.contato}
                onChange={alterarCampo("contato")}
              />
            </div>

            <div className="func-campo">
              <label htmlFor="func-cargo">Cargo</label>
              <select
                id="func-cargo"
                className="func-input"
                value={form.cargo_id}
                onChange={alterarCampo("cargo_id")}
              >
                <option value="">Selecione um cargo</option>
                {cargos.map((cargo) => (
                  <option key={cargo.id} value={cargo.id}>
                    {cargo.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="func-campo">
              <label htmlFor="func-departamento">Departamento (ID)</label>
              <input
                id="func-departamento"
                className="func-input"
                type="number"
                min={1}
                placeholder="1"
                value={form.departamento_id}
                onChange={alterarCampo("departamento_id")}
              />
            </div>

            <div className="func-campo">
              <label htmlFor="func-endereco">Endereço (ID)</label>
              <input
                id="func-endereco"
                className="func-input"
                type="number"
                min={1}
                placeholder="1"
                value={form.endereco_id}
                onChange={alterarCampo("endereco_id")}
              />
            </div>
          </div>

          <div className="func-acoes-form">
            {editando && (
              <button
                type="button"
                className="func-btn func-btn-vermelho"
                onClick={limparFormulario}
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="func-btn func-btn-verde"
              disabled={!formularioValido || salvando}
            >
              {salvando ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="func-secao">
        <div className="func-titulo-linha">
          <h2 className="func-titulo">Funcionários cadastrados</h2>
          <span className="func-contador">{funcionarios.length} item(ns)</span>
        </div>

        <div className="func-tabela-wrap">
          <table className="func-tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Nascimento</th>
                <th>Estado civil</th>
                <th>Contato</th>
                <th>Cargo</th>
                <th className="func-col-acoes">Ações</th>
              </tr>
            </thead>
            <tbody>
              {carregando && (
                <tr>
                  <td colSpan={7} className="func-vazio">
                    Carregando funcionários...
                  </td>
                </tr>
              )}

              {!carregando && erroLista && (
                <tr>
                  <td colSpan={7} className="func-vazio func-estado-erro">
                    {erroLista}{" "}
                    <button type="button" className="func-link" onClick={carregarDados}>
                      Tentar novamente
                    </button>
                  </td>
                </tr>
              )}

              {!carregando && !erroLista && funcionarios.length === 0 && (
                <tr>
                  <td colSpan={7} className="func-vazio">
                    Nenhum funcionário adicionado.
                  </td>
                </tr>
              )}

              {!carregando &&
                !erroLista &&
                funcionarios.map((f) => (
                  <tr key={f.id}>
                    <td>{f.nome}</td>
                    <td>{f.cpf}</td>
                    <td>{formatarData(f.data_nasc)}</td>
                    <td>{f.estado_civil}</td>
                    <td>{f.contato}</td>
                    <td>{nomeDoCargo(f.cargo_id)}</td>
                    <td className="func-col-acoes">
                      <button
                        type="button"
                        className="func-link"
                        onClick={() => iniciarEdicao(f)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="func-link func-link-perigo"
                        onClick={() => remover(f)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}