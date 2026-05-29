"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, X, Minus, Plus, Trash2, ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCartStore } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils/format";

interface CartDrawerProps {
  children?: React.ReactNode;
}

const FREE_SHIPPING_THRESHOLD = 200;

export function CartDrawer({ children }: CartDrawerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { items, removeItem, updateQty, clear, itemCount, subtotal } = useCartStore();
  const total = subtotal();
  const count = itemCount();
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - total);
  const hasFreeShipping = total >= FREE_SHIPPING_THRESHOLD;

  return (
    <Sheet>
      <SheetTrigger
        render={
          children ? (
            <span>{children}</span>
          ) : (
            <button className="relative inline-flex items-center justify-center rounded-md h-9 w-9 hover:bg-secondary transition-colors">
              <ShoppingCart className="h-5 w-5" />
              {mounted && count > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] bg-brand text-white flex items-center justify-center rounded-full">
                  {count > 9 ? "9+" : count}
                </Badge>
              )}
            </button>
          )
        }
      />

      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2 pr-8">
            <ShoppingCart className="h-5 w-5 flex-shrink-0" />
            <SheetTitle className="flex items-center gap-2 flex-1 min-w-0">
              Meu carrinho
              {count > 0 && (
                <Badge variant="secondary" className="font-normal flex-shrink-0">
                  {count} {count === 1 ? "item" : "itens"}
                </Badge>
              )}
            </SheetTitle>
            {items.length > 0 && (
              <button
                onClick={clear}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
              >
                Limpar
              </button>
            )}
          </div>
        </SheetHeader>

        {/* Free shipping progress */}
        {items.length > 0 && (
          <div className="px-5 py-3 bg-brand-50 border-b border-border">
            {hasFreeShipping ? (
              <p className="text-xs text-brand font-medium flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Frete grátis garantido! 🎉
              </p>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Falta {formatCurrency(remaining)} para frete grátis
                </p>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (total / FREE_SHIPPING_THRESHOLD) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Carrinho vazio</p>
                <p className="text-sm text-muted-foreground">
                  Explore nosso catálogo e adicione livros ao carrinho.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/editora/livros">
                  Ver catálogo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  {/* Cover */}
                  <Link
                    href={`/editora/livros/${item.slug}`}
                    className="relative w-16 h-20 rounded-lg overflow-hidden bg-secondary flex-shrink-0"
                  >
                    {item.coverUrl ? (
                      <Image
                        src={item.coverUrl}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xl">📖</span>
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="flex flex-col flex-1 min-w-0 gap-1">
                    <Link
                      href={`/editora/livros/${item.slug}`}
                      className="text-sm font-medium text-foreground leading-snug line-clamp-2 hover:text-brand transition-colors"
                    >
                      {item.title}
                    </Link>
                    <p className="text-sm font-bold text-brand">
                      {formatCurrency(item.price)}
                    </p>

                    <div className="flex items-center justify-between mt-auto">
                      {/* Qty controls */}
                      <div className="flex items-center border border-border rounded-md overflow-hidden">
                        <button
                          onClick={() =>
                            item.quantity > 1
                              ? updateQty(item.id, item.quantity - 1)
                              : removeItem(item.id)
                          }
                          className="px-2 py-1 hover:bg-secondary transition-colors"
                        >
                          {item.quantity > 1 ? (
                            <Minus className="h-3 w-3" />
                          ) : (
                            <Trash2 className="h-3 w-3 text-destructive" />
                          )}
                        </button>
                        <span className="px-2.5 py-1 text-xs font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.id, item.quantity + 1)}
                          className="px-2 py-1 hover:bg-secondary transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 pb-5 pt-4 border-t border-border flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="font-bold text-lg">{formatCurrency(total)}</span>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Frete calculado no checkout
            </p>

            <Button
              size="lg"
              className="bg-brand hover:bg-brand-700 text-white font-semibold w-full"
              asChild
            >
              <Link href="/editora/carrinho">
                Ver carrinho
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/editora/livros">Continuar comprando</Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
