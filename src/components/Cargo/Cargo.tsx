import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Pencil, Search, Trash2 } from "lucide-react";
import SortableHeader from "../SortableHeader/SortableHeader";
import { ordenarLista } from "../../lib/ordenacao";
import type { DirecaoOrdenacao } from "../../lib/ordenacao";
import "./Cargo.css";

import { API_BASE_URL } from "../../lib/api";

const API_URL = `${API_BASE_URL}/cargo`;

interface CargoItem {
  id: number | string;
  nome: string;
}

type ColunaOrdenacaoCargo = "codigo" | "nome";

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

export default function Cargo({ buscaGlobal }: { buscaGlobal: string }) {
  const [cargos, setCargos] = useState<CargoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState("");
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<{
    coluna: ColunaOrdenacaoCargo;
    direcao: DirecaoOrdenacao;
  } | null>(null);

  const [nome, setNome] = useState("");
  const [editandoId, setEditandoId] = useState<CargoItem["id"] | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const nomeLimpo = nome.trim();
  const editando = editandoId !== null;

  const cargosFiltrados = useMemo(() => {
    const termos = [busca, buscaGlobal]
      .map((valor) => valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase(),
      )
      .filter(Boolean);

    return cargos.filter((cargo) =>
      termos.every((termo) => `${cargo.id} ${cargo.nome}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(termo)),
    );
  }, [busca, buscaGlobal, cargos]);

  const cargosOrdenados = useMemo(() => {
    if (!ordenacao) return cargosFiltrados;
    return ordenarLista(
      cargosFiltrados,
      (cargo) => ordenacao.coluna === "codigo" ? Number(cargo.id) : cargo.nome,
      ordenacao.direcao,
    );
  }, [cargosFiltrados, ordenacao]);

  function alternarOrdenacao(coluna: ColunaOrdenacaoCargo) {
    setOrdenacao((atual) => ({
      coluna,
      direcao: atual?.coluna === coluna && atual.direcao === "desc" ? "asc" : "desc",
    }));
  }

  const carregarCargos = useCallback(async () => {
    try {
      const dados = await requisicao<CargoItem[]>();
      setCargos(Array.isArray(dados) ? dados : []);
      setErroLista("");
    } catch (e) {
      setErroLista(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setCarregando(false);
    }
  }, []);

  function tentarNovamente() {
    setCarregando(true);
    setErroLista("");
    void carregarCargos();
  }

  useEffect(() => {
    async function iniciar() {
      await carregarCargos();
    }

    void iniciar();
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
          <span className="cargo-contador">
            {cargosFiltrados.length} de {cargos.length} cargo(s)
          </span>
        </div>

        <label className="cargo-busca">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar cargo por nome ou código"
            aria-label="Buscar cargos"
          />
        </label>

        <div className="cargo-tabela-wrap">
          <table className="cargo-tabela">
            <thead>
              <tr>
                <SortableHeader label="Código" className="cargo-col-id" active={ordenacao?.coluna === "codigo"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("codigo")} />
                <SortableHeader label="Cargo" active={ordenacao?.coluna === "nome"} direction={ordenacao?.direcao ?? "desc"} onClick={() => alternarOrdenacao("nome")} />
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
                    <button type="button" className="cargo-link" onClick={tentarNovamente}>
                      Tentar novamente
                    </button>
                  </td>
                </tr>
              )}

              {!carregando && !erroLista && cargosOrdenados.length === 0 && (
                <tr>
                  <td colSpan={3} className="cargo-vazio">
                    {cargos.length === 0
                      ? "Nenhum cargo adicionado."
                      : "Nenhum cargo corresponde à busca."}
                  </td>
                </tr>
              )}

              {!carregando &&
                !erroLista &&
                cargosOrdenados.map((cargo) => (
                  <tr key={cargo.id}>
                    <td>{cargo.id}</td>
                    <td>{cargo.nome}</td>
                    <td className="cargo-col-acoes">
                      <div className="cargo-acoes-linha">
                        <button
                          type="button"
                          className="cargo-acao cargo-editar"
                          onClick={() => iniciarEdicao(cargo)}
                          aria-label={`Editar ${cargo.nome}`}
                          title="Editar cargo"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          className="cargo-acao cargo-excluir"
                          onClick={() => void remover(cargo)}
                          aria-label={`Excluir ${cargo.nome}`}
                          title="Excluir cargo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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