"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useCartStore } from "../lib/cartStore";
import { useUserAuth } from "../context/UserAuthContext";
import PageHero from "../components/PageHero";
import Image from "next/image";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const cartItems = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const { user, loading: authLoading, authFetch } = useUserAuth();
  
  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  
  // Check if cart is empty on initial load
  useEffect(() => {
    if (!authLoading && cartItems.length === 0) {
      toast.error("Your cart is empty. Add some products first.");
      router.push("/cart");
    }
  }, [cartItems, authLoading, router]);
  
  // Redirect if user is not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please login to checkout");
      router.push("/login?redirect=/checkout");
    }
  }, [user, authLoading, router]);
  
  // Fetch user addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      if (user) {
        try {
          const response = await authFetch("/user/addresses");
          const data = await response.json();
          
          if (response.ok) {
            setAddresses(data.addresses || []);
            // Set default selected address if available
            if (data.addresses && data.addresses.length > 0) {
              setSelectedAddress(data.addresses[0].id);
            }
          } else {
            toast.error(data.message || "Failed to fetch addresses");
          }
        } catch (error) {
          console.error("Error fetching addresses:", error);
          toast.error("Error loading addresses");
        }
      }
    };
    
    fetchAddresses();
  }, [user, authFetch]);
  
  // Calculate cart total
  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  
  const shipping = 99; // Standard shipping fee
  const total = subtotal + shipping;
  
  // Handle order placement
  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error("Please select a delivery address");
      return;
    }
    
    setLoading(true);
    
    try {
      const orderData = {
        addressId: selectedAddress,
        paymentMethod,
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price
        }))
      };
      
      const response = await authFetch("/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(orderData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (paymentMethod === "online") {
          // Redirect to payment gateway
          window.location.href = data.paymentUrl;
        } else {
          // Clear cart and redirect to success page
          clearCart();
          toast.success("Order placed successfully!");
          router.push(`/order-success?orderId=${data.orderId}`);
        }
      } else {
        toast.error(data.message || "Failed to place order");
      }
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error("Error placing order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || cartItems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div>
      <PageHero title="Checkout" subtitle="Complete your purchase" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left side - Delivery and Payment */}
          <div className="lg:w-2/3">
            {/* Delivery Address Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4">Delivery Address</h2>
              
              {addresses.length > 0 ? (
                <div className="space-y-4">
                  {addresses.map(address => (
                    <div 
                      key={address.id}
                      className={`border rounded-lg p-4 cursor-pointer ${
                        selectedAddress === address.id ? 'border-primary bg-primary-50' : 'border-gray-200'
                      }`}
                      onClick={() => setSelectedAddress(address.id)}
                    >
                      <div className="flex items-start">
                        <input
                          type="radio"
                          className="mt-1 mr-3"
                          checked={selectedAddress === address.id}
                          onChange={() => setSelectedAddress(address.id)}
                        />
                        <div>
                          <p className="font-medium">{address.name}</p>
                          <p className="text-gray-600 text-sm mt-1">
                            {address.street}, {address.city}, {address.state}, {address.pincode}
                          </p>
                          <p className="text-gray-600 text-sm mt-1">Phone: {address.phone}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500 mb-4">No saved addresses found</p>
                  <button
                    onClick={() => router.push('/profile/addresses?redirect=/checkout')}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                  >
                    Add New Address
                  </button>
                </div>
              )}
              
              {addresses.length > 0 && (
                <button
                  onClick={() => router.push('/profile/addresses?redirect=/checkout')}
                  className="mt-4 text-primary text-sm hover:underline"
                >
                  + Add New Address
                </button>
              )}
            </div>
            
            {/* Payment Method Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
              
              <div className="space-y-3">
                <div 
                  className={`border rounded-lg p-4 cursor-pointer ${
                    paymentMethod === 'cash' ? 'border-primary bg-primary-50' : 'border-gray-200'
                  }`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      className="mr-3"
                      checked={paymentMethod === 'cash'}
                      onChange={() => setPaymentMethod('cash')}
                    />
                    <div>
                      <p className="font-medium">Cash on Delivery</p>
                      <p className="text-gray-600 text-sm mt-1">Pay when you receive your order</p>
                    </div>
                  </div>
                </div>
                
                <div 
                  className={`border rounded-lg p-4 cursor-pointer ${
                    paymentMethod === 'online' ? 'border-primary bg-primary-50' : 'border-gray-200'
                  }`}
                  onClick={() => setPaymentMethod('online')}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      className="mr-3"
                      checked={paymentMethod === 'online'}
                      onChange={() => setPaymentMethod('online')}
                    />
                    <div>
                      <p className="font-medium">Online Payment</p>
                      <p className="text-gray-600 text-sm mt-1">Pay securely with card, UPI, or other methods</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right side - Order Summary */}
          <div className="lg:w-1/3">
            <div className="bg-white p-6 rounded-lg shadow-sm sticky top-20">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              
              <div className="max-h-[300px] overflow-y-auto mb-4">
                {cartItems.map(item => (
                  <div key={item.id} className="flex py-3 border-b">
                    <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                      <div className="relative w-full h-full">
                        <Image 
                          src={item.image} 
                          alt={item.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                    </div>
                    
                    <div className="ml-4 flex-grow">
                      <h3 className="text-sm font-medium">{item.name}</h3>
                      <p className="text-gray-500 text-xs">Size: {item.size || 'N/A'}</p>
                      <div className="flex justify-between mt-1">
                        <p className="text-sm">Qty: {item.quantity}</p>
                        <p className="text-sm font-semibold">₹{item.price * item.quantity}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2 py-3 border-b border-dashed">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>₹{shipping}</span>
                </div>
              </div>
              
              <div className="flex justify-between py-3 font-semibold">
                <span>Total</span>
                <span className="text-lg">₹{total}</span>
              </div>
              
              <button
                onClick={handlePlaceOrder}
                disabled={loading || !selectedAddress}
                className="w-full py-3 mt-4 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Place Order'}
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
        <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
