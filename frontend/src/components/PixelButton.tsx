import type { ButtonHTMLAttributes } from 'react';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

const variants = {
  primary:
    'bg-[#555] text-white hover:bg-[#666] shadow-[4px_4px_0_0_rgba(40,40,40,0.8)]',
  secondary:
    'bg-[#2a2a2a] text-gray-200 hover:bg-[#333] shadow-[4px_4px_0_0_rgba(20,20,20,0.8)]',
  danger:
    'bg-red-700 text-white hover:bg-red-600 shadow-[4px_4px_0_0_rgba(120,20,20,0.8)]',
};

export default function PixelButton({ variant = 'primary', className = '', children, ...props }: PixelButtonProps) {
  return (
    <button
      className={`rounded-lg border-2 border-white/20 px-6 py-3 text-xs font-pixel uppercase tracking-[0.15em] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${variants[variant]} disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
