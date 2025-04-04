import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      
      // Add item to cart
      addItem: (item) => {
        const { items } = get();
        const existingItem = items.find(
          (i) => i.id === item.id && i.size === item.size
        );
        
        if (existingItem) {
          // Update quantity if item exists
          const updatedItems = items.map((i) =>
            i.id === item.id && i.size === item.size
              ? { ...i, quantity: i.quantity + (item.quantity || 1) }
              : i
          );
          set({ items: updatedItems });
        } else {
          // Add new item
          set({ items: [...items, { ...item, quantity: item.quantity || 1 }] });
        }
      },
      
      // Update item quantity
      updateItemQuantity: (itemId, size, quantity) => {
        const { items } = get();
        const updatedItems = items.map((item) =>
          item.id === itemId && item.size === size
            ? { ...item, quantity }
            : item
        );
        set({ items: updatedItems });
      },
      
      // Remove item from cart
      removeItem: (itemId, size) => {
        const { items } = get();
        const updatedItems = items.filter(
          (item) => !(item.id === itemId && item.size === size)
        );
        set({ items: updatedItems });
      },
      
      // Clear cart
      clearCart: () => set({ items: [] }),
      
      // Get cart total price
      getTotal: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
      
      // Get total number of items in cart
      getItemCount: () => {
        const { items } = get();
        return items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage', // unique name for localStorage
    }
  )
); 