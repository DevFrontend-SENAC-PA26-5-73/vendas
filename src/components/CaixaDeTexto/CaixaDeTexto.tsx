import React from 'react';
import './CaixaDeTexto.css'; // Importa o CSS separado

function CaixaDeTexto(props: any) {
  return (
    <div className="erp-input-group">
      {/* Exibe a etiqueta com a sua classe global se você passar a propriedade label */}
      {props.label && <label className="bold-h3">{props.label}</label>}
      
      <input
        type="text"
        className="erp-input-field medium-h2"
        placeholder={props.placeholder}
        value={props.value}
        onChange={props.onChange}
      />
    </div>
  );
}

export default CaixaDeTexto;
