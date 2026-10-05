import './Container.css'; // Importa o CSS abaixo

function Container(props: any) {
  return (
    <div className="erp-container">
      {props.children}
    </div>
  );
}

export default Container;
