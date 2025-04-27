"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { FiBox, FiUsers, FiShoppingBag, FiDollarSign, FiCalendar } from "react-icons/fi";
import getAdminApiClient from "@/app/utils/apiClient";

// StatsCard component
function StatsCard({ title, value, icon, color, link }) {
  const router = useRouter();

  return (
    <div
      className={`rounded-lg shadow-sm p-6 ${color} text-white cursor-pointer`}
      onClick={() => link && router.push(link)}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0 mr-4">{icon}</div>
        <div>
          <div className="text-sm font-medium opacity-80">{title}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </div>
    </div>
  );
}

// Format currency values
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}

function AdminDashboardContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    sellersCount: 0,
    productsCount: 0,
    activeProductsCount: 0,
    totalOrders: 0,
    totalRevenue: 0,
    todayOrdersCount: 0,
    usersCount: 0,
    returnsCount: 0,
  });
  const [recentSellers, setRecentSellers] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const apiClient = getAdminApiClient();
      setLoading(true);
      setError(null);

      // Use the dashboard-stats endpoint on the seller service with the correct /api prefix
      const dashboardResponse = await apiClient.get("/api/admin/dashboard-stats");
      
      if (dashboardResponse.data) {
        const { stats, recentSellers, recentProducts, recentOrders } = dashboardResponse.data;
        
        // Update stats
        setStats({
          sellersCount: stats.sellersCount || 0,
          productsCount: stats.productsCount || 0,
          activeProductsCount: stats.activeProductsCount || 0,
          totalOrders: stats.totalOrders || 0,
          totalRevenue: stats.totalRevenue || 0,
          todayOrdersCount: stats.todayOrdersCount || 0,
          usersCount: stats.usersCount || 0,
          returnsCount: stats.returnsCount || 0,
        });
        
        // Update recent data
        if (Array.isArray(recentSellers)) {
          setRecentSellers(recentSellers);
        }
        
        if (Array.isArray(recentProducts)) {
          // Filter out any products that might have missing seller data
          setRecentProducts(recentProducts.filter(product => product && product.seller));
        }
        
        if (Array.isArray(recentOrders)) {
          setRecentOrders(recentOrders);
        }
      } else {
        console.error("Invalid dashboard response format:", dashboardResponse.data);
        setError("Invalid response format from API");
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError(
        error.response?.data?.message || "Failed to load dashboard data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <svg
            className="w-5 h-5 mr-3 text-red-500"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p>{error}</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Dashboard Overview
      </h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Total Sellers"
          value={stats.sellersCount}
          icon={<FiUsers className="w-6 h-6" />}
          color="bg-blue-500"
          link="/superadmin/sellers"
        />
        <StatsCard
          title="Total Products"
          value={stats.productsCount}
          icon={<FiBox className="w-6 h-6" />}
          color="bg-green-500"
          link="/superadmin/products"
        />
        <StatsCard
          title="Active Products"
          value={stats.activeProductsCount}
          icon={<FiShoppingBag className="w-6 h-6" />}
          color="bg-purple-500"
          link="/superadmin/products"
        />
        <StatsCard
          title="Total Orders"
          value={stats.totalOrders || 0}
          icon={<FiDollarSign className="w-6 h-6" />}
          color="bg-yellow-500"
          link="/superadmin/orders"
        />
        <StatsCard
          title="Today's Orders"
          value={stats.todayOrdersCount || 0}
          icon={<FiShoppingBag className="w-6 h-6" />}
          color="bg-indigo-500"
          link="/superadmin/orders"
        />
        <StatsCard
          title="Total Users"
          value={stats.usersCount || 0}
          icon={<FiUsers className="w-6 h-6" />}
          color="bg-teal-500"
          link="/superadmin/users"
        />
        <StatsCard
          title="Returns"
          value={stats.returnsCount || 0}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z"
              />
            </svg>
          }
          color="bg-red-500"
          link="/superadmin/returns"
        />
      </div>

      {/* Revenue Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Revenue Overview</h2>
        <div className="flex items-center">
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(stats.totalRevenue || 0)}
          </div>
          <div className="ml-4 text-sm text-gray-500">
            Total revenue from {stats.totalOrders || 0} orders
          </div>
        </div>
      </div>

      {/* Recent sellers */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Recent Sellers</h2>
          <button
            onClick={() => router.push("/superadmin/sellers")}
            className="text-sm text-primary hover:underline"
          >
            View All
          </button>
        </div>

        {recentSellers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seller
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Store Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentSellers.map((seller) => (
                  <tr key={seller.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {seller.shopName
                            ? seller.shopName.charAt(0).toUpperCase()
                            : "S"}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {seller.ownerName || "Unknown Owner"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {seller.phone || "No contact info"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {seller.shopName || "Not set"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(seller.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            No recent sellers found
          </div>
        )}
      </div>

      {/* Recent products section */}
      {recentProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Products</h2>
            <button
              onClick={() => router.push("/superadmin/products")}
              className="text-sm text-primary hover:underline"
            >
              View All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProducts.map((product) => (
              <div
                key={product.id || 'unknown'}
                className="border rounded-lg overflow-hidden shadow-sm"
              >
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {product.name || 'Unnamed Product'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {product.category || "Uncategorized"}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-bold text-gray-900">
                      ₹{product.sellingPrice || 0}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        product.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {product.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders section */}
      {recentOrders && recentOrders.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Orders</h2>
            <button
              onClick={() => router.push("/superadmin/orders")}
              className="text-sm text-primary hover:underline"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/superadmin/orders/${order.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order.orderNumber || order.id.substring(0, 8)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {order.user?.name || "Guest User"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.user?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(order.totalAmount || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 
                          order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        {order.status || "PENDING"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
