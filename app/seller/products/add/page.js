"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

const SIZES = ["XS", "S", "M", "L", "XL"];

export default function AddProduct() {
  const router = useRouter();
  const { seller } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    mrpPrice: "",
    sellingPrice: "",
    category: "",
    subcategory: "",
    sizeQuantities: {
      XS: 0,
      S: 0,
      M: 0,
      L: 0,
      XL: 0,
    },
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "mrpPrice" || name === "sellingPrice") {
      // Allow only numbers and one decimal point
      const regex = /^\d*\.?\d{0,2}$/;
      if (regex.test(value) || value === "") {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSizeQuantityChange = (size, value) => {
    // Allow only positive integers
    const regex = /^\d*$/;
    if (regex.test(value)) {
      setFormData((prev) => ({
        ...prev,
        sizeQuantities: {
          ...prev.sizeQuantities,
          [size]: parseInt(value) || 0,
        },
      }));
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const uploadImages = async (files) => {
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      return data.url;
    });

    return Promise.all(uploadPromises);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const sellerId = localStorage.getItem("sellerId");

      // First upload all images
      const imageUrls = await uploadImages(selectedFiles);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...formData,
            sellerId,
            mrpPrice: parseFloat(formData.mrpPrice),
            sellingPrice: parseFloat(formData.sellingPrice),
            images: imageUrls,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add product");
      }

      router.push("/seller/dashboard");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-semibold mb-6">Add New Product</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-md"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-md"
              required
            />
          </div>

          {/* Quantity by Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <div className="grid grid-cols-5 gap-4">
              {SIZES.map((size) => (
                <div key={size} className="text-center">
                  <div className="mb-2 inline-block p-2 border border-gray-300 rounded-lg">
                    {size}
                  </div>
                  <input
                    type="text"
                    value={formData.sizeQuantities[size]}
                    onChange={(e) =>
                      handleSizeQuantityChange(size, e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded-md text-center"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MRP Price
              </label>
              <input
                type="text"
                name="mrpPrice"
                value={formData.mrpPrice}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md"
                required
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selling Price
              </label>
              <input
                type="text"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md"
                required
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Photos
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                  >
                    <span>Upload files</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={handleFileChange}
                      accept="image/*"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>
            </div>
            {selectedFiles.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {selectedFiles.length} files selected
                </p>
              </div>
            )}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
