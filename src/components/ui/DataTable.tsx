import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
}

interface DataTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  footer?: ReactNode;
  caption?: string;
}

/** Generic, accessible table. Feature components decide the columns and cells. */
export default function DataTable<T>({ columns, rows, footer, caption }: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
      <table className="w-full text-left text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="bg-paper text-xs uppercase tracking-wide text-ink-600">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-4 py-3 font-semibold ${column.align === "right" ? "text-right" : "text-left"}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-200">
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 ${column.align === "right" ? "text-right" : "text-left"}`}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer ? <tfoot className="bg-paper font-bold">{footer}</tfoot> : null}
      </table>
    </div>
  );
}
