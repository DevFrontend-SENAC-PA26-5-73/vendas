import "./CaixaDeTexto.css";

type CaixaDeTextoProps = {
  titulo: string;
  type?: string;
};

function CaixaDeTexto({
  titulo,
  type = "text",
}: CaixaDeTextoProps) {

  const exemplos: Record<string, string> = {
    "Nome Completo": "Ex: João da Silva",
    "CPF": "Ex: 543.387.398-23",
    "Data de Nascimento": "Ex: 15/03/1998",
    "Sexo": "Ex: Masculino",
    "Telefone": "Ex: (91) 98888-7777",
    "E-Mail": "Ex: joao@email.com",
    "Rua": "Ex: Av. Barão do Rio Branco",
    "Complemento": "Ex: Apto 302",
    "Estado": "Ex: Pará",
    "Cidade": "Ex: Castanhal",
    "Número": "Ex: 245",
    "Código do Pedido": "Ex: PED-2026-001",
    "Data Emissão": "Ex: 07/10/2026",
    "Data Entrega": "Ex: 14/10/2026",
    "Vendedor": "Ex: Maria Oliveira",
    "Preço": "Ex: R$ 245,00",
    "Quantidade": "Ex: 3",
    "Valor Total": "Ex: R$ 735,00",
    "Forma de Pagamento": "Ex: Pix",
    "Parcelamento": "Ex: 3x sem juros",
  };

  return (
    <div className="input-group">
      <label className="input-label">
        {titulo}
      </label>

      <input
        type={type}
        className="input-field"
        placeholder={exemplos[titulo] || "Ex: valor"}
      />
    </div>
  );
}

export default CaixaDeTexto;