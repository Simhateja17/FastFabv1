"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import getAdminApiClient from "@/app/utils/apiClient";

export default function SellersPage() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const router = useRouter();

  // Fetch sellers
  useEffect(() => {
    const fetchSellers = async () => {
      try {
        // Using mock data for demonstration purposes
        const mockSellers = [
          {
            id: "seller-1",
            shopName: "Fashion Trends",
            ownerName: "John Smith",
            phone: "+91 9876543210",
            email: "john@fashiontrends.com",
            city: "Mumbai",
            productsCount: 24,
            createdAt: new Date(
              Date.now() - 60 * 24 * 60 * 60 * 1000
            ).toISOString(),
          },
          {
            id: "seller-2",
            shopName: "Tech World",
            ownerName: "Arun Kumar",
            phone: "+91 9871234560",
            email: "arun@techworld.in",
            city: "Bangalore",
            productsCount: 18,
            createdAt: new Date(
              Date.now() - 45 * 24 * 60 * 60 * 1000
            ).toISOString(),
          },
          {
            id: "seller-3",
            shopName: "Home Essentials",
            ownerName: "Priya Sharma",
            phone: "+91 9867890123",
            email: "priya@homeessentials.com",
            city: "Delhi",
            productsCount: 32,
            createdAt: new Date(
              Date.now() - 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
          },
          {
            id: "seller-4",
            shopName: "Kids Corner",
            ownerName: "Rahul Verma",
            phone: "+91 9890123456",
            email: "rahul@kidscorner.in",
            city: "Hyderabad",
            productsCount: 12,
            createdAt: new Date(
              Date.now() - 20 * 24 * 60 * 60 * 1000
            ).toISOString(),
          },
        ];

        setSellers(mockSellers);
      } catch (error) {
        console.error("Error fetching sellers:", error);
        setError(
          error.response?.data?.message || "Failed to load sellers data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSellers();
  }, []);

  // Filter sellers based on search query
  const filteredSellers = sellers.filter((seller) => {
    const query = searchQuery.toLowerCase();
    return (
      (seller.shopName && seller.shopName.toLowerCase().includes(query)) ||
      (seller.ownerName && seller.ownerName.toLowerCase().includes(query)) ||
      seller.phone.toLowerCase().includes(query) ||
      (seller.city && seller.city.toLowerCase().includes(query))
    );
  });

  // Handle delete seller
  const handleDeleteSeller = async () => {
    if (!selectedSeller) return;

    setLoading(true);
    try {
      // For demo purposes, we're just updating the state without making an actual API call
      setSellers(sellers.filter((seller) => seller.id !== selectedSeller.id));
      setIsDeleteModalOpen(false);
      setSelectedSeller(null);
    } catch (error) {
      console.error("Error deleting seller:", error);
      setError(error.response?.data?.message || "Failed to delete seller");
    } finally {
      setLoading(false);
    }
  };

  // View seller details
  const viewSellerDetails = (sellerId) => {
    router.push(`/admin/superadmin/sellers/${sellerId}`);
  };

  if (loading && sellers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text">Sellers</h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Search sellers..."
            className="pl-10 pr-4 py-2 rounded-lg border border-ui-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-text-muted"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      <div className="bg-background-card rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ui-border">
            <thead className="bg-background-alt">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Seller
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-background-card divide-y divide-ui-border">
              {filteredSellers.length > 0 ? (
                filteredSellers.map((seller) => (
                  <tr key={seller.id} className="hover:bg-background-alt">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                          {(
                            seller.shopName?.charAt(0) ||
                            seller.ownerName?.charAt(0) ||
                            "S"
                          ).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-text">
                            {seller.shopName || "Unnamed Shop"}
                          </div>
                          <div className="text-sm text-text-muted">
                            {seller.ownerName || "Unknown Owner"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text">{seller.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text">
                        {seller.city || "N/A"}
                        {seller.city && seller.state ? ", " : ""}
                        {seller.state || ""}
                      </div>
                      <div className="text-sm text-text-muted">
                        {seller.pincode || ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      {seller._count?.products || 0} products
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                      {new Date(seller.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => viewSellerDetails(seller.id)}
                        className="text-primary hover:text-primary-dark mr-3"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSeller(seller);
                          setIsDeleteModalOpen(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-4 text-center text-sm text-text-muted"
                  >
                    {searchQuery
                      ? "No sellers found matching your search"
                      : "No sellers found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedSeller && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background-card rounded-lg p-6 w-96 max-w-full">
            <h3 className="text-lg font-medium text-text mb-4">
              Confirm Deletion
            </h3>
            <p className="text-text-muted mb-6">
              Are you sure you want to delete seller "
              {selectedSeller.shopName || selectedSeller.phone}"? This action
              cannot be undone and will delete all their products.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedSeller(null);
                }}
                className="px-4 py-2 border border-ui-border rounded-md text-text hover:bg-background-alt"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSeller}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
