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
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "#666",
          background: "#f9f9f9",
          borderRadius: "4px",
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Desktop table view */}
      <div className="table-desktop">
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "white",
          }}
        >
          <thead>
            <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "#333",
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={keyExtractor(item, index)} style={{ borderBottom: "1px solid #eee" }}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: "1rem",
                      color: "#333",
                    }}
                  >
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
          <div
            key={keyExtractor(item, index)}
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "1rem",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            }}
          >
            {columns.map((col) => (
              <div
                key={col.key}
                style={{
                  marginBottom: "0.75rem",
                  paddingBottom: "0.75rem",
                  borderBottom: "1px solid #eee",
                }}
              >
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#666",
                    marginBottom: "0.25rem",
                    fontWeight: 500,
                  }}
                >
                  {col.mobileLabel || col.header}
                </div>
                <div style={{ color: "#333" }}>{col.render(item)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Responsive styles */}
      <style jsx>{`
        .table-desktop {
          display: block;
        }

        .table-mobile {
          display: none;
        }

        @media (max-width: 768px) {
          .table-desktop {
            display: none;
          }

          .table-mobile {
            display: block;
          }
        }
      `}</style>
    </>
  );
}
