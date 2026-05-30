<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Instant navigation feedback — mandatory pattern

Every route must have a `loading.tsx` sibling to its `page.tsx`. This gives users immediate visual feedback on navigation (the skeleton shows the instant the route changes, before any data fetches complete).

## Rules

1. **Every new `page.tsx` MUST ship with a `loading.tsx` in the same directory.** No exceptions.
2. The skeleton must mirror the actual page layout — same card count, same grid columns, same section order. A generic spinner is not acceptable.
3. Use `@/components/ui/skeleton` (`<Skeleton className="…" />`). It uses `animate-pulse` and `bg-muted`.
4. The skeleton only renders the *content* area. Layouts (header, sidebar, footer) are already rendered by the layout file and stay visible during navigation.

## Pattern by route group

| Route group | How to skeleton |
|---|---|
| `(editora)` | Match the grid/shelf layout of the page content |
| `(conta)` | Match the cards inside the `md:col-span-3` main area (sidebar stays) |
| `(admin)` | Use `<AdminLoading />` from `@/components/admin/admin-loading`; pass `hasKpis` for dashboard-style pages |
| `(auth)` | Simple centered card skeleton |
| `(checkout)` | Mirror step layout |

## Example — minimal loading.tsx

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function MyPageLoading() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
```
