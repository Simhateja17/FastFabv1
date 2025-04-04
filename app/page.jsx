"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from 'next/navigation';
import ProductCard from "@/app/components/ProductCard";
import { PUBLIC_ENDPOINTS } from "@/app/config";
import { FiShoppingBag, FiMapPin, FiCompass, FiAlertCircle } from "react-icons/fi";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import SellerBanner from "@/app/components/SellerBanner";
import { SafeLocationConsumer } from "@/app/components/SafeLocationWrapper";
import LocationRequiredMessage from "@/app/components/LocationRequiredMessage";
import { useLocationStore } from "@/app/lib/locationStore";
import { toast } from 'react-hot-toast';
import HeroSection from './components/HeroSection';
import ProductSection from './components/ProductSection';
import FeaturesSection from './components/FeaturesSection';
import TestimonialsSection from './components/TestimonialsSection';
import NewsletterSection from './components/NewsletterSection';
import CategorySection from './components/CategorySection';

// New component to hold the main content and hook logic
function HomePageContent({ userLocation: contextLocation, loading: locationLoading }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationError, setLocationError] = useState(false);
  const [lastUserLocation, setLastUserLocation] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);

  const searchTerm = searchParams.get("q") || "";

  // Memoize location for stability
  const userLocation = useMemo(() => contextLocation, [contextLocation]);

  // Check for any payment redirects
  useEffect(() => {
    const paymentStatus = searchParams.get('payment_status');
    if (paymentStatus === 'success') {
      toast.success('Payment successful! Your order has been placed.');
      router.replace('/');
    } else if (paymentStatus === 'failed') {
      toast.error('Payment failed. Please try again.');
      router.replace('/');
    }
  }, [searchParams, router]);

  // Moved fetchProducts definition before useEffect
  const fetchProducts = useCallback(async (location, currentSearchTerm) => {
    if (!location?.latitude || !location?.longitude) {
      console.log("Fetch products skipped: Location not available");
      setLocationError(true);
      setLoading(false);
      setProducts([]);
      return;
    }

    setLoading(true);
    setError(null);
    setLocationError(false);

    try {
      const params = new URLSearchParams({
        latitude: location.latitude,
        longitude: location.longitude,
        radius: 3, // Fixed 3km radius
        page: 1,
        limit: 50, // Fetch more products initially
      });

      if (currentSearchTerm) {
        params.append("search", currentSearchTerm);
      }

      const response = await fetch(`/api/products/nearby?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError("Failed to load products. Please try again later.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []); // Keep empty dependency array for useCallback unless external dependencies are needed

  // Moved useEffect here (now after fetchProducts)
  useEffect(() => {
    if (userLocation && 
       (!lastUserLocation || 
        lastUserLocation.latitude !== userLocation.latitude || 
        lastUserLocation.longitude !== userLocation.longitude)) {
      console.log('Updating lastUserLocation with:', userLocation);
      setLastUserLocation(userLocation);
      // Fetch products when location is first set or changes
      fetchProducts(userLocation, searchTerm);
    } else if (!userLocation && !locationLoading) {
      // Handle case where location is not available and not loading
      setLoading(false);
      setLocationError(true);
      setProducts([]); // Clear products if location is lost
    }
  }, [userLocation, locationLoading, searchTerm, lastUserLocation, fetchProducts]); // Added fetchProducts

  const filteredProducts = useMemo(() => {
    if (!searchTerm) {
      return products;
    }
    return products.filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  function groupProductsByCategory(products) {
    const grouped = {};
    products.forEach((product) => {
      const category = product.category || "Other";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      if (grouped[category].length < 4) {
        // Limit to 4 products per category on homepage
        grouped[category].push(product);
      }
    });
    return grouped;
  }

  const groupedProducts = useMemo(() => groupProductsByCategory(products), [products]);
  const categories = useMemo(() => Object.keys(groupedProducts), [groupedProducts]);

  const LocationErrorMessage = () => (
    <div className="text-center py-12 bg-red-50 rounded-lg shadow-sm mb-8">
      <FiAlertCircle className="w-12 h-12 mx-auto text-red-400" />
      <h3 className="mt-4 text-lg font-medium text-red-600">Location Error</h3>
      <p className="mt-2 text-red-500 max-w-md mx-auto">
        We couldn&apos;t get your location. Please enable location services or set your location manually.
      </p>
      {/* Optionally add a button to trigger location setting */}
    </div>
  );

  const LocationRequiredMessage = () => (
    <div className="text-center py-12 bg-blue-50 rounded-lg shadow-sm mb-8">
      <FiCompass className="w-12 h-12 mx-auto text-blue-400" />
      <h3 className="mt-4 text-lg font-medium text-blue-600">Set Your Location</h3>
      <p className="mt-2 text-blue-500 max-w-md mx-auto">
        Please set your location to see products available near you.
      </p>
      {/* You might want a button here to open the location modal */}
    </div>
  );

  // Moved return statement here
  const isLocationSet = userLocation?.latitude && userLocation?.longitude;

  // Fetch featured products
  const fetchFeaturedProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products/featured');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch products');
      }
      
      setFeaturedProducts(data.featuredProducts || []);
      setNewArrivals(data.newArrivals || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeaturedProducts();
  }, [fetchFeaturedProducts]);

  return (
    <main className="min-h-screen bg-background">
      {/* Seller Banner Modal */}
      <SellerBanner />

      {/* Main Category Buttons - Moved directly below search */}
      <div className="flex justify-center gap-6 mt-24 mb-8 px-4 sm:px-6 lg:px-8">
        <Link
          href="/products/category/men"
          className="inline-block bg-secondary text-white px-10 py-3 rounded-md hover:bg-secondary-dark transition-colors text-lg font-medium"
        >
          Men
        </Link>
        <Link
          href="/products/category/women"
          className="inline-block bg-primary text-white px-10 py-3 rounded-md hover:bg-primary-dark transition-colors text-lg font-medium"
        >
          Women
        </Link>
      </div>
      
      {/* Products by Category */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Show location required message if location is not set */}
        {!isLocationSet && !loading && !locationLoading && <LocationRequiredMessage />}
        
        {/* Only show the rest of the content if location is set */}
        {(loading || locationLoading) ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner size="large" color="secondary" />
          </div>
        ) : isLocationSet && (
          filteredProducts.length > 0 ? (
            searchTerm.trim() !== "" ? (
              // Search results view
              <section>
                <h2 className="text-2xl font-semibold text-primary mb-8">
                  Search Results for &quot;{searchTerm}&quot; 
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            ) : (
              // Category view (only show if no search term active)
              categories.map((category) => (
                <section key={category}>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-semibold text-primary">
                      {category}
                    </h2>
                    <Link
                      href={`/products/category/${category.toLowerCase()}`}
                      className="text-sm text-secondary hover:text-secondary-dark font-medium"
                    >
                      View All &rarr;
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                    {groupedProducts[category].map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </section>
              ))
            )
          ) : (
            locationError ? <LocationErrorMessage /> : (
              searchTerm.trim() !== "" ? (
                // No results found for search term
                <div className="text-center py-12 bg-background-card rounded-lg shadow-sm">
                  <FiShoppingBag className="w-12 h-12 mx-auto text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No Products Found</h3>
                  <p className="mt-2 text-gray-500 max-w-md mx-auto">
                    We couldn&apos;t find any products matching &quot;{searchTerm}&quot;. Please try a different search term.
                  </p>
                </div>
              ) : null // Optionally show a generic "No products nearby" message if needed
            )
          )
        )}
      </div>

      <HeroSection />
      
      <CategorySection />
      
      <ProductSection 
        title="Featured Products"
        products={featuredProducts}
        loading={loading}
        error={error}
        onRetry={fetchFeaturedProducts}
      />
      
      <FeaturesSection />
      
      <ProductSection 
        title="New Arrivals"
        products={newArrivals}
        loading={loading}
        error={error}
        onRetry={fetchFeaturedProducts}
      />
      
      <TestimonialsSection />
      
      <NewsletterSection />
    </main>
  );
}

// Original HomeContent renamed and now uses the consumer
function HomeContentWrapper() {
  return (
    <SafeLocationConsumer>
      {({ userLocation, loading }) => (
        <HomePageContent userLocation={userLocation} loading={loading} />
      )}
    </SafeLocationConsumer>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" color="primary" />
      </div>
    }>
      {/* Render the wrapper which handles location context */}
      <HomeContentWrapper />
    </Suspense>
  );
}
