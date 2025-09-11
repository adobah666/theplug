'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav
      className={`flex items-center gap-1 text-xs sm:text-sm text-gray-600 leading-none ${className}`}
      aria-label="Breadcrumb"
      role="navigation"
    >
      {items.map((item, index) => (
        <div key={index} className="flex h-5 items-center whitespace-nowrap">
          {index > 0 && (
            <ChevronRight className="w-3.5 h-3.5 mx-1 text-gray-400 shrink-0" />
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="flex h-5 items-center leading-none hover:text-gray-900 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="flex h-5 items-center leading-none text-gray-900 font-medium">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}