import React, { createContext, useContext, useState, useEffect } from "react";
import { CartData, CartConflictPayload, BuyHandoffResponse } from "../types/floate";
import { api } from "../services/api";

interface CartContextType {
  cart: CartData;
  isLoading: boolean;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  conflictData: CartConflictPayload | null;
  setConflictData: (data: CartConflictPayload | null) => void;
  addToCart: (productId: string, quantity?: number) => Promise<boolean>;
  replaceCart: (productId: string, quantity?: number) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  buyCart: (note?: string) => Promise<BuyHandoffResponse | null>;
  refreshCart: () => Promise<void>;
}

const defaultCart: CartData = {
  cart_id: "default-user",
  vendor: null,
  items: [],
  total_naira: 0,
  formatted_total: "₦0",
  count: 0
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartData>(defaultCart);
  const [isLoading, setIsLoading] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [conflictData, setConflictData] = useState<CartConflictPayload | null>(null);

  const refreshCart = async () => {
    try {
      const res = await api.getCart();
      if (res.success && res.cart) {
        setCart(res.cart);
      }
    } catch (e) {
      console.warn("Error refreshing cart:", e);
    }
  };

  useEffect(() => {
    refreshCart();
  }, []);

  const addToCart = async (productId: string, quantity: number = 1): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await api.addToCart(productId, quantity);
      if (result.status === 409) {
        // Vendor conflict
        setConflictData(result.data as CartConflictPayload);
        setIsLoading(false);
        return false;
      }
      if (result.data?.success && result.data.cart) {
        setCart(result.data.cart);
        setIsCartDrawerOpen(true);
      }
      setIsLoading(false);
      return true;
    } catch (e) {
      console.error("Failed to add to cart:", e);
      setIsLoading(false);
      return false;
    }
  };

  const replaceCart = async (productId: string, quantity: number = 1): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await api.replaceCart(productId, quantity);
      if (res.success && res.cart) {
        setCart(res.cart);
        setConflictData(null);
        setIsCartDrawerOpen(true);
      }
      setIsLoading(false);
      return true;
    } catch (e) {
      console.error("Failed to replace cart:", e);
      setIsLoading(false);
      return false;
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      const res = await api.updateCartItem(itemId, quantity);
      if (res.success && res.cart) {
        setCart(res.cart);
      }
    } catch (e) {
      console.error("Failed to update cart quantity:", e);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const res = await api.removeCartItem(itemId);
      if (res.success && res.cart) {
        setCart(res.cart);
      }
    } catch (e) {
      console.error("Failed to remove item:", e);
    }
  };

  const clearCart = async () => {
    try {
      const res = await api.clearCart();
      if (res.success && res.cart) {
        setCart(res.cart);
      }
    } catch (e) {
      console.error("Failed to clear cart:", e);
    }
  };

  const buyCart = async (note?: string): Promise<BuyHandoffResponse | null> => {
    try {
      const res = await api.buyCart("default-user", note);
      return res;
    } catch (e) {
      console.error("Failed to initiate buy handoff:", e);
      return null;
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        conflictData,
        setConflictData,
        addToCart,
        replaceCart,
        updateQuantity,
        removeItem,
        clearCart,
        buyCart,
        refreshCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
