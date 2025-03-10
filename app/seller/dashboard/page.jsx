"use client";

import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";

export default function SellerDashboard() {
  const { seller } = useAuth();

  const dashboardItems = [
    {
      title: "Product",
      href: "/seller/products",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      ),
    },
    {
      title: "Your Orders",
      href: "/seller/orders",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z"
          />
        </svg>
      ),
    },
    {
      title: "Earnings",
      href: "/seller/earnings",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 8.25H9m6 3H9m6 3H9M10.5 5.25h3L9 18.75l-1.5-.75m12 0L15 5.25"
          />
        </svg>
      ),
    },
    {
      title: "Refunds",
      href: "/seller/refunds",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 9.75h4.875a2.625 2.625 0 0 1 0 5.25H12M8.25 9.75 10.5 7.5M8.25 9.75 10.5 12m5.625 5.625L18.75 12m-7.5 0h4.875a2.625 2.625 0 0 1 0 5.25H12m-4.875 0V12"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {dashboardItems.map((item) => (
        <Link
          key={item.title}
          href={item.href}
          className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-[#faf9f8] rounded-full text-[#8B6E5A]">
              {item.icon}
            </div>
            <h2 className="text-xl font-medium text-gray-900">{item.title}</h2>
          </div>
        </Link>
      ))}
    </div>
  );
}
