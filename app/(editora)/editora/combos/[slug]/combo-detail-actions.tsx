"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart";
import { toast } from "sonner";

interface CartItem {
  id: string;
  type: "combo";
  title: string;
  slug: string;
  coverUrl: string | null;
  covers?: string[];
  price: number;
}

export function ComboDetailActions({
  cartItem,
  comboName,
}: {
  cartItem: CartItem;
  comboName: string;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const setBuyNow = useCartStore((s) => s.setBuyNow);
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  function handleAddToCart() {
    setAdding(true);
    addItem(cartItem);
    toast.success("Combo adicionado ao carrinho", {
      description: comboName,
      action: { label: "Ver carrinho", onClick: () => router.push("/editora/carrinho") },
    });
    setTimeout(() => setAdding(false), 600);
  }

  function handleBuyNow() {
    setBuyNow(cartItem);
    router.push("/checkout");
  }

  return (
    <div className="flex gap-3">
      <Button
        className="flex-1 bg-brand hover:bg-brand-700 text-white gap-2"
        onClick={handleBuyNow}
      >
        <Zap className="h-4 w-4" />
        Comprar agora
      </Button>
      <Button
        variant="outline"
        className="flex-1 gap-2"
        onClick={handleAddToCart}
        disabled={adding}
      >
        <ShoppingCart className="h-4 w-4" />
        {adding ? "Adicionado!" : "Carrinho"}
      </Button>
    </div>
  );
}
