import React from 'react';
import { Separator } from './separator';

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  children: React.ReactNode;
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ orientation = 'vertical', className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex ${
          orientation === 'horizontal'
            ? 'flex-row items-center justify-between gap-4'
            : 'flex-col gap-1.5'
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Field.displayName = 'Field';

export interface FieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const FieldGroup = React.forwardRef<HTMLDivElement, FieldGroupProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`space-y-4 w-full ${className}`} {...props}>
        {children}
      </div>
    );
  }
);
FieldGroup.displayName = 'FieldGroup';

export interface FieldSetProps extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {
  className?: string;
  children: React.ReactNode;
}

export const FieldSet = React.forwardRef<HTMLFieldSetElement, FieldSetProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <fieldset ref={ref} className={`space-y-2.5 w-full border-none p-0 m-0 ${className}`} {...props}>
        {children}
      </fieldset>
    );
  }
);
FieldSet.displayName = 'FieldSet';

export interface FieldLegendProps extends React.HTMLAttributes<HTMLLegendElement> {
  className?: string;
  children: React.ReactNode;
}

export const FieldLegend = React.forwardRef<HTMLLegendElement, FieldLegendProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <legend
        ref={ref}
        className={`text-sm sm:text-base font-black text-neutral-900 dark:text-neutral-100 tracking-tight select-none ${className}`}
        {...props}
      >
        {children}
      </legend>
    );
  }
);
FieldLegend.displayName = 'FieldLegend';

export interface FieldContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const FieldContent = React.forwardRef<HTMLDivElement, FieldContentProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`flex flex-col gap-0.5 min-w-0 flex-1 ${className}`} {...props}>
        {children}
      </div>
    );
  }
);
FieldContent.displayName = 'FieldContent';

export interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  className?: string;
  children: React.ReactNode;
}

export const FieldLabel = React.forwardRef<HTMLLabelElement, FieldLabelProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 cursor-pointer select-none ${className}`}
        {...props}
      >
        {children}
      </label>
    );
  }
);
FieldLabel.displayName = 'FieldLabel';

export interface FieldDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string;
  children: React.ReactNode;
}

export const FieldDescription = React.forwardRef<HTMLParagraphElement, FieldDescriptionProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`text-xs text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed ${className}`}
        {...props}
      >
        {children}
      </p>
    );
  }
);
FieldDescription.displayName = 'FieldDescription';

export interface FieldSeparatorProps {
  className?: string;
}

export const FieldSeparator: React.FC<FieldSeparatorProps> = ({ className = 'my-2' }) => {
  return <Separator className={className} />;
};
