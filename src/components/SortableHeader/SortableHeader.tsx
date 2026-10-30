import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { DirecaoOrdenacao } from "../../lib/ordenacao";
import "./SortableHeader.css";

type SortableHeaderProps = {
  label: string;
  active: boolean;
  direction: DirecaoOrdenacao;
  onClick: () => void;
  className?: string;
};

function SortableHeader({
  label,
  active,
  direction,
  onClick,
  className,
}: SortableHeaderProps) {
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      className={`sortable-header-cell ${className ?? ""}`}
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        className="sortable-header-button"
        onClick={onClick}
        title={`Ordenar por ${label}`}
      >
        <span>{label}</span>
        <Icon size={14} aria-hidden="true" />
      </button>
    </th>
  );
}

export default SortableHeader;