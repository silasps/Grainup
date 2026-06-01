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
  // IDs explicitamente desmarcados pelo usuário no carrinho (não persistido — reseta a cada sessão)
  deselectedIds: string[];

  addItem: (item: CartItemInput) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
  clearSelected: () => void;
  toggleSelect: (id: string) => void;
  isSelected: (id: string) => boolean;
  selectedItems: () => CartItem[];
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
      deselectedIds: [],

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
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
          deselectedIds: state.deselectedIds.filter((d) => d !== id),
        })),

      updateQty: (id, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.id !== id)
              : state.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
          deselectedIds: qty <= 0 ? state.deselectedIds.filter((d) => d !== id) : state.deselectedIds,
        })),

      clear: () => set({ items: [], deselectedIds: [] }),

      // Remove apenas itens selecionados; desmarcados permanecem para a próxima compra
      clearSelected: () =>
        set((state) => ({
          items: state.items.filter((i) => state.deselectedIds.includes(i.id)),
          deselectedIds: [],
        })),

      toggleSelect: (id) =>
        set((state) => ({
          deselectedIds: state.deselectedIds.includes(id)
            ? state.deselectedIds.filter((d) => d !== id)
            : [...state.deselectedIds, id],
        })),

      isSelected: (id) => !get().deselectedIds.includes(id),

      selectedItems: () => get().items.filter((i) => !get().deselectedIds.includes(i.id)),

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
