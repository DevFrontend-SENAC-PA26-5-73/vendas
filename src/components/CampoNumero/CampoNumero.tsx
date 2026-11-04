import "./CampoNumero.css";
import { normalizarDigitos } from "./useCampoNumero";

type Props = {
  id: string;
  texto: string;
  aoAlterar: (texto: string) => void;
  prefixo?: string;
  sufixo?: string;
  placeholder?: string;
  maximo?: number;
  ariaLabel?: string;
};

/**
 * Campo numérico para valores inteiros.
 *
 * O valor inicial (por exemplo "0") continua visível, mas não é somado ao
 * número digitado: ao focar, o conteúdo é selecionado — a primeira tecla
 * substitui tudo — e zeros à esquerda são removidos.
 */
function CampoNumero({
  id,
  texto,
  aoAlterar,
  prefixo,
  sufixo,
  placeholder,
  maximo,
  ariaLabel,
}: Props) {
  function alterar(novoTexto: string) {
    const digitos = normalizarDigitos(novoTexto);
    const numero = Number(digitos) || 0;

    if (maximo !== undefined && numero > maximo) {
      aoAlterar(String(maximo));
      return;
    }

    aoAlterar(digitos);
  }

  return (
    <div
      className={`campo-numero${sufixo ? " campo-numero-com-sufixo" : ""}`}
    >
      {prefixo && <span className="campo-numero-prefixo">{prefixo}</span>}

      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={texto}
        onChange={(evento) => alterar(evento.target.value)}
        onFocus={(evento) => evento.target.select()}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />

      {sufixo && <span className="campo-numero-sufixo">{sufixo}</span>}
    </div>
  );
}

export default CampoNumero;
