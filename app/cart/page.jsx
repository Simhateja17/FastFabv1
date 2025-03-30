"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { USER_ENDPOINTS } from "@/app/config";
import { toast } from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";
import { FiTrash2, FiPlus, FiMinus, FiShoppingCart } from "react-icons/fi";

export default function Cart() {
  const router = useRouter();
  const { user, userAuthFetch, loading: authLoading } = useUserAuth();
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Fetch cart on component mount
  useEffect(() => {
    const checkAuth = async () => {
      if (loading) return; // Skip if auth context is still loading

      console.log("Cart page - Checking auth:", !!user);

      try {
        // If no user in context, check localStorage as fallback
        if (!user) {
          const savedUserData = localStorage.getItem("userData");
          const accessToken = localStorage.getItem("userAccessToken");
          const refreshToken = localStorage.getItem("userRefreshToken");

          console.log("Cart page - Auth fallbacks:", {
            savedUserData: !!savedUserData,
            accessToken: !!accessToken,
            refreshToken: !!refreshToken,
          });

          // If we have no authentication data at all, redirect to login
          if (!savedUserData && !accessToken && !refreshToken) {
            toast.error("Please sign in to view your cart");
            router.push("/login");
            return;
          }
        }

        // Proceed with fetching cart - userAuthFetch will handle token refresh if needed
        await fetchCart();
      } catch (error) {
        console.error("Authentication check error:", error);
        toast.error("Authentication error. Please sign in again.");
        router.push("/login");
      }
    };

    checkAuth();
  }, [user, loading, router]);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const response = await userAuthFetch(USER_ENDPOINTS.CART_ITEMS);
      if (response.ok) {
        const data = await response.json();
        // Handle different API response formats
        const cartItemsList = Array.isArray(data)
          ? data
          : data.items || data.data?.items || data.data || [];

        setCart(cartItemsList);
        console.log("Cart items fetched successfully:", cartItemsList);

        // Calculate cart totals
        calculateTotals(cartItemsList);
      } else {
        console.error(
          `Error fetching cart: ${response.status} ${response.statusText}`
        );
        toast.error("Failed to fetch cart items. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
      if (
        error.message.includes("No refresh token available") ||
        error.message.includes("Failed to refresh token")
      ) {
        // This is an auth issue - only show sign in message if user was actually signed out
        if (
          !localStorage.getItem("userData") &&
          !localStorage.getItem("userAccessToken")
        ) {
          toast.error("Please sign in to view your cart");
          router.push("/login");
        }
      } else {
        toast.error("Failed to fetch cart items. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const updateCartItem = async (itemId, quantity) => {
    if (quantity < 1) {
      return removeCartItem(itemId);
    }

    try {
      setUpdating(true);
      const response = await userAuthFetch(
        `${USER_ENDPOINTS.CART_ITEMS}/${itemId}`,
        {
          method: "PUT",
          body: JSON.stringify({ quantity }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update item quantity");
      }

      const data = await response.json();

      // Update cart with new data
      setCart(data.cart);
      toast.success("Cart updated");
    } catch (error) {
      console.error("Error updating cart item:", error);
      toast.error("Failed to update item. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const removeCartItem = async (itemId) => {
    try {
      setUpdating(true);
      const response = await userAuthFetch(
        `${USER_ENDPOINTS.CART_ITEMS}/${itemId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove item from cart");
      }

      const data = await response.json();

      // Update cart with new data
      setCart(data.cart);
      toast.success("Item removed from cart");
    } catch (error) {
      console.error("Error removing cart item:", error);
      toast.error("Failed to remove item. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const clearCart = async () => {
    if (!window.confirm("Are you sure you want to clear your cart?")) {
      return;
    }

    try {
      setUpdating(true);
      const response = await userAuthFetch(`${USER_ENDPOINTS.CART}/clear`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to clear cart");
      }

      setCart({ items: [] });
      toast.success("Cart cleared");
    } catch (error) {
      console.error("Error clearing cart:", error);
      toast.error("Failed to clear cart. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  // Calculate cart totals
  const calculateTotals = (items) => {
    const subtotal = items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    const shipping = subtotal > 0 ? 100 : 0; // Example shipping cost
    const tax = subtotal * 0.18; // 18% tax
    const total = subtotal + shipping + tax;

    setCart({
      items: items.map((item) => ({ ...item, subtotal, shipping, tax, total })),
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  const { subtotal, shipping, tax, total } = calculateTotals(cart.items);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        Your Shopping Cart
      </h1>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : cart.items.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <FiShoppingCart className="text-5xl text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-700 mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-500 mb-6">
            Looks like you haven&apos;t added any products to your cart yet.
          </p>
          <Link
            href="/products"
            className="bg-secondary text-white px-6 py-3 rounded-md hover:bg-secondary-dark transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
                <h2 className="font-medium">
                  Cart Items ({cart.items.length})
                </h2>
                <button
                  onClick={clearCart}
                  disabled={updating}
                  className="text-red-600 text-sm hover:text-red-800 flex items-center"
                >
                  <FiTrash2 className="mr-1" />
                  Clear Cart
                </button>
              </div>

              <div>
                {cart.items.map((item) => (
                  <div key={item.id} className="flex border-b p-4">
                    <div className="w-20 h-20 bg-gray-100 rounded flex-shrink-0">
                      {item.product?.images?.[0] ? (
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.name}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex-grow">
                      <h3 className="font-medium">
                        {item.product?.name || "Product"}
                      </h3>
                      <div className="text-sm text-gray-500 mb-2">
                        {item.size && (
                          <span className="mr-3">Size: {item.size}</span>
                        )}
                        {item.color && <span>Color: {item.color}</span>}
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="flex items-center">
                          <button
                            onClick={() =>
                              updateCartItem(item.id, item.quantity - 1)
                            }
                            disabled={updating}
                            className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-l"
                          >
                            <FiMinus size={14} />
                          </button>
                          <span className="w-10 h-8 flex items-center justify-center border-t border-b border-gray-300">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateCartItem(item.id, item.quantity + 1)
                            }
                            disabled={updating}
                            className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-r"
                          >
                            <FiPlus size={14} />
                          </button>
                        </div>
                        <div className="flex items-center">
                          <div className="mr-4">
                            <div className="font-medium">
                              {formatCurrency(item.price * item.quantity)}
                            </div>
                            {item.quantity > 1 && (
                              <div className="text-xs text-gray-500">
                                {formatCurrency(item.price)} each
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeCartItem(item.id)}
                            disabled={updating}
                            className="text-red-600 hover:text-red-800"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium mb-4">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>{formatCurrency(shipping)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (18%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="border-t pt-3 mt-3 flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="block w-full bg-secondary text-white text-center py-3 rounded-md hover:bg-secondary-dark transition-colors"
              >
                Proceed to Checkout
              </Link>

              <div className="mt-6">
                <div className="text-sm text-gray-500 mb-2">
                  Accepted Payment Methods
                </div>
                <div className="flex space-x-2">
                  <div className="w-10 h-6 bg-gray-100 rounded"></div>
                  <div className="w-10 h-6 bg-gray-100 rounded"></div>
                  <div className="w-10 h-6 bg-gray-100 rounded"></div>
                  <div className="w-10 h-6 bg-gray-100 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
