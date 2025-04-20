"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from 'next/image';
import getAdminApiClient from "@/app/utils/apiClient";
import { toast } from "react-hot-toast";
import { FiUpload, FiX, FiImage, FiTrash2, FiEdit2 } from "react-icons/fi";
import { PRODUCT_ENDPOINTS } from "@/app/config";

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
  const [formData, setFormData] = useState({
      name: "",
      description: "",
      sellingPrice: 0,
      mrpPrice: 0,
      isActive: false,
      category: "",
      subcategory: "",
      isReturnable: true,
      images: [],
      sizeQuantities: SIZES.reduce((acc, size) => { acc[size] = 0; return acc; }, {}),
      colorInventory: {},
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [availableSubcategories, setAvailableSubcategories] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [colorInventory, setColorInventory] = useState({});
  const router = useRouter();

  // New State for File Upload
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [previewUrls, setPreviewUrls] = useState([]);

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
        
        // Correctly Initialize color inventory state
        let initialColorInventoryState = {};
        let initialSelectedColors = [];
        
        if (productData.colorInventory && Array.isArray(productData.colorInventory)) {
          productData.colorInventory.forEach(item => {
            const sizesData = typeof item.inventory === 'string'
                              ? JSON.parse(item.inventory)
                              : item.inventory || {};
            
            initialColorInventoryState[item.color] = {
              colorCode: item.colorCode || "",
              stockNumber: item.stockNumber || null,
              sizes: SIZES.reduce((acc, size) => {
                acc[size] = sizesData[size] !== undefined ? Number(sizesData[size]) : 0;
                return acc;
              }, {})
            };
            initialSelectedColors.push(item.color);
          });
        }
        setColorInventory(initialColorInventoryState);
        setSelectedColors(initialSelectedColors);
        
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
          sizeQuantities: productData.sizeQuantities ||
            SIZES.reduce((acc, size) => {
              acc[size] = 0;
              return acc;
            }, {}),
          colorInventory: initialColorInventoryState,
        });
      } catch (error) {
        console.error("Error fetching product data:", error);
        setError(
          error.response?.data?.message || "Failed to load product details"
        );
        toast.error("Failed to load product details");
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProductData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        subcategory: "",
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
    const parsedValue = value === '' ? '' : parseFloat(value);
    if (value === '' || (!isNaN(parsedValue) && parsedValue >= 0)) {
        setFormData({
            ...formData,
            [name]: value === '' ? '' : parsedValue,
        });
    }
  };

  // Handle size quantity change
  const handleSizeQuantityChange = (size, value) => {
    const newSizeQuantities = {
      ...formData.sizeQuantities,
      [size]: parseInt(value) >= 0 ? parseInt(value) : 0
    };
    
    setFormData({
      ...formData,
      sizeQuantities: newSizeQuantities
    });
  };

  // Handle color selection
  const toggleColorSelection = (colorName) => {
    const colorDetails = COLORS.find(c => c.name === colorName);
    const colorCode = colorDetails ? colorDetails.hex : "#000000";

    const newSelectedColors = [...selectedColors];
    const newColorInventory = { ...colorInventory };
    const newFormDataColorInventory = { ...formData.colorInventory };

    if (newSelectedColors.includes(colorName)) {
      const index = newSelectedColors.indexOf(colorName);
      if (index > -1) {
        newSelectedColors.splice(index, 1);
      }
      delete newColorInventory[colorName];
      delete newFormDataColorInventory[colorName];

    } else {
      newSelectedColors.push(colorName);
      const initialSizes = SIZES.reduce((acc, size) => {
        acc[size] = 0;
        return acc;
      }, {});
      newColorInventory[colorName] = { colorCode: colorCode, stockNumber: null, sizes: initialSizes };
      newFormDataColorInventory[colorName] = { colorCode: colorCode, stockNumber: null, sizes: initialSizes };
    }

    setSelectedColors(newSelectedColors);
    setColorInventory(newColorInventory);
    setFormData({
      ...formData,
      colorInventory: newFormDataColorInventory
    });
  };

  // Handle color inventory quantity change
  const handleColorSizeChange = (color, size, value) => {
    const quantity = parseInt(value) >= 0 ? parseInt(value) : 0;

    const newColorInventory = {
      ...colorInventory,
      [color]: {
        ...colorInventory[color],
        sizes: {
          ...colorInventory[color]?.sizes,
          [size]: quantity
        }
      }
    };
    setColorInventory(newColorInventory);

    const newFormDataColorInventory = {
      ...formData.colorInventory,
      [color]: {
        ...formData.colorInventory[color],
        sizes: {
          ...formData.colorInventory[color]?.sizes,
          [size]: quantity
        }
      }
    };
    setFormData({
      ...formData,
      colorInventory: newFormDataColorInventory
    });
  };

  // Handle stock number change for a color
  const handleStockNumberChange = (color, value) => {
      const newColorInventory = {
          ...colorInventory,
          [color]: {
              ...colorInventory[color],
              stockNumber: value || null,
          }
      };
      setColorInventory(newColorInventory);

      const newFormDataColorInventory = {
        ...formData.colorInventory,
        [color]: {
          ...formData.colorInventory[color],
          stockNumber: value || null,
        }
      };
      setFormData({
          ...formData,
          colorInventory: newFormDataColorInventory
      });
  };

  // Handle file change
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);

    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    setUploadError(null);
  };

  const removeSelectedFile = (index) => {
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index]);
    }

    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    const updatedImages = formData.images.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      images: updatedImages,
    });
  };

  const uploadImages = async () => {
    if (selectedFiles.length === 0) {
      return [];
    }

    setUploading(true);
    setUploadError(null);
    const data = new FormData();
    selectedFiles.forEach(file => {
      data.append('images', file);
    });

    try {
      const apiClient = getAdminApiClient();
      const response = await apiClient.post(PRODUCT_ENDPOINTS.UPLOAD_IMAGES, data, {
          headers: {
              'Content-Type': 'multipart/form-data',
          },
      });

      console.log("Upload response:", response.data);

      if (!response.data || !response.data.imageUrls || !Array.isArray(response.data.imageUrls)) {
          console.error("Invalid upload response structure:", response.data);
          throw new Error("Image upload failed: Invalid response from server.");
      }

      setSelectedFiles([]);
      setPreviewUrls(prev => {
          prev.forEach(url => URL.revokeObjectURL(url));
          return [];
      });
      return response.data.imageUrls;

    } catch (error) {
      console.error("Error uploading images:", error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || error.message || "Failed to upload images. Please try again.";
      setUploadError(errorMessage);
      toast.error(`Upload failed: ${errorMessage}`);
      throw new Error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setUploadError(null);

    if (formData.mrpPrice === '' || isNaN(formData.mrpPrice) || parseFloat(formData.mrpPrice) < 0) {
        toast.error("MRP Price must be a valid non-negative number.");
        setIsSaving(false);
        return;
    }
    if (formData.sellingPrice === '' || isNaN(formData.sellingPrice) || parseFloat(formData.sellingPrice) < 0) {
        toast.error("Selling Price must be a valid non-negative number.");
        setIsSaving(false);
        return;
    }
     if (parseFloat(formData.sellingPrice) > parseFloat(formData.mrpPrice)) {
        toast.error("Selling Price cannot exceed MRP.");
        setIsSaving(false);
        return;
     }

    let finalImageUrls = [...formData.images];

    try {
      if (selectedFiles.length > 0) {
        const uploadedUrls = await uploadImages();
        finalImageUrls = [...finalImageUrls, ...uploadedUrls];
      }

      const payload = {
          name: formData.name,
          description: formData.description,
          sellingPrice: parseFloat(formData.sellingPrice),
          mrpPrice: parseFloat(formData.mrpPrice),
          isActive: Boolean(formData.isActive),
          isReturnable: Boolean(formData.isReturnable),
          category: formData.category,
          subcategory: formData.subcategory,
          images: finalImageUrls,
          colorInventory: Object.entries(formData.colorInventory).map(([color, details]) => ({
              color: color,
              colorCode: details.colorCode || COLORS.find(c => c.name === color)?.hex || "#000000",
              stockNumber: details.stockNumber || null,
              inventory: details.sizes
          })),
      };

      const apiClient = getAdminApiClient();
      const response = await apiClient.put(
        `/api/admin/products/${productId}`,
        payload
      );

      const updatedProductData = response.data;
      setProduct(updatedProductData);
      setIsEditing(false);
      setError(null);

      updateSubcategories(updatedProductData.category);
      let savedColorInventoryState = {};
      let savedSelectedColors = [];
      if (updatedProductData.colorInventory && Array.isArray(updatedProductData.colorInventory)) {
        updatedProductData.colorInventory.forEach(item => {
          const sizesData = typeof item.inventory === 'string'
                            ? JSON.parse(item.inventory)
                            : item.inventory || {};
          savedColorInventoryState[item.color] = {
            colorCode: item.colorCode || "",
            stockNumber: item.stockNumber || null,
            sizes: SIZES.reduce((acc, size) => {
              acc[size] = sizesData[size] !== undefined ? Number(sizesData[size]) : 0;
              return acc;
            }, {})
          };
          savedSelectedColors.push(item.color);
        });
      }
      setColorInventory(savedColorInventoryState);
      setSelectedColors(savedSelectedColors);

      setFormData({
        name: updatedProductData.name || "",
        description: updatedProductData.description || "",
        sellingPrice: updatedProductData.sellingPrice || 0,
        mrpPrice: updatedProductData.mrpPrice || 0,
        isActive: updatedProductData.isActive || false,
        category: updatedProductData.category || "",
        subcategory: updatedProductData.subcategory || "",
        isReturnable: updatedProductData.isReturnable !== undefined ? updatedProductData.isReturnable : true,
        images: updatedProductData.images || [],
        sizeQuantities: updatedProductData.sizeQuantities || SIZES.reduce((acc, size) => { acc[size] = 0; return acc; }, {}),
        colorInventory: savedColorInventoryState,
      });

      toast.success("Product updated successfully!");
    } catch (error) {
      console.error("Error updating product:", error);
      const message = uploadError || error.response?.data?.message || error.message || "Failed to update product details";
      setSaveError(message);
      toast.error(`Update failed: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    updateSubcategories(product.category);
    let initialColorInventoryState = {};
    let initialSelectedColors = [];
     if (product.colorInventory && Array.isArray(product.colorInventory)) {
        product.colorInventory.forEach(item => {
            const sizesData = typeof item.inventory === 'string' ? JSON.parse(item.inventory) : item.inventory || {};
            initialColorInventoryState[item.color] = {
                colorCode: item.colorCode || "",
                stockNumber: item.stockNumber || null,
                sizes: SIZES.reduce((acc, size) => {
                    acc[size] = sizesData[size] !== undefined ? Number(sizesData[size]) : 0;
                    return acc;
                }, {})
            };
            initialSelectedColors.push(item.color);
        });
    }
    setColorInventory(initialColorInventoryState);
    setSelectedColors(initialSelectedColors);

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
      sizeQuantities: product.sizeQuantities || SIZES.reduce((acc, size) => { acc[size] = 0; return acc; }, {}),
      colorInventory: initialColorInventoryState,
    });

    setSelectedFiles([]);
    setPreviewUrls(prev => {
        prev.forEach(url => {
          if (url) URL.revokeObjectURL(url);
        });
        return [];
    });
    setUploadError(null);
    setUploading(false);

    setIsEditing(false);
    setSaveError(null);
  };

  const toggleProductStatus = async () => {
    if (!product) return;
    const newStatus = !product.isActive;
    try {
        setIsSaving(true);
        const apiClient = getAdminApiClient();
        await apiClient.put(`/api/admin/products/${productId}`, {
            isActive: newStatus,
        });
        setProduct({ ...product, isActive: newStatus });
        setFormData({ ...formData, isActive: newStatus });
        toast.success(`Product status updated to ${newStatus ? 'Active' : 'Inactive'}`);
    } catch (error) {
        console.error("Error toggling product status:", error);
        toast.error(error.response?.data?.message || "Failed to update product status");
    } finally {
        setIsSaving(false);
    }
  };

  const calculateDiscount = () => {
    const mrp = parseFloat(isEditing ? formData.mrpPrice : product?.mrpPrice);
    const selling = parseFloat(isEditing ? formData.sellingPrice : product?.sellingPrice);

    if (!isNaN(mrp) && !isNaN(selling) && mrp > 0 && selling > 0 && mrp >= selling) {
      const discount = ((mrp - selling) / mrp) * 100;
      return `${Math.round(discount)}% OFF`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-600 text-xl">{error}</p>
        <Link href="/superadmin/products" className="text-blue-600 hover:underline mt-4 inline-block">
            Go back to products list
        </Link>
      </div>
    );
  }

  if (!product) {
     return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-600 text-xl">Product not found.</p>
         <Link href="/superadmin/products" className="text-blue-600 hover:underline mt-4 inline-block">
            Go back to products list
        </Link>
      </div>
    );
  }

  const discount = calculateDiscount();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 text-sm text-gray-500">
        <Link href="/superadmin/dashboard" className="hover:text-gray-700">Dashboard</Link>
        {' > '}
        <Link href="/superadmin/products" className="hover:text-gray-700">Products</Link>
        {' > '}
        <span>{isEditing ? 'Edit: ' : ''}{product.name || 'Product Detail'}</span>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-800 flex-grow truncate mr-4">
           {product.name || 'Product Detail'}
           {product.seller && (
             <span className="text-sm font-normal text-gray-500 ml-2">
                (Seller: {product.seller.shopName || product.seller.ownerName || 'N/A'})
             </span>
           )}
        </h1>
        <div className="flex items-center space-x-3 flex-shrink-0">
            {product && (
                <button
                    onClick={toggleProductStatus}
                    disabled={isSaving}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                        product.isActive
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <span>{product.isActive ? 'Active' : 'Inactive'}</span>
                    {isSaving && !isEditing && <span className="animate-spin h-3 w-3 border-t-2 border-current rounded-full ml-1"></span>}
                </button>
            )}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-primary hover:bg-primary-dark text-black px-5 py-2 rounded-md shadow-sm text-sm font-medium transition-colors flex items-center space-x-1"
            >
              <FiEdit2 className="h-4 w-4" />
              <span>Edit Product</span>
            </button>
          ) : (
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving || uploading}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded-md shadow-sm text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="product-edit-form"
                disabled={isSaving || uploading}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-md shadow-sm text-sm font-medium transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving || uploading ? (
                   <>
                    <span className="animate-spin h-4 w-4 border-t-2 border-white rounded-full mr-2"></span>
                    <span>{uploading ? 'Uploading...' : 'Saving...'}</span>
                   </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {isEditing ? (
            <form id="product-edit-form" onSubmit={handleSave} className="bg-background-card rounded-lg shadow p-6 border-2 border-primary">
              <h2 className="text-xl font-medium text-text mb-6 flex items-center">
                 <FiEdit2 className="h-6 w-6 mr-2 text-primary" />
                 Edit Product Information
              </h2>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                      <label htmlFor="name" className="block text-sm font-medium text-text-muted mb-1">Product Name</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-text-muted mb-1">Category</label>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                        required
                      >
                        <option value="">Select Category</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat.name} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                     <div>
                      <label htmlFor="subcategory" className="block text-sm font-medium text-text-muted mb-1">Subcategory</label>
                      <select
                        id="subcategory"
                        name="subcategory"
                        value={formData.subcategory}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                        required
                        disabled={!formData.category || availableSubcategories.length === 0}
                      >
                        <option value="">Select Subcategory</option>
                        {availableSubcategories.map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                      <div>
                        <label htmlFor="isReturnable" className="block text-sm font-medium text-text-muted mb-1">Return Policy & Commission</label>
                        <select
                            id="isReturnable"
                            name="isReturnable"
                            value={String(formData.isReturnable)}
                            onChange={(e) => handleChange({ target: { name: 'isReturnable', value: e.target.value === 'true', type: 'select' }})}
                            className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                            required
                        >
                            {RETURNABLE_OPTIONS.map(option => (
                                <option key={String(option.value)} value={String(option.value)}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-text-muted mb-1">Description</label>
                    <textarea
                    id="description"
                    name="description"
                    rows="4"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    ></textarea>
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="mrpPrice" className="block text-sm font-medium text-text-muted mb-1">MRP Price (₹)</label>
                      <input
                        type="number"
                        id="mrpPrice"
                        name="mrpPrice"
                        value={formData.mrpPrice}
                        onChange={handleNumberChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="sellingPrice" className="block text-sm font-medium text-text-muted mb-1">Selling Price (₹)</label>
                      <input
                        type="number"
                        id="sellingPrice"
                        name="sellingPrice"
                        value={formData.sellingPrice}
                        onChange={handleNumberChange}
                        placeholder="0.00"
                         min="0"
                         step="0.01"
                        className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                       {discount && (
                            <p className="mt-1 text-sm text-green-600 font-medium">{discount}</p>
                        )}
                         {parseFloat(formData.sellingPrice) > parseFloat(formData.mrpPrice) && (
                            <p className="mt-1 text-sm text-red-600">Selling price cannot exceed MRP.</p>
                        )}
                    </div>
                 </div>

                <div className="border-t border-ui-border pt-6">
                  <label className="block text-lg font-medium text-text-dark mb-4">
                    Product Images
                  </label>

                   {formData.images && formData.images.length > 0 && (
                      <div className="mb-6">
                          <p className="text-sm text-text-muted mb-3">Current Images:</p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                              {formData.images.map((imageUrl, index) => (
                              <div key={`existing-${index}`} className="relative group aspect-square">
                                  <Image
                                  src={imageUrl}
                                  alt={`Existing product image ${index + 1}`}
                                  fill
                                  className="object-cover rounded-md border border-ui-border bg-gray-100"
                                   onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100' fill='%23f0f0f0'%3E%3Crect width='100' height='100' fill='%23eee'/%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%23aaa'%3EError%3C/text%3E%3C/svg%3E";
                                  }}
                                  sizes="(max-width: 768px) 100vw, 150px"
                                  />
                                  <button
                                  type="button"
                                  onClick={() => removeExistingImage(index)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-opacity opacity-0 group-hover:opacity-100 z-10"
                                  aria-label="Remove existing image"
                                  >
                                  <FiX className="h-3 w-3" />
                                  </button>
                              </div>
                              ))}
                          </div>
                       </div>
                   )}

                   {previewUrls.length > 0 && (
                        <div className="mb-6">
                            <p className="text-sm text-text-muted mb-3">New Images to Upload:</p>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                               {previewUrls.map((url, index) => (
                                   <div key={`new-${index}`} className="relative group aspect-square">
                                       <Image
                                           src={url}
                                           alt={`New image preview ${index + 1}`}
                                           fill
                                           className="object-cover rounded-md border border-blue-300"
                                           onLoad={() => console.log(`Preview loaded: ${url}`)}
                                           onError={(e) => console.error(`Preview error: ${url}`, e)}
                                       />
                                       <button
                                           type="button"
                                           onClick={() => removeSelectedFile(index)}
                                           className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-opacity opacity-0 group-hover:opacity-100 z-10"
                                           aria-label="Remove new image"
                                       >
                                           <FiX className="h-3 w-3" />
                                       </button>
                                   </div>
                               ))}
                            </div>
                        </div>
                   )}

                   <div className="mt-4">
                      <label htmlFor="file-upload" className="block text-sm font-medium text-text-muted mb-2">
                          Add More Photos (Upload)
                      </label>
                      <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-ui-border border-dashed rounded-md bg-background-alt">
                          <div className="space-y-1 text-center">
                              <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                              <div className="flex text-sm text-gray-600">
                                  <label
                                      htmlFor="file-upload-input"
                                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary px-1"
                                  >
                                      <span>Upload files</span>
                                      <input
                                          id="file-upload-input"
                                          name="file-upload"
                                          type="file"
                                          multiple
                                          className="sr-only"
                                          onChange={handleFileChange}
                                          accept="image/png, image/jpeg, image/gif, image/webp"
                                      />
                                  </label>
                                  <p className="pl-1">or drag and drop</p>
                              </div>
                              <p className="text-xs text-gray-500">PNG, JPG, GIF, WEBP up to 10MB each</p>
                          </div>
                      </div>
                      {uploading && <p className="text-sm text-blue-600 mt-2">Uploading...</p>}
                      {uploadError && <p className="text-sm text-red-600 mt-2">Upload Error: {uploadError}</p>}
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="bg-background-card rounded-lg shadow p-6">
               <h2 className="text-xl font-medium text-text mb-6">
                Product Information
               </h2>
              <div className="space-y-6">
                 <div className="space-y-2">
                   <h3 className="text-md font-medium text-text-muted">
                     Product Images
                   </h3>
                    {product.images && product.images.length > 0 ? (
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                         {product.images.map((image, idx) => (
                             <div
                             key={idx}
                             className="aspect-square relative border border-ui-border rounded-lg overflow-hidden bg-gray-100"
                             >
                             <Image
                                 src={image}
                                 alt={`${product.name || 'Product'} image ${idx + 1}`}
                                 fill
                                 className="object-cover"
                                 onError={(e) => {
                                 e.target.onerror = null;
                                 e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' viewBox='0 0 300 300' fill='%23f0f0f0'%3E%3Crect width='100%' height='100%' fill='%23eee'/%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='18' fill='%23aaa'%3ENo Image%3C/text%3E%3C/svg%3E";
                                 }}
                                 sizes="(max-width: 768px) 100vw, 300px"
                             />
                             </div>
                         ))}
                       </div>
                    ) : (
                        <p className="text-sm text-text-muted italic">No images available.</p>
                    )}
                 </div>

                 <dl className="divide-y divide-ui-border">
                     <div className="py-3 grid grid-cols-3 gap-4">
                         <dt className="text-sm font-medium text-text-muted">Description</dt>
                         <dd className="text-sm text-text col-span-2">{product.description || '-'}</dd>
                     </div>
                      <div className="py-3 grid grid-cols-3 gap-4">
                         <dt className="text-sm font-medium text-text-muted">Category</dt>
                         <dd className="text-sm text-text col-span-2">{product.category || '-'}</dd>
                     </div>
                      <div className="py-3 grid grid-cols-3 gap-4">
                         <dt className="text-sm font-medium text-text-muted">Subcategory</dt>
                         <dd className="text-sm text-text col-span-2">{product.subcategory || '-'}</dd>
                     </div>
                      <div className="py-3 grid grid-cols-3 gap-4">
                         <dt className="text-sm font-medium text-text-muted">MRP Price</dt>
                         <dd className="text-sm text-text col-span-2">₹{product.mrpPrice?.toFixed(2) ?? '0.00'}</dd>
                     </div>
                      <div className="py-3 grid grid-cols-3 gap-4">
                         <dt className="text-sm font-medium text-text-muted">Selling Price</dt>
                         <dd className="text-sm text-text col-span-2">
                              <span className="font-semibold">₹{product.sellingPrice?.toFixed(2) ?? '0.00'}</span>
                               {discount && <span className="ml-2 text-xs font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{discount}</span>}
                         </dd>
                     </div>
                      <div className="py-3 grid grid-cols-3 gap-4">
                         <dt className="text-sm font-medium text-text-muted">Return Policy</dt>
                         <dd className="text-sm text-text col-span-2">
                              {product.isReturnable ? 'Returnable (8% Commission)' : 'Non-Returnable (12% Commission)'}
                         </dd>
                     </div>
                      <div className="py-3 grid grid-cols-3 gap-4">
                         <dt className="text-sm font-medium text-text-muted">Status</dt>
                         <dd className="text-sm col-span-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                 {product.isActive ? 'Active' : 'Inactive'}
                             </span>
                         </dd>
                     </div>
                  </dl>

                  <div className="border-t border-ui-border pt-6">
                    <h3 className="text-md font-medium text-text-muted mb-4">Color Inventory</h3>
                     {product.colorInventory && Array.isArray(product.colorInventory) && product.colorInventory.length > 0 ? (
                        <div className="space-y-4">
                            {product.colorInventory.map((item, index) => {
                                const sizesData = typeof item.inventory === 'string' ? JSON.parse(item.inventory) : item.inventory || {};
                                const availableSizes = Object.entries(sizesData)
                                                        .filter(([_, qty]) => qty > 0)
                                                        .map(([size, qty]) => `${size} (${qty})`)
                                                        .join(', ');
                                return (
                                    <div key={index} className="p-3 border border-ui-border rounded-md bg-background-alt">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <span className="w-4 h-4 rounded-full mr-2 border border-gray-300" style={{ backgroundColor: item.colorCode || '#ccc' }}></span>
                                                <span className="font-medium text-sm text-text-dark">{item.color}</span>
                                                 {item.stockNumber && <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">#{item.stockNumber}</span>}
                                            </div>

                                        </div>
                                        {availableSizes ? (
                                             <p className="text-xs text-text-muted mt-1 pl-6">Sizes: {availableSizes}</p>
                                        ) : (
                                             <p className="text-xs text-text-muted mt-1 pl-6 italic">No stock for this color.</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-text-muted italic">No color-specific inventory defined.</p>
                    )}
                  </div>

              </div>
            </div>
          )}
        </div>

        {product.seller && (
             <div className="lg:col-span-1 space-y-6">
                <div className="bg-background-card rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-text-dark mb-4">Seller Information</h3>
                    <dl className="space-y-2 text-sm">
                         <div>
                            <dt className="text-text-muted">Shop Name</dt>
                            <dd className="text-text">{product.seller.shopName || '-'}</dd>
                         </div>
                         <div>
                             <dt className="text-text-muted">Owner Name</dt>
                             <dd className="text-text">{product.seller.ownerName || '-'}</dd>
                         </div>
                         <div>
                             <dt className="text-text-muted">Phone</dt>
                             <dd className="text-text">{product.seller.phone || '-'}</dd>
                         </div>
                         <div>
                            <dt className="text-text-muted">Seller ID</dt>
                            <dd className="text-text font-mono text-xs">{product.seller.id}</dd>
                         </div>
                         <div>
                             <Link
                                href={`/superadmin/sellers/${product.seller.id}`}
                                className="text-primary hover:underline text-sm font-medium mt-2 inline-block"
                             >
                                View Seller Details &rarr;
                             </Link>
                         </div>
                    </dl>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
