
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  className = '', 
  variant = 'primary',
  disabled = false,
  type = 'button'
}) => {
  const baseStyles = "px-6 py-3 font-bold uppercase tracking-widest transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2 border-2 border-black";
  
  const variants = {
    primary: "bg-[#B11116] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#8e0e12]",
    secondary: "bg-[#1A1A1A] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black",
    outline: "bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50",
    danger: "bg-rose-100 text-rose-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-rose-200"
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};