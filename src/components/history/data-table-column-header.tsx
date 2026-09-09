import React from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DataTableColumnHeaderProps {
  column: any
  title: string
  className?: string
}

export function DataTableColumnHeader({
  column,
  title,
  className = '',
}: DataTableColumnHeaderProps) {
  if (!column.getCanSort()) {
    return <div className={`text-xs font-bold uppercase tracking-wider text-neutral-500 ${className}`}>{title}</div>
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8 data-[state=open]:bg-neutral-100 dark:data-[state=open]:bg-neutral-800 text-xs font-bold uppercase tracking-wider"
            />
          }
        >
          <span>{title}</span>
          {column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-3.5 w-3.5" />
          ) : column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-3.5 w-3.5" />
          ) : (
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 text-neutral-400" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp className="mr-2 h-3.5 w-3.5 text-neutral-500" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown className="mr-2 h-3.5 w-3.5 text-neutral-500" />
            Desc
          </DropdownMenuItem>
          {column.getCanHide() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                <EyeOff className="mr-2 h-3.5 w-3.5 text-neutral-500" />
                Hide
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
