const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

// headers: string[]; rows: array of arrays (same order as headers)
export const downloadCSV = (filename, headers, rows) => {
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};
