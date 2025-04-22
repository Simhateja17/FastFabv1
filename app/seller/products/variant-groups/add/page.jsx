

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import { toast } from "react-hot-toast";
import {
  FiChevronRight,
  FiArrowLeft,
  FiPlus,
  FiPackage,
} from "react-icons/fi";

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

export default function AddVariantGroup() {
  const router = useRouter();
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    basePrice: "",
    sellingPrice: "",
    category: "",
    subcategory: "",
  });
  const [selectedCategory, setSelectedCategory] = useState("");
  const [availableSubcategories, setAvailableSubcategories] = useState([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "basePrice" || name === "sellingPrice") {
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
    setSelectedCategory(category);
    setFormData((prev) => ({ ...prev, category, subcategory: "" }));

    // Update available subcategories based on selected category
    const categoryObj = CATEGORIES.find((c) => c.name === category);
    setAvailableSubcategories(categoryObj ? categoryObj.subcategories : []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate the form data
    if (!formData.name || !formData.basePrice || !formData.sellingPrice) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    // Validate that selling price is not greater than base price
    if (parseFloat(formData.sellingPrice) > parseFloat(formData.basePrice)) {
      toast.error("Selling price cannot be greater than base price");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      // Prepare the payload
      const payload = {
        ...formData,
        basePrice: parseFloat(formData.basePrice),
        sellingPrice: parseFloat(formData.sellingPrice),
      };
      
      // Create the variant group
      const response = await authFetch("/api/products/variant-group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create variant group");
      }
      
      const data = await response.json();
      
      toast.success("Variant group created successfully!");
      
      // Redirect to add variant page
      router.push(`/seller/products/variant-groups/${data.variantGroup.id}/add-variant`);
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
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
        <Link
          href="/seller/products/variant-groups"
          className="text-text-muted hover:text-text"
        >
          Variant Groups
        </Link>
        <FiChevronRight className="mx-2 text-text-muted mt-1" />
        <span className="text-text-dark font-medium">Add Group</span>
      </nav>

      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/seller/products/variant-groups")}
          className="inline-flex items-center text-secondary hover:text-secondary-dark transition-colors"
        >
          <FiArrowLeft className="w-5 h-5 mr-2 stroke-2" />
          Back to Variant Groups
        </button>
      </div>

      <div className="bg-background-card rounded-lg shadow-md p-6 border border-ui-border">
        <h1 className="text-2xl font-bold text-text-dark mb-6 flex items-center">
          <span className="bg-secondary bg-opacity-20 text-secondary p-2 rounded-full mr-3">
            <FiPackage className="w-6 h-6 stroke-2 text-white" />
          </span>
          Create Variant Group
        </h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter product group name"
              className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
              required
            />
            <p className="text-xs text-text-muted mt-1">
              This will be used as the base name for all product variants
            </p>
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
              Description (optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your product group"
              rows={4}
              className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Base Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="basePrice"
                value={formData.basePrice}
                onChange={handleInputChange}
                placeholder="0.00"
                className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
                required
              />
              <p className="text-xs text-text-muted mt-1">
                MRP price for all variants (can be overridden per variant)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Selling Price (₹) <span className="text-red-500">*</span>
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
              <p className="text-xs text-text-muted mt-1">
                Cannot be greater than base price
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="mr-2">Creating Group...</span>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                </>
              ) : (
                <>
                  <FiPlus className="w-5 h-5 mr-2" />
                  Create Group
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 



