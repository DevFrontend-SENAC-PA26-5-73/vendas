import "./Atendimento.css";

import CaixaDeTexto from "../CaixaDeTexto/CaixaDeTexto";
import Button from "../Button/Button";

function Atendimento() {
  return (
    <section className="atendimento">
      {/* DADOS DO CLIENTE */}

      <div className="atendimento-card atendimento-cliente">
        <CaixaDeTexto titulo="Nome Completo" />

        <div className="atendimento-linha atendimento-tres-colunas">
          <CaixaDeTexto titulo="CPF" />

          <CaixaDeTexto
            titulo="Data de Nascimento"
            type="date"
          />

          <CaixaDeTexto titulo="Sexo" />
        </div>

        <div className="atendimento-linha atendimento-duas-colunas">
          <CaixaDeTexto
            titulo="Telefone"
            type="tel"
          />

          <CaixaDeTexto
            titulo="E-Mail"
            type="email"
          />
        </div>

        <div className="atendimento-titulo">
          <h2 className="medium-h2">Endereço</h2>
        </div>

        <div className="atendimento-linha atendimento-duas-colunas">
          <CaixaDeTexto titulo="Rua" />

          <CaixaDeTexto titulo="Complemento" />
        </div>

        <div className="atendimento-linha atendimento-endereco">
          <CaixaDeTexto titulo="Estado" />

          <CaixaDeTexto titulo="Cidade" />

          <CaixaDeTexto
            titulo="Número"
            type="number"
          />
        </div>

        <div className="atendimento-acoes atendimento-acoes-cliente">
          <div className="acao-esquerda">
            <Button
              texto="Cancelar"
              cor="btn-secundaria"
            />
          </div>

          <div className="acao-centro">
            <Button
              texto="Editar"
              cor="btn-c"
            />
          </div>

          <div className="acao-direita">
            <Button
              texto="Salvar"
              cor="btn-primaria"
            />
          </div>
        </div>
      </div>

      {/* DADOS DO PEDIDO */}

      <div className="atendimento-card atendimento-pedido">
        <CaixaDeTexto titulo="Código do Pedido" />

        <div className="atendimento-linha atendimento-duas-colunas">
          <CaixaDeTexto
            titulo="Data Emissão"
            type="date"
          />

          <CaixaDeTexto
            titulo="Data Entrega"
            type="date"
          />
        </div>

        <CaixaDeTexto titulo="Vendedor" />

        <div className="atendimento-linha atendimento-duas-colunas">
          <CaixaDeTexto
            titulo="Preço"
            type="number"
          />

          <CaixaDeTexto
            titulo="Quantidade"
            type="number"
          />
        </div>

        <CaixaDeTexto titulo="Valor Total" />

        <CaixaDeTexto titulo="Forma de Pagamento" />

        <CaixaDeTexto titulo="Parcelamento" />

        <div className="atendimento-acoes atendimento-acoes-pedido">
          <Button
            texto="Cancelar"
            cor="btn-secundaria"
          />

          <Button
            texto="Confirmar"
            cor="btn-primaria"
          />
        </div>
      </div>
    </section>
  );
}

export default Atendimento;