"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { useAuth } from "@/app/context/AuthContext";

const SIZES = ["XS", "S", "M", "L", "XL"];
const CATEGORIES = [
  {
    name: "Men",
    subcategories: ["Shirts", "T-Shirts", "Jeans", "Trousers", "Jackets"],
  },
  {
    name: "Women",
    subcategories: ["Dresses", "Tops", "Jeans", "Skirts", "Jackets"],
  },
  {
    name: "Kids",
    subcategories: ["T-Shirts", "Jeans", "Dresses", "Tops", "Sets"],
  },
];

export default function EditProductClient({ productId }) {
  const router = useRouter();
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [availableSubcategories, setAvailableSubcategories] = useState([]);
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
    images: [],
  });

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      console.log("Fetching product with ID:", productId);

      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}`
      );

      console.log("Fetch response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(
          `Failed to fetch product: ${response.status} ${errorText}`
        );
      }

      const product = await response.json();
      console.log("Fetched product data:", product);

      // Update subcategories based on category
      const categoryData = CATEGORIES.find((c) => c.name === product.category);
      setAvailableSubcategories(categoryData ? categoryData.subcategories : []);

      setFormData({
        name: product.name || "",
        description: product.description || "",
        mrpPrice: product.mrpPrice ? product.mrpPrice.toString() : "",
        sellingPrice: product.sellingPrice
          ? product.sellingPrice.toString()
          : "",
        category: product.category || "",
        subcategory: product.subcategory || "",
        sizeQuantities: product.sizeQuantities || {
          XS: 0,
          S: 0,
          M: 0,
          L: 0,
          XL: 0,
        },
        images: product.images || [],
      });
      setPreviewImages(product.images || []);
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Error fetching product: " + error.message);
      router.push("/seller/products");
    } finally {
      setLoading(false);
    }
  };

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

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setFormData((prev) => ({ ...prev, category }));

    // Update subcategories based on selected category
    const categoryData = CATEGORIES.find((c) => c.name === category);
    setAvailableSubcategories(categoryData ? categoryData.subcategories : []);
    setFormData((prev) => ({ ...prev, subcategory: "" })); // Reset subcategory
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

    // Validate file size and type
    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max 10MB)`);
        return false;
      }

      if (!file.type.startsWith("image/")) {
        toast.error(`File ${file.name} is not an image`);
        return false;
      }

      return true;
    });

    setSelectedFiles(validFiles);

    // Create preview URLs for valid files
    const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
    setPreviewImages((prev) => [...prev, ...newPreviews]);
  };

  const uploadImages = async () => {
    if (selectedFiles.length === 0) return formData.images;

    setUploading(true);
    try {
      const formDataObj = new FormData();
      selectedFiles.forEach((file) => {
        formDataObj.append("images", file);
      });

      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products/upload-images`,
        {
          method: "POST",
          body: formDataObj,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to upload images");
      }

      return [...formData.images, ...data.imageUrls];
    } catch (error) {
      console.error("Image upload error:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate token
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required. Please login again.");
      }

      // Upload new images if any
      let imageUrls = formData.images;
      if (selectedFiles.length > 0) {
        try {
          imageUrls = await uploadImages();
        } catch (uploadError) {
          throw new Error(`Failed to upload images: ${uploadError.message}`);
        }
      }

      // Update product
      console.log("Updating product:", productId);
      console.log(
        "API URL:",
        `${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}`
      );
      console.log("With data:", {
        ...formData,
        mrpPrice: parseFloat(formData.mrpPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        images: imageUrls,
      });

      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            mrpPrice: parseFloat(formData.mrpPrice),
            sellingPrice: parseFloat(formData.sellingPrice),
            images: imageUrls,
          }),
        }
      );

      console.log("Update response status:", response.status);

      // Try to get response body regardless of status
      let responseBody;
      try {
        responseBody = await response.json();
        console.log("Response body:", responseBody);
      } catch (e) {
        console.log("Could not parse response as JSON:", e);
        const text = await response.text();
        console.log("Response text:", text);
      }

      if (!response.ok) {
        throw new Error(
          responseBody?.message ||
            `Failed to update product: ${response.status}`
        );
      }

      toast.success("Product updated successfully!");
      router.push("/seller/products");
    } catch (error) {
      console.error("Update error:", error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (index) => {
    const newImages = [...formData.images];
    newImages.splice(index, 1);
    setFormData((prev) => ({ ...prev, images: newImages }));
    setPreviewImages((prev) => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-semibold mb-6">Edit Product</h1>

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

          {/* Category and Subcategory Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleCategoryChange}
                className="w-full p-3 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select Category</option>
                {CATEGORIES.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subcategory
              </label>
              <select
                name="subcategory"
                value={formData.subcategory}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md"
                required
                disabled={!formData.category}
              >
                <option value="">Select Subcategory</option>
                {availableSubcategories.map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory}
                  </option>
                ))}
              </select>
            </div>
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

          {/* Current Images */}
          {previewImages.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Images
              </label>
              <div className="grid grid-cols-3 gap-4">
                {previewImages.map((image, index) => (
                  <div key={index} className="relative">
                    <div className="relative h-24 w-full overflow-hidden rounded-md">
                      <Image
                        src={image}
                        alt={`Product ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add More Photos
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
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push("/seller/products")}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading || uploading
                ? uploading
                  ? "Uploading..."
                  : "Updating..."
                : "Update Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
