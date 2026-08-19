import { ChevronLeft, ChevronRight } from "lucide-react";

export function DataTablePanel({ children, className = "" }) {
  return <section className={`data-panel ${className}`.trim()}>{children}</section>;
}

export function DataTable({ columns, children, className = "" }) {
  return (
    <div className={`data-grid-table ${className}`.trim()}>
      <div className="data-grid-header data-grid-row">
        {columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      {children}
    </div>
  );
}

export function TablePagination({
  start,
  end,
  total,
  label = "items",
  page = 1,
  totalPages = 1,
  pageSize = 10,
  pageSizeOptions = [5, 10, 20],
  onPageChange,
  onPageSizeChange,
  disabled = false,
}) {
  const canPrevious = !disabled && page > 1;
  const canNext = !disabled && page < totalPages;

  return (
    <div className="table-pagination">
      <span>
        Showing {start} to {end} of {total} {label}
      </span>
      <div className="pagination-actions">
        <button type="button" disabled={!canPrevious} onClick={() => onPageChange?.(page - 1)}>
          <ChevronLeft size={16} />
        </button>
        <strong>{page}</strong>
        <button type="button" disabled={!canNext} onClick={() => onPageChange?.(page + 1)}>
          <ChevronRight size={16} />
        </button>
        <select
          value={pageSize}
          disabled={disabled}
          onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>{option} per page</option>
          ))}
        </select>
      </div>
    </div>
  );
}
