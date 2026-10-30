import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import "./Configuracao.css";
import {
  lerIdentidade,
  salvarIdentidade,
  limparIdentidade,
} from "./useIdentidade";
import type { Identidade } from "./useIdentidade";

/* ---------- Tema ---------- */

type Tema = "claro" | "escuro";

const CHAVE_TEMA = "vendas:tema";

function temaSalvo(): Tema {
  try {
    return localStorage.getItem(CHAVE_TEMA) === "escuro" ? "escuro" : "claro";
  } catch {
    return "claro";
  }
}

function aplicarTema(tema: Tema) {
  document.documentElement.setAttribute("data-tema", tema);
}

// Aplica o tema salvo assim que o app abre, evitando piscar em branco
aplicarTema(temaSalvo());

const OPCOES_TEMA: { valor: Tema; rotulo: string }[] = [
  { valor: "claro", rotulo: "Claro" },
  { valor: "escuro", rotulo: "Escuro" },
];

/* ---------- Ícone usado no menu lateral ---------- */

export function IconeEngrenagem() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/* ---------- Exclusão de conta ---------- */

const PALAVRA_CONFIRMACAO = "EXCLUIR";

async function excluirConta() {
  // TODO: chame aqui o endpoint da API que exclui a conta, por exemplo:
  // await fetch("https://vendas.gabrielpimentel.com.br/<endpoint-da-conta>", { method: "DELETE" });
  //
  // Por enquanto, apenas apaga os dados guardados neste navegador.
  try {
    localStorage.removeItem(CHAVE_TEMA);
    limparIdentidade();
  } catch {
    /* sem armazenamento disponível */
  }
  window.location.reload();
}

/* ---------- Página ---------- */

export default function Configuracao() {
  const [tema, setTema] = useState<Tema>(temaSalvo);

  const [salva, setSalva] = useState<Identidade>(lerIdentidade);
  const [form, setForm] = useState<Identidade>(salva);
  const [aviso, setAviso] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const campoConfirmacao = useRef<HTMLInputElement>(null);

  const alterada = form.nome !== salva.nome || form.logo !== salva.logo;
  const podeExcluir = confirmacao.trim().toUpperCase() === PALAVRA_CONFIRMACAO;

  useEffect(() => {
    aplicarTema(tema);
    try {
      localStorage.setItem(CHAVE_TEMA, tema);
    } catch {
      /* o tema vale só nesta sessão */
    }
  }, [tema]);

  useEffect(() => {
    if (!modalAberto) return;
    campoConfirmacao.current?.focus();

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape" && !excluindo) fecharModal();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [modalAberto, excluindo]);

  function aoEscolherLogo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      setAviso("Escolha um arquivo de imagem (PNG, JPG ou SVG).");
      return;
    }
    if (arquivo.size > 500 * 1024) {
      setAviso("A logo deve ter no máximo 500 KB.");
      return;
    }

    const leitor = new FileReader();
    leitor.onload = () => {
      setAviso("");
      setForm((f) => ({ ...f, logo: String(leitor.result) }));
    };
    leitor.readAsDataURL(arquivo);
  }

  function salvar() {
    try {
        const nova = { nome: form.nome.trim(), logo: form.logo };

        salvarIdentidade(nova);

        window.dispatchEvent(new Event("identidade-atualizada"));

        setSalva(nova);
        setForm(nova);

        setAviso("Alterações salvas.");
    } catch {
        setAviso("Não foi possível salvar. Tente uma logo menor.");
    }
} 

  function descartar() {
    setForm(salva);
    setAviso("");
  }

  function abrirModal() {
    setConfirmacao("");
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setConfirmacao("");
  }

  async function confirmarExclusao() {
    if (!podeExcluir || excluindo) return;
    setExcluindo(true);
    await excluirConta();
  }

  return (
    <div className="cfg-pagina">
      <div className="cfg-card">
        <header className="cfg-topo">
          <h1 className="cfg-titulo">Configuração</h1>
          <p className="cfg-subtitulo">
            Personalize a aparência do sistema e gerencie a sua conta.
          </p>
        </header>

        {/* Aparência */}
        <section className="cfg-secao" aria-labelledby="cfg-aparencia">
          <h2 className="cfg-secao-titulo" id="cfg-aparencia">
            Aparência
          </h2>
          <p className="cfg-secao-texto">Escolha como o sistema é exibido.</p>

          <div className="cfg-opcoes" role="radiogroup" aria-labelledby="cfg-aparencia">
            {OPCOES_TEMA.map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                role="radio"
                aria-checked={tema === opcao.valor}
                className={`cfg-opcao ${tema === opcao.valor ? "cfg-opcao--ativa" : ""}`}
                onClick={() => setTema(opcao.valor)}
              >
                <span className={`cfg-previa cfg-previa--${opcao.valor}`} aria-hidden="true">
                  <span className="cfg-previa-topo" />
                  <span className="cfg-previa-base">
                    <span className="cfg-previa-menu" />
                    <span className="cfg-previa-corpo">
                      <span className="cfg-previa-linha" />
                      <span className="cfg-previa-linha cfg-previa-linha--curta" />
                    </span>
                  </span>
                </span>
                <span className="cfg-opcao-rotulo">
                  <span className="cfg-radio" />
                  {opcao.rotulo}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Identidade do site */}
        <section className="cfg-secao" aria-labelledby="cfg-identidade">
          <h2 className="cfg-secao-titulo" id="cfg-identidade">
            Identidade do site
          </h2>
          <p className="cfg-secao-texto">
            A logo e o nome aparecem no cabeçalho do sistema.
          </p>

          <div className="cfg-grid">
            <div className="cfg-campo">
              <label htmlFor="cfg-nome">Nome da empresa</label>
              <input
                id="cfg-nome"
                value={form.nome}
                maxLength={60}
                placeholder="Nome da empresa"
                onChange={(e) => {
                  setAviso("");
                  setForm((f) => ({ ...f, nome: e.target.value }));
                }}
              />
            </div>

            <div className="cfg-campo">
              <span className="cfg-rotulo">Logo</span>
              <div className="cfg-logo-linha">
                <div className="cfg-logo-previa">
                  {form.logo && <img src={form.logo} alt="Prévia da logo" />}
                </div>

                <label className="cfg-botao cfg-botao--suave" htmlFor="cfg-logo">
                  {form.logo ? "Trocar imagem" : "Escolher imagem"}
                </label>
                <input
                  id="cfg-logo"
                  className="cfg-arquivo"
                  type="file"
                  accept="image/*"
                  onChange={aoEscolherLogo}
                />

                {form.logo && (
                  <button
                    type="button"
                    className="cfg-link"
                    onClick={() => setForm((f) => ({ ...f, logo: "" }))}
                  >
                    Remover
                  </button>
                )}
              </div>
              <small className="cfg-ajuda">PNG, JPG ou SVG, até 500 KB.</small>
            </div>
          </div>

          <div className="cfg-acoes">
            <span className="cfg-aviso" role="status">
              {aviso}
            </span>
            <button
              type="button"
              className="cfg-botao cfg-botao--suave"
              onClick={descartar}
              disabled={!alterada}
            >
              Descartar
            </button>
            <button
              type="button"
              className="cfg-botao"
              onClick={salvar}
              disabled={!alterada}
            >
              Salvar alterações
            </button>
          </div>
        </section>

        {/* Conta */}
        <section className="cfg-secao" aria-labelledby="cfg-conta">
          <h2 className="cfg-secao-titulo" id="cfg-conta">
            Conta
          </h2>

          <div className="cfg-perigo">
            <div>
              <strong>Excluir conta</strong>
              <p>
                Apaga a sua conta e todos os dados associados. Essa ação não
                pode ser desfeita.
              </p>
            </div>
            <button type="button" className="cfg-botao cfg-botao--perigo-contorno" onClick={abrirModal}>
              Excluir conta
            </button>
          </div>
        </section>
      </div>

      {/* Confirmação de exclusão */}
      {modalAberto && (
        <div
          className="cfg-fundo"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !excluindo) fecharModal();
          }}
        >
          <div
            className="cfg-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cfg-modal-titulo"
            aria-describedby="cfg-modal-texto"
          >
            <h2 className="cfg-modal-titulo" id="cfg-modal-titulo">
              Tem certeza que deseja excluir a conta?
            </h2>
            <p className="cfg-modal-texto" id="cfg-modal-texto">
              Todos os dados da conta serão apagados e não poderão ser
              recuperados.
            </p>

            <div className="cfg-campo">
              <label htmlFor="cfg-confirmacao">
                Digite <strong>{PALAVRA_CONFIRMACAO}</strong> para confirmar
              </label>
              <input
                id="cfg-confirmacao"
                ref={campoConfirmacao}
                value={confirmacao}
                autoComplete="off"
                onChange={(e) => setConfirmacao(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmarExclusao();
                }}
              />
            </div>

            <div className="cfg-modal-acoes">
              <button
                type="button"
                className="cfg-botao cfg-botao--suave"
                onClick={fecharModal}
                disabled={excluindo}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="cfg-botao cfg-botao--perigo"
                onClick={confirmarExclusao}
                disabled={!podeExcluir || excluindo}
              >
                {excluindo ? "Excluindo..." : "Sim, excluir conta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}