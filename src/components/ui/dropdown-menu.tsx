import * as React from "react"
import { Check } from "lucide-react"

interface DropdownMenuContextType {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType | null>(null)

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div ref={menuRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

export function DropdownMenuTrigger({
  children,
  render,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  render?: React.ReactElement
}) {
  const ctx = React.useContext(DropdownMenuContext)
  if (!ctx) return null

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    ctx.setOpen(prev => !prev)
    if (props.onClick) props.onClick(e)
  }

  if (render) {
    return React.cloneElement(render, {
      onClick: handleClick,
      'aria-expanded': ctx.open,
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-expanded={ctx.open}
      className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#171717] text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-[#262626] transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function DropdownMenuContent({
  children,
  align = "end",
  className = "",
}: {
  children: React.ReactNode
  align?: "start" | "end" | "center"
  className?: string
}) {
  const ctx = React.useContext(DropdownMenuContext)
  if (!ctx || !ctx.open) return null

  const alignClass =
    align === "end"
      ? "right-0"
      : align === "start"
      ? "left-0"
      : "left-1/2 -translate-x-1/2"

  return (
    <div
      className={`absolute z-50 mt-2 min-w-[10rem] overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1f1f1f] p-1.5 text-neutral-900 dark:text-neutral-100 shadow-xl animate-in fade-in-0 zoom-in-95 ${alignClass} ${className}`}
    >
      {children}
    </div>
  )
}

export function DropdownMenuItem({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  const ctx = React.useContext(DropdownMenuContext)

  return (
    <div
      onClick={(e) => {
        if (onClick) onClick()
        ctx?.setOpen(false)
      }}
      className={`relative flex cursor-pointer select-none items-center rounded-xl px-3 py-2 text-xs font-semibold outline-none transition-colors hover:bg-neutral-100 dark:hover:bg-[#2e2e2e] text-neutral-700 dark:text-neutral-200 ${className}`}
    >
      {children}
    </div>
  )
}

export function DropdownMenuCheckboxItem({
  children,
  checked,
  onCheckedChange,
  className = "",
}: {
  children: React.ReactNode
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
}) {
  return (
    <div
      onClick={() => onCheckedChange && onCheckedChange(!checked)}
      className={`relative flex cursor-pointer select-none items-center rounded-xl py-2 pl-8 pr-3 text-xs font-semibold outline-none transition-colors hover:bg-neutral-100 dark:hover:bg-[#2e2e2e] text-neutral-700 dark:text-neutral-200 ${className}`}
    >
      <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
        {checked && <Check className="h-4 w-4 text-emerald-500" />}
      </span>
      {children}
    </div>
  )
}

export function DropdownMenuLabel({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 ${className}`}
    >
      {children}
    </div>
  )
}

export function DropdownMenuSeparator({
  className = "",
}: {
  className?: string
}) {
  return (
    <div
      className={`-mx-1 my-1 h-px bg-neutral-100 dark:bg-neutral-800 ${className}`}
    />
  )
}
