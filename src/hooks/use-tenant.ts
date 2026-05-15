"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";

export function useTenantSlug(): string | undefined {
  const params = useParams();
  const slug = params?.slug;
  return typeof slug === "string" ? slug : undefined;
}

export function useTenantPath(path: string): string {
  const slug = useTenantSlug();
  return useMemo(() => {
    if (!slug) return path;
    return `/t/${slug}${path.startsWith("/") ? path : `/${path}`}`;
  }, [slug, path]);
}