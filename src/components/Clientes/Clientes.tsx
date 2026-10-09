import "./Clientes.css";
import { ArrowLeft } from "lucide-react";

function Clientes() {
    return (
        <section className="pagina-clientes">

            <header className="clientes-cabecalho">
                <ArrowLeft size={20} />
                <h1>Clientes</h1>
            </header>

            <div className="tabela-clientes">

                <div className="linha-titulos">
                    <span>Nome</span>
                    <span>RG</span>
                    <span>CPF</span>
                    <span>Endereço</span>
                    <span>CEP</span>
                    <span>Contato</span>
                </div>

                <div className="lista-clientes">
                    {Array.from({ length: 16 }).map((_, index) => (
                        <div className="linha-cliente" key={index}>
                            <input type="text" weight-medium ={`Nome do cliente ${index + 1}`} />
                            <input type="text" weight-medium ={`RG do cliente ${index + 1}`} />
                            <input type="text" weight-medium={`CPF do cliente ${index + 1}`} />
                            <input type="text" weight-medium={`Endereço do cliente ${index + 1}`} />
                            <input type="text" weight-medium={`CEP do cliente ${index + 1}`} />
                            <input type="text" weight-medium={`Contato do cliente ${index + 1}`} />
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
}

export default Clientes;