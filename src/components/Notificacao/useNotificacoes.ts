import { useCallback, useEffect, useRef, useState } from "react";

export type TipoNotificacao = "sucesso" | "erro" | "info";

export type Notificacao = {
  id: number;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem?: string;
};

/** Tempo que a notificação fica na tela antes de sumir sozinha. */
const DURACAO_PADRAO = 5000;

/**
 * Controla a fila de notificações (toasts) da tela.
 * Cada aviso aparece no canto da tela e some sozinho ou ao ser fechado.
 */
export function useNotificacoes(duracao = DURACAO_PADRAO) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const proximoId = useRef(1);
  const temporizadores = useRef<Map<number, number>>(new Map());

  const fechar = useCallback((id: number) => {
    const temporizador = temporizadores.current.get(id);

    if (temporizador !== undefined) {
      window.clearTimeout(temporizador);
      temporizadores.current.delete(id);
    }

    setNotificacoes((atuais) =>
      atuais.filter((notificacao) => notificacao.id !== id),
    );
  }, []);

  const mostrar = useCallback(
    (tipo: TipoNotificacao, titulo: string, mensagem?: string) => {
      const id = proximoId.current++;

      setNotificacoes((atuais) => [
        ...atuais,
        { id, tipo, titulo, mensagem },
      ]);

      temporizadores.current.set(
        id,
        window.setTimeout(() => fechar(id), duracao),
      );

      return id;
    },
    [duracao, fechar],
  );

  useEffect(() => {
    const timers = temporizadores.current;

    return () => {
      timers.forEach((temporizador) => window.clearTimeout(temporizador));
      timers.clear();
    };
  }, []);

  return { notificacoes, mostrar, fechar };
}
