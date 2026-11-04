import { CircleCheck, CircleX, Info, X } from "lucide-react";

import "./Notificacao.css";
import type { Notificacao as ItemNotificacao, TipoNotificacao } from "./useNotificacoes";

type Props = {
  notificacoes: ItemNotificacao[];
  aoFechar: (id: number) => void;
};

const ICONES: Record<TipoNotificacao, typeof CircleCheck> = {
  sucesso: CircleCheck,
  erro: CircleX,
  info: Info,
};

const ROTULOS: Record<TipoNotificacao, string> = {
  sucesso: "Sucesso",
  erro: "Erro",
  info: "Aviso",
};

function Notificacao({ notificacoes, aoFechar }: Props) {
  if (notificacoes.length === 0) {
    return null;
  }

  return (
    <div className="notificacoes" role="region" aria-label="Notificações">
      {notificacoes.map((notificacao) => {
        const Icone = ICONES[notificacao.tipo];

        return (
          <div
            key={notificacao.id}
            className={`notificacao notificacao-${notificacao.tipo}`}
            role={notificacao.tipo === "erro" ? "alert" : "status"}
          >
            <Icone className="notificacao-icone" size={22} aria-hidden="true" />
            <div className="notificacao-conteudo">
              <strong className="medium-h3">
                {ROTULOS[notificacao.tipo]} — {notificacao.titulo}
              </strong>
              {notificacao.mensagem && (
                <small className="light-h3">{notificacao.mensagem}</small>
              )}
            </div>
            <button
              type="button"
              className="notificacao-fechar"
              onClick={() => aoFechar(notificacao.id)}
              aria-label="Fechar notificação"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default Notificacao;
