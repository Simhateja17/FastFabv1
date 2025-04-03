"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import getAdminApiClient from "@/app/utils/apiClient";

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full">
      <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
    </div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}

function AdminDashboardContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    sellersCount: 0,
    productsCount: 0,
    activeProductsCount: 0,
  });
  const [recentSellers, setRecentSellers] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const apiClient = getAdminApiClient();
        const response = await apiClient.get("/admin/dashboard-stats");
        const { stats, recentSellers, recentProducts } = response.data;

        setStats(stats);
        setRecentSellers(recentSellers);
        setRecentProducts(recentProducts);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError(
          error.response?.data?.message || "Failed to load dashboard data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">Error</p>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Total Sellers"
          value={stats.sellersCount}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          }
          color="bg-blue-500"
          link="/superadmin/sellers"
        />
        <StatsCard
          title="Total Products"
          value={stats.productsCount}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          }
          color="bg-purple-500"
          link="/superadmin/products"
        />
        <StatsCard
          title="Active Products"
          value={stats.activeProductsCount}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          color="bg-green-500"
          link="/superadmin/products"
        />
      </div>

      {/* Recent Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sellers */}
        <div className="bg-background-card rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-text">Recent Sellers</h2>
            <Link
              href="/superadmin/sellers"
              className="text-sm text-primary hover:text-primary-dark"
            >
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-background-alt">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Shop Name
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border">
                {recentSellers.length > 0 ? (
                  recentSellers.map((seller) => (
                    <tr key={seller.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-text">
                        <Link
                          href={`/superadmin/sellers/${seller.id}`}
                          className="text-primary hover:text-primary-dark"
                        >
                          {seller.shopName || "N/A"}
                        </Link>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-text">
                        {seller.ownerName || "N/A"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-text">
                        {seller.phone}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-text-muted">
                        {new Date(seller.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-4 py-2 text-center text-sm text-text-muted"
                    >
                      No sellers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Products */}
        <div className="bg-background-card rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-text">Recent Products</h2>
            <Link
              href="/superadmin/products"
              className="text-sm text-primary hover:text-primary-dark"
            >
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-background-alt">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Seller
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border">
                {recentProducts.length > 0 ? (
                  recentProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-text">
                        <Link
                          href={`/superadmin/products/${product.id}`}
                          className="text-primary hover:text-primary-dark"
                        >
                          {product.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-text">
                        ₹{(product.sellingPrice || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-text">
                        <Link
                          href={`/superadmin/sellers/${
                            product.seller?.id || "unknown"
                          }`}
                          className="text-primary hover:text-primary-dark"
                        >
                          {product.seller?.shopName || "Unknown"}
                        </Link>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            product.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {product.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-4 py-2 text-center text-sm text-text-muted"
                    >
                      No products found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stats Card Component
function StatsCard({ title, value, icon, color, link }) {
  return (
    <Link
      href={link}
      className="bg-background-card rounded-lg shadow p-6 transition-transform hover:scale-105"
    >
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${color} text-white mr-4`}>
          {icon}
        </div>
        <div>
          <p className="text-text-muted text-sm">{title}</p>
          <p className="text-text text-2xl font-bold">{value}</p>
        </div>
      </div>
    </Link>
  );
}
