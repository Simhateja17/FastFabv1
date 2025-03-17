"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Image from "next/image";
import { toast } from "react-hot-toast";
import LoadingButton from "@/app/components/LoadingButton";
import { FiUpload, FiX } from "react-icons/fi";

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

export default function AddProduct() {
  const router = useRouter();
  const { seller, authFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
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
  const [selectedCategory, setSelectedCategory] = useState("");
  const [availableSubcategories, setAvailableSubcategories] = useState([]);

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

    // Validate file size and type
    const validFiles = files.filter((file) => {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max 10MB)`);
        return false;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        toast.error(`File ${file.name} is not an image`);
        return false;
      }

      return true;
    });

    setSelectedFiles(validFiles);

    // Clean up previous preview URLs to avoid memory leaks
    previewImages.forEach((url) => URL.revokeObjectURL(url));

    // Create preview URLs for valid files
    const previews = validFiles.map((file) => URL.createObjectURL(file));
    setPreviewImages(previews);
  };

  const uploadImages = async () => {
    if (selectedFiles.length === 0) return [];

    setUploading(true);
    try {
      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products/upload-images`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to upload images");
      }

      setUploadedImages(data.imageUrls);
      return data.imageUrls;
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Failed to upload images: " + error.message);
      setError("Failed to upload images: " + error.message);
      return [];
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // First upload images
      const imageUrls = await uploadImages();

      if (imageUrls.length === 0) {
        throw new Error("Failed to upload images");
      }

      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products`,
        {
          method: "POST",
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add product");
      }

      toast.success("Product added successfully!");
      router.push("/seller/dashboard");
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const removePreviewImage = (index) => {
    // Remove the preview image
    const newPreviews = [...previewImages];
    URL.revokeObjectURL(newPreviews[index]); // Clean up
    newPreviews.splice(index, 1);
    setPreviewImages(newPreviews);

    // Remove the file from selectedFiles
    const newSelectedFiles = [...selectedFiles];
    newSelectedFiles.splice(index, 1);
    setSelectedFiles(newSelectedFiles);
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setSelectedCategory(category);
    setFormData((prev) => ({ ...prev, category }));

    // Update subcategories based on selected category
    const categoryData = CATEGORIES.find((c) => c.name === category);
    setAvailableSubcategories(categoryData ? categoryData.subcategories : []);
    setFormData((prev) => ({ ...prev, subcategory: "" })); // Reset subcategory
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-background-card rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-semibold mb-6 text-primary">
          Add New Product
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Product Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-3 border border-ui-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-input"
              required
            />
          </div>

          {/* Category and Subcategory Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleCategoryChange}
                className="w-full p-3 border border-ui-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-input"
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
              <label className="block text-sm font-medium text-text mb-2">
                Subcategory
              </label>
              <select
                name="subcategory"
                value={formData.subcategory}
                onChange={handleInputChange}
                className="w-full p-3 border border-ui-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-input"
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

          {/* Quantity by Size */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Quantity
            </label>
            <div className="grid grid-cols-5 gap-4">
              {SIZES.map((size) => (
                <div key={size} className="text-center">
                  <div className="mb-2 inline-block p-2 border border-ui-border rounded-lg bg-background-alt">
                    {size}
                  </div>
                  <input
                    type="text"
                    value={formData.sizeQuantities[size]}
                    onChange={(e) =>
                      handleSizeQuantityChange(size, e.target.value)
                    }
                    className="w-full p-2 border border-ui-border rounded-md text-center focus:outline-none focus:ring-1 focus:ring-primary bg-input"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                MRP Price
              </label>
              <input
                type="text"
                name="mrpPrice"
                value={formData.mrpPrice}
                onChange={handleInputChange}
                className="w-full p-3 border border-ui-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-input"
                required
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Selling Price
              </label>
              <input
                type="text"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleInputChange}
                className="w-full p-3 border border-ui-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-input"
                required
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Add Photos
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-ui-border border-dashed rounded-md bg-background-alt">
              <div className="space-y-1 text-center">
                <FiUpload className="mx-auto h-12 w-12 text-text-muted" />
                <div className="flex text-sm text-text-muted">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-background-alt rounded-md font-medium text-secondary hover:text-secondary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-secondary"
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
                <p className="text-xs text-text-muted">
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>
            </div>

            {/* Image Previews */}
            {previewImages.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-4">
                {previewImages.map((preview, index) => (
                  <div key={index} className="relative">
                    <div className="relative h-24 w-full overflow-hidden rounded-md">
                      <Image
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        fill
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removePreviewImage(index)}
                      className="absolute -top-2 -right-2 bg-error text-white rounded-full p-1"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-text border border-ui-border rounded-md hover:bg-background-alt transition-colors"
            >
              Cancel
            </button>
            <LoadingButton
              type="submit"
              variant="primary"
              isLoading={loading || uploading}
              loadingText={uploading ? "Uploading..." : "Adding..."}
              disabled={loading || uploading}
            >
              Add Product
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}
