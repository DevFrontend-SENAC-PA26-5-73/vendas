/**
 * Cliente HTTP único do front-end.
 *
 * A base pode ser trocada sem editar componentes:
 *   VITE_API_URL=http://10.3.20.30:5001 npm run dev
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://10.3.20.30:5001";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.name = "ApiError";
    this.status = status;
  }
}

function extrairMensagem(dados: unknown): string {
  if (typeof dados === "string") {
    return dados;
  }

  if (!dados || typeof dados !== "object") {
    return "";
  }

  const corpo = dados as Record<string, unknown>;
  const mensagem = corpo.message ?? corpo.mensagem ?? corpo.error;

  if (Array.isArray(mensagem)) {
    return mensagem.map(String).join(", ");
  }

  return typeof mensagem === "string" ? mensagem : "";
}

export async function apiRequest<T>(
  caminho: string,
  init: RequestInit = {},
): Promise<T> {
  let resposta: Response;

  try {
    resposta = await fetch(`${API_BASE_URL}${caminho}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === "AbortError") {
      throw erro;
    }

    throw new ApiError(
      0,
      "A API não respondeu. Verifique a conexão e tente novamente.",
    );
  }

  const texto = await resposta.text();
  let dados: unknown = null;

  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = texto;
    }
  }

  if (!resposta.ok) {
    throw new ApiError(
      resposta.status,
      extrairMensagem(dados) || `A API respondeu com o status ${resposta.status}.`,
    );
  }

  return dados as T;
}

export function descreverErro(erro: unknown): string {
  if (erro instanceof ApiError) {
    return erro.status > 0
      ? `${erro.message} (HTTP ${erro.status})`
      : erro.message;
  }

  if (erro instanceof Error) {
    return erro.message;
  }

  return "Não foi possível concluir a operação.";
}
