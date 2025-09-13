"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface SortSelectProps {
  value: string;
}

export function SortSelect({ value }: SortSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  return (
    <select
      value={value}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams?.toString());
        params.set("sort", e.target.value);
        // Reset page on sort change
        params.delete("page");
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="newest">Newest First</option>
      <option value="price-low">Price: Low to High</option>
      <option value="price-high">Price: High to Low</option>
      <option value="rating">Highest Rated</option>
      <option value="popular">Most Popular</option>
    </select>
  );
}
