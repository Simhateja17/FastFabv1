"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Image from "next/image";
import { toast } from "react-hot-toast";
import Link from "next/link";
import {
  FiUpload,
  FiX,
  FiChevronRight,
  FiArrowLeft,
  FiPlus,
  FiCheck,
} from "react-icons/fi";

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

export default function AddProduct() {
  const router = useRouter();
  const { seller, authFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);

  // Size management state
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState("");
  const [selectedSizes, setSelectedSizes] = useState([]);

  // Color inventory state
  const [selectedColor, setSelectedColor] = useState("");
  const [colorInventories, setColorInventories] = useState([]);
  const [showColorInventory, setShowColorInventory] = useState(false);
  const [currentColorSizes, setCurrentColorSizes] = useState([]);

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
      XXL: 0,
      "3XL": 0,
      "4XL": 0,
      "5XL": 0,
      "6XL": 0,
      "7XL": 0,
      "8XL": 0,
      "9XL": 0,
      "10XL": 0,
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

  const handleSizeQuantityChange = (e) => {
    setSelectedQuantity(e.target.value);
  };

  const handleSizeChange = (e) => {
    setSelectedSize(e.target.value);
  };

  const handleColorSelect = (color) => {
    setSelectedColor(color);
    // Find if this color already has inventory
    const existing = colorInventories.find((item) => item.color === color.name);
    if (existing) {
      // Convert the inventory JSON to an array of size objects
      const sizeArray = Object.entries(existing.inventory || {})
        .filter(([_, quantity]) => quantity > 0)
        .map(([size, quantity]) => ({ size, quantity }));
      setCurrentColorSizes(sizeArray);
    } else {
      setCurrentColorSizes([]);
    }
    setShowColorInventory(true);
  };

  const addSizeQuantity = () => {
    if (!selectedSize || !selectedQuantity || parseInt(selectedQuantity) <= 0) {
      toast.error("Please select a size and enter a valid quantity");
      return;
    }

    if (!selectedColor) {
      // Add to the default inventory
      // Check if size already exists
      const existing = selectedSizes.find((item) => item.size === selectedSize);
      if (existing) {
        // Update existing size
        setSelectedSizes(
          selectedSizes.map((item) =>
            item.size === selectedSize
              ? { ...item, quantity: parseInt(selectedQuantity) }
              : item
          )
        );
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

      // Update formData
      const updatedSizeQuantities = { ...formData.sizeQuantities };
      updatedSizeQuantities[selectedSize] = parseInt(selectedQuantity);
      setFormData((prev) => ({
        ...prev,
        sizeQuantities: updatedSizeQuantities,
      }));
    } else {
      // Add to the color inventory
      // Check if size already exists in current color inventory
      const existing = currentColorSizes.find(
        (item) => item.size === selectedSize
      );
      let updatedColorSizes;

      if (existing) {
        // Update existing size
        updatedColorSizes = currentColorSizes.map((item) =>
          item.size === selectedSize
            ? { ...item, quantity: parseInt(selectedQuantity) }
            : item
        );
      } else {
        // Add new size
        updatedColorSizes = [
          ...currentColorSizes,
          {
            size: selectedSize,
            quantity: parseInt(selectedQuantity),
          },
        ];
      }

      setCurrentColorSizes(updatedColorSizes);

      // Update colorInventories
      const existingColorIndex = colorInventories.findIndex(
        (item) => item.color === selectedColor.name
      );

      if (existingColorIndex >= 0) {
        // Update existing color inventory
        const updatedInventories = [...colorInventories];
        const inventoryObj = {
          ...updatedInventories[existingColorIndex].inventory,
        };
        inventoryObj[selectedSize] = parseInt(selectedQuantity);

        updatedInventories[existingColorIndex] = {
          ...updatedInventories[existingColorIndex],
          inventory: inventoryObj,
        };

        setColorInventories(updatedInventories);
      } else {
        // Create new color inventory
        const inventoryObj = {};
        inventoryObj[selectedSize] = parseInt(selectedQuantity);

        setColorInventories([
          ...colorInventories,
          {
            color: selectedColor.name,
            colorCode: selectedColor.hex,
            inventory: inventoryObj,
          },
        ]);
      }
    }

    // Clear selection
    setSelectedSize("");
    setSelectedQuantity("");
  };

  const removeSizeQuantity = (sizeToRemove) => {
    if (!selectedColor) {
      // Remove from default inventory
      setSelectedSizes(
        selectedSizes.filter((item) => item.size !== sizeToRemove)
      );

      // Update formData
      const updatedSizeQuantities = { ...formData.sizeQuantities };
      updatedSizeQuantities[sizeToRemove] = 0;
      setFormData((prev) => ({
        ...prev,
        sizeQuantities: updatedSizeQuantities,
      }));
    } else {
      // Remove from color inventory
      setCurrentColorSizes(
        currentColorSizes.filter((item) => item.size !== sizeToRemove)
      );

      // Update colorInventories
      const existingColorIndex = colorInventories.findIndex(
        (item) => item.color === selectedColor.name
      );

      if (existingColorIndex >= 0) {
        const updatedInventories = [...colorInventories];
        const inventoryObj = {
          ...updatedInventories[existingColorIndex].inventory,
        };
        inventoryObj[sizeToRemove] = 0;

        updatedInventories[existingColorIndex] = {
          ...updatedInventories[existingColorIndex],
          inventory: inventoryObj,
        };

        setColorInventories(updatedInventories);
      }
    }
  };

  const removeColor = (colorName) => {
    setColorInventories(
      colorInventories.filter((item) => item.color !== colorName)
    );

    if (selectedColor && selectedColor.name === colorName) {
      setSelectedColor("");
      setCurrentColorSizes([]);
      setShowColorInventory(false);
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

      // Prepare payload with color inventories
      const payload = {
        ...formData,
        mrpPrice: parseFloat(formData.mrpPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        images: imageUrls,
        colorInventories: colorInventories.map((item) => ({
          color: item.color,
          colorCode: item.colorCode || "",
          inventory: item.inventory,
        })),
      };

      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
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

    // Update available subcategories based on selected category
    const categoryObj = CATEGORIES.find((c) => c.name === category);
    setAvailableSubcategories(categoryObj ? categoryObj.subcategories : []);
  };

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
        <span className="text-text-dark font-medium">Add Product</span>
      </nav>

      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/seller/products")}
          className="inline-flex items-center text-secondary hover:text-secondary-dark transition-colors"
        >
          <FiArrowLeft className="w-5 h-5 mr-2 stroke-2" />
          Back to Products
        </button>
      </div>

      <div className="bg-background-card rounded-lg shadow-md p-6 border border-ui-border">
        <h1 className="text-2xl font-bold text-text-dark mb-6 flex items-center">
          <span className="bg-secondary bg-opacity-20 text-secondary p-2 rounded-full mr-3">
            <FiPlus className="w-6 h-6 stroke-2 text-white" />
          </span>
          Add New Product
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Product Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter product name"
              className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Category and Subcategory */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleCategoryChange}
                className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
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
              <label className="block text-sm font-medium text-text-dark mb-2">
                Subcategory
              </label>
              <select
                name="subcategory"
                value={formData.subcategory}
                onChange={handleInputChange}
                className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors disabled:bg-background-alt disabled:opacity-70"
                required
                disabled={!formData.category}
              >
                <option value="">Select a subcategory</option>
                {availableSubcategories.map((subcat) => (
                  <option key={subcat} value={subcat}>
                    {subcat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your product"
              rows={4}
              className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Color Palette */}
          <div className="bg-background-alt p-6 rounded-lg border border-ui-border">
            <label className="block text-sm font-medium text-text-dark mb-4">
              Color Options
            </label>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => handleColorSelect(color)}
                  className={`flex flex-col items-center space-y-1 p-2 rounded-md ${
                    selectedColor && selectedColor.name === color.name
                      ? "ring-2 ring-secondary"
                      : "hover:bg-background"
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full border border-ui-border shadow-sm"
                    style={{ backgroundColor: color.hex }}
                  ></div>
                  <span className="text-xs truncate max-w-[70px]">
                    {color.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Selected Colors List */}
            {colorInventories.length > 0 && (
              <div className="mt-4 pt-4 border-t border-ui-border">
                <h4 className="text-sm font-medium text-text-dark mb-2">
                  Selected Colors
                </h4>
                <div className="flex flex-wrap gap-2">
                  {colorInventories.map((colorInv) => (
                    <div
                      key={colorInv.color}
                      className="flex items-center bg-background p-2 rounded-md border border-ui-border shadow-sm"
                    >
                      <div
                        className="w-4 h-4 rounded-full mr-2"
                        style={{
                          backgroundColor: colorInv.colorCode || "#000000",
                        }}
                      ></div>
                      <span className="text-xs mr-2">{colorInv.color}</span>
                      <button
                        type="button"
                        onClick={() => removeColor(colorInv.color)}
                        className="text-error hover:text-error-dark"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Color Inventory Summary */}
            {colorInventories.length > 0 && (
              <div className="mt-6 pt-4 border-t border-ui-border">
                <h4 className="text-sm font-medium text-text-dark mb-3">
                  Color Inventory Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {colorInventories.map((colorInv) => {
                    // Count total inventory for this color
                    const sizeEntries = Object.entries(colorInv.inventory || {})
                      .filter(([_, qty]) => qty > 0)
                      .sort(([sizeA], [sizeB]) => {
                        // Custom sort for sizes
                        const sizeOrder = SIZES.reduce((acc, size, idx) => {
                          acc[size] = idx;
                          return acc;
                        }, {});
                        return (
                          (sizeOrder[sizeA] || 999) - (sizeOrder[sizeB] || 999)
                        );
                      });

                    const totalItems = sizeEntries.reduce(
                      (sum, [_, qty]) => sum + (parseInt(qty) || 0),
                      0
                    );

                    if (totalItems === 0) return null;

                    return (
                      <div
                        key={colorInv.color}
                        className="bg-background rounded-lg border border-ui-border p-3 shadow-sm"
                      >
                        <div className="flex items-center mb-2">
                          <div
                            className="w-5 h-5 rounded-full mr-2 border border-ui-border"
                            style={{
                              backgroundColor: colorInv.colorCode || "#000000",
                            }}
                          ></div>
                          <h5 className="font-medium text-text-dark">
                            {colorInv.color}
                          </h5>
                          <span className="ml-auto text-sm text-text-muted">
                            {totalItems} {totalItems === 1 ? "item" : "items"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-2">
                          {sizeEntries.map(([size, qty]) => (
                            <div
                              key={`${colorInv.color}-${size}`}
                              className="bg-background-alt px-2 py-1 rounded text-xs"
                            >
                              {size}: {qty}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Inventory by Size */}
          <div className="bg-background-alt p-4 rounded-lg border border-ui-border">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-text-dark">
                {selectedColor
                  ? `Inventory for ${selectedColor.name}`
                  : "Quantity by Size"}
              </label>

              {selectedColor && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedColor("");
                    setCurrentColorSizes([]);
                    setShowColorInventory(false);
                  }}
                  className="text-secondary text-sm hover:underline"
                >
                  Back to Default Inventory
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-4 mb-4">
              <div className="w-full md:w-1/3">
                <label className="block text-xs text-text-muted mb-1">
                  Size
                </label>
                <select
                  value={selectedSize}
                  onChange={handleSizeChange}
                  className="w-full p-2 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
                >
                  <option value="">Select Size</option>
                  {SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full md:w-1/3">
                <label className="block text-xs text-text-muted mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={selectedQuantity}
                  onChange={handleSizeQuantityChange}
                  className="w-full p-2 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
                  placeholder="Quantity"
                />
              </div>

              <div className="w-full md:w-1/4 flex items-end">
                <button
                  type="button"
                  onClick={addSizeQuantity}
                  className="w-full p-2 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors"
                >
                  Add Size
                </button>
              </div>
            </div>

            {/* Selected Sizes Display */}
            {(selectedColor ? currentColorSizes : selectedSizes).length > 0 && (
              <div className="mt-4 border-t border-ui-border pt-4">
                <h4 className="text-sm font-medium text-text-dark mb-2">
                  {selectedColor
                    ? `Sizes for ${selectedColor.name}`
                    : "Selected Sizes"}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(selectedColor ? currentColorSizes : selectedSizes).map(
                    (item) => (
                      <div
                        key={item.size}
                        className="flex items-center justify-between p-2 border border-ui-border rounded-lg bg-background"
                      >
                        <span className="font-medium text-secondary">
                          {item.size}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-text-dark">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSizeQuantity(item.size)}
                            className="text-error hover:text-error-dark transition-colors"
                          >
                            <FiX className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                MRP Price (₹)
              </label>
              <input
                type="text"
                name="mrpPrice"
                value={formData.mrpPrice}
                onChange={handleInputChange}
                placeholder="0.00"
                className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Selling Price (₹)
              </label>
              <input
                type="text"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleInputChange}
                placeholder="0.00"
                className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
                required
              />
              {formData.mrpPrice &&
                formData.sellingPrice &&
                parseFloat(formData.mrpPrice) >
                  parseFloat(formData.sellingPrice) && (
                  <div className="mt-2 text-sm text-accent font-medium">
                    Discount:{" "}
                    {Math.round(
                      ((parseFloat(formData.mrpPrice) -
                        parseFloat(formData.sellingPrice)) /
                        parseFloat(formData.mrpPrice)) *
                        100
                    )}
                    %
                  </div>
                )}
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-text-dark">
              Product Images
            </label>

            {/* Preview of uploaded images */}
            {previewImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                {previewImages.map((url, index) => (
                  <div key={index} className="relative">
                    <div className="relative h-24 overflow-hidden rounded-lg border border-ui-border bg-background-alt shadow-sm">
                      <Image
                        src={url}
                        alt={`Product ${index + 1}`}
                        className="object-cover"
                        fill
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removePreviewImage(index)}
                      className="absolute -top-2 -right-2 bg-error text-white rounded-full p-1 shadow-sm hover:bg-opacity-90"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Image upload area */}
            <div className="border border-ui-border border-dashed rounded-lg p-6 bg-background-alt">
              <div className="text-center">
                <FiUpload className="mx-auto h-12 w-12 text-secondary opacity-80" />
                <div className="mt-2">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-secondary font-medium hover:text-secondary-dark">
                      Upload files
                    </span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={handleFileChange}
                      accept="image/*"
                    />
                    <span className="text-text-muted ml-1">
                      or drag and drop
                    </span>
                  </label>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-error bg-opacity-10 text-error rounded-md">
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-ui-border flex justify-end">
            <button
              type="submit"
              disabled={loading || uploading}
              className="px-6 py-3 bg-secondary text-white rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-70 flex items-center"
            >
              {loading || uploading ? (
                <>
                  <div className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {uploading ? "Uploading..." : "Saving..."}
                </>
              ) : (
                "Add Product"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
