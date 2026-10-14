import { useState } from "react";
import type { ChangeEvent } from "react";

import CaixaDeTexto from "../CaixaDeTexto/CaixaDeTexto";
import Button from "../Button/Button";

import "./Produtos.css";

type ImagemProdutoProps = {
  titulo: string;
};

type ProdutoTabela = {
  id: number;
  nome: string;
  codigo: string;
  empresa: string;
  descricao: string;
  valor: string;
};

function ImagemProduto({ titulo }: ImagemProdutoProps) {
  const [imagem, setImagem] = useState<string | null>(null);

  function selecionarImagem(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];

    if (!arquivo) {
      return;
    }

    const enderecoImagem = URL.createObjectURL(arquivo);
    setImagem(enderecoImagem);
  }

  return (
    <div className="produto-imagem-grupo">
      <span className="medium-h3">
        {titulo}
      </span>

      <label className="produto-imagem-caixa">
        {imagem ? (
          {imagem}
        ) : (
          <span className="produto-imagem-icone">
            +
          </span>
        )}

        <input
          type="file"
          accept="image/*"
          onChange={selecionarImagem}
        />
      </label>

      <span className="light-h3">
        Inserir produto
      </span>
    </div>
  );
}

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
          <h1 className="medium-h2">
            Cadastro de produto
          </h1>
        </div>

        <div className="produtos-formulario">
          <div className="produtos-campos">
            <CaixaDeTexto titulo="Nome do produto" />

            <CaixaDeTexto titulo="Descrição do produto" />

            <div className="produtos-campos-menores">
              <CaixaDeTexto titulo="Código" />

              <CaixaDeTexto titulo="Categoria" />
            </div>

            <CaixaDeTexto
              titulo="Valor"
              type="number"
            />
          </div>

          <div className="produtos-imagens">
            <ImagemProduto titulo="Imagem principal" />

            <ImagemProduto titulo="Imagem secundária" />
          </div>
        </div>

        <div className="produtos-acoes">
          <Button
            texto="Cancelar"
            cor="btn-secundaria"
          />

          <Button
            texto="Editar"
            cor="btn-c"
          />

          <Button
            texto="Salvar"
            cor="btn-primaria"
          />
        </div>
      </div>

      <div className="produtos-listagem">
        <div className="produtos-listagem-titulo">
          <h2 className="medium-h2">
            Produtos cadastrados
          </h2>
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