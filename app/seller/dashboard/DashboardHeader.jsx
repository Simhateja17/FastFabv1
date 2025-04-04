"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { FiLogOut } from "react-icons/fi";

export function DashboardHeader() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/seller/signin');
  };

  return (
    <div className="flex justify-between items-center mb-6">
      <p className="text-gray-600">Seller Dashboard</p>
      <button
        onClick={handleLogout}
        className="flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
      >
        <FiLogOut className="mr-2" />
        Logout
      </button>
    </div>
  );
} 