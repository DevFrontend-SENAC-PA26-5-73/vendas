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

      <div className="sidebar">
        <House />
        <ChartPie />
        <CircleUserRound />
        <LayoutDashboard />
        <SquareMousePointer />
        <ArrowDownUp />
        <Box />
        <CircleDollarSign />
        <Settings />
      </div>

    </div>
  );
}

export default Menu;