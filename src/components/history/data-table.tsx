import * as React from "react"
import {
  useTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type RowData,
  type SortingState,
} from "@tanstack/react-table"
import { Search, Download, Trash2, Layers } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import { features, type DataTableFeatures } from "./data-table-features"
import { DataTablePagination } from "./data-table-pagination"
import { DataTableViewOptions } from "./data-table-view-options"

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  onBatchDelete?: (selectedRows: TData[]) => void
  onBatchExport?: (selectedRows: TData[]) => void
  onRowClick?: (row: TData) => void
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  searchKey = "subjectCode",
  searchPlaceholder = "Filter by subject or code...",
  onBatchDelete,
  onBatchExport,
  onRowClick,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useTable({
    features,
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows.map(r => r.original)

  return (
    <div className="space-y-3">
      {/* Top Controls: Search filter & Column toggles */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="w-full pl-10 pr-4 py-2 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent-tertiary-subtle)] focus:border-[var(--accent-tertiary)] transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {selectedRows.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in-0 duration-200">
              {onBatchExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBatchExport(selectedRows)}
                  className="gap-1.5 text-xs font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export ({selectedRows.length})
                </Button>
              )}
              {onBatchDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onBatchDelete(selectedRows)}
                  className="gap-1.5 text-xs font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete ({selectedRows.length})
                </Button>
              )}
            </div>
          )}

          <DataTableViewOptions table={table} />
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#171717] shadow-sm">
        <Table className="min-w-[640px]">
          <TableHeader className="bg-neutral-50/80 dark:bg-[#202020] border-b border-neutral-200 dark:border-neutral-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('[role="checkbox"]') || target.closest('[data-radix-collection-item]')) {
                      return;
                    }
                    onRowClick?.(row.original);
                  }}
                  className={`transition-colors hover:bg-neutral-50/80 dark:hover:bg-[#202020] ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 text-neutral-400 dark:text-neutral-500">
                    <Layers className="w-8 h-8 stroke-[1.5]" />
                    <p className="text-xs font-bold">No sessions found matching your filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination & Row counts */}
      <DataTablePagination table={table} />
    </div>
  )
}
