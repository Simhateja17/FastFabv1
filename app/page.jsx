import Link from "next/link";
import ProductCard from "@/app/components/ProductCard";
import { PUBLIC_ENDPOINTS } from "@/app/config";

async function getProducts() {
  try {
    console.log("Fetching products from:", PUBLIC_ENDPOINTS.ACTIVE_PRODUCTS);

    const res = await fetch(PUBLIC_ENDPOINTS.ACTIVE_PRODUCTS, {
      cache: "no-store",
      next: { revalidate: 300 }, // Revalidate every 5 minutes
    });

    console.log("API Response status:", res.status);

    if (!res.ok) {
      console.log("Response not OK. Status:", res.status);
      const errorText = await res.text();
      console.log("Error response:", errorText);
      throw new Error(`Failed to fetch products: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    console.log("Fetched products:", data);
    return data;
  } catch (error) {
    console.error("Detailed error in getProducts:", error);
    return [];
  }
}

// Helper function to group products by category
function groupProductsByCategory(products) {
  console.log("Grouping products:", products);
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

export default async function Home() {
  console.log("Starting Home component render");
  const products = await getProducts();
  console.log("Products received in Home:", products);

  // Check if we have products but they're not showing
  if (products.length > 0) {
    console.log("Sample product data:", products[0]);
  }

  const groupedProducts = groupProductsByCategory(products);
  console.log("Grouped products:", groupedProducts);
  const categories = Object.keys(groupedProducts);
  console.log("Categories found:", categories);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-[#faf9f8] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-[#8B6E5A]">
              Welcome to Fast&Fab
            </h1>
            <p className="mt-4 text-xl text-gray-600">
              Discover the latest fashion trends
            </p>
            {categories.length > 0 && (
              <div className="mt-8 flex justify-center gap-4 flex-wrap">
                {categories.map((category) => (
                  <Link
                    key={category}
                    href={`/products/category/${category.toLowerCase()}`}
                    className="inline-block bg-[#8B6E5A] text-white px-6 py-2 rounded-md hover:bg-[#7d6351] transition-colors"
                  >
                    {category}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Products by Category */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        {products.length > 0 ? (
          categories.map((category) => (
            <section key={category}>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-semibold text-[#8B6E5A]">
                  {category}
                </h2>
                <Link
                  href={`/products/category/${category.toLowerCase()}`}
                  className="text-sm text-[#8B6E5A] hover:text-[#7d6351] font-medium"
                >
                  View All →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {groupedProducts[category].map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-12 h-12 mx-auto text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No Products Available
            </h3>
            <p className="mt-2 text-gray-500">
              Check back soon for our latest products!
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
