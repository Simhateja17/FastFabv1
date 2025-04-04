"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { USER_ENDPOINTS } from "@/app/config";
import { toast } from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";
import { FiHeart, FiTrash2, FiExternalLink } from "react-icons/fi";

export default function Wishlist() {
  const router = useRouter();
  const { user, userAuthFetch, loading: authLoading } = useUserAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userAuthFetch(USER_ENDPOINTS.WISHLIST);
      if (response.ok) {
        const data = await response.json();
        // Handle different API response formats
        const wishlistList = Array.isArray(data)
          ? data
          : data.items || data.data?.items || data.data || [];

        setWishlistItems(wishlistList);
        console.log("Wishlist items fetched successfully:", wishlistList);
      } else {
        console.error(
          `Error fetching wishlist: ${response.status} ${response.statusText}`
        );

        // If endpoint doesn't exist yet, just use empty array
        if (response.status === 404) {
          setWishlistItems([]);
          console.log(
            "Wishlist endpoint not implemented yet, using empty list"
          );
        } else {
          toast.error("Failed to fetch wishlist items. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      if (
        error.message.includes("No refresh token available") ||
        error.message.includes("Failed to refresh token")
      ) {
        // This is an auth issue - only show sign in message if user was actually signed out
        if (
          !localStorage.getItem("userData") &&
          !localStorage.getItem("userAccessToken")
        ) {
          toast.error("Please sign in to view your wishlist");
          router.push("/login");
        }
      } else {
        toast.error("Failed to fetch wishlist items. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [userAuthFetch, router]);

  // Fetch wishlist on component mount
  useEffect(() => {
    const checkAuth = async () => {
      if (authLoading) return; // Skip if auth context is still loading

      console.log("Wishlist page - Checking auth:", !!user);

      try {
        // If no user in context, check localStorage as fallback
        if (!user) {
          const savedUserData = localStorage.getItem("userData");
          const accessToken = localStorage.getItem("userAccessToken");
          const refreshToken = localStorage.getItem("userRefreshToken");

          console.log("Wishlist page - Auth fallbacks:", {
            savedUserData: !!savedUserData,
            accessToken: !!accessToken,
            refreshToken: !!refreshToken,
          });

          // If we have no authentication data at all, redirect to login
          if (!savedUserData && !accessToken && !refreshToken) {
            toast.error("Please sign in to view your wishlist");
            router.push("/login");
            return;
          }
        }

        // Proceed with fetching wishlist - userAuthFetch will handle token refresh if needed
        await fetchWishlist();
      } catch (error) {
        console.error("Authentication check error:", error);
        toast.error("Authentication error. Please sign in again.");
        router.push("/login");
      }
    };

    checkAuth();
  }, [user, authLoading, router, fetchWishlist]);

  const removeFromWishlist = async (itemId) => {
    try {
      // Mock implementation - replace with real API call when backend is ready
      toast.success("Item would be removed from wishlist");
      setWishlistItems(wishlistItems.filter((item) => item.id !== itemId));

      // Uncomment when backend is implemented
      /*
      const response = await userAuthFetch(USER_ENDPOINTS.WISHLIST_ITEM(itemId), {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove item from wishlist");
      }

      toast.success("Item removed from wishlist");
      fetchWishlist();
      */
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast.error("Failed to remove item. Please try again.");
    }
  };

  const viewProductDetails = (productId) => {
    router.push(`/products/${productId}`);
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        Your Wishlist
      </h1>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : wishlistItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <FiHeart className="text-5xl text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-700 mb-2">
            Your wishlist is empty
          </h2>
          <p className="text-gray-500 mb-6">
            Save items you like to your wishlist and they will appear here.
          </p>
          <Link
            href="/products"
            className="bg-secondary text-white px-6 py-3 rounded-md hover:bg-secondary-dark transition-colors"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
            <h2 className="font-medium">
              Wishlist Items ({wishlistItems.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {wishlistItems.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-w-16 aspect-h-9 bg-gray-100">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={300}
                      height={200}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-medium text-lg mb-1">{item.name}</h3>
                  <p className="text-primary text-xl font-semibold mb-3">
                    ₹{item.price.toFixed(2)}
                  </p>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => viewProductDetails(item.productId)}
                      className="flex-1 flex items-center justify-center bg-secondary text-white py-2 px-4 rounded hover:bg-secondary-dark transition-colors"
                    >
                      <FiExternalLink className="mr-2" />
                      View Details
                    </button>
                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="p-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                    >
                      <FiTrash2 className="text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
