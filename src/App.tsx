import React, { useState } from 'react';
import Container from './components/Container/Container';
import CaixaDeTexto from './components/CaixaDeTexto/CaixaDeTexto';
import MenuButton from './components/MenuButton/MenuButton';

function App() {
  // Estado para controlar qual aba do menu lateral está ativa
  const [paginaAtual, setPaginaAtual] = useState('vendas');

  // Estado para capturar o texto digitado na caixa de entrada
  const [codigoProduto, setCodigoProduto] = useState('');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--c)' }}>
      
      {/* 1. BARRA LATERAL (SIDEBAR) */}
      <aside style={{ 
        width: '220px', 
        backgroundColor: 'var(--w)', 
        borderRight: '1px solid rgba(158, 158, 158, 0.3)',
        padding: '40px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <h2 className="bold-h2" style={{ paddingLeft: '12px', marginBottom: '20px', color: 'var(--b)' }}>
          ERP Vendas
        </h2>
        
        {/* Botões do Menu Lateral que alternam a cor verde ao clicar */}
        <MenuButton 
          texto="Início" 
          icone="🏠" 
          ativo={paginaAtual === 'inicio'} 
          onClick={() => setPaginaAtual('inicio')} 
        />
        <MenuButton 
          texto="Vendas" 
          icone="💰" 
          ativo={paginaAtual === 'vendas'} 
          onClick={() => setPaginaAtual('vendas')} 
        />
        <MenuButton 
          texto="Estoque" 
          icone="📦" 
          ativo={paginaAtual === 'estoque'} 
          onClick={() => setPaginaAtual('estoque')} 
        />
        <MenuButton 
          texto="Configurações" 
          icone="⚙️" 
          ativo={paginaAtual === 'config'} 
          onClick={() => setPaginaAtual('config')} 
        />
      </aside>

      {/* 2. ÁREA DE CONTEÚDO PRINCIPAL (DIREITA) */}
      <main style={{ flex: 1, padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* O seu Container estático do Figma (793x878px) */}
        <Container>
          
          {/* Cabeçalho do formulário usando suas classes do index.css */}
          <header style={{ marginBottom: '10px' }}>
            <h1 className="bold-h1" style={{ color: 'var(--b)', marginBottom: '4px' }}>
              Consulta de Registro
            </h1>
            <p className="medium-h3" style={{ color: '#666' }}>
              Insira os dados do produto para realizar as operações no sistema.
            </p>
          </header>

          {/* Sua CaixaDeTexto simples com tamanho exato de 128x42px */}
          <CaixaDeTexto 
            label="Cód. Produto"
            placeholder="Ex: 1020"
            value={codigoProduto}
            onChange={(e: any) => setCodigoProduto(e.target.value)}
          />

          {/* Espaçador estático para empurrar os botões de ação para baixo, se desejar */}
          <div style={{ flex: 1 }}></div>

          {/* Rodapé do Container com seus 3 Botões Redondos de Ação */}
          <footer style={{ display: 'flex', gap: '15px', borderTop: '1px solid #f2f2f7', paddingTop: '20px' }}>

          </footer>

        </Container>

      </main>

    </div>
  );
}

export default App;
