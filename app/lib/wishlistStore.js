import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],
      
      // Add item to wishlist
      addItem: (item) => {
        const { items } = get();
        const existingItem = items.find((i) => i.id === item.id);
        
        if (!existingItem) {
          // Only add if it doesn't exist already
          set({ items: [...items, item] });
        }
      },
      
      // Remove item from wishlist
      removeItem: (itemId) => {
        const { items } = get();
        const updatedItems = items.filter((item) => item.id !== itemId);
        set({ items: updatedItems });
      },
      
      // Check if item is in wishlist
      isInWishlist: (itemId) => {
        const { items } = get();
        return items.some((item) => item.id === itemId);
      },
      
      // Clear wishlist
      clearWishlist: () => set({ items: [] }),
    }),
    {
      name: 'wishlist-storage', // unique name for localStorage
    }
  )
); 