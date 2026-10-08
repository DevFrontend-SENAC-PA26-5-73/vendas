import React, { useState } from "react";
import {
  House,
  ChartPie,
  CircleUserRound,
  LayoutDashboard,
  SquareMousePointer,
  ArrowDownUp,
  Box,
  CircleDollarSign,
  Settings,
} from "lucide-react";
import "./MenuButton.css"; // Mantém o import do seu arquivo de estilo
import CaixaDeTexto from "../CaixaDeTexto/CaixaDeTexto";

function MenuButton() {
  // Controle de estado estático para saber qual botão está ativo em cada seção
  const [ativoMenu, setAtivoMenu] = useState("menu1");
  const [ativoSidebar, setAtivoSidebar] = useState("house");

  return (
    <div className="menu-container">

      {/* 1. CAIXA DO MENU (VERSÃO EXPANDIDA COM TEXTO) */}
      <div className="menu-box">
        
        {/* Usamos a classe estática com base no estado 'ativoMenu' */}
        <div 
          className={`menu-item ${ativoMenu === "menu1" ? "ativo" : ""}`} 
          onClick={() => setAtivoMenu("menu1")}
        >
          <House size={25} />
          <span>Menu</span>
        </div>
      </div>
      </div>
  );
}

export default MenuButton;
