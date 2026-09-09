import React from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { MoreHorizontal, FileSpreadsheet, Trash2, Copy, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from './data-table-column-header'
import { type DataTableFeatures } from './data-table-features'
import { AttendanceSession } from '@/types'

export type SessionRow = {
  id: number
  date: string
  periodNumber: number
  subjectCode: string
  subjectName: string
  facultyName: string
  presentCount: number
  absentCount: number
  totalStudents: number
  percentage: number
  rawSession: AttendanceSession
}

const columnHelper = createColumnHelper<DataTableFeatures, SessionRow>()

export const createColumns = (actions: {
  onReExport: (session: AttendanceSession) => void
  onDelete: (id: number) => void
  onCopyInfo?: (session: AttendanceSession) => void
  onViewDetails?: (session: AttendanceSession) => void
}) =>
  columnHelper.columns([
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={
            table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    }),

    columnHelper.accessor('date', {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
          {row.getValue('date')}
        </span>
      ),
    }),

    columnHelper.accessor('subjectCode', {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Subject" />
      ),
      cell: ({ row }) => {
        const rowData = row.original
        return (
          <div className="flex flex-col">
            <span className="font-bold text-neutral-900 dark:text-white text-xs">
              {rowData.subjectName || rowData.subjectCode}
            </span>
            <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
              {rowData.subjectCode}
            </span>
          </div>
        )
      },
    }),

    columnHelper.accessor('periodNumber', {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Period" />
      ),
      cell: ({ row }) => (
        <span className="px-2.5 py-1 rounded-full bg-[var(--accent-tertiary-subtle)] text-[var(--accent-tertiary)] text-xs font-bold font-mono">
          P{row.getValue('periodNumber')}
        </span>
      ),
    }),

    columnHelper.accessor('facultyName', {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Faculty" />
      ),
      cell: ({ row }) => (
        <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 truncate max-w-[140px] block">
          {row.getValue('facultyName') || 'Faculty In-Charge'}
        </span>
      ),
    }),

    columnHelper.accessor('presentCount', {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Present / Total" />
      ),
      cell: ({ row }) => {
        const r = row.original
        return (
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 font-mono">
            {r.presentCount} / {r.totalStudents}
          </span>
        )
      },
    }),

    columnHelper.accessor('percentage', {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Rate %" />
      ),
      cell: ({ row }) => {
        const val = row.getValue('percentage') as number
        const isGood = val >= 75
        const isAvg = val >= 60 && val < 75

        return (
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold ${
              isGood
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : isAvg
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
            }`}
          >
            {val.toFixed(1)}%
          </span>
        )
      },
    }),

    columnHelper.display({
      id: 'actions',
      cell: ({ row }) => {
        const item = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Session Actions</DropdownMenuLabel>
              {actions.onViewDetails && (
                <DropdownMenuItem onClick={() => actions.onViewDetails?.(item.rawSession)}>
                  <Eye className="mr-2 h-3.5 w-3.5" />
                  View Details
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  if (actions.onCopyInfo) {
                    actions.onCopyInfo(item.rawSession);
                  } else {
                    const absentees = (item.rawSession.records || [])
                      .filter(r => r.status === 'absent')
                      .map(r => `${r.registerNo}  ${r.name.toUpperCase()}`);
                    const absText = absentees.length > 0 ? absentees.join('\n') : 'NIL';
                    const text = `Attendance ${item.date}\nPeriod ${item.periodNumber}\nSubject: ${item.subjectName || item.subjectCode} (${item.subjectCode})\nFaculty: ${item.facultyName}\n\nABSENTEES (${item.absentCount}):\n${absText}\n\nPresent: ${item.presentCount}/${item.totalStudents} (${item.percentage.toFixed(1)}%)`;
                    navigator.clipboard.writeText(text);
                  }
                }}
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copy Full Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onReExport(item.rawSession)}>
                <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
                Re-export Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => actions.onDelete(item.id)}
                className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete Session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableSorting: false,
      enableHiding: false,
    }),
  ])
