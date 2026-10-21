
import { useEffect, useState } from "react";
import axios from "axios";

import CaixaDeTexto from "../CaixaDeTexto/CaixaDeTexto";
import Button from "../Button/Button";

import "./Produtos.css";

interface Iproduto {
  id: number;
  nome: string;
  quantidade: number;
  tipo: string;
  preco: number;
}

const API_URL = "https://vendas.gabrielpimentel.com.br/produtos";

function Produtos() {
  const [produtos, setProdutos] = useState<Iproduto[]>([]);

  useEffect(() => {
    axios
      .get(API_URL)
      .then((resposta) => {
        console.log("Resposta da API:", resposta.data);

        const dados = resposta.data;

        // Confere se a API retornou uma lista
        if (Array.isArray(dados)) {
          setProdutos(dados);
        } else if (Array.isArray(dados.produtos)) {
          setProdutos(dados.produtos);
        } else if (Array.isArray(dados.data)) {
          setProdutos(dados.data);
        } else {
          console.error(
            "A API não retornou uma lista de produtos:",
            dados
          );
          setProdutos([]);
        }
      })
      .catch((erro) => {
        console.error("Erro ao buscar produtos:", erro);
        setProdutos([]);
      });
  }, []);

  return (
    <section className="produtos">
      <div className="produtos-cadastro">
        <div className="produtos-cabecalho">
          <div>
            <h1 className="medium-h1">Cadastro de produto</h1>
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

  <CaixaDeTexto titulo="Quantidade" type="number" />

  <CaixaDeTexto titulo="Empresa" />

  <div className="produto-campo-descricao">
    <CaixaDeTexto titulo="Descrição do produto" />
  </div>

  <CaixaDeTexto titulo="Valor" type="number" />
</div>
        <div className="produtos-acoes">
          <div className="produto-acao-esquerda">
            <Button texto="Cancelar" cor="btn-secundaria" />
          </div>

          <div className="produto-acao-centro">
            <Button texto="Editar" cor="btn-c" />
          </div>

          <div className="produto-acao-direita">
            <Button texto="Salvar" cor="btn-primaria" />
          </div>
        </div>
      </div>

      <div className="produtos-listagem">
        <div className="produtos-listagem-titulo">
          <h2 className="medium-h1">Produtos cadastrados</h2>
          <p className="light-h3">
            Consulte os produtos existentes no sistema.
          </p>
        </div>

        <div className="produtos-tabela-container">
          <table className="produtos-tabela">
            <thead>
              <tr>
                <th className="medium-h3">Código de barra</th>
                <th className="medium-h3">Nome do produto</th>
                <th className="medium-h3">Categoria</th>
                <th className="medium-h3">Empresa</th>
                <th className="medium-h3">Descrição</th>
                <th className="medium-h3">Valor</th>
                <th className="medium-h3">Estoque</th>
              </tr>
            </thead>

            <tbody>
              {produtos.map((produto) => (
                <tr key={produto.id}>
                  <td className="light-h3">{produto.id}</td>
                  <td className="light-h3">{produto.nome}</td>
                  <td className="light-h3">{produto.tipo}</td>
                  <td className="light-h3">Falta implementar</td>
                  <td className="light-h3">Falta implementar</td>

                  <td className="medium-h3">
                    {Number(produto.preco || 0).toLocaleString(
                      "pt-BR",
                      {
                        style: "currency",
                        currency: "BRL",
                      }
                    )}
                  </td>

                  <td className="light-h3">
                    {produto.quantidade}
                  </td>
                </tr>
              ))}

              {produtos.length === 0 && (
                <tr>
                  <td colSpan={7} className="light-h3">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default Produtos;
