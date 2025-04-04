"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-hot-toast";
import {
  FiUpload,
  FiX,
  FiChevronRight,
  FiArrowLeft,
  FiPlus,
  FiPackage,
  FiCheck,
} from "react-icons/fi";
import { PRODUCT_ENDPOINTS } from "@/app/config";

const SIZES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "3XL",
  "4XL",
  "5XL",
  "6XL",
  "7XL",
  "8XL",
  "9XL",
  "10XL",
];

// Define color palette
const COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Red", hex: "#FF0000" },
  { name: "Green", hex: "#008000" },
  { name: "Blue", hex: "#0000FF" },
  { name: "Yellow", hex: "#FFFF00" },
  { name: "Purple", hex: "#800080" },
  { name: "Orange", hex: "#FFA500" },
  { name: "Pink", hex: "#FFC0CB" },
  { name: "Brown", hex: "#A52A2A" },
  { name: "Gray", hex: "#808080" },
  { name: "Navy", hex: "#000080" },
  { name: "Teal", hex: "#008080" },
  { name: "Olive", hex: "#808000" },
  { name: "Maroon", hex: "#800000" },
  { name: "Lime", hex: "#00FF00" },
  { name: "Cyan", hex: "#00FFFF" },
  { name: "Magenta", hex: "#FF00FF" },
  { name: "Silver", hex: "#C0C0C0" },
  { name: "Gold", hex: "#FFD700" },
  { name: "Indigo", hex: "#4B0082" },
  { name: "Violet", hex: "#EE82EE" },
  { name: "Beige", hex: "#F5F5DC" },
  { name: "Coral", hex: "#FF7F50" },
];

export default function AddVariant({ params }) {
  const { id: groupId } = params;
  const router = useRouter();
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [variantGroup, setVariantGroup] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  
  // Size management state
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState("");
  const [selectedSizes, setSelectedSizes] = useState([]);
  
  // Color inventory state
  const [selectedColor, setSelectedColor] = useState(null);
  const [stockNumber, setStockNumber] = useState("");
  
  const fetchVariantGroup = useCallback(async () => {
    setFetching(true);
    try {
      const response = await authFetch(`/api/products/variant-group/${groupId}`, {
        method: "GET",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch variant group");
      }
      
      const data = await response.json();
      setVariantGroup(data);
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setFetching(false);
    }
  }, [groupId, authFetch]);
  
  useEffect(() => {
    fetchVariantGroup();
  }, [groupId, fetchVariantGroup]);
  
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Filter out any non-image files
    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    
    if (imageFiles.length === 0) {
      toast.error("Please select valid image files");
      return;
    }
    
    // Limit to 5 images
    const newFiles = [...selectedFiles, ...imageFiles].slice(0, 5);
    setSelectedFiles(newFiles);
    
    // Create preview URLs for the new files
    const newPreviewURLs = newFiles.map(file => URL.createObjectURL(file));
    
    // Clean up old preview URLs to avoid memory leaks
    previewImages.forEach(url => URL.revokeObjectURL(url));
    
    setPreviewImages(newPreviewURLs);
  };
  
  const handleSizeQuantityChange = (e) => {
    setSelectedQuantity(e.target.value);
  };
  
  const handleSizeChange = (e) => {
    setSelectedSize(e.target.value);
  };
  
  const addSizeQuantity = () => {
    if (!selectedSize || !selectedQuantity || parseInt(selectedQuantity) <= 0) {
      toast.error("Please select a size and enter a valid quantity");
      return;
    }
    
    // Check if size already exists
    const existingIndex = selectedSizes.findIndex(item => item.size === selectedSize);
    
    if (existingIndex >= 0) {
      // Update existing size
      const updatedSizes = [...selectedSizes];
      updatedSizes[existingIndex].quantity = parseInt(selectedQuantity);
      setSelectedSizes(updatedSizes);
    } else {
      // Add new size
      setSelectedSizes([
        ...selectedSizes,
        {
          size: selectedSize,
          quantity: parseInt(selectedQuantity),
        },
      ]);
    }
    
    // Reset size and quantity inputs
    setSelectedSize("");
    setSelectedQuantity("");
  };
  
  const removeSizeQuantity = (sizeToRemove) => {
    setSelectedSizes(selectedSizes.filter(item => item.size !== sizeToRemove));
  };
  
  const uploadImages = async () => {
    if (selectedFiles.length === 0) return [];
    
    setUploading(true);
    try {
      // Create FormData
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append("images", file);
      });
      
      // Upload images
      const response = await authFetch(PRODUCT_ENDPOINTS.UPLOAD_IMAGES, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload images");
      }
      
      const data = await response.json();
      return data.imageUrls;
    } catch (error) {
      console.error("Error uploading images:", error);
      setError("Failed to upload images: " + error.message);
      return [];
    } finally {
      setUploading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedColor) {
      toast.error("Please select a color for this variant");
      return;
    }
    
    if (selectedFiles.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }
    
    if (selectedSizes.length === 0) {
      toast.error("Please add at least one size with quantity");
      return;
    }
    
    if (!stockNumber) {
      toast.error("Please enter a stock number");
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
      
      // Convert size quantities array to object format expected by API
      const sizeQuantitiesObj = {};
      SIZES.forEach(size => {
        const sizeItem = selectedSizes.find(item => item.size === size);
        sizeQuantitiesObj[size] = sizeItem ? sizeItem.quantity : 0;
      });
      
      // Prepare inventory data for the selected color
      const inventoryData = {};
      selectedSizes.forEach(item => {
        inventoryData[item.size] = item.quantity;
      });
      
      // Prepare the form data for submission
      const productData = JSON.stringify({
        name: variantGroup.name, // Use group name by default
        description: variantGroup.description,
        category: variantGroup.category,
        subcategory: variantGroup.subcategory,
        mrpPrice: variantGroup.basePrice,
        sellingPrice: variantGroup.sellingPrice,
        sizeQuantities: JSON.stringify(sizeQuantitiesObj),
        color: selectedColor.name,
        colorCode: selectedColor.hex,
        stockNumber: stockNumber,
        inventory: JSON.stringify(inventoryData),
      });
      
      // Prepare FormData for the multipart request
      const formData = new FormData();
      formData.append("productData", productData);
      
      // Append all image files
      selectedFiles.forEach(file => {
        formData.append("images", file);
      });
      
      // Send request to create the variant
      const response = await authFetch(`/api/products/variant/${groupId}`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create product variant");
      }
      
      toast.success("Product variant added successfully!");
      router.push(`/seller/products/variant-groups/${groupId}`);
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
  
  if (fetching) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 bg-background min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!variantGroup) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 bg-background min-h-screen">
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
          Variant group not found
        </div>
        <Link
          href="/seller/products/variant-groups"
          className="inline-flex items-center text-secondary hover:text-secondary-dark transition-colors"
        >
          <FiArrowLeft className="w-5 h-5 mr-2 stroke-2" />
          Back to Variant Groups
        </Link>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 bg-background min-h-screen">
      {/* Breadcrumb Nav */}
      <nav className="flex mb-8 text-sm">
        <Link
          href="/seller/dashboard"
          className="text-text-muted hover:text-text"
        >
          Dashboard
        </Link>
        <FiChevronRight className="mx-2 text-text-muted mt-1" />
        <Link
          href="/seller/products"
          className="text-text-muted hover:text-text"
        >
          Products
        </Link>
        <FiChevronRight className="mx-2 text-text-muted mt-1" />
        <Link
          href="/seller/products/variant-groups"
          className="text-text-muted hover:text-text"
        >
          Variant Groups
        </Link>
        <FiChevronRight className="mx-2 text-text-muted mt-1" />
        <Link
          href={`/seller/products/variant-groups/${groupId}`}
          className="text-text-muted hover:text-text"
        >
          {variantGroup.name}
        </Link>
        <FiChevronRight className="mx-2 text-text-muted mt-1" />
        <span className="text-text-dark font-medium">Add Variant</span>
      </nav>
      
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`/seller/products/variant-groups/${groupId}`)}
          className="inline-flex items-center text-secondary hover:text-secondary-dark transition-colors"
        >
          <FiArrowLeft className="w-5 h-5 mr-2 stroke-2" />
          Back to {variantGroup.name}
        </button>
      </div>
      
      <div className="bg-background-card rounded-lg shadow-md p-6 border border-ui-border">
        <h1 className="text-2xl font-bold text-text-dark mb-6 flex items-center">
          <span className="bg-secondary bg-opacity-20 text-secondary p-2 rounded-full mr-3">
            <FiPlus className="w-6 h-6 stroke-2 text-white" />
          </span>
          Add Variant to {variantGroup.name}
        </h1>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
            {error}
          </div>
        )}
        
        {/* Group Info */}
        <div className="bg-background-alt p-4 rounded-md mb-6">
          <div className="flex flex-wrap gap-2 text-sm">
            {variantGroup.category && (
              <span className="bg-background-card px-2 py-1 rounded">
                {variantGroup.category} {variantGroup.subcategory && `/ ${variantGroup.subcategory}`}
              </span>
            )}
            <span className="bg-background-card px-2 py-1 rounded">
              Base: ₹{variantGroup.basePrice.toFixed(2)}
            </span>
            <span className="bg-background-card px-2 py-1 rounded">
              Selling: ₹{variantGroup.sellingPrice.toFixed(2)}
            </span>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Color <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  className={`relative w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                    selectedColor?.name === color.name
                      ? "border-primary shadow-md"
                      : "border-ui-border hover:border-ui-border-hover"
                  }`}
                  style={{ backgroundColor: color.hex }}
                  onClick={() => setSelectedColor(color)}
                  title={color.name}
                >
                  {selectedColor?.name === color.name && (
                    <FiCheck
                      className={`w-6 h-6 ${
                        color.name === "White" || color.name === "Yellow" || color.name === "Lime"
                          ? "text-black"
                          : "text-white"
                      }`}
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="mt-2 text-sm">
              {selectedColor && (
                <span className="inline-block px-3 py-1 bg-background-alt rounded-full">
                  Selected: {selectedColor.name}
                </span>
              )}
            </div>
          </div>
          
          {/* Stock Number */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Stock/SKU Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={stockNumber}
              onChange={(e) => setStockNumber(e.target.value)}
              placeholder="Enter stock number"
              className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
              required
            />
            <p className="text-xs text-text-muted mt-1">
              Unique identifier for this color variant
            </p>
          </div>
          
          {/* Size Quantities */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Size Quantities <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
              <div>
                <select
                  value={selectedSize}
                  onChange={handleSizeChange}
                  className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
                >
                  <option value="">Select Size</option>
                  {SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <input
                  type="number"
                  value={selectedQuantity}
                  onChange={handleSizeQuantityChange}
                  placeholder="Quantity"
                  min="1"
                  className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={addSizeQuantity}
                  className="w-full bg-secondary hover:bg-secondary-dark text-white p-3 rounded-md transition-colors flex items-center justify-center"
                >
                  <FiPlus className="w-5 h-5 mr-2" />
                  Add Size
                </button>
              </div>
            </div>
            
            {/* Display selected sizes */}
            <div className="mt-3">
              {selectedSizes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedSizes.map((sizeItem) => (
                    <div
                      key={sizeItem.size}
                      className="bg-background-alt px-3 py-2 rounded-md flex items-center border border-ui-border"
                    >
                      <span className="mr-2 font-medium">{sizeItem.size}</span>
                      <span className="mr-2">
                        {sizeItem.quantity} {sizeItem.quantity === 1 ? "unit" : "units"}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSizeQuantity(sizeItem.size)}
                        className="text-text-muted hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-text-muted italic text-sm">
                  No sizes added yet
                </div>
              )}
            </div>
          </div>
          
          {/* Product Images */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Product Images <span className="text-red-500">*</span>
            </label>
            
            <div className="border-2 border-dashed border-ui-border rounded-lg p-8 text-center">
              <input
                type="file"
                id="imageUpload"
                multiple
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                disabled={selectedFiles.length >= 5}
              />
              
              {previewImages.length > 0 ? (
                <div className="mb-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {previewImages.map((url, index) => (
                      <div key={index} className="relative group">
                        <div className="relative h-32 w-full overflow-hidden rounded-md border border-ui-border">
                          <Image
                            src={url}
                            alt={`Preview ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removePreviewImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-80 hover:opacity-100 transition-opacity"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    
                    {selectedFiles.length < 5 && (
                      <label
                        htmlFor="imageUpload"
                        className="relative h-32 w-full flex flex-col items-center justify-center rounded-md border-2 border-dashed border-ui-border hover:border-secondary cursor-pointer transition-colors"
                      >
                        <FiPlus className="w-8 h-8 text-text-muted mb-2" />
                        <span className="text-sm text-text-muted">Add More</span>
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="imageUpload"
                  className="flex flex-col items-center justify-center h-32 cursor-pointer"
                >
                  <FiUpload className="w-12 h-12 text-text-muted mb-2" />
                  <span className="text-text-dark font-medium">
                    Upload files
                  </span>
                  <span className="text-text-muted text-sm mt-1">
                    PNG, JPG, GIF up to 10MB
                  </span>
                  <span className="mt-2 text-xs text-text-muted">
                    (Click or drag and drop)
                  </span>
                </label>
              )}
            </div>
          </div>
          
          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || uploading}
              className="w-full md:w-auto bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading || uploading ? (
                <>
                  <span className="mr-2">
                    {uploading ? "Uploading Images..." : "Creating Variant..."}
                  </span>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                </>
              ) : (
                <>
                  <FiPlus className="w-5 h-5 mr-2" />
                  Add Variant
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 