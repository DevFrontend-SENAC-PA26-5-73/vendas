import React from 'react';
import './MenuButton.css'; // Importa o CSS abaixo

function MenuButton(props: any) {
  // Se props.ativo for verdadeiro, aplica a classe de cor permanente
  const classeAtivo = props.ativo ? 'erp-menu-btn-ativo' : '';
  const classeFinal = `erp-menu-btn ${classeAtivo} medium-h2`.trim();

  return (
    <button className={classeFinal} onClick={props.onClick}>
      <span className="erp-menu-icon">
        {props.icone}
      </span>
      <span className="erp-menu-text">
        {props.texto}
      </span>
    </button>
  );
}

export default MenuButton;
