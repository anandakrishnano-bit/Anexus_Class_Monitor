import * as React from "react"
import { PanelLeft } from "lucide-react"
import { cn } from "@/lib/utils"

const SIDEBAR_COOKIE_NAME = "sidebar:state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "4.5rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

interface SidebarContextType {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean | ((value: boolean) => boolean)) => void
  openMobile: boolean
  setOpenMobile: (open: boolean | ((value: boolean) => boolean)) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextType | null>(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }
  return context
}

interface SidebarProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const SidebarProvider = React.forwardRef<HTMLDivElement, SidebarProviderProps>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const [_open, _setOpen] = React.useState(defaultOpen)
    const [openMobile, setOpenMobile] = React.useState(false)
    const [isMobile, setIsMobile] = React.useState(false)

    const open = openProp !== undefined ? openProp : _open
    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const nextOpen = typeof value === "function" ? value(open) : value
        if (setOpenProp) {
          setOpenProp(nextOpen)
        } else {
          _setOpen(nextOpen)
        }
      },
      [setOpenProp, open]
    )

    // Check media query for mobile/portrait screens (< 768px)
    React.useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768)
      }
      checkMobile()
      window.addEventListener("resize", checkMobile)
      return () => window.removeEventListener("resize", checkMobile)
    }, [])

    const toggleSidebar = React.useCallback(() => {
      if (isMobile) {
        setOpenMobile((prev) => !prev)
      } else {
        setOpen((prev) => !prev)
      }
    }, [isMobile, setOpen])

    // Keyboard shortcut (Ctrl+B / Cmd+B)
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault()
          toggleSidebar()
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [toggleSidebar])

    const state = open ? "expanded" : "collapsed"

    const contextValue = React.useMemo<SidebarContextType>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
    )

    return (
      <SidebarContext.Provider value={contextValue}>
        <div
          ref={ref}
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          className={cn("flex min-h-full w-full", className)}
          {...props}
        >
          {children}
        </div>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
  dir?: "ltr" | "rtl"
}

export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "icon",
      className,
      children,
      dir = "ltr",
      ...props
    },
    ref
  ) => {
    const { open, state } = useSidebar()

    return (
      <aside
        ref={ref}
        data-state={state}
        data-collapsible={collapsible}
        data-side={side}
        data-variant={variant}
        dir={dir}
        className={cn(
          "group/sidebar hidden md:flex flex-col shrink-0 sticky top-16 h-[calc(100vh-4rem)] z-20",
          "border-r border-neutral-200/80 dark:border-neutral-800 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md",
          "transition-[width] duration-300 ease-in-out select-none",
          open ? "w-64" : collapsible === "icon" ? "w-[4.5rem]" : "w-0 overflow-hidden",
          className
        )}
        {...props}
      >
        <div className="flex flex-col h-full w-full overflow-hidden">
          {children}
        </div>
      </aside>
    )
  }
)
Sidebar.displayName = "Sidebar"

export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="sidebar-header"
      className={cn("flex flex-col gap-2 p-3 shrink-0 border-b border-neutral-100 dark:border-neutral-800/80", className)}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="sidebar-content"
      className={cn(
        "flex flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden p-2.5 scrollbar-thin",
        className
      )}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent"

export const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="sidebar-footer"
      className={cn("flex flex-col gap-2 p-3 shrink-0 border-t border-neutral-100 dark:border-neutral-800/80", className)}
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"

export const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="sidebar-group"
      className={cn("relative flex w-full min-w-0 flex-col p-1", className)}
      {...props}
    />
  )
})
SidebarGroup.displayName = "SidebarGroup"

export const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { open } = useSidebar()
  if (!open) return null
  return (
    <div
      ref={ref}
      data-slot="sidebar-group-label"
      className={cn(
        "px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500",
        className
      )}
      {...props}
    />
  )
})
SidebarGroupLabel.displayName = "SidebarGroupLabel"

export const SidebarGroupAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      data-slot="sidebar-group-action"
      className={cn(
        "absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors",
        className
      )}
      {...props}
    />
  )
})
SidebarGroupAction.displayName = "SidebarGroupAction"

export const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="sidebar-group-content"
      className={cn("w-full text-sm space-y-1", className)}
      {...props}
    />
  )
})
SidebarGroupContent.displayName = "SidebarGroupContent"

export const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => {
  return (
    <ul
      ref={ref}
      data-slot="sidebar-menu"
      className={cn("flex w-full min-w-0 flex-col gap-1 list-none p-0 m-0", className)}
      {...props}
    />
  )
})
SidebarMenu.displayName = "SidebarMenu"

export const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => {
  return (
    <li
      ref={ref}
      data-slot="sidebar-menu-item"
      className={cn("group/menu-item relative list-none", className)}
      {...props}
    />
  )
})
SidebarMenuItem.displayName = "SidebarMenuItem"

export interface SidebarMenuButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean
  tooltip?: string
  render?: React.ReactNode
}

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  SidebarMenuButtonProps
>(({ className, isActive = false, tooltip, render, children, ...props }, ref) => {
  const { open } = useSidebar()

  if (render && React.isValidElement(render)) {
    return React.cloneElement(render as React.ReactElement<{ className?: string; [key: string]: unknown }>, {
      ref,
      className: cn(
        "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-xs font-bold transition-all select-none active:scale-[0.98]",
        isActive
          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm"
          : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#171717] hover:text-neutral-900 dark:hover:text-white",
        !open && "justify-center px-0 py-2.5",
        (render.props as { className?: string }).className,
        className
      ),
      title: !open && tooltip ? tooltip : undefined,
      ...props,
    })
  }

  return (
    <button
      ref={ref}
      data-slot="sidebar-menu-button"
      data-active={isActive}
      title={!open && tooltip ? tooltip : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-xs font-bold transition-all select-none active:scale-[0.98]",
        isActive
          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm"
          : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#171717] hover:text-neutral-900 dark:hover:text-white",
        !open && "justify-center px-0 py-2.5",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
})
SidebarMenuButton.displayName = "SidebarMenuButton"

export const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      data-slot="sidebar-menu-action"
      className={cn(
        "absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuAction.displayName = "SidebarMenuAction"

export const SidebarMenuBadge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { open } = useSidebar()
  if (!open) return null
  return (
    <div
      ref={ref}
      data-slot="sidebar-menu-badge"
      className={cn(
        "ml-auto flex items-center justify-center rounded-full bg-neutral-100 dark:bg-[#262626] px-2 py-0.5 text-[10px] font-bold font-mono text-neutral-600 dark:text-neutral-300 shrink-0",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuBadge.displayName = "SidebarMenuBadge"

export const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => {
  const { open } = useSidebar()
  if (!open) return null
  return (
    <ul
      ref={ref}
      data-slot="sidebar-menu-sub"
      className={cn(
        "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-neutral-200 dark:border-neutral-800 px-2.5 py-0.5",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuSub.displayName = "SidebarMenuSub"

export const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ ...props }, ref) => <li ref={ref} {...props} />)
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

export const SidebarMenuSubButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { isActive?: boolean }
>(({ className, isActive, ...props }, ref) => {
  return (
    <button
      ref={ref}
      data-slot="sidebar-menu-sub-button"
      data-active={isActive}
      className={cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-xs font-semibold transition-colors",
        isActive
          ? "bg-neutral-200/60 dark:bg-neutral-800 text-neutral-900 dark:text-white"
          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-[#1e1e1e] dark:hover:text-white",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

export const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      ref={ref}
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar (Ctrl+B)"
      className={cn(
        "absolute inset-y-0 right-0 z-20 hidden w-2 -translate-x-1/2 transition-all ease-linear sm:flex",
        "hover:after:bg-[var(--accent-tertiary)] after:absolute after:inset-y-0 after:start-1/2 after:w-[2px] after:bg-transparent after:transition-colors",
        className
      )}
      {...props}
    />
  )
})
SidebarRail.displayName = "SidebarRail"

export const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      ref={ref}
      data-slot="sidebar-trigger"
      aria-label="Toggle Sidebar"
      title="Toggle Sidebar (Ctrl+B)"
      onClick={(e) => {
        toggleSidebar()
        onClick?.(e)
      }}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#171717] text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-[#262626] shadow-sm transition-all active:scale-95",
        className
      )}
      {...props}
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

export const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="sidebar-inset"
      className={cn("relative flex min-h-screen flex-1 flex-col min-w-0 bg-[#FAFAFA] dark:bg-[#0A0A0A]", className)}
      {...props}
    />
  )
})
SidebarInset.displayName = "SidebarInset"
