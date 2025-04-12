"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from 'next/image';
import getAdminApiClient from "@/app/utils/apiClient";
import { toast } from "react-hot-toast";

// Define color options
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

// Define categories
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
  {
    name: "Accessories",
    subcategories: ["Belts", "Hats", "Scarf", "Gloves", "Socks"],
  },
  {
    name: "Footwear",
    subcategories: ["Shoes", "Boots", "Sandals", "Slippers", "Sneakers"],
  },
];

// Define sizes
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

// Define returnable options
const RETURNABLE_OPTIONS = [
  { value: true, label: "Returnable :- 8% Commission" },
  { value: false, label: "Non-Returnable :- 12% Commission" }
];

export default function ProductDetailPage({ params }) {
  const productId = params.id;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [availableSubcategories, setAvailableSubcategories] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [colorInventory, setColorInventory] = useState({});
  const router = useRouter();

  // Fetch product data
  useEffect(() => {
    const fetchProductData = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiClient = getAdminApiClient();
        const response = await apiClient.get(
          `/api/admin/products/${productId}`
        );
        
        const productData = response.data;
        setProduct(productData);
        
        // Set subcategories based on category
        updateSubcategories(productData.category);
        
        // --- Correctly Initialize color inventory state --- 
        let initialColorInventoryState = {};
        let initialSelectedColors = [];
        
        if (productData.colorInventory && Array.isArray(productData.colorInventory)) {
          productData.colorInventory.forEach(item => {
            // Ensure item.inventory is treated as an object (it's JSON from DB)
            const sizesData = typeof item.inventory === 'string' 
                              ? JSON.parse(item.inventory) 
                              : item.inventory || {}; 
            
            initialColorInventoryState[item.color] = {
              // Store original db id if needed later for updates (optional)
              // dbId: item.id, 
              colorCode: item.colorCode || "",
              stockNumber: item.stockNumber || null,
              sizes: SIZES.reduce((acc, size) => {
                // Populate sizes from the inventory JSON field
                acc[size] = sizesData[size] !== undefined ? Number(sizesData[size]) : 0;
                return acc;
              }, {})
            };
            initialSelectedColors.push(item.color);
          });
        }
        setColorInventory(initialColorInventoryState); // Set the processed state
        setSelectedColors(initialSelectedColors);   // Set the selected colors
        // --- End Color Inventory Initialization ---
        
        setFormData({
          name: productData.name || "",
          description: productData.description || "",
          sellingPrice: productData.sellingPrice || 0,
          mrpPrice: productData.mrpPrice || 0,
          isActive: productData.isActive || false,
          category: productData.category || "",
          subcategory: productData.subcategory || "",
          isReturnable: productData.isReturnable !== undefined ? productData.isReturnable : true,
          images: productData.images || [],
          // Note: sizeQuantities might be redundant if using colorInventory comprehensively
          // Keeping it for now based on existing code, but might need review
          sizeQuantities: productData.sizeQuantities || 
            SIZES.reduce((acc, size) => {
              acc[size] = 0;
              return acc;
            }, {}),
          // Pass the correctly structured state to formData
          colorInventory: initialColorInventoryState, 
        });
      } catch (error) {
        console.error("Error fetching product data:", error);
        setError(
          error.response?.data?.message || "Failed to load product details"
        );
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProductData();
    }
  }, [productId]);

  // Update subcategories when category changes
  const updateSubcategories = (categoryName) => {
    const category = CATEGORIES.find(cat => cat.name === categoryName);
    setAvailableSubcategories(category ? category.subcategories : []);
  };

  // Handle form data change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === "category") {
      updateSubcategories(value);
      setFormData({
        ...formData,
        category: value,
        subcategory: "", // Reset subcategory when category changes
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === "checkbox" ? checked : value,
      });
    }
  };

  // Handle number input change
  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: parseFloat(value) || 0,
    });
  };

  // Handle size quantity change
  const handleSizeQuantityChange = (size, value) => {
    const newSizeQuantities = {
      ...formData.sizeQuantities,
      [size]: parseInt(value) || 0
    };
    
    setFormData({
      ...formData,
      sizeQuantities: newSizeQuantities
    });
  };

  // Handle color selection
  const toggleColorSelection = (colorName) => {
    if (selectedColors.includes(colorName)) {
      setSelectedColors(selectedColors.filter(c => c !== colorName));
      
      // Remove from color inventory
      const newColorInventory = { ...colorInventory };
      delete newColorInventory[colorName];
      setColorInventory(newColorInventory);
      
      setFormData({
        ...formData,
        colorInventory: newColorInventory
      });
    } else {
      setSelectedColors([...selectedColors, colorName]);
      
      // Initialize in color inventory
      const newColorInventory = { 
        ...colorInventory, 
        [colorName]: {
          sizes: SIZES.reduce((acc, size) => {
            acc[size] = 0;
            return acc;
          }, {})
        }
      };
      
      setColorInventory(newColorInventory);
      
      setFormData({
        ...formData,
        colorInventory: newColorInventory
      });
    }
  };

  // Handle color inventory quantity change
  const handleColorSizeChange = (color, size, value) => {
    const newColorInventory = { 
      ...formData.colorInventory, // Use formData.colorInventory for consistency
      [color]: {
        ...formData.colorInventory[color],
        sizes: {
          ...formData.colorInventory[color]?.sizes,
          [size]: parseInt(value) || 0 // Ensure value is parsed as int
        }
      }
    };
    
    // Update both the dedicated state and the formData state
    setColorInventory(newColorInventory); 
    setFormData({
      ...formData,
      colorInventory: newColorInventory
    });
  };

  // Save product data
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    // Prepare payload, converting frontend state back to backend expected format
    const payload = { ...formData }; // Copy existing form data
    
    // Transform colorInventory state object back into an array for the backend
    payload.colorInventory = Object.entries(formData.colorInventory).map(([colorName, data]) => ({
      color: colorName,
      colorCode: data.colorCode || "", 
      stockNumber: data.stockNumber || null,
      inventory: data.sizes // The backend expects the sizes object directly in the 'inventory' field
    }));

    try {
      const apiClient = getAdminApiClient();
      // Send the transformed payload
      const response = await apiClient.put(
        `/api/admin/products/${productId}`,
        payload 
      );
      
      // IMPORTANT: Update local state from the *response* data which includes IDs etc.
      const updatedProductData = response.data.product; // Assuming response structure is { message, product }
      setProduct(updatedProductData); 
      setIsEditing(false);
      
      // Re-initialize state after save based on the definitive data from backend
      // (Similar logic as useEffect, but using updatedProductData)
      let postSaveColorInventoryState = {};
      let postSaveSelectedColors = [];
      if (updatedProductData.colorInventory && Array.isArray(updatedProductData.colorInventory)) {
        updatedProductData.colorInventory.forEach(item => {
          const sizesData = typeof item.inventory === 'string' 
                            ? JSON.parse(item.inventory) 
                            : item.inventory || {}; 
          postSaveColorInventoryState[item.color] = {
            colorCode: item.colorCode || "",
            stockNumber: item.stockNumber || null,
            sizes: SIZES.reduce((acc, size) => {
              acc[size] = sizesData[size] !== undefined ? Number(sizesData[size]) : 0;
              return acc;
            }, {})
          };
          postSaveSelectedColors.push(item.color);
        });
      }
      setColorInventory(postSaveColorInventoryState); 
      setSelectedColors(postSaveSelectedColors);   
      setFormData({ // Also reset formData based on backend response
          name: updatedProductData.name || "",
          description: updatedProductData.description || "",
          sellingPrice: updatedProductData.sellingPrice || 0,
          mrpPrice: updatedProductData.mrpPrice || 0,
          isActive: updatedProductData.isActive || false,
          category: updatedProductData.category || "",
          subcategory: updatedProductData.subcategory || "",
          isReturnable: updatedProductData.isReturnable !== undefined ? updatedProductData.isReturnable : true,
          images: updatedProductData.images || [],
          sizeQuantities: updatedProductData.sizeQuantities || {}, // Reset based on response
          colorInventory: postSaveColorInventoryState, 
      });

      toast.success("Product updated successfully!");
    } catch (error) {
      console.error("Error updating product:", error);
      setSaveError(
        error.response?.data?.message || "Failed to update product details"
      );
      toast.error("Failed to update product");
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setFormData({
      name: product.name || "",
      description: product.description || "",
      sellingPrice: product.sellingPrice || 0,
      mrpPrice: product.mrpPrice || 0,
      isActive: product.isActive || false,
      category: product.category || "",
      subcategory: product.subcategory || "",
      isReturnable: product.isReturnable !== undefined ? product.isReturnable : true,
      images: product.images || [],
      sizeQuantities: product.sizeQuantities || {},
      colorInventory: product.colorInventory || {},
    });
    
    // Reset selected colors
    if (product.colorInventory) {
      setSelectedColors(Object.keys(product.colorInventory));
      setColorInventory(product.colorInventory);
    } else {
      setSelectedColors([]);
      setColorInventory({});
    }
    
    // Reset subcategories
    updateSubcategories(product.category);
    
    setIsEditing(false);
    setSaveError(null);
  };

  // Handle image URL change
  const handleImageChange = (index, value) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData({
      ...formData,
      images: newImages,
    });
  };

  // Add new image URL
  const addImage = () => {
    setFormData({
      ...formData,
      images: [...formData.images, ""],
    });
  };

  // Remove image URL
  const removeImage = (index) => {
    const newImages = [...formData.images];
    newImages.splice(index, 1);
    setFormData({
      ...formData,
      images: newImages,
    });
  };

  // Toggle product status
  const toggleProductStatus = async () => {
    try {
      const apiClient = getAdminApiClient();
      const response = await apiClient.patch(
        `/api/admin/products/${productId}/toggle-status`,
        {
          isActive: !product.isActive,
        }
      );
      setProduct({ ...product, isActive: !product.isActive });
      toast.success(product.isActive ? "Product deactivated" : "Product activated");
    } catch (error) {
      console.error("Error toggling product status:", error);
      toast.error("Failed to update product status");
    }
  };

  // Discount calculation
  const calculateDiscount = () => {
    if (!product || !product.mrpPrice || !product.sellingPrice) return 0;
    if (product.mrpPrice <= product.sellingPrice) return 0;

    return Math.round(
      ((product.mrpPrice - product.sellingPrice) / product.mrpPrice) * 100
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">Error</p>
        <p>{error}</p>
        <Link
          href="/superadmin/products"
          className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
        >
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link
            href="/superadmin/products"
            className="inline-flex items-center text-primary hover:text-primary-dark mb-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Back to Products
          </Link>
          <h1 className="text-2xl font-bold text-text">
            {product.name || "Unnamed Product"}
          </h1>
          <p className="text-text-muted">ID: {product.id}</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={toggleProductStatus}
            className={`px-4 py-2 rounded ${
              product.isActive
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
          >
            {product.isActive ? "Deactivate" : "Activate"}
          </button>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Edit Product
            </button>
          ) : (
            <div className="space-x-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-ui-border text-text rounded hover:bg-background-alt"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-70"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>

      {saveError && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{saveError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main product information */}
        <div className="lg:col-span-2 space-y-6">
          {isEditing ? (
            /* Edit Form */
            <div className="bg-background-card rounded-lg shadow p-6 border-2 border-blue-600">
              <h2 className="text-xl font-medium text-text mb-6 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Edit Product Information
              </h2>

              <form className="space-y-6">
                {/* Basic Info Section */}
                <div className="border p-5 rounded-lg bg-background-alt">
                  <h3 className="text-lg font-medium text-text-dark mb-4">Basic Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-text-muted mb-1">
                        Product Name*
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-text-muted mb-1">
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={4}
                        className="w-full px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      ></textarea>
                    </div>
                  </div>
                </div>

                {/* Category Section */}
                <div className="border p-5 rounded-lg bg-background-alt">
                  <h3 className="text-lg font-medium text-text-dark mb-4">Category</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="category" className="block text-text-muted mb-1">
                        Main Category*
                      </label>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                        required
                      >
                        <option value="">Select a category</option>
                        {CATEGORIES.map((category) => (
                          <option key={category.name} value={category.name}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="subcategory" className="block text-text-muted mb-1">
                        Subcategory
                      </label>
                      <select
                        id="subcategory"
                        name="subcategory"
                        value={formData.subcategory}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                        disabled={!formData.category}
                      >
                        <option value="">Select a subcategory</option>
                        {availableSubcategories.map((subcategory) => (
                          <option key={subcategory} value={subcategory}>
                            {subcategory}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Price Section */}
                <div className="border p-5 rounded-lg bg-background-alt">
                  <h3 className="text-lg font-medium text-text-dark mb-4">Pricing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="mrpPrice" className="block text-text-muted mb-1">
                        MRP Price (₹)*
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">₹</span>
                        </div>
                        <input
                          type="number"
                          id="mrpPrice"
                          name="mrpPrice"
                          value={formData.mrpPrice}
                          onChange={handleNumberChange}
                          className="w-full pl-10 pr-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          min="0"
                          required
                        />
                      </div>
                      <p className="mt-1 text-sm text-text-muted">Original price before discount</p>
                    </div>

                    <div>
                      <label htmlFor="sellingPrice" className="block text-text-muted mb-1">
                        Selling Price (₹)*
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">₹</span>
                        </div>
                        <input
                          type="number"
                          id="sellingPrice"
                          name="sellingPrice"
                          value={formData.sellingPrice}
                          onChange={handleNumberChange}
                          className="w-full pl-10 pr-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          min="0"
                          required
                        />
                      </div>
                      <p className="mt-1 text-sm text-text-muted">Price shown to customers</p>
                    </div>
                    
                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div>
                          <span className="text-sm font-medium text-green-800">Discount:</span>
                          <span className="ml-2 text-2xl font-bold text-green-600">
                            {Math.max(0, Math.round((1 - formData.sellingPrice / (formData.mrpPrice || 1)) * 100))}%
                          </span>
                          <span className="ml-2 text-sm text-green-700">off</span>
                        </div>
                        <span className="text-sm text-green-700">Savings: ₹{Math.max(0, (formData.mrpPrice - formData.sellingPrice).toFixed(0))}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Return Policy */}
                <div className="border p-5 rounded-lg bg-background-alt">
                  <h3 className="text-lg font-medium text-text-dark mb-4">Return Policy</h3>
                  <select
                    name="isReturnable"
                    value={formData.isReturnable}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  >
                    {RETURNABLE_OPTIONS.map((option) => (
                      <option key={String(option.value)} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Colors Selection */}
                <div className="border-t border-ui-border pt-6">
                  <label className="block text-lg font-medium text-text-dark mb-4">
                    Color Options
                  </label>
                  <p className="text-sm text-text-muted mb-4">Select all colors available for this product:</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {COLORS.map((color) => (
                      <div
                        key={color.name}
                        onClick={() => toggleColorSelection(color.name)}
                        className={`rounded-lg p-3 border-2 cursor-pointer flex flex-col items-center justify-center transition-all ${
                          selectedColors.includes(color.name)
                            ? "border-primary ring-2 ring-primary bg-primary bg-opacity-5"
                            : "border-ui-border hover:border-primary hover:bg-background-alt"
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-full mb-2 border border-gray-200"
                          style={{ backgroundColor: color.hex }}
                        ></div>
                        <span className="text-sm font-medium">{color.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Color Inventory */}
                {selectedColors.length > 0 && (
                  <div className="border-t border-ui-border pt-6">
                    <h3 className="text-lg font-medium text-text-dark mb-4">
                      Color Inventory
                    </h3>
                    <p className="text-sm text-text-muted mb-4">Set available quantities for each color and size:</p>
                    <div className="space-y-6">
                      {selectedColors.map((colorName) => (
                        <div key={colorName} className="border border-ui-border rounded-lg p-5 bg-background-alt">
                          <div className="flex items-center mb-4">
                            <div
                              className="w-6 h-6 rounded-full mr-2 border border-gray-200"
                              style={{ backgroundColor: COLORS.find(c => c.name === colorName)?.hex }}
                            ></div>
                            <h4 className="font-medium text-lg">{colorName}</h4>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {SIZES.map((size) => (
                              <div key={`${colorName}-${size}`} className="bg-white rounded-md shadow-sm p-3 border border-ui-border">
                                <label className="flex justify-between items-center text-sm font-medium text-text-dark mb-2">
                                  {size}
                                  <span className="text-xs bg-background-alt px-2 py-1 rounded">Qty</span>
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={colorInventory[colorName]?.sizes?.[size] || 0}
                                  onChange={(e) => handleColorSizeChange(colorName, size, e.target.value)}
                                  className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-center"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Images Section */}
                <div className="border-t border-ui-border pt-6">
                  <label className="block text-lg font-medium text-text-dark mb-4">
                    Product Images
                  </label>
                  <p className="text-sm text-text-muted mb-4">Add image URLs for this product:</p>
                  <div className="space-y-3">
                    {formData.images.map((image, index) => (
                      <div key={index} className="flex items-center space-x-3 border border-ui-border rounded-md p-2">
                        {image && (
                          <div className="h-16 w-16 relative flex-shrink-0 bg-background-alt">
                            <img
                              src={image}
                              alt={`Preview ${index + 1}`}
                              className="h-full w-full object-cover rounded-md"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' viewBox='0 0 300 300' fill='%23f0f0f0'%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='18' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E";
                              }}
                            />
                          </div>
                        )}
                        <input
                          type="text"
                          value={image}
                          onChange={(e) =>
                            handleImageChange(index, e.target.value)
                          }
                          placeholder="Enter image URL"
                          className="flex-1 px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 flex-shrink-0"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addImage}
                      className="w-full px-4 py-3 border-2 border-dashed border-primary rounded-md text-primary hover:bg-primary-50 flex items-center justify-center font-medium"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Add New Image
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            /* View Mode */
            <div className="bg-background-card rounded-lg shadow p-6">
              <h2 className="text-xl font-medium text-text mb-6">
                Product Information
              </h2>

              <div className="space-y-6">
                {/* Product gallery */}
                <div className="space-y-2">
                  <h3 className="text-md font-medium text-text-muted">
                    Product Images
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {product.images && product.images.length > 0 ? (
                      product.images.map((image, idx) => (
                        <div
                          key={idx}
                          className="aspect-square relative border border-ui-border rounded-lg overflow-hidden"
                        >
                          <Image
                            src={image}
                            alt={`${product.name} image ${idx + 1}`}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src =
                                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' viewBox='0 0 300 300' fill='%23f0f0f0'%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='18' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E";
                            }}
                            sizes="(max-width: 768px) 100vw, 300px"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="aspect-square flex items-center justify-center bg-background-alt border border-ui-border rounded-lg col-span-2 md:col-span-3">
                        <p className="text-text-muted">No images available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Basic product info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4">
                  <div>
                    <p className="text-sm text-text-muted">Product Name</p>
                    <p className="text-text font-medium">
                      {product.name || "Unnamed Product"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Category</p>
                    <p className="text-text">
                      {product.category ? product.category : "Uncategorized"}
                      {product.subcategory ? ` / ${product.subcategory}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Status</p>
                    <p
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {product.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Return Policy</p>
                    <p className="text-text">
                      {product.isReturnable ? "Returnable" : "Non-Returnable"}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-text-muted">Description</p>
                    <p className="text-text whitespace-pre-line">
                      {product.description || "No description available"}
                    </p>
                  </div>
                </div>

                {/* Price information */}
                <div>
                  <h3 className="text-md font-medium text-text-muted mb-3">
                    Pricing
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-background-alt p-3 rounded-lg">
                      <p className="text-sm text-text-muted">MRP Price</p>
                      <p className="text-xl font-medium text-text">
                        ₹{product.mrpPrice || 0}
                      </p>
                    </div>
                    <div className="bg-background-alt p-3 rounded-lg">
                      <p className="text-sm text-text-muted">Selling Price</p>
                      <p className="text-xl font-medium text-primary">
                        ₹{product.sellingPrice || 0}
                      </p>
                    </div>
                    <div className="bg-background-alt p-3 rounded-lg">
                      <p className="text-sm text-text-muted">Discount</p>
                      <p className="text-xl font-medium text-green-600">
                        {calculateDiscount()}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Color inventory */}
                {product.colorInventory && Object.keys(product.colorInventory).length > 0 && (
                  <div>
                    <h3 className="text-md font-medium text-text-muted mb-3">
                      Color Inventory
                    </h3>
                    <div className="space-y-4">
                      {Object.entries(product.colorInventory).map(([colorName, data]) => (
                        <div key={colorName} className="border border-ui-border rounded-md p-4">
                          <div className="flex items-center mb-2">
                            <div
                              className="w-4 h-4 rounded-full mr-2"
                              style={{ backgroundColor: COLORS.find(c => c.name === colorName)?.hex }}
                            ></div>
                            <h4 className="font-medium">{colorName}</h4>
                          </div>
                          <div className="grid grid-cols-6 gap-2">
                            {SIZES.map((size) => (
                              <div key={`${colorName}-${size}`} className="text-center">
                                <p className="text-xs text-text-muted">{size}</p>
                                <p className="font-medium">{data.sizes?.[size] || 0}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Created/Updated info */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-ui-border">
                  <div>
                    <p className="text-sm text-text-muted">Created</p>
                    <p className="text-text">
                      {new Date(product.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Last Updated</p>
                    <p className="text-text">
                      {new Date(product.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          {/* Seller Information */}
          {product.seller && (
            <div className="bg-background-card rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-text mb-4">
                Seller Information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-text-muted">Shop Name</p>
                  <Link
                    href={`/superadmin/sellers/${product.seller.id}`}
                    className="text-primary hover:text-primary-dark font-medium"
                  >
                    {product.seller.shopName || "Unnamed Shop"}
                  </Link>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Owner Name</p>
                  <p className="text-text">
                    {product.seller.ownerName || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Contact</p>
                  <p className="text-text">
                    {product.seller.phone || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Fixed Action Button */}
      {!isEditing && (
        <div className="fixed bottom-8 right-8 z-10">
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none transform transition hover:scale-110"
            title="Edit Product"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Fixed Save/Cancel Buttons When Editing */}
      {isEditing && (
        <div className="fixed bottom-8 right-8 z-10 flex space-x-4">
          <button
            onClick={handleCancel}
            className="flex items-center justify-center w-14 h-14 bg-gray-200 text-gray-800 rounded-full shadow-lg hover:bg-gray-300 focus:outline-none"
            title="Cancel Editing"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center w-14 h-14 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 focus:outline-none disabled:opacity-70"
            title="Save Changes"
          >
            {isSaving ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
