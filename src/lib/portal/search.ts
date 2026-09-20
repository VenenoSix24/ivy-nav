import type { PortalItem } from "./types";

export interface SearchSubject extends Pick<
  PortalItem,
  "title" | "description" | "url" | "domain" | "tags"
> {
  categoryName: string | null;
}

/** Space-separated terms all have to match, across title, description, URL, domain, tags and category. */
export function matchesQuery(subject: SearchSubject, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = [
    subject.title,
    subject.description ?? "",
    subject.url,
    subject.domain,
    subject.categoryName ?? "",
    ...subject.tags,
  ]
    .join(" ")
    .toLowerCase();

  return terms.every((term) => haystack.includes(term));
}
