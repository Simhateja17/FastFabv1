"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import ProductCard from "@/app/components/ProductCard";
import { PUBLIC_ENDPOINTS } from "@/app/config";
import { FiShoppingBag, FiMapPin, FiCompass } from "react-icons/fi";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import SellerBanner from "@/app/components/SellerBanner";
import { SafeLocationConsumer } from "@/app/components/SafeLocationWrapper";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [groupedProducts, setGroupedProducts] = useState({});
  const [categories, setCategories] = useState([]);
  const [locationError, setLocationError] = useState(false);
  const [lastUserLocation, setLastUserLocation] = useState(null);

  // Get search term from URL
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get('search') || "";

  // Fetch products based on location - memoized to prevent recreation on each render
  const fetchProducts = useCallback(async (locationData) => {
    try {
      setLoading(true);
      
      let url = PUBLIC_ENDPOINTS.ACTIVE_PRODUCTS;
      
      // If we have location data, use the nearby products API
      if (locationData?.latitude && locationData?.longitude) {
        url = `/api/products/nearby?latitude=${locationData.latitude}&longitude=${locationData.longitude}&radius=3`;
        console.log("Fetching nearby products with location:", locationData);
      } else {
        console.log("No location data available, user won't see any products until location is set");
        setLocationError(true);
        setLoading(false);
        return;
      }
      
      console.log("Fetching from:", url);

      const res = await fetch(url, {
        cache: "no-store",
        next: { revalidate: 300 }, // Revalidate every 5 minutes
      });

      console.log("Response status:", res.status);

      if (!res.ok) {
        // Get more detailed error information from the response if possible
        let errorDetails = "";
        try {
          const errorData = await res.json();
          errorDetails = errorData.details || errorData.error || "";
          console.error("Error details from API:", errorData);
        } catch (parseError) {
          console.error("Could not parse error response:", parseError);
          // Try to get text response as fallback
          try {
            errorDetails = await res.text();
            console.error("Error response text:", errorDetails);
          } catch (textError) {
            console.error("Could not get error response text:", textError);
          }
        }
        
        throw new Error(`Failed to fetch products: ${res.status}${errorDetails ? ` - ${errorDetails}` : ""}`);
      }

      const data = await res.json();
      
      if (data.isLocationFilter) {
        console.log(`Location-filtered products: ${data.products.length} products within 3km radius`);
      }
      
      setProducts(data.products || []);
      // Filter products immediately after fetching based on URL search term
      const currentSearchTerm = searchParams.get('search') || "";
      const initialFiltered = (data.products || []).filter(
        (product) =>
          currentSearchTerm.trim() === "" ||
          product.name.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
          (product.category &&
            product.category.toLowerCase().includes(currentSearchTerm.toLowerCase()))
      );
      setFilteredProducts(initialFiltered);

      setLocationError(data.products?.length === 0 && !currentSearchTerm); // Only show location error if no products AND no search term

      // Group products by category
      const grouped = groupProductsByCategory(initialFiltered); // Group the filtered products
      setGroupedProducts(grouped);
      setCategories(Object.keys(grouped));
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
      setFilteredProducts([]);
      setGroupedProducts({});
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [searchParams]); // Add searchParams as a dependency

  // Keep track of location changes to trigger product fetch
  useEffect(() => {
    if (lastUserLocation) {
      fetchProducts(lastUserLocation);
    }
  // Make sure fetchProducts is stable or included if needed
  }, [lastUserLocation, fetchProducts]); 

  // Filter products whenever the search term (from URL) or the base products list changes
  useEffect(() => {
    const term = searchParams.get('search') || "";
    if (term.trim() === "") {
      setFilteredProducts(products);
      const grouped = groupProductsByCategory(products);
      setGroupedProducts(grouped);
      setCategories(Object.keys(grouped));
    } else {
      const filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(term.toLowerCase()) ||
          (product.category &&
            product.category.toLowerCase().includes(term.toLowerCase()))
      );
      setFilteredProducts(filtered);
      const grouped = groupProductsByCategory(filtered);
      setGroupedProducts(grouped);
      setCategories(Object.keys(grouped));
    }
    // Only show location error if products are empty *because* of location, not search
    setLocationError(products?.length === 0 && term.trim() === ""); 

  }, [searchParams, products]); // Re-filter when searchParams or products change

  // Helper function to group products by category
  function groupProductsByCategory(products) {
    return products.reduce((acc, product) => {
      // Use "Uncategorized" if no category is set
      const category = product.category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {});
  }

  // Location error message component
  const LocationErrorMessage = () => (
    <div className="text-center py-12 bg-blue-50 rounded-lg shadow-sm mb-8">
      <FiCompass className="w-12 h-12 mx-auto text-blue-400" />
      <h3 className="mt-4 text-lg font-medium text-blue-600">Expanding Soon!</h3>
      <p className="mt-2 text-blue-500 max-w-md mx-auto">
        We're expanding soon to your Area! Check back later to see products near you.
      </p>
    </div>
  );

  return (
    <SafeLocationConsumer>
      {({ userLocation, loading: locationLoading }) => {
        // Use useEffect to update local state when location changes
        // instead of doing it during render
        useEffect(() => {
          if (userLocation && 
             (!lastUserLocation || 
              lastUserLocation.latitude !== userLocation.latitude || 
              lastUserLocation.longitude !== userLocation.longitude)) {
            console.log('Updating lastUserLocation with:', userLocation);
            setLastUserLocation(userLocation);
          }
        }, [userLocation, lastUserLocation]);

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
              {/* Only show location error if no products AND not loading AND no search term */ }
              {!loading && !locationLoading && products.length === 0 && !searchTerm && <LocationErrorMessage />}
              
              {loading || locationLoading ? (
                <div className="flex justify-center items-center py-20">
                  <LoadingSpinner size="large" color="secondary" />
                </div>
              ) : filteredProducts.length > 0 ? (
                 searchTerm.trim() !== "" ? (
                  // Search results view
                  <section>
                    <h2 className="text-2xl font-semibold text-primary mb-8">
                      Search Results for "{searchTerm}" 
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
                          View All →
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
                 searchTerm.trim() !== "" ? (
                   // No results found for search term
                   <div className="text-center py-12 bg-background-card rounded-lg shadow-sm">
                     <FiShoppingBag className="w-12 h-12 mx-auto text-text-muted" />
                     <h3 className="mt-4 text-lg font-medium text-text-dark">
                       No Products Found
                     </h3>
                     <p className="mt-2 text-text-muted">
                       No products match your search term "{searchTerm}". Try different keywords.
                     </p>
                   </div>
                 ) : ( 
                   // No products available at location (and no search term) - Covered by LocationErrorMessage now
                   null 
                 )
              )}
            </div>
          </main>
        );
      }}
    </SafeLocationConsumer>
  );
}
