"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useCartStore } from "../lib/cartStore";
import { useUserAuth } from "../context/UserAuthContext";
import { useLocationStore } from "../lib/locationStore";
import PageHero from "../components/PageHero";
import Image from "next/image";
import { PUBLIC_ENDPOINTS, USER_ENDPOINTS, API_URL } from "@/app/config";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { FiMapPin } from "react-icons/fi";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const cartItems = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const { user, loading: authLoading, authFetch } = useUserAuth();
  const { userLocation } = useLocationStore();
  
  const [loading, setLoading] = useState(true);
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [isBuyNow, setIsBuyNow] = useState(false);
  const [paymentMethod] = useState("online");
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const initializeCheckout = async () => {
      setLoading(true);
      setError(null);
      const productId = searchParams.get('productId');
      const color = searchParams.get('color');
      const size = searchParams.get('size');
      const quantityParam = searchParams.get('quantity');

      if (productId && color && size && quantityParam) {
        setIsBuyNow(true);
        console.log("Checkout: Buy Now flow detected.");
        try {
          const quantity = parseInt(quantityParam, 10);
          if (isNaN(quantity) || quantity <= 0) {
            throw new Error("Invalid quantity.");
          }

          const productRes = await fetch(PUBLIC_ENDPOINTS.PRODUCT_DETAIL(productId));
          if (!productRes.ok) {
            throw new Error(`Failed to fetch product details: ${productRes.status}`);
          }
          const productData = await productRes.json();
          
          const buyNowItem = {
            id: productId,
            name: productData.name,
            price: productData.sellingPrice,
            image: productData.images?.[0] || '/placeholder.png',
            quantity: quantity,
            size: size,
            color: color,
          };
          setCheckoutItems([buyNowItem]);
          console.log("Checkout: Buy Now item prepared:", buyNowItem);

        } catch (err) {
          console.error("Error processing Buy Now item:", err);
          toast.error(err.message || "Could not load product for checkout.");
          setError("Failed to load item details.");
          setCheckoutItems([]);
        }

      } else {
        setIsBuyNow(false);
        console.log("Checkout: Cart flow detected.");
        if (cartItems.length === 0 && !authLoading) {
            toast.error("Your cart is empty. Add some products first.");
            router.push("/");
            return;
        }
        setCheckoutItems(cartItems);
        console.log("Checkout: Items loaded from cart:", cartItems);
      }
      setLoading(false);
    };

    if (!authLoading) {
        initializeCheckout();
    }

  }, [searchParams, cartItems, authLoading, router]);
  
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please login to checkout");
      const currentPath = window.location.pathname + window.location.search;
      sessionStorage.setItem('redirectAfterLogin', currentPath);
      router.push("/login");
    }
  }, [user, authLoading, router]);
  
  const subtotal = checkoutItems.reduce(
    (total, item) => total + (item.price || 0) * (item.quantity || 0),
    0
  );
  
  const shipping = subtotal > 0 ? 99 : 0;
  const total = subtotal + shipping;
  
  const handlePlaceOrder = async () => {
    if (checkoutItems.length === 0) {
        toast.error("There are no items to check out.");
        return;
    }
    
    if (!userLocation || !userLocation.label) {
        toast.error("Delivery location is not set. Please select a location from the navigation bar.");
        return;
    }
    
    setLoading(true);
    
    try {
      const orderItemsPayload = checkoutItems.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price,
        size: item.size, 
        color: item.color 
      }));

      const orderData = {
        deliveryLocationName: userLocation.label,
        paymentMethod: paymentMethod,
        items: orderItemsPayload,
        isBuyNow: isBuyNow
      };
      
      console.log("Placing order with data:", orderData);

      // First, create a payment order
      const response = await fetch('/api/create-payment-order', {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: total,
          customer_id: user?.id || `user_${Date.now()}`,
          customer_email: user?.email || "",
          customer_phone: user?.phone || "",
          order_details: orderData // Include full order details for reference
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create payment order");
      }

      const data = await response.json();
      
      // Redirect to Cashfree hosted payment page
      if (data.payment_link) {
        // Use the payment link directly
        window.location.href = data.payment_link;
      } else if (data.payment_session_id) {
        // Construct the payment URL using session ID
        const paymentUrl = `https://sandbox.cashfree.com/pg/orders/${data.order_id}/pay?payment_session_id=${data.payment_session_id}`;
        window.location.href = paymentUrl;
      } else {
        throw new Error("Payment URL not received from server");
      }

      console.log("Order placed successfully. Redirecting to payment gateway.");
      
      // Clear cart before redirecting if it's a cart checkout
      if (!isBuyNow) {
        clearCart();
        console.log("Cart cleared before payment redirect");
      }
      
    } catch (error) {
      console.error("Error during order placement:", error);
      toast.error(error.message || "Error placing order. Please try again.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" color="primary" />
      </div>
    );
  }

  if (error) {
       return (
         <div>
           <PageHero title="Checkout Error" subtitle="Something went wrong" />
           <div className="container mx-auto px-4 py-8 text-center">
                <p className="text-red-600 text-lg mb-4">{error}</p>
                <button onClick={() => router.push('/')} className="bg-primary text-white px-6 py-2 rounded hover:bg-primary-dark">
                    Go Home
                </button>
           </div>
         </div>
       );
  }
  
  if (checkoutItems.length === 0) {
       return (
         <div>
           <PageHero title="Checkout" subtitle="Your items" />
           <div className="container mx-auto px-4 py-8 text-center">
                <p className="text-gray-600 text-lg mb-4">No items to checkout.</p>
                 <button onClick={() => router.push('/')} className="bg-primary text-white px-6 py-2 rounded hover:bg-primary-dark">
                     Continue Shopping
                 </button>
           </div>
         </div>
       );
   }
  
  return (
    <div>
      <PageHero title="Checkout" subtitle="Complete your purchase" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-2/3">
            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Delivery Location</h2>
              </div>
              
              {userLocation?.label ? (
                <div className="border rounded-lg p-4 bg-gray-50 border-gray-200">
                  <div className="flex items-start">
                    <FiMapPin className="mr-3 mt-1 h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-800">Deliver to:</p>
                      <p className="text-gray-700 text-lg font-semibold mt-1">{userLocation.label}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-red-300 rounded-md bg-red-50">
                   <p className="text-red-700 mb-3 font-medium">Delivery location not set.</p>
                    <p className="text-red-600 text-sm">Please select your location from the top navigation bar.</p>
                </div>
              )}
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
                <div className="space-y-3">
                    <div 
                        className={`border rounded-lg p-4 border-primary bg-primary-50 ring-1 ring-primary`}
                    >
                        <label className="flex items-center">
                            <input 
                                type="radio" 
                                name="paymentMethod" 
                                value="online"
                                checked={paymentMethod === 'online'} 
                                readOnly
                                className="mr-3 h-4 w-4 text-primary focus:ring-primary border-gray-300"
                            />
                            Online Payment (Credit/Debit Card, UPI)
                        </label>
                    </div>
                </div>
            </div>
          </div>
          
          <div className="lg:w-1/3">
            <div className="bg-white p-6 rounded-lg shadow-sm sticky top-20">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              
              <div className="max-h-[300px] overflow-y-auto mb-4 divide-y divide-gray-200">
                {checkoutItems.map(item => (
                  <div key={`${item.id}-${item.size || 'nosize'}-${item.color || 'nocolor'}`} className="flex py-3 first:pt-0 last:pb-0">
                    <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                      <div className="relative w-full h-full">
                        <Image 
                          src={item.image || '/placeholder.png'}
                          alt={item.name || 'Product'}
                          fill
                          sizes="64px"
                          className="object-cover"
                          onError={(e) => e.target.src = '/placeholder.png'}
                        />
                      </div>
                    </div>
                    
                    <div className="ml-4 flex-grow flex flex-col justify-between">
                      <div>
                          <h3 className="text-sm font-medium line-clamp-2">{item.name || 'Product Name'}</h3>
                          {(item.size || item.color) && (
                            <p className="text-gray-500 text-xs">
                                {item.size && `Size: ${item.size}`}
                                {item.size && item.color && `, `}
                                {item.color && `Color: ${item.color}`}
                            </p>
                          )}
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        <p className="text-sm font-semibold">₹{(item.price || 0) * (item.quantity || 0)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2 py-3 border-b border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>{shipping > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(shipping) : 'Free'}</span>
                </div>
              </div>
              
              <div className="flex justify-between py-3 font-semibold">
                <span>Total</span>
                <span className="text-lg">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(total)}</span>
              </div>
              
              <button
                onClick={handlePlaceOrder}
                disabled={loading || !userLocation?.label || checkoutItems.length === 0}
                className="w-full py-3 mt-4 bg-primary text-white rounded-md font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                    <span className="flex items-center justify-center">
                        <LoadingSpinner size="small" color="white" className="mr-2"/> Processing...
                    </span>
                ) : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" color="primary" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
