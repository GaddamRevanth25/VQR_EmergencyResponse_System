import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  // const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200';
  
  // const variants = {
  //   primary: 'bg-[#dc2626] text-white hover:bg-[#b91c1c] shadow-[0_0_15px_rgba(220,38,38,0.3)]',
  //   secondary: 'bg-[#1f2937] text-white hover:bg-[#374151]',
  //   outline: 'border-2 border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] bg-transparent',
  //   ghost: 'bg-transparent hover:bg-[rgba(255,255,255,0.05)]',
  // };
  
  // const sizes = {
  //   sm: 'px-4 py-2 text-sm',
  //   md: 'px-6 py-3 text-base',
  //   lg: 'px-8 py-4 text-lg',
  // };

  // const styleString = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  // Use a hacky workaround for inline styles since we aren't using tailwind for everything
  const inlineStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    borderRadius: '8px',
    transition: 'all 0.2s',
    cursor: 'pointer',
    border: variant === 'outline' ? '2px solid rgba(255,255,255,0.1)' : 'none',
    backgroundColor: variant === 'primary' ? 'var(--color-primary)' : variant === 'secondary' ? '#1f2937' : 'transparent',
    color: '#fff',
    padding: size === 'sm' ? '0.5rem 1rem' : size === 'lg' ? '1rem 2rem' : '0.75rem 1.5rem',
    fontSize: size === 'sm' ? '0.875rem' : size === 'lg' ? '1.125rem' : '1rem',
  };

  return (
    <button style={inlineStyles} className={className} {...props}>
      {children}
    </button>
  );
}
