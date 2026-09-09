import React from 'react';

export interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'end';
  className?: string;
  children: React.ReactNode;
}

export const Message = React.forwardRef<HTMLDivElement, MessageProps>(
  ({ align = 'start', className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-end gap-2.5 max-w-[88%] ${
          align === 'end' ? 'flex-row-reverse self-end ml-auto' : 'flex-row self-start mr-auto'
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Message.displayName = 'Message';

export interface MessageAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const MessageAvatar = React.forwardRef<HTMLDivElement, MessageAvatarProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`shrink-0 mb-0.5 ${className}`} {...props}>
        {children}
      </div>
    );
  }
);
MessageAvatar.displayName = 'MessageAvatar';

export interface MessageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const MessageContent = React.forwardRef<HTMLDivElement, MessageContentProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`flex flex-col gap-1 min-w-0 ${className}`} {...props}>
        {children}
      </div>
    );
  }
);
MessageContent.displayName = 'MessageContent';
