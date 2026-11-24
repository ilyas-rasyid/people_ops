import { ChevronLeft, ChevronRight } from "lucide-react";
export function Pagination({
  page,
  pageSize = 20,
  total,
  onChange,
}: {
  page: number;
  pageSize?: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pagination">
      <span>{total} total records</span>
      <div>
        <button
          className="icon-btn"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={18} />
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button
          className="icon-btn"
          onClick={() => onChange(Math.min(pages, page + 1))}
          disabled={page >= pages}
          aria-label="Next page"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
