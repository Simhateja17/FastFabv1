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
import { FiMapPin, FiShield } from "react-icons/fi";
import Script from 'next/script';
import { v4 as uuidv4 } from 'uuid';

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
  const [cashfreeLoaded, setCashfreeLoaded] = useState(false);
  const [cashfreeInstance, setCashfreeInstance] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  useEffect(() => {
    const initializeCheckout = async () => {
      setLoading(true);
      setError(null);
      const productId = searchParams.get('productId');
      const quantityParam = searchParams.get('quantity');
      const colorParam = searchParams.get('color');
      const sizeParam = searchParams.get('size');

      if (productId && quantityParam) {
        setIsBuyNow(true);
        console.log("Checkout: Buy Now flow detected.");
        try {
          const quantity = parseInt(quantityParam, 10);
          if (isNaN(quantity) || quantity <= 0) {
            throw new Error("Invalid quantity provided.");
          }

          const productRes = await fetch(PUBLIC_ENDPOINTS.PRODUCT_DETAIL(productId));
          if (!productRes.ok) {
            throw new Error(`Failed to fetch product details: ${productRes.status}`);
          }
          const productData = await productRes.json();
          
          const requiresVariations = productData.colorInventories && productData.colorInventories.length > 0;
          let finalColor = null;
          let finalSize = null;

          if (requiresVariations) {
            if (!colorParam || !sizeParam) {
              console.error("Buy Now Error: Variations required but color/size missing in URL.", { productId, colorParam, sizeParam });
              throw new Error("Product variation (color/size) missing. Please go back and select options on the product page.");
            }
            finalColor = colorParam;
            finalSize = sizeParam;
            console.log("Checkout: Variations required and validated:", { finalColor, finalSize });
          } else {
            console.log("Checkout: Variations not required for this product.");
          }

          const buyNowItem = {
            id: productId,
            name: productData.name,
            price: productData.sellingPrice,
            mrpPrice: productData.mrpPrice,
            image: productData.images?.[0] || '/placeholder.png',
            quantity: quantity,
            size: finalSize,
            color: finalColor,
          };
          setCheckoutItems([buyNowItem]);
          console.log("Checkout: Buy Now item prepared:", buyNowItem);

        } catch (err) {
          console.error("Error processing Buy Now item:", err);
          toast.error(err.message || "Could not load product for checkout.");
          setError("Failed to load item details. " + err.message);
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
  
  useEffect(() => {
    if (cashfreeLoaded) {
      try {
        console.log('Attempting to initialize Cashfree...');
        const mode = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
        const cashfree = window.Cashfree({
          mode: mode
        });
        console.log('Cashfree initialization successful');
        setCashfreeInstance(cashfree);
      } catch (err) {
        console.error("SDK initialization error:", err);
        toast.error("Payment gateway failed to load. Please refresh.");
        setError("Payment system error.");
      }
    }
  }, [cashfreeLoaded]);
  
  const subtotal = checkoutItems.reduce(
    (total, item) => total + (item.price || 0) * (item.quantity || 0),
    0
  );
  
  const total = subtotal;
  
  // Calculate original MRP and discount
  const calculateTotalMRP = () => {
    return checkoutItems.reduce(
      (total, item) => {
        // If the item has an original MRP stored, use that
        // Otherwise, use the current price as MRP
        const itemMRP = item.mrpPrice || item.price || 0;
        return total + itemMRP * (item.quantity || 0);
      },
      0
    );
  };
  
  const totalMRP = calculateTotalMRP();
  const discountOnMRP = totalMRP > subtotal ? totalMRP - subtotal : 0;
  
  const handlePlaceOrder = async () => {
    if (checkoutItems.length === 0) {
      toast.error("There are no items to check out.");
      return;
    }
    
    if (!userLocation || !userLocation.label) {
      toast.error("Delivery location is not set. Please select a location from the navigation bar.");
      return;
    }

    if (!cashfreeInstance) {
      toast.error("Payment gateway is not ready. Please wait or refresh the page.");
      return;
    }
    
    setIsProcessingPayment(true);
    setError(null);
    
    // --- Generate Order ID FIRST ---
    const orderIdForCashfree = `order_${uuidv4()}`;
    console.log(`Generated Order ID for Cashfree & DB: ${orderIdForCashfree}`);

    try {
      // --- Prepare Order Data for Internal DB Save ---
      const internalOrderData = {
        orderId: orderIdForCashfree, // Use the generated ID
        userId: user.id,
        items: checkoutItems.map(item => ({
          productId: item.id, // Assuming item.id holds productId
          quantity: item.quantity,
          price: item.price,
          mrpPrice: item.mrpPrice || item.price,
          size: item.size,
          color: item.color,
          productName: item.name, // Pass product name if available
          // TODO: Ensure sellerId is available on checkoutItems
          sellerId: item.sellerId || 'MISSING_SELLER_ID' // Placeholder - Needs correction
        })),
        totalAmount: total,
        addressId: userLocation.id, // Assuming userLocation has the selected address ID
        paymentMethod: 'ONLINE', // Or derive from state if needed
        // Include other relevant fields like shippingFee, tax, discount if calculated
      };
      
      // --- 1. Create Order Record Internally ---
      console.log("Creating internal order record...");
      const internalOrderResponse = await fetch('/api/create-internal-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(internalOrderData)
      });
      const internalOrderResult = await internalOrderResponse.json();

      if (!internalOrderResponse.ok || !internalOrderResult.success) {
        console.error('Failed to create internal order record:', internalOrderResult);
        throw new Error(internalOrderResult.error || 'Failed to save order before payment.');
      }
      console.log(`Internal order ${internalOrderResult.order?.id} created successfully.`);

      // --- 2. Create Cashfree Payment Order ---
      const customerDetailsPayload = {
        customer_id: user?.id || `guest_${Date.now()}`,
        customer_phone: user?.phone || '',
        customer_name: user?.displayName || user?.name || '',
      };

      if (!customerDetailsPayload.customer_phone) {
        throw new Error("Phone number is required for payment. Please update your profile.");
      }

      console.log("Creating Cashfree payment order...");
      const cashfreeOrderResponse = await fetch('/api/create-payment-order', {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          order_id: orderIdForCashfree, // Pass the SAME generated order ID
          amount: total,
          currency: 'INR',
          customer_details: customerDetailsPayload
        })
      });
      
      const cashfreeOrderData = await cashfreeOrderResponse.json();
      console.log("Cashfree order creation response:", cashfreeOrderData);

      if (!cashfreeOrderResponse.ok || !cashfreeOrderData.success) {
        // TODO: Consider rolling back internal order creation or marking it as failed?
        throw new Error(cashfreeOrderData.error || "Could not initiate payment process with Cashfree.");
      }

      if (!cashfreeOrderData.payment_session_id) {
        // TODO: Consider rolling back internal order creation or marking it as failed?
        throw new Error("Payment session could not be created by Cashfree.");
      }

      // --- 3. Launch Cashfree Checkout ---
      const checkoutOptions = {
        paymentSessionId: cashfreeOrderData.payment_session_id,
        redirectTarget: "_self",
      };
      
      console.log("Launching Cashfree checkout with options:", checkoutOptions);
      cashfreeInstance.checkout(checkoutOptions);

      // --- 4. Clear Cart (if applicable) ---
      if (!isBuyNow) {
        clearCart();
      }

    } catch (error) {
      console.error("Checkout process error:", error);
      toast.error(error.message || "Checkout failed. Please try again.");
      setError(error.message || "Checkout failed");
      setIsProcessingPayment(false); // Ensure loading state stops on error
    }
    // Note: Don't set processing to false here if checkout launch is successful
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
    <div className="min-h-screen bg-gray-50 py-12">
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        onLoad={() => {
          console.log('Cashfree SDK loaded');
          setCashfreeLoaded(true);
        }}
        onError={(e) => {
          console.error('Error loading Cashfree SDK:', e);
          toast.error('Failed to load payment system. Please refresh the page.');
        }}
      />
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-7/12 order-1 lg:order-1">
            <div className="bg-white p-6 rounded-lg shadow-md sticky top-20">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Order Summary</h2>
              
              <div className="max-h-[300px] overflow-y-auto mb-4 divide-y divide-gray-200 pr-2">
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-base font-medium text-gray-800 mb-3">PRICE DETAILS ({checkoutItems.reduce((total, item) => total + item.quantity, 0)} {checkoutItems.reduce((total, item) => total + item.quantity, 0) > 1 ? 'Items' : 'Item'})</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total MRP</span>
                    <span>₹{totalMRP}</span>
                  </div>
                  
                  {discountOnMRP > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount on MRP</span>
                      <span className="text-gray-900">-₹{discountOnMRP}</span>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-200 pt-3 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total Amount</span>
                      <span>₹{total}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handlePlaceOrder}
                disabled={!cashfreeInstance || isProcessingPayment || !userLocation?.label}
                className={`w-full py-4 mt-6 rounded-lg font-bold uppercase text-white text-lg tracking-wide transition-all duration-300 text-center flex items-center justify-center shadow-lg ${ 
                  (!cashfreeInstance || isProcessingPayment || !userLocation?.label) 
                  ? 'bg-gray-400 cursor-not-allowed opacity-70' 
                  : 'bg-black hover:bg-gray-800 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isProcessingPayment ? (
                    <span className="flex items-center justify-center">
                        <LoadingSpinner size="small" color="white"/>
                        <span className="ml-2">Processing...</span>
                    </span>
                ) : (
                    <span>Click to Pay ₹{total}</span>
                )}
              </button>
            </div>
          </div>

          <div className="lg:w-5/12 order-2 lg:order-2">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Delivery Location</h2>
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
          </div>
          
        </div>
        
        <div id="payment-form" className="mt-4"></div>
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
