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
import { ensureOrderAddress } from "@/app/utils/addressUtils";

function CheckoutContent() {
  console.log('CheckoutContent component rendering...'); // DIAGNOSTIC LOG 1
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
  
  // Promo code states
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeError, setPromoCodeError] = useState(null);
  const [promoCodeSuccess, setPromoCodeSuccess] = useState(null);
  const [appliedPromoCode, setAppliedPromoCode] = useState(null);
  const [isApplyingPromoCode, setIsApplyingPromoCode] = useState(false);
  
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
          let finalSize = sizeParam; // Always try to use sizeParam if provided for Buy Now

          if (requiresVariations) {
            // If variations are required, color becomes mandatory
            if (!colorParam) {
              console.error("Buy Now Error: Color variation required but color missing in URL.", { productId, colorParam });
              throw new Error("Product color variation missing. Please go back and select options on the product page.");
            }
            finalColor = colorParam;
            // Size validation might still be needed even if not strictly part of colorInventories
            if (!sizeParam) {
               console.error("Buy Now Error: Size variation required but size missing in URL.", { productId, sizeParam });
               throw new Error("Product size variation missing. Please go back and select options on the product page.");
            }
            console.log("Checkout: Variations required (Color/Size) and validated:", { finalColor, finalSize });
          } else {
            // If no color inventories, color is not applicable
            finalColor = null; 
            console.log("Checkout: Color variations not required for this product. Using Size from URL if provided:", { finalSize });
          }

          // Double-check: if size is expected based on product data but missing, throw error
          // This handles cases where sizeQuantities exist but no size was passed in the URL
          const hasSizeQuantities = productData.sizeQuantities && Object.keys(productData.sizeQuantities).length > 0;
          if (hasSizeQuantities && !finalSize) {
             console.error("Buy Now Error: Product has sizes, but no size was provided in the URL.", { productId });
             throw new Error("Product size missing. Please go back and select a size on the product page.");
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
            sellerId: productData.sellerId
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
    // Ensure this runs only once after cashfree is loaded and if instance isn't already set
    if (cashfreeLoaded && !cashfreeInstance) { 
      try {
        console.log('Attempting to initialize Cashfree... (Instance currently null)');
        const mode = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';

        // Check if window.Cashfree function exists after script load
        if (typeof window.Cashfree !== 'function') {
             console.error('window.Cashfree function not found after SDK script loaded!');
             throw new Error('Cashfree SDK did not load correctly.');
        }

        const cashfree = window.Cashfree({
          mode: mode
        });

        // Check if initialization returned a valid instance
        if (!cashfree) {
            console.error('window.Cashfree() initialization returned null or undefined!');
            throw new Error('Cashfree SDK initialization failed to return instance.');
        }

        console.log('Cashfree initialization successful, setting instance.');
        setCashfreeInstance(cashfree); // Set the instance

      } catch (err) {
        console.error("SDK initialization error:", err);
        toast.error("Payment gateway failed to load. Please refresh.");
        setError("Payment system error.");
        setCashfreeInstance(null); // Ensure instance is null on error
      }
    } else if (cashfreeLoaded && cashfreeInstance) {
        console.log('Cashfree SDK already initialized, skipping.'); // Log if we skip re-initialization
    } else if (!cashfreeLoaded) {
        console.log('Cashfree SDK not loaded yet, waiting...');
    }
  }, [cashfreeLoaded, cashfreeInstance]); // Add cashfreeInstance to dependency array
  
  const subtotal = checkoutItems.reduce(
    (total, item) => total + (item.price || 0) * (item.quantity || 0),
    0
  );
  
  const deliveryFee = 40; // Define Delivery Fee
  const convenienceFee = 10; // Define Convenience Fee

  // Calculate discount from promo code
  const promoDiscount = appliedPromoCode ? appliedPromoCode.discountAmount : 0;

  // Update total calculation with promo discount
  const total = subtotal + deliveryFee + convenienceFee - promoDiscount;
  
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
  
  // Handle promo code application
  const handleApplyPromoCode = async () => {
    // Reset states
    setPromoCodeError(null);
    setPromoCodeSuccess(null);
    
    if (!promoCode.trim()) {
      setPromoCodeError("Please enter a promo code");
      return;
    }
    
    setIsApplyingPromoCode(true);
    
    try {
      const response = await fetch('/api/promo-code/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: promoCode,
          orderTotal: subtotal
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setPromoCodeError(data.error || "Failed to apply promo code");
        setAppliedPromoCode(null);
      } else {
        setPromoCodeSuccess(`Promo code applied! You saved ₹${data.promoCode.discountAmount}`);
        setAppliedPromoCode(data.promoCode);
      }
    } catch (error) {
      console.error("Error applying promo code:", error);
      setPromoCodeError("An error occurred while applying the promo code");
      setAppliedPromoCode(null);
    } finally {
      setIsApplyingPromoCode(false);
    }
  };
  
  // Handle removing promo code
  const handleRemovePromoCode = () => {
    setAppliedPromoCode(null);
    setPromoCode("");
    setPromoCodeSuccess(null);
    setPromoCodeError(null);
  };
  
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
      let internalOrderData = {
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
          sellerId: item.sellerId // Use the actual sellerId from the item
        })),
        totalAmount: total, // Use the updated total with promo discount
        paymentMethod: 'UPI', // Send 'UPI' instead of 'ONLINE'
        shippingCost: deliveryFee, // Add delivery fee
        convenienceFee: convenienceFee, // Add convenience fee
        discount: promoDiscount, // Add promo discount
        // Include other relevant fields like tax, discount if calculated
      };
      
      // --- Ensure order has a valid addressId ---
      try {
        console.log("Creating/obtaining address for order...");
        
        // Prepare a complete location object to ensure all address components are captured
        const completeLocationData = {
          ...userLocation,
          // Ensure the full address string is included
          address: userLocation.fullAddress || userLocation.description || userLocation.label,
          // Make sure we're using consistent property names
          formatted_address: userLocation.fullAddress || userLocation.description,
          // Include structured address components if available
          city: userLocation.addressComponents?.city || userLocation.city,
          state: userLocation.addressComponents?.state || userLocation.state,
          pincode: userLocation.addressComponents?.postalCode || userLocation.postcode || userLocation.pincode,
          // Log to make debugging easier
          original: userLocation
        };
        
        console.log("Passing complete location data to address creation:", completeLocationData);
        internalOrderData = await ensureOrderAddress(internalOrderData, completeLocationData, user);
        console.log("Order data with address:", internalOrderData);
      } catch (addressError) {
        console.error("Failed to create address:", addressError);
        toast.error("Could not create shipping address. Please try again.");
        setIsProcessingPayment(false);
        return;
      }
      
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

      // Apply promo code if one is used
      if (appliedPromoCode) {
        try {
          await fetch('/api/promo-code/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: appliedPromoCode.code,
              orderId: internalOrderResult.order.id,
              discountAmount: appliedPromoCode.discountAmount
            })
          });
        } catch (promoError) {
          console.error("Error recording promo code usage:", promoError);
          // Continue with checkout even if promo recording fails
        }
      }

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
  
  console.log('Rendering main checkout UI including Cashfree Script tag...'); // DIAGNOSTIC LOG 2
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
              
              {/* Promo Code Section */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-base font-medium text-gray-800 mb-3">HAVE A PROMO CODE?</h3>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter promo code"
                    disabled={!!appliedPromoCode || isApplyingPromoCode}
                    className="flex-grow border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  
                  {appliedPromoCode ? (
                    <button
                      onClick={handleRemovePromoCode}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={handleApplyPromoCode}
                      disabled={isApplyingPromoCode || !promoCode.trim()}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border border-gray-400 ${
                        isApplyingPromoCode || !promoCode.trim()
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-200 text-black hover:bg-gray-300'
                      }`}
                    >
                      {isApplyingPromoCode ? 'Applying...' : 'Apply'}
                    </button>
                  )}
                </div>
                
                {promoCodeError && (
                  <p className="text-red-500 text-xs mt-1">{promoCodeError}</p>
                )}
                
                {promoCodeSuccess && (
                  <p className="text-green-500 text-xs mt-1">{promoCodeSuccess}</p>
                )}
              </div>
              
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-base font-medium text-gray-800 mb-3">PRICE DETAILS ({checkoutItems.reduce((total, item) => total + item.quantity, 0)} {checkoutItems.reduce((total, item) => total + item.quantity, 0) > 1 ? 'Items' : 'Item'})</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total MRP</span>
                    <span>₹{totalMRP}</span>
                  </div>
                  
                  {discountOnMRP > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount on MRP</span>
                      <span className="text-green-600">-₹{discountOnMRP}</span>
                    </div>
                  )}

                  {/* Add Delivery Fee Display */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span>₹{deliveryFee}</span>
                  </div>

                  {/* Add Convenience Fee Display */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Convenience Fee</span>
                    <span>₹{convenienceFee}</span>
                  </div>
                  
                  {/* Add Promo Discount Display */}
                  {promoDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Promo Discount</span>
                      <span className="text-green-600">-₹{promoDiscount}</span>
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
              
              <div className="p-5 rounded-lg shadow-sm border border-gray-200 bg-white mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Delivery Location</h3>
                {userLocation?.label ? (
                  <div className="flex items-start">
                    <FiMapPin className="text-primary mt-1 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-gray-700 text-lg font-semibold mt-1">{userLocation.label}</p>
                      {userLocation.fullAddress && (
                        <p className="text-gray-600 text-sm mt-1">{userLocation.fullAddress}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-red-500">
                    Please set your delivery location to continue
                  </div>
                )}
              </div>
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
