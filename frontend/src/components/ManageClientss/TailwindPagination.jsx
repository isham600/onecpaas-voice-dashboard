const TailwindPagination = ({
  count,
  rowsPerPage,
  page,
  onPageChange,
  onRowsPerPageChange,
}) => {
  const totalPages = Math.ceil(count / rowsPerPage);
  const startItem = page * rowsPerPage + 1;
  const endItem = Math.min(startItem + rowsPerPage - 1, count);

  return (
    <div className="flex items-center justify-end space-x-4 py-2 text-gray-700">
      {/* Rows per page selection */}
      <div className="flex items-center space-x-2">
        <span className="text-sm">Rows per page:</span>
        <select
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring focus:ring-indigo-300"
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(e, parseInt(e.target.value))}
        >
          {[5, 10, 25].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {/* Page info */}
      <span className="text-sm">
        {startItem}-{endItem} of {count}
      </span>

      {/* Pagination buttons */}
      <div className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(null, 0)}
          disabled={page === 0}
          className={`p-1 border rounded ${
            page === 0
              ? "text-gray-400 cursor-not-allowed"
              : "hover:bg-gray-200"
          }`}
        >
          ⏮
        </button>

        <button
          onClick={() => onPageChange(null, page - 1)}
          disabled={page === 0}
          className={`p-1 border rounded ${
            page === 0
              ? "text-gray-400 cursor-not-allowed"
              : "hover:bg-gray-200"
          }`}
        >
          ◀
        </button>

        <button
          onClick={() => onPageChange(null, page + 1)}
          disabled={page >= totalPages - 1}
          className={`p-1 border rounded ${
            page >= totalPages - 1
              ? "text-gray-400 cursor-not-allowed"
              : "hover:bg-gray-200"
          }`}
        >
          ▶
        </button>

        <button
          onClick={() => onPageChange(null, totalPages - 1)}
          disabled={page >= totalPages - 1}
          className={`p-1 border rounded ${
            page >= totalPages - 1
              ? "text-gray-400 cursor-not-allowed"
              : "hover:bg-gray-200"
          }`}
        >
          ⏭
        </button>
      </div>
    </div>
  );
};

export default TailwindPagination;
