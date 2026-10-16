import CaixaDeTexto from "../CaixaDeTexto/CaixaDeTexto";
import Button from "../Button/Button";

import "./Produtos.css";

type ProdutoTabela = {
  id: number;
  nome: string;
  codigo: string;
  empresa: string;
  descricao: string;
  valor: string;
};

function Produtos() {
  const produtos: ProdutoTabela[] = [
    {
      id: 1,
      nome: "Produto exemplo",
      codigo: "PROD-001",
      empresa: "Empresa Norte",
      descricao: "Descrição do produto",
      valor: "R$ 245,00",
    },
    {
      id: 2,
      nome: "Produto exemplo",
      codigo: "PROD-002",
      empresa: "Empresa Norte",
      descricao: "Descrição do produto",
      valor: "R$ 180,00",
    },
    {
      id: 3,
      nome: "Produto exemplo",
      codigo: "PROD-003",
      empresa: "Empresa Norte",
      descricao: "Descrição do produto",
      valor: "R$ 310,00",
    },
    {
      id: 4,
      nome: "Produto exemplo",
      codigo: "PROD-004",
      empresa: "Empresa Norte",
      descricao: "Descrição do produto",
      valor: "R$ 95,00",
    },
    {
      id: 5,
      nome: "Produto exemplo",
      codigo: "PROD-005",
      empresa: "Empresa Norte",
      descricao: "Descrição do produto",
      valor: "R$ 520,00",
    },
  ];

  return (
    <section className="produtos">
      <div className="produtos-cadastro">
        <div className="produtos-cabecalho">
          <div>
            <h1 className="medium-h1">
              Cadastro de produto
            </h1>

            <p className="light-h3">
              Preencha as informações para cadastrar um produto.
            </p>
          </div>

          <span className="produtos-status medium-h3">
            Novo produto
          </span>
        </div>

        <div className="produtos-formulario">
          <CaixaDeTexto titulo="Nome do produto" />

          <CaixaDeTexto titulo="Código" />

          <CaixaDeTexto titulo="Categoria" />

          <CaixaDeTexto
            titulo="Quantidade"
            type="number"
          />

          <div className="produto-campo-descricao">
            <CaixaDeTexto titulo="Descrição do produto" />
          </div>

          <CaixaDeTexto
            titulo="Valor"
            type="number"
          />
        </div>

        <div className="produtos-acoes">
          <div className="produto-acao-esquerda">
            <Button
              texto="Cancelar"
              cor="btn-secundaria"
            />
          </div>

          <div className="produto-acao-centro">
            <Button
              texto="Editar"
              cor="btn-c"
            />
          </div>

          <div className="produto-acao-direita">
            <Button
              texto="Salvar"
              cor="btn-primaria"
            />
          </div>
        </div>
      </div>

      <div className="produtos-listagem">
        <div className="produtos-listagem-titulo">
          <h2 className="medium-h1">
            Produtos cadastrados
          </h2>

          <p className="light-h3">
            Consulte os produtos existentes no sistema.
          </p>
        </div>

        <div className="produtos-tabela-container">
          <table className="produtos-tabela">
            <thead>
              <tr>
                <th className="medium-h3">
                  Nome do produto
                </th>

                <th className="medium-h3">
                  Código
                </th>

                <th className="medium-h3">
                  Empresa
                </th>

                <th className="medium-h3">
                  Descrição
                </th>

                <th className="medium-h3">
                  Valor
                </th>
              </tr>
            </thead>

            <tbody>
              {produtos.map((produto) => (
                <tr key={produto.id}>
                  <td className="light-h3">
                    {produto.nome}
                  </td>

                  <td className="light-h3">
                    {produto.codigo}
                  </td>

                  <td className="light-h3">
                    {produto.empresa}
                  </td>

                  <td className="light-h3">
                    {produto.descricao}
                  </td>

                  <td className="medium-h3">
                    {produto.valor}
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

export default Produtos;