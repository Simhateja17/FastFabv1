"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { USER_ENDPOINTS } from "@/app/config";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { FiHome, FiPlus, FiEdit2, FiTrash2, FiCheck } from "react-icons/fi";

export default function AddressList() {
  const router = useRouter();
  const { user, userAuthFetch, loading: authLoading } = useUserAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    isDefault: false,
  });

  // Fetch addresses on component mount
  useEffect(() => {
    const checkAuth = async () => {
      if (loading) return; // Skip if auth context is still loading

      console.log("Address page - Checking auth:", !!user);

      try {
        // If no user in context, check localStorage as fallback
        if (!user) {
          const savedUserData = localStorage.getItem("userData");
          const accessToken = localStorage.getItem("userAccessToken");
          const refreshToken = localStorage.getItem("userRefreshToken");

          console.log("Address page - Auth fallbacks:", {
            savedUserData: !!savedUserData,
            accessToken: !!accessToken,
            refreshToken: !!refreshToken,
          });

          // If we have no authentication data at all, redirect to login
          if (!savedUserData && !accessToken && !refreshToken) {
            toast.error("Please sign in to view your addresses");
            router.push("/login");
            return;
          }
        }

        // Proceed with fetching addresses - userAuthFetch will handle token refresh if needed
        await fetchAddresses();
      } catch (error) {
        console.error("Authentication check error:", error);
        toast.error("Authentication error. Please sign in again.");
        router.push("/login");
      }
    };

    checkAuth();
  }, [user, loading, router]);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const response = await userAuthFetch(USER_ENDPOINTS.ADDRESSES);
      if (response.ok) {
        const data = await response.json();
        // Handle different API response formats
        const addressList = Array.isArray(data)
          ? data
          : data.addresses || data.data?.addresses || data.data || [];

        setAddresses(addressList);
        console.log("Addresses fetched successfully:", addressList);
      } else {
        console.error(
          `Error fetching addresses: ${response.status} ${response.statusText}`
        );
        toast.error("Failed to fetch addresses. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
      if (
        error.message.includes("No refresh token available") ||
        error.message.includes("Failed to refresh token")
      ) {
        // This is an auth issue - only show sign in message if user was actually signed out
        if (
          !localStorage.getItem("userData") &&
          !localStorage.getItem("userAccessToken")
        ) {
          toast.error("Please sign in to view your addresses");
          router.push("/login");
        }
      } else {
        toast.error("Failed to fetch addresses. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
      isDefault: false,
    });
    setShowAddForm(false);
    setEditingAddressId(null);
  };

  const handleEditAddress = (address) => {
    setFormData({
      name: address.name || "",
      line1: address.line1 || "",
      line2: address.line2 || "",
      city: address.city || "",
      state: address.state || "",
      pincode: address.pincode || "",
      phone: address.phone || "",
      isDefault: address.isDefault || false,
    });
    setEditingAddressId(address.id);
    setShowAddForm(true);
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm("Are you sure you want to delete this address?")) {
      return;
    }

    try {
      const response = await userAuthFetch(
        `${USER_ENDPOINTS.ADDRESS_DETAIL(addressId)}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete address");
      }

      toast.success("Address deleted successfully");
      setAddresses(addresses.filter((address) => address.id !== addressId));
    } catch (error) {
      console.error("Error deleting address:", error);
      toast.error("Failed to delete address. Please try again.");
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      const response = await userAuthFetch(
        `${USER_ENDPOINTS.ADDRESS_DETAIL(addressId)}/default`,
        {
          method: "PATCH",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to set default address");
      }

      toast.success("Default address updated");
      // Update addresses with new default
      setAddresses(
        addresses.map((address) => ({
          ...address,
          isDefault: address.id === addressId,
        }))
      );
    } catch (error) {
      console.error("Error setting default address:", error);
      toast.error("Failed to update default address. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (
      !formData.name ||
      !formData.line1 ||
      !formData.city ||
      !formData.state ||
      !formData.pincode ||
      !formData.phone
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.phone.length !== 10 || !/^\d+$/.test(formData.phone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    try {
      const method = editingAddressId ? "PUT" : "POST";
      const url = editingAddressId
        ? USER_ENDPOINTS.ADDRESS_DETAIL(editingAddressId)
        : USER_ENDPOINTS.ADDRESSES;

      const response = await userAuthFetch(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to ${editingAddressId ? "update" : "add"} address`
        );
      }

      const data = await response.json();

      toast.success(
        `Address ${editingAddressId ? "updated" : "added"} successfully`
      );

      if (editingAddressId) {
        setAddresses(
          addresses.map((address) =>
            address.id === editingAddressId ? data.address : address
          )
        );
      } else {
        setAddresses([...addresses, data.address]);
      }

      resetForm();
    } catch (error) {
      console.error(
        `Error ${editingAddressId ? "updating" : "adding"} address:`,
        error
      );
      toast.error(
        `Failed to ${
          editingAddressId ? "update" : "add"
        } address. Please try again.`
      );
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Your Addresses
          </h1>
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(!showAddForm);
            }}
            className="flex items-center px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors"
          >
            {showAddForm ? (
              "Cancel"
            ) : (
              <>
                <FiPlus className="mr-2" />
                Add New Address
              </>
            )}
          </button>
        </div>

        {/* Add/Edit Address Form */}
        {showAddForm && (
          <div className="mb-8 p-4 border border-gray-200 rounded-lg">
            <h2 className="text-xl font-medium mb-4">
              {editingAddressId ? "Edit Address" : "Add New Address"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Name*
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Home, Office, etc."
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number*
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="10-digit phone number"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 1*
                </label>
                <input
                  type="text"
                  name="line1"
                  value={formData.line1}
                  onChange={handleInputChange}
                  placeholder="Street address, House number"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  name="line2"
                  value={formData.line2}
                  onChange={handleInputChange}
                  placeholder="Apartment, floor, landmark (optional)"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City*
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State*
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pincode*
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    maxLength={6}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isDefault"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-secondary focus:ring-secondary border-gray-300 rounded"
                />
                <label
                  htmlFor="isDefault"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Set as default address
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-secondary text-white px-6 py-2 rounded-md hover:bg-secondary-dark transition-colors"
                >
                  {editingAddressId ? "Update Address" : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-8">
            <FiHome className="text-4xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">
              You don't have any saved addresses yet.
            </p>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors"
              >
                Add Your First Address
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`relative p-4 border rounded-lg ${
                  address.isDefault
                    ? "border-secondary bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                {address.isDefault && (
                  <div className="absolute top-2 right-2 bg-secondary text-white text-xs px-2 py-1 rounded-full">
                    Default
                  </div>
                )}
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">{address.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditAddress(address)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(address.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FiTrash2 />
                    </button>
                    {!address.isDefault && (
                      <button
                        onClick={() => handleSetDefaultAddress(address.id)}
                        className="text-green-600 hover:text-green-800"
                        title="Set as default"
                      >
                        <FiCheck />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm">{address.line1}</p>
                {address.line2 && <p className="text-sm">{address.line2}</p>}
                <p className="text-sm">
                  {address.city}, {address.state} - {address.pincode}
                </p>
                <p className="text-sm mt-2">Phone: {address.phone}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
