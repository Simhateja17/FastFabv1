"use client";

// Existing imports...

export default function ProductsPage() {
  // Existing component logic...

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Products Grid - Show only if not loading, no errors, has location, and has products */}
      {!isLoading && !error && !showLocationError && products.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
} 