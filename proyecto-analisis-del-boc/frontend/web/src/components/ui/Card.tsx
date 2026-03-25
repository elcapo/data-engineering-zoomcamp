import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "section";
}

export function Card({ children, className = "", as: Tag = "div" }: CardProps) {
  return (
    <Tag className={`rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      {children}
    </Tag>
  );
}
