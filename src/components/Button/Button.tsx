import "./Button.css";

type ButtonProps = {
  texto: string;
  cor: "btn-primaria" | "btn-secundaria" | "btn-c";
  
};

function Button({ texto, cor }: ButtonProps) {
  return (
    <button className={`botao ${cor}`}>
      {texto}
    </button>
  );
}

export default Button;