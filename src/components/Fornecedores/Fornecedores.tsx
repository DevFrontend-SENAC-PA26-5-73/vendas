import "./Fornecedores.css";
import { ArrowLeft } from "lucide-react";

function Fornecedores() {
    return (
        <div className="fornecedores-layout">

            {/* FORMULÁRIO PRINCIPAL */}
            <section className="formulario-fornecedor">

                <header className="titulo-fornecedor">
                    <ArrowLeft size={20} />
                    <h2>Fornecedores</h2>
                </header>

                <div className="campos-fornecedor">

                    <label className="campo nome">
                        Nome
                        <input type="text" placeholder="Caixa de texto" />
                    </label>

                    <label className="campo cpf">
                        CPF/CNPJ
                        <input type="text" />
                    </label>

                    <label className="campo fax">
                        FAX
                        <input type="text" />
                    </label>

                    <label className="campo website">
                        WebSite
                        <input type="text" />
                    </label>

                    <label className="campo telefone">
                        Telefone
                        <input type="text" />
                    </label>

                    <label className="campo estado">
                        Estado Civil
                        <input type="text" />
                    </label>

                    <label className="campo endereco">
                        Endereço
                        <input type="text" />
                    </label>

                    <label className="campo cep">
                        CEP
                        <input type="text" />
                    </label>

                    <label className="campo numero">
                        Número
                        <input type="text" />
                    </label>

                    <label className="campo uf">
                        UF
                        <input type="text" />
                    </label>

                    <label className="campo empresa">
                        Empresa
                        <input type="text" />
                    </label>

                    <label className="campo cidade">
                        Cidade
                        <input type="text" />
                    </label>

                    <label className="campo cargo">
                        Cargo
                        <input type="text" />
                    </label>

                    <label className="campo contato">
                        Contato
                        <input type="text" />
                    </label>

                    <label className="campo email">
                        Email Empresarial
                        <input type="email" />
                    </label>

                    <label className="campo inscricao">
                        Inscrição estadual
                        <input type="text" />
                    </label>

                    <label className="campo isento">
                        <input type="checkbox" />
                        Isento
                    </label>

                </div>

                <div className="botoes-fornecedor">
                    <button type="button" className="btn-cancelar">
                        Cancelar
                    </button>

                    <button type="button" className="btn-editar">
                        Editar
                    </button>

                    <button type="button" className="btn-salvar">
                        Salvar
                    </button>
                </div>

            </section>

            {/* PAINEL DE PEDIDOS */}
            <aside className="pedido-fornecedor">

                <label className="campo">
                    Código do pedido
                    <input type="text" />
                </label>

                <div className="grupo-pedido">
                    <label className="campo">
                        Data do Pedido
                        <input type="date" />
                    </label>

                    <label className="campo">
                        Data de Entrega
                        <input type="date" />
                    </label>
                </div>

                <label className="campo">
                    Fornecedor
                    <input type="text" />
                </label>

                <div className="grupo-pedido">
                    <label className="campo">
                        Preço
                        <input type="number" />
                    </label>

                    <label className="campo">
                        Quantidade
                        <input type="number" />
                    </label>
                </div>

                <label className="campo">
                    Valor Total
                    <input type="text" readOnly />
                </label>

                <label className="campo">
                    Forma de pagamento
                    <input type="text" />
                </label>

                <label className="campo">
                    Código Da Compra
                    <input type="text" />
                </label>

            </aside>

        </div>
    );
}

export default Fornecedores;