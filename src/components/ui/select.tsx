import React, { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface SelectContextType {
  value?: string | number | null;
  onValueChange?: (value: any) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled?: boolean;
  selectedLabel?: string;
  setSelectedLabel: (label: string) => void;
  registerItem: (itemValue: string | number, label: string) => void;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

export interface SelectItemData {
  label: string;
  value: string | number | null;
  disabled?: boolean;
}

export interface SelectProps {
  value?: string | number | null;
  defaultValue?: string | number | null;
  onValueChange?: (value: any) => void;
  disabled?: boolean;
  items?: SelectItemData[];
  children: React.ReactNode;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  value: controlledValue,
  defaultValue,
  onValueChange,
  disabled = false,
  children,
  className = ''
}) => {
  const [uncontrolledValue, setUncontrolledValue] = useState<string | number | null>(defaultValue ?? null);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const labelsMap = useRef<Map<string, string>>(new Map());
  const selectRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = (newVal: any) => {
    if (!isControlled) {
      setUncontrolledValue(newVal);
    }
    const label = labelsMap.current.get(String(newVal));
    if (label) {
      setSelectedLabel(label);
    }
    onValueChange?.(newVal);
    setOpen(false);
  };

  const registerItem = useCallback((itemVal: string | number, label: string) => {
    labelsMap.current.set(String(itemVal), label);
    if (value !== undefined && value !== null && String(value) === String(itemVal)) {
      setSelectedLabel(label);
    }
  }, [value]);

  useEffect(() => {
    if (value !== undefined && value !== null) {
      const match = labelsMap.current.get(String(value));
      if (match) {
        setSelectedLabel(match);
      }
    } else {
      setSelectedLabel('');
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange: handleValueChange,
        open,
        setOpen,
        disabled,
        selectedLabel,
        setSelectedLabel,
        registerItem
      }}
    >
      <div ref={selectRef} className={`relative inline-block w-full ${className}`}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children?: React.ReactNode;
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className = '', children, ...props }, ref) => {
    const ctx = useContext(SelectContext);
    if (!ctx) throw new Error('SelectTrigger must be used within Select');

    return (
      <button
        ref={ref}
        type="button"
        role="combobox"
        aria-expanded={ctx.open}
        disabled={ctx.disabled}
        onClick={() => {
          if (!ctx.disabled) ctx.setOpen(!ctx.open);
        }}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] px-3.5 py-2.5 text-xs font-bold text-neutral-900 dark:text-white transition-all focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      >
        <span className="truncate">{children}</span>
        <ChevronDown className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200 ${ctx.open ? 'rotate-180' : ''}`} />
      </button>
    );
  }
);
SelectTrigger.displayName = 'SelectTrigger';

export interface SelectValueProps {
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
}

export const SelectValue: React.FC<SelectValueProps> = ({
  placeholder = 'Select an option...',
  children,
  className = ''
}) => {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error('SelectValue must be used within Select');

  if (children !== undefined && children !== null && children !== '') {
    return <span className={className}>{children}</span>;
  }

  const displayText = ctx.selectedLabel || (ctx.value !== null && ctx.value !== undefined && ctx.value !== '' ? String(ctx.value) : placeholder);

  return (
    <span className={className}>
      {displayText}
    </span>
  );
};

export interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className = '', children, ...props }, ref) => {
    const ctx = useContext(SelectContext);
    if (!ctx) return null;

    return (
      <div
        ref={ref}
        className={`absolute left-0 top-[calc(100%+0.35rem)] z-50 min-w-[8rem] w-full max-h-60 overflow-y-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#171717] p-1.5 text-neutral-900 dark:text-white shadow-2xl dropdown-expand focus:outline-none ${
          ctx.open ? 'block' : 'hidden'
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SelectContent.displayName = 'SelectContent';

export interface SelectGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const SelectGroup: React.FC<SelectGroupProps> = ({ className = '', children, ...props }) => {
  return (
    <div className={`p-0.5 space-y-0.5 ${className}`} {...props}>
      {children}
    </div>
  );
};

export interface SelectLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const SelectLabel: React.FC<SelectLabelProps> = ({ className = '', children, ...props }) => {
  return (
    <div
      className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 select-none ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string | number | null;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

function extractNodeText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractNodeText).join('');
  if (React.isValidElement(node) && (node.props as any)?.children) {
    return extractNodeText((node.props as any).children);
  }
  return '';
}

export const SelectItem: React.FC<SelectItemProps> = ({
  value,
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error('SelectItem must be used within Select');

  const isSelected = String(ctx.value) === String(value);
  const labelText = useMemo(() => extractNodeText(children), [children]);

  useEffect(() => {
    if (value !== null && value !== undefined && labelText) {
      ctx.registerItem(value, labelText);
    }
  }, [value, labelText, ctx]);

  return (
    <div
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled && ctx.onValueChange) {
          if (labelText) {
            ctx.setSelectedLabel(labelText);
          }
          ctx.onValueChange(value);
        }
      }}
      className={`relative flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold select-none transition-colors ${
        disabled
          ? 'cursor-not-allowed opacity-40 pointer-events-none'
          : 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-[#262626] active:scale-[0.99]'
      } ${
        isSelected
          ? 'bg-neutral-100 dark:bg-[#262626] text-neutral-900 dark:text-white'
          : 'text-neutral-700 dark:text-neutral-300'
      } ${className}`}
      {...props}
    >
      <span className="truncate">{children}</span>
      {isSelected && <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-white shrink-0 ml-2" />}
    </div>
  );
};
