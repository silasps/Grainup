"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BookCard, type BookCardData } from "./book-card";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface BookRow {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  price: number;
  price_promotional: number | null;
  rating_avg: number;
  rating_count: number;
  is_bestseller: boolean;
  is_new: boolean;
  is_featured: boolean;
  category_id: string | null;
  authors: { name: string } | null;
}

interface BookGridProps {
  books: BookRow[];
  categories: Category[];
  searchParams: { [key: string]: string | string[] | undefined };
}

type SortOption = "relevancia" | "mais-vendidos" | "lancamentos" | "preco-asc" | "preco-desc" | "avaliacao";

const SORT_LABELS: Record<SortOption, string> = {
  relevancia: "Relevância",
  "mais-vendidos": "Mais vendidos",
  lancamentos: "Lançamentos",
  "preco-asc": "Menor preço",
  "preco-desc": "Maior preço",
  avaliacao: "Melhor avaliação",
};

const PRICE_RANGES = [
  { label: "Até R$40", min: 0, max: 40 },
  { label: "R$40 – R$60", min: 40, max: 60 },
  { label: "R$60 – R$80", min: 60, max: 80 },
  { label: "Acima de R$80", min: 80, max: Infinity },
];

function normalizeBook(b: BookRow): BookCardData {
  return {
    id: b.id,
    title: b.title,
    slug: b.slug,
    author: b.authors?.name ?? null,
    coverUrl: b.cover_url,
    price: b.price,
    pricePromotional: b.price_promotional,
    ratingAvg: b.rating_avg,
    ratingCount: b.rating_count,
    isNew: b.is_new,
    isBestseller: b.is_bestseller,
  };
}

export function BookGrid({ books, categories, searchParams }: BookGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState(
    (searchParams.busca as string) ?? ""
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  const currentSort = ((searchParams.ordenar as string) ?? "relevancia") as SortOption;
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(() => {
    const cats = searchParams.categoria;
    if (!cats) return new Set<string>();
    if (typeof cats === "string") return new Set([cats]);
    return new Set(cats as string[]);
  });
  const [selectedPriceRange, setSelectedPriceRange] = useState((searchParams.preco as string) ?? "");
  const [showOnlyPromo, setShowOnlyPromo] = useState(searchParams.promocao === "1");
  const [showOnlyNew, setShowOnlyNew] = useState(searchParams.novidades === "1");

  function updateParam(key: string, value: string | null) {
    if (key === "preco") setSelectedPriceRange(value ?? "");
    if (key === "promocao") setShowOnlyPromo(value === "1");
    if (key === "novidades") setShowOnlyNew(value === "1");
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  function toggleCategory(slug: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
    const next = new URLSearchParams(params.toString());
    const existing = next.getAll("categoria");
    if (existing.includes(slug)) {
      next.delete("categoria");
      existing.filter((c) => c !== slug).forEach((c) => next.append("categoria", c));
    } else {
      next.append("categoria", slug);
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  function clearFilters() {
    setSelectedCategories(new Set());
    setSelectedPriceRange("");
    setShowOnlyPromo(false);
    setShowOnlyNew(false);
    router.push(pathname);
    setSearch("");
  }

  // Filter books client-side for instant feedback
  const filteredBooks = useMemo(() => {
    let result = [...books];

    // Search
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.authors?.name?.toLowerCase().includes(q)
      );
    }

    // Categories — map selected slugs to category IDs for filtering
    if (selectedCategories.size > 0) {
      const selectedIds = new Set(
        categories.filter((c) => selectedCategories.has(c.slug)).map((c) => c.id)
      );
      result = result.filter((b) => b.category_id && selectedIds.has(b.category_id));
    }

    // Price range
    if (selectedPriceRange) {
      const range = PRICE_RANGES.find((r) =>
        r.label === PRICE_RANGES.find((p) => `${p.min}-${p.max}` === selectedPriceRange)?.label
      );
      const parsed = selectedPriceRange.split("-").map(Number);
      if (parsed.length === 2) {
        const [min, max] = parsed;
        result = result.filter((b) => {
          const price = b.price_promotional ?? b.price;
          return price >= min && (max === Infinity || price <= max);
        });
      }
    }

    // Promo only
    if (showOnlyPromo) {
      result = result.filter(
        (b) => b.price_promotional && b.price_promotional < b.price
      );
    }

    // New only
    if (showOnlyNew) {
      result = result.filter((b) => b.is_new);
    }

    // Sort
    switch (currentSort) {
      case "mais-vendidos":
        result.sort((a, b) => (b.is_bestseller ? 1 : 0) - (a.is_bestseller ? 1 : 0));
        break;
      case "lancamentos":
        result.sort((a, b) => (b.is_new ? 1 : 0) - (a.is_new ? 1 : 0));
        break;
      case "preco-asc":
        result.sort((a, b) => (a.price_promotional ?? a.price) - (b.price_promotional ?? b.price));
        break;
      case "preco-desc":
        result.sort((a, b) => (b.price_promotional ?? b.price) - (a.price_promotional ?? a.price));
        break;
      case "avaliacao":
        result.sort((a, b) => (b.rating_avg ?? 0) - (a.rating_avg ?? 0));
        break;
      default:
        // relevancia — featured first, then bestsellers
        result.sort((a, b) => {
          const scoreA = (a.is_featured ? 3 : 0) + (a.is_bestseller ? 2 : 0) + (a.is_new ? 1 : 0);
          const scoreB = (b.is_featured ? 3 : 0) + (b.is_bestseller ? 2 : 0) + (b.is_new ? 1 : 0);
          return scoreB - scoreA;
        });
    }

    return result;
  }, [books, search, selectedCategories, selectedPriceRange, showOnlyPromo, showOnlyNew, currentSort]);

  const activeFilterCount =
    selectedCategories.size +
    (selectedPriceRange ? 1 : 0) +
    (showOnlyPromo ? 1 : 0) +
    (showOnlyNew ? 1 : 0);

  const categoryIdsWithBooks = useMemo(
    () => new Set(books.map((b) => b.category_id).filter(Boolean)),
    [books]
  );

  const FilterRow = ({
    id,
    checked,
    onCheckedChange,
    label,
    disabled,
  }: {
    id: string;
    checked: boolean;
    onCheckedChange: (v: boolean) => void;
    label: string;
    disabled?: boolean;
  }) => (
    <label
      htmlFor={id}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all select-none",
        disabled
          ? "opacity-40 cursor-not-allowed"
          : checked
          ? "bg-brand-50 text-brand-700 cursor-pointer"
          : "hover:bg-secondary/70 text-foreground/80 hover:text-foreground cursor-pointer"
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={disabled ? undefined : onCheckedChange}
        disabled={disabled}
        className="flex-shrink-0 border-brand"
      />
      <span className={cn("text-sm font-medium", checked && "font-semibold")}>{label}</span>
    </label>
  );

  const FiltersContent = () => (
    <div className="flex flex-col gap-1">
      {/* Categoria */}
      <div className="px-1 pt-2 pb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-2">
          Categoria
        </p>
        <div className="flex flex-col gap-0.5">
          {categories.map((cat) => (
            <FilterRow
              key={cat.id}
              id={`cat-${cat.slug}`}
              checked={selectedCategories.has(cat.slug)}
              onCheckedChange={() => toggleCategory(cat.slug)}
              label={cat.name}
              disabled={!categoryIdsWithBooks.has(cat.id)}
            />
          ))}
        </div>
      </div>

      <div className="mx-3">
        <Separator />
      </div>

      {/* Faixa de preço */}
      <div className="px-1 pt-3 pb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-2">
          Faixa de preço
        </p>
        <div className="flex flex-col gap-0.5">
          {PRICE_RANGES.map((range) => {
            const key = `${range.min}-${range.max}`;
            return (
              <FilterRow
                key={key}
                id={`price-${key}`}
                checked={selectedPriceRange === key}
                onCheckedChange={(checked) => updateParam("preco", checked ? key : null)}
                label={range.label}
              />
            );
          })}
        </div>
      </div>

      <div className="mx-3">
        <Separator />
      </div>

      {/* Filtros rápidos */}
      <div className="px-1 pt-3 pb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-2">
          Filtros rápidos
        </p>
        <div className="flex flex-col gap-0.5">
          <FilterRow
            id="filter-promo"
            checked={showOnlyPromo}
            onCheckedChange={(checked) => updateParam("promocao", checked ? "1" : null)}
            label="Em promoção"
          />
          <FilterRow
            id="filter-new"
            checked={showOnlyNew}
            onCheckedChange={(checked) => updateParam("novidades", checked ? "1" : null)}
            label="Lançamentos"
          />
        </div>
      </div>

      {activeFilterCount > 0 && (
        <>
          <div className="mx-3">
            <Separator />
          </div>
          <div className="px-2 pt-2 pb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/5 border border-dashed border-destructive/30"
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Limpar filtros ({activeFilterCount})
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-1">
          Catálogo de Livros
        </h1>
        <p className="text-sm text-muted-foreground">
          {filteredBooks.length} {filteredBooks.length === 1 ? "livro encontrado" : "livros encontrados"}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou autor..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort */}
        <Select
          value={currentSort}
          onValueChange={(val) => updateParam("ordenar", val === "relevancia" ? null : val)}
        >
          <SelectTrigger className="w-44 hidden sm:flex">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORT_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filters button — mobile */}
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger
            render={
              <button className="lg:hidden relative inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-border bg-background hover:bg-secondary transition-colors h-8">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-brand text-white text-[10px] flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            }
          />
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-border bg-secondary/40">
              <SheetTitle className="flex items-center gap-2 text-sm">
                <SlidersHorizontal className="h-3.5 w-3.5 text-brand" />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="h-5 w-5 rounded-full bg-brand text-white text-[10px] flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto">
              <FiltersContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {[...selectedCategories].map((slug) => {
            const cat = categories.find((c) => c.slug === slug);
            return (
              <Badge
                key={slug}
                variant="secondary"
                className="gap-1 cursor-pointer"
                onClick={() => toggleCategory(slug)}
              >
                {cat?.name ?? slug}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
          {showOnlyPromo && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer"
              onClick={() => updateParam("promocao", null)}
            >
              Em promoção <X className="h-3 w-3" />
            </Badge>
          )}
          {showOnlyNew && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer"
              onClick={() => updateParam("novidades", null)}
            >
              Lançamentos <X className="h-3 w-3" />
            </Badge>
          )}
          {selectedPriceRange && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer"
              onClick={() => updateParam("preco", null)}
            >
              {PRICE_RANGES.find((r) => `${r.min}-${r.max}` === selectedPriceRange)?.label}
              <X className="h-3 w-3" />
            </Badge>
          )}
        </div>
      )}

      <div className="flex gap-8">
        {/* Sidebar filters — desktop */}
        <aside className="hidden lg:block w-60 flex-shrink-0">
          <div className="sticky top-24 max-h-[calc(100vh-8rem)] flex flex-col">
            <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col min-h-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-brand" />
                  <h2 className="text-sm font-semibold text-foreground">Filtros</h2>
                  {activeFilterCount > 0 && (
                    <span className="h-5 w-5 rounded-full bg-brand text-white text-[10px] flex items-center justify-center font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-brand hover:text-brand-700 font-medium transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <div className="overflow-y-auto flex-1">
                <FiltersContent />
              </div>
            </div>
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1 min-w-0">
          {/* Mobile sort */}
          <div className="flex items-center gap-2 mb-4 sm:hidden">
            <Select
              value={currentSort}
              onValueChange={(val) => updateParam("ordenar", val === "relevancia" ? null : val)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SORT_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredBooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="text-5xl mb-4">📚</span>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                Nenhum livro encontrado
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Tente ajustar os filtros ou a busca para encontrar o que procura.
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredBooks.map((b) => (
                <BookCard key={b.id} book={normalizeBook(b)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
