import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  type: "book" | "combo";
  title: string;
  slug: string;
  coverUrl: string | null;
  price: number;
  quantity: number;
}

export type CartItemInput = Omit<CartItem, "quantity">;

interface CartState {
  items: CartItem[];
  // buyNowItem: fluxo "Comprar agora" — isolado do carrinho, não persistido
  buyNowItem: CartItemInput | null;

  addItem: (item: CartItemInput) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
  itemCount: () => number;
  subtotal: () => number;

  setBuyNow: (item: CartItemInput) => void;
  clearBuyNow: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      buyNowItem: null,

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateQty: (id, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.id !== id)
              : state.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
        })),

      clear: () => set({ items: [] }),

      itemCount: () => get().items.reduce((s, i) => s + i.quantity, 0),

      subtotal: () =>
        get().items.reduce((s, i) => s + i.price * i.quantity, 0),

      setBuyNow: (item) => set({ buyNowItem: item }),
      clearBuyNow: () => set({ buyNowItem: null }),
    }),
    {
      name: "grainup-cart",
      // buyNowItem não é persistido — sempre começa null após reload
      partialize: (state) => ({ items: state.items }),
    }
  )
);
