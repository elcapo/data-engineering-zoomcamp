import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "section";
}

export function Card({ children, className = "", as: Tag = "div" }: CardProps) {
  return (
    <Tag className={`rounded-xl border border-zinc-200 bg-white p-6 transition-colors duration-150 dark:border-zinc-800 dark:bg-zinc-900/80 ${className}`}>
      {children}
    </Tag>
  );
}
