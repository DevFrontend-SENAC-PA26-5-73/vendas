import {
  House,
  ChartPie,
  CircleUserRound,
  LayoutDashboard,
  SquareMousePointer,
  Box,  
  ArrowDownUp,
  CircleDollarSign,
  Settings,
} from "lucide-react";

import "./Menu.css";

function Menu() {
  return (
    <div className="menu-container">

      <div className="menu-box">

        <div className="menu-item">
          <House size={25} />
          <span>Menu</span>
        </div>

        <div className="menu-item ativo">
          <House size={25} />
          <span>Menu</span>
        </div>

      </div>

      
    </div>
  );
}

export default Menu;