/**
 * T063 [US12] Responsive table component
 *
 * Provides a mobile-friendly table that:
 * - Shows as standard table on desktop (>=768px)
 * - Converts to card layout on mobile (<768px)
 * - Maintains accessibility and touch-friendly interactions
 */

import { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  mobileLabel?: string; // Optional custom label for mobile view
}

export interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  emptyMessage?: string;
}

export function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data available",
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="enrollment-empty">
        <p className="enrollment-empty-text">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table view */}
      <div className="table-desktop">
        <table className="table-basic">
          <thead>
            <tr className="table-header-row">
              {columns.map((col) => (
                <th key={col.key} className="table-header">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={keyExtractor(item, index)} className="table-row">
                {columns.map((col) => (
                  <td key={col.key} className="table-cell">
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="table-mobile">
        {data.map((item, index) => (
          <div key={keyExtractor(item, index)} className="table-mobile-card">
            {columns.map((col) => (
              <div key={col.key} className="table-mobile-field">
                <span className="table-mobile-label">{col.mobileLabel || col.header}</span>
                <div>{col.render(item)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
