"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils/format";

const FREE_SHIPPING_THRESHOLD = 200;

export function CartPageClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { items, removeItem, updateQty, clear, toggleSelect, isSelected, selectedItems, itemCount, clearBuyNow } = useCartStore();

  const selected = mounted ? selectedItems() : [];
  const allItems = mounted ? items : [];

  const selectedCount = selected.reduce((s, i) => s + i.quantity, 0);
  const totalCount = itemCount();
  const sub = selected.reduce((s, i) => s + i.price * i.quantity, 0);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - sub);
  const hasFreeShipping = sub >= FREE_SHIPPING_THRESHOLD;
  const shippingCost = hasFreeShipping ? 0 : 18.9;

  if (!mounted) return null;

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <div>
          <p className="font-heading font-bold text-xl mb-1">Carrinho vazio</p>
          <p className="text-muted-foreground text-sm">Explore nosso catálogo e adicione livros.</p>
        </div>
        <Button asChild className="bg-brand hover:bg-brand-700 text-white">
          <Link href="/editora/livros">Ver catálogo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Items */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-heading font-bold text-base">
            Produtos ({totalCount} {totalCount === 1 ? "item" : "itens"})
          </h2>
          <button
            onClick={clear}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Limpar carrinho
          </button>
        </div>

        {/* Free shipping bar — baseado nos itens selecionados */}
        <div className="px-5 py-3 bg-brand-50 border-b border-border">
          {sub === 0 ? (
            <p className="text-xs text-muted-foreground">Selecione itens para ver o resumo</p>
          ) : hasFreeShipping ? (
            <p className="text-xs text-brand font-medium flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Frete grátis garantido para os itens selecionados!
            </p>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                Falta <strong>{formatCurrency(remaining)}</strong> para frete grátis
              </p>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (sub / FREE_SHIPPING_THRESHOLD) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="divide-y divide-border">
          {allItems.map((item) => {
            const checked = isSelected(item.id);
            return (
              <div
                key={item.id}
                className={`flex gap-3 px-5 py-4 transition-opacity ${!checked ? "opacity-50" : ""}`}
              >
                {/* Checkbox */}
                <div className="flex items-center pt-1 shrink-0">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleSelect(item.id)}
                    aria-label={`${checked ? "Desmarcar" : "Marcar"} ${item.title}`}
                    className="data-[state=checked]:bg-brand data-[state=checked]:border-brand"
                  />
                </div>

                <Link
                  href={`/editora/livros/${item.slug}`}
                  className="relative w-16 h-20 rounded-lg overflow-hidden bg-secondary flex-shrink-0"
                >
                  {item.coverUrl ? (
                    <Image src={item.coverUrl} alt={item.title} fill className="object-cover" sizes="64px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">📖</div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/editora/livros/${item.slug}`}
                    className="text-sm font-medium text-foreground leading-snug line-clamp-2 hover:text-brand transition-colors"
                  >
                    {item.title}
                  </Link>
                  <p className={`text-sm font-bold mt-1 ${checked ? "text-brand" : "text-muted-foreground"}`}>
                    {formatCurrency(item.price * item.quantity)}
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-border rounded-md overflow-hidden">
                      <button
                        onClick={() =>
                          item.quantity > 1
                            ? updateQty(item.id, item.quantity - 1)
                            : removeItem(item.id)
                        }
                        className="px-2.5 py-1.5 hover:bg-secondary transition-colors"
                        aria-label="Diminuir quantidade"
                      >
                        {item.quantity > 1 ? (
                          <Minus className="h-3.5 w-3.5" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </button>
                      <span className="px-3 py-1.5 text-sm font-medium border-x border-border">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, item.quantity + 1)}
                        className="px-2.5 py-1.5 hover:bg-secondary transition-colors"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      aria-label="Remover item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Frete</span>
          {sub === 0 ? (
            <span className="text-muted-foreground text-xs">—</span>
          ) : hasFreeShipping ? (
            <span className="text-brand font-medium">Grátis</span>
          ) : (
            <span className="text-muted-foreground">Calculado no checkout</span>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl border border-border p-5 sticky top-4">
          <h3 className="font-heading font-bold text-base mb-4">Resumo da compra</h3>

          <div className="flex flex-col gap-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {selectedCount === totalCount
                  ? `Produto (${totalCount} ${totalCount === 1 ? "item" : "itens"})`
                  : `Selecionados (${selectedCount} de ${totalCount})`}
              </span>
              <span>{formatCurrency(sub)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frete</span>
              {sub === 0 ? (
                <span className="text-muted-foreground text-xs self-center">—</span>
              ) : hasFreeShipping ? (
                <span className="text-brand font-medium">Grátis</span>
              ) : (
                <span className="text-muted-foreground text-xs self-center">a calcular</span>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex justify-between font-bold text-base mb-4">
            <span>Total</span>
            <span className="text-brand">{formatCurrency(sub)}</span>
          </div>

          {!hasFreeShipping && sub > 0 && (
            <p className="text-xs text-muted-foreground mb-4">
              + frete a partir de {formatCurrency(shippingCost)} (calculado no checkout)
            </p>
          )}

          <Button
            size="lg"
            className="bg-brand hover:bg-brand-700 text-white font-semibold w-full disabled:opacity-50"
            disabled={selectedCount === 0}
            asChild={selectedCount > 0}
          >
            {selectedCount > 0 ? (
              <Link href="/checkout" onClick={clearBuyNow}>
                Continuar ({selectedCount})
              </Link>
            ) : (
              <span>Continuar (0)</span>
            )}
          </Button>

          <Button variant="outline" size="sm" className="w-full mt-2" asChild>
            <Link href="/editora/livros">Continuar comprando</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
