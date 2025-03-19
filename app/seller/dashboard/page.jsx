"use client";

import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import {
  FiPlusSquare,
  FiShoppingBag,
  FiDollarSign,
  FiRefreshCw,
  FiUser,
} from "react-icons/fi";

// The actual dashboard content
function DashboardContent() {
  const { seller } = useAuth();

  const dashboardItems = [
    {
      title: "Products",
      href: "/seller/products",
      icon: <FiPlusSquare className="w-6 h-6 text-white" />,
    },
    {
      title: "Your Orders",
      href: "/seller/orders",
      icon: <FiShoppingBag className="w-6 h-6 text-white" />,
    },
    {
      title: "Earnings",
      href: "/seller/earnings",
      icon: <FiDollarSign className="w-6 h-6 text-white" />,
    },
    {
      title: "Refunds",
      href: "/seller/refunds",
      icon: <FiRefreshCw className="w-6 h-6 text-white" />,
    },
    {
      title: "My Profile",
      href: "/seller/profile",
      icon: <FiUser className="w-6 h-6 text-white" />,
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-primary mb-6">
        Seller Dashboard
      </h1>

      {seller && (
        <div className="bg-background-card p-4 rounded-lg shadow-sm mb-6 border border-ui-border">
          <h2 className="font-medium text-lg text-text-dark">
            Welcome, {seller.shopName || seller.phone}!
          </h2>
          <p className="text-text-muted mt-1">
            Manage your products and orders from here.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="p-6 bg-background-card rounded-lg shadow-sm hover:shadow-md transition-shadow border border-ui-border"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary bg-opacity-15 rounded-full text-primary">
                {item.icon}
              </div>
              <h2 className="text-xl font-medium text-text-dark">
                {item.title}
              </h2>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Wrap the dashboard content with the ProtectedRoute component
export default function SellerDashboard() {
  return (
    <ProtectedRoute requireOnboarding={true}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
