import React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DataTablePaginationProps {
  table: any
}

export function DataTablePagination({ table }: DataTablePaginationProps) {
  const selectedCount = table.getFilteredSelectedRowModel?.()?.rows?.length ?? 0
  const totalCount = table.getFilteredRowModel?.()?.rows?.length ?? 0
  
  const state = table.store?.state || table.options?.state || {}
  const pagination = state.pagination || { pageIndex: 0, pageSize: 10 }
  const pageIndex = pagination.pageIndex ?? 0
  const pageSize = pagination.pageSize ?? 10
  const pageCount = typeof table.getPageCount === 'function' ? Math.max(1, table.getPageCount()) : 1

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-3">
      <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
        {selectedCount} of {totalCount} row(s) selected.
      </div>
      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-6 w-full sm:w-auto">
        <div className="flex items-center space-x-2">
          <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Rows per page</p>
          <select
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value)
              if (typeof table.setPageSize === 'function') {
                table.setPageSize(newSize)
              }
            }}
            className="h-8 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#262626] text-xs font-semibold text-neutral-800 dark:text-neutral-200 px-2 py-1 outline-none"
          >
            {[5, 10, 20, 30, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
            Page {pageIndex + 1} of {pageCount}
          </div>
          <div className="flex items-center space-x-1.5">
            <Button
              variant="outline"
              size="icon"
              className="hidden h-8 w-8 lg:flex"
              onClick={() => {
                if (typeof table.firstPage === 'function') {
                  table.firstPage()
                } else if (typeof table.setPageIndex === 'function') {
                  table.setPageIndex(0)
                }
              }}
              disabled={!table.getCanPreviousPage?.()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4 shrink-0" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.previousPage?.()}
              disabled={!table.getCanPreviousPage?.()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4 shrink-0" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage?.()}
              disabled={!table.getCanNextPage?.()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden h-8 w-8 lg:flex"
              onClick={() => {
                if (typeof table.lastPage === 'function') {
                  table.lastPage()
                } else if (typeof table.setPageIndex === 'function') {
                  table.setPageIndex(pageCount - 1)
                }
              }}
              disabled={!table.getCanNextPage?.()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4 shrink-0" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
