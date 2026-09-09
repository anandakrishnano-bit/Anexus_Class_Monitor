import React from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DataTableViewOptionsProps {
  table: any
}

export function DataTableViewOptions({
  table,
}: DataTableViewOptionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="ml-auto hidden h-9 lg:flex gap-2 text-xs font-bold"
          />
        }
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Columns
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns?.()
          ?.filter((column: any) => column.getCanHide?.())
          ?.map((column: any) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible?.()}
                onCheckedChange={(value) => column.toggleVisibility?.(!!value)}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            )
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
