import axios from "axios";

/**
 * Configuração centralizada de TODAS as APIs do sistema.
 *
 * Para apontar o sistema para outro backend, altere apenas a constante
 * API_URL abaixo. Nenhuma tela deve declarar URLs, instâncias de Axios ou
 * funções de requisição para o backend fora deste arquivo.
 */
export const API_URL = "http://10.3.20.30:5001";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/** Status HTTP de um erro do Axios (0 quando não houve resposta do servidor). */
export function statusHttp(erro: unknown): number {
  return axios.isAxiosError(erro) ? (erro.response?.status ?? 0) : 0;
}

/** Indica que o erro veio do Axios sem resposta do servidor (rede/CORS). */
export function erroSemResposta(erro: unknown): boolean {
  return axios.isAxiosError(erro) && !erro.response;
}

/** Lê a mensagem de erro enviada pelo backend no corpo da resposta. */
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

/** Corpo devolvido pelo backend junto com o erro (undefined quando não houver). */
export function dadosDoErro(erro: unknown): unknown {
  return axios.isAxiosError(erro) ? erro.response?.data : undefined;
}

/** Mensagem de erro devolvida pelo backend (vazio quando não houver). */
export function mensagemDoErro(erro: unknown): string {
  return axios.isAxiosError(erro) ? extrairMensagem(erro.response?.data) : "";
}

/** Converte qualquer erro em uma mensagem legível para exibir na tela. */
export function descreverErro(erro: unknown): string {
  if (axios.isAxiosError(erro)) {
    if (!erro.response) {
      return "A API não respondeu. Verifique a conexão e tente novamente.";
    }

    const status = erro.response.status;
    const mensagem =
      extrairMensagem(erro.response.data) ||
      `A API respondeu com o status ${status}.`;

    return `${mensagem} (HTTP ${status})`;
  }

  if (erro instanceof Error) {
    return erro.message;
  }

  return "Não foi possível concluir a operação.";
}

export default api;
