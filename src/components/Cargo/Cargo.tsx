import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import "./Cargo.css";

const API_URL = "https://vendas.gabrielpimentel.com.br/cargo";

interface CargoItem {
  id: number | string;
  nome: string;
}

interface Aviso {
  tipo: "ok" | "erro";
  texto: string;
}

async function requisicao<T = unknown>(
  caminho = "",
  opcoes: RequestInit = {}
): Promise<T | null> {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    ...opcoes,
    headers: { "Content-Type": "application/json", ...opcoes.headers },
  });

  if (!resposta.ok) {
    const mensagens: Record<number, string> = {
      400: "Dados inválidos.",
      404: "Cargo não encontrado.",
    };
    throw new Error(mensagens[resposta.status] ?? "Erro inesperado. Tente novamente.");
  }

  // DELETE pode não devolver corpo
  const texto = await resposta.text();
  return texto ? (JSON.parse(texto) as T) : null;
}

export default function Cargo() {
  const [cargos, setCargos] = useState<CargoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState("");

  const [nome, setNome] = useState("");
  const [editandoId, setEditandoId] = useState<CargoItem["id"] | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const nomeLimpo = nome.trim();
  const editando = editandoId !== null;

  const carregarCargos = useCallback(async () => {
    setCarregando(true);
    setErroLista("");
    try {
      const dados = await requisicao<CargoItem[]>();
      setCargos(Array.isArray(dados) ? dados : []);
    } catch (e) {
      setErroLista(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarCargos();
  }, [carregarCargos]);

  function limparFormulario() {
    setNome("");
    setEditandoId(null);
  }

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nomeLimpo || salvando) return;

    setSalvando(true);
    setAviso(null);
    try {
      if (editando) {
        await requisicao(`/${editandoId}`, {
          method: "PATCH",
          body: JSON.stringify({ nome: nomeLimpo }),
        });
        setAviso({ tipo: "ok", texto: "Cargo atualizado com sucesso." });
      } else {
        await requisicao("", {
          method: "POST",
          body: JSON.stringify({ nome: nomeLimpo }),
        });
        setAviso({ tipo: "ok", texto: "Cargo criado com sucesso." });
      }
      limparFormulario();
      await carregarCargos();
    } catch (e) {
      setAviso({
        tipo: "erro",
        texto: e instanceof Error ? e.message : "Erro inesperado.",
      });
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(cargo: CargoItem) {
    setEditandoId(cargo.id);
    setNome(cargo.nome);
    setAviso(null);
  }

  async function remover(cargo: CargoItem) {
    if (!window.confirm(`Remover o cargo "${cargo.nome}"?`)) return;

    setAviso(null);
    try {
      await requisicao(`/${cargo.id}`, { method: "DELETE" });
      if (editandoId === cargo.id) limparFormulario();
      setAviso({ tipo: "ok", texto: "Cargo removido com sucesso." });
      await carregarCargos();
    } catch (e) {
      setAviso({
        tipo: "erro",
        texto: e instanceof Error ? e.message : "Erro inesperado.",
      });
    }
  }

  return (
    <section className="cargo-page">
      {aviso && (
        <div
          role="status"
          className={`cargo-aviso ${aviso.tipo === "erro" ? "cargo-aviso-erro" : ""}`}
        >
          {aviso.texto}
        </div>
      )}

      {/* Formulário */}
      <div className="cargo-secao">
        <h2 className="cargo-titulo">{editando ? "Editar cargo" : "Adicionar cargo"}</h2>

        <form className="cargo-painel cargo-form" onSubmit={salvar}>
          <div className="cargo-campo">
            <label htmlFor="cargo-nome">Nome do cargo</label>
            <input
              id="cargo-nome"
              className="cargo-input"
              type="text"
              placeholder="Ex.: Desenvolvedor"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={100}
              autoComplete="off"
            />
          </div>

          <div className="cargo-acoes-form">
            {editando && (
              <button
                type="button"
                className="cargo-btn cargo-btn-vermelho"
                onClick={limparFormulario}
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="cargo-btn cargo-btn-verde"
              disabled={!nomeLimpo || salvando}
            >
              {salvando ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="cargo-secao">
        <div className="cargo-titulo-linha">
          <h2 className="cargo-titulo">Cargos cadastrados</h2>
          <span className="cargo-contador">{cargos.length} item(ns)</span>
        </div>

        <div className="cargo-tabela-wrap">
          <table className="cargo-tabela">
            <thead>
              <tr>
                <th className="cargo-col-id">Código</th>
                <th>Cargo</th>
                <th className="cargo-col-acoes">Ações</th>
              </tr>
            </thead>
            <tbody>
              {carregando && (
                <tr>
                  <td colSpan={3} className="cargo-vazio">
                    Carregando cargos...
                  </td>
                </tr>
              )}

              {!carregando && erroLista && (
                <tr>
                  <td colSpan={3} className="cargo-vazio cargo-estado-erro">
                    {erroLista}{" "}
                    <button type="button" className="cargo-link" onClick={carregarCargos}>
                      Tentar novamente
                    </button>
                  </td>
                </tr>
              )}

              {!carregando && !erroLista && cargos.length === 0 && (
                <tr>
                  <td colSpan={3} className="cargo-vazio">
                    Nenhum cargo adicionado.
                  </td>
                </tr>
              )}

              {!carregando &&
                !erroLista &&
                cargos.map((cargo) => (
                  <tr key={cargo.id}>
                    <td>{cargo.id}</td>
                    <td>{cargo.nome}</td>
                    <td className="cargo-col-acoes">
                      <button
                        type="button"
                        className="cargo-link"
                        onClick={() => iniciarEdicao(cargo)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="cargo-link cargo-link-perigo"
                        onClick={() => remover(cargo)}
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