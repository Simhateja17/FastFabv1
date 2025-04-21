"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { useAuth } from "@/app/context/AuthContext";
import {
  FiArrowLeft,
  FiEdit2,
  FiX,
  FiUpload,
  FiPlus,
  FiCheck,
} from "react-icons/fi";
import { PRODUCT_ENDPOINTS, API_URL } from "@/app/config";

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

// Define returnable options
const RETURNABLE_OPTIONS = [
  { value: true, label: "Returnable :- 8% Commission" },
  { value: false, label: "Non-Returnable :- 12% Commission" }
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
    isReturnable: true,
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
    images: [],
  });

  // Function to fetch color inventories separately
  const fetchColorInventories = useCallback(async (pid) => {
    try {
      const colorResponse = await authFetch(
        `${API_URL}/seller/products/${pid}/colors`
      );

      if (colorResponse.ok) {
        const colorData = await colorResponse.json();
        setColorInventories(colorData.colorInventories || []);
      } else if (colorResponse.status === 401) {
        console.error("Authentication error while fetching color inventories");
        toast.error("Please login again to continue.");
        setTimeout(() => {
          router.push("/signin");
        }, 2000);
      } else {
        console.warn(`Failed to fetch color inventories: ${colorResponse.status}`);
        // Continue with the product data we have
      }
    } catch (colorError) {
      console.error("Error fetching color inventories:", colorError);
      // Don't throw, just continue with the product data we have
      if (colorError.message.includes("Authentication required")) {
        toast.error("Please login again to continue.");
        setTimeout(() => {
          router.push("/signin");
        }, 2000);
      }
    }
  }, [authFetch, router]);

  // Helper function to process product data
  const processProductData = useCallback((product) => {
      console.log("[processProductData] Received product:", JSON.stringify(product, null, 2)); // Log the received product object

      // Update subcategories based on category
      const categoryData = CATEGORIES.find((c) => c.name === product.category);
      setAvailableSubcategories(categoryData ? categoryData.subcategories : []);

      // Create array of selected sizes
      const sizesArray = Object.entries(product.sizeQuantities || {})
        .filter(([_, quantity]) => quantity > 0)
        .map(([size, quantity]) => ({ size, quantity }));

      setSelectedSizes(sizesArray);

      // Fetch color inventories if available
      fetchColorInventories(product.id || productId);

      const newFormData = {
        name: product.name || "",
        description: product.description || "",
        mrpPrice: product.mrpPrice ? product.mrpPrice.toString() : "",
        sellingPrice: product.sellingPrice
          ? product.sellingPrice.toString()
          : "",
        category: product.category || "",
        subcategory: product.subcategory || "",
        isReturnable: product.isReturnable !== undefined ? product.isReturnable : true,
        sizeQuantities: product.sizeQuantities || {
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
        images: product.images || [],
      };

      console.log("[processProductData] Setting formData to:", JSON.stringify(newFormData, null, 2)); // Log the object before setting state
      setFormData(newFormData);
      
      console.log("[processProductData] Setting previewImages to:", product.images || []); // Log images being set
      setPreviewImages(product.images || []);
  }, [fetchColorInventories, productId]);

  const fetchProduct = useCallback(async () => {
    try {
      console.log("Fetching product with ID:", productId);
      setLoading(true);

      // First try the standard API endpoint
      try {
      const response = await authFetch(
        PRODUCT_ENDPOINTS.DETAIL(productId)
      );

      console.log("Fetch response status:", response.status);

      if (!response.ok) {
          const contentType = response.headers.get('content-type') || '';
          // Check if we're getting HTML instead of JSON
          if (contentType.includes('text/html')) {
            console.error("Received HTML response, trying alternative endpoint");
            throw new Error("Server returned an HTML error page");
          }
          
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(
          `Failed to fetch product: ${response.status} ${errorText}`
        );
      }

      const data = await response.json();
      if (!data || !data.product) {
        console.error("Fetched data is missing the 'product' key:", data);
        throw new Error("Invalid data structure received from server.");
      }
      
      console.log("Fetched data:", data);
      console.log("Processing product data:", data.product);
      
      processProductData(data.product);
      return;
      } catch (primaryError) {
        console.warn("Error with primary endpoint, trying direct seller service:", primaryError);
        
        // If primary endpoint fails, try direct seller service if configured
        const apiUrl = process.env.NEXT_PUBLIC_SELLER_SERVICE_URL || 'http://localhost:8000';
        console.log("Using direct seller service URL:", apiUrl);
        
        try {
          // Use regular fetch here to bypass authFetch which might be causing issues
          const accessToken = localStorage.getItem("accessToken");
          const directResponse = await fetch(
            `${apiUrl}/api/products/${productId}`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (!directResponse.ok) {
            const errorText = await directResponse.text();
            throw new Error(`Failed with direct endpoint: ${directResponse.status} ${errorText}`);
          }
          
          const product = await directResponse.json();
          console.log("Fetched product data from direct API:", product);
          processProductData(product);
          return; // Exit function if successful
        } catch (directError) {
          console.error("Both endpoints failed:", directError);
          // Re-throw the primary error for consistent error handling
          throw primaryError;
        }
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Unable to load product information. Please try again later.");
      router.push("/seller/products");
    } finally {
      setLoading(false);
    }
  }, [productId, authFetch, processProductData, router]);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId, fetchProduct]);

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
    console.log("Files selected:", files.length);

    if (files.length === 0) return; // Early return if no files selected

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

    if (validFiles.length === 0) {
      toast.error("No valid files selected");
      // Reset the file input
      e.target.value = "";
      return;
    }

    // Add to existing files instead of replacing
    setSelectedFiles((prevFiles) => [...prevFiles, ...validFiles]);

    // Create preview URLs for new valid files and add to existing
    const newPreviewUrls = validFiles.map((file) => URL.createObjectURL(file));
    setPreviewImages((prevUrls) => [...prevUrls, ...newPreviewUrls]);
    
    // Reset the file input to allow selecting the same file again
    e.target.value = "";
    
    console.log(`Updated files: ${selectedFiles.length + validFiles.length}, previews: ${previewImages.length + newPreviewUrls.length}`);
  };

  // Direct upload function that bypasses authFetch for image uploads
  const directUpload = async (url, formData) => {
    console.log(`[DirectUpload] Starting direct upload to ${url}`);
    
    // Get auth token directly
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      throw new Error("Authentication required. Please login again.");
    }
    
    // Log request details
    console.log(`[DirectUpload] Authorization header configured with token`);
    console.log(`[DirectUpload] FormData contains ${formData.getAll('images').length} files`);
    formData.getAll('images').forEach((file, i) => {
      console.log(`[DirectUpload] File ${i+1}: ${file.name}, ${file.size} bytes, ${file.type}`);
    });
    
    // Implement retry mechanism
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`[DirectUpload] Attempt ${attempts}/${maxAttempts}`);
        
        // Use direct fetch with manual auth header instead of authFetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
            // Don't set Content-Type for multipart/form-data
          },
          body: formData,
          credentials: 'include',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log(`[DirectUpload] Response status: ${response.status}, content type: ${response.headers.get('content-type') || 'unknown'}`);
        
        // Handle responses based on status
        if (!response.ok) {
          // Try to get detailed error info
          const contentType = response.headers.get('content-type') || '';
          
          // For HTML errors, don't try to parse JSON
          if (contentType.includes('text/html')) {
            const htmlText = await response.text();
            console.error('[DirectUpload] HTML error response:', htmlText.substring(0, 500));
            throw new Error(`Upload failed (${response.status}): Server returned HTML error page`);
          }
          
          // For JSON errors, parse them
          if (contentType.includes('application/json')) {
            const errorData = await response.json();
            console.error('[DirectUpload] JSON error response:', errorData);
            throw new Error(errorData.message || `Upload failed with status ${response.status}`);
          }
          
          // For other content types
          const errorText = await response.text();
          console.error('[DirectUpload] Error response:', errorText.substring(0, 500));
          throw new Error(`Upload failed with status ${response.status}`);
        }
        
        // For successful responses
        const contentType = response.headers.get('content-type') || '';
        
        // Only try to parse JSON for JSON responses
        if (contentType.includes('application/json')) {
          const data = await response.json();
          console.log('[DirectUpload] Success response:', data);
          return data;
        }
        
        // For non-JSON success responses, return empty urls
        console.warn('[DirectUpload] Non-JSON success response');
        const text = await response.text();
        console.log('[DirectUpload] Response text:', text.substring(0, 200));
        return { imageUrls: [] };
        
      } catch (error) {
        console.error(`[DirectUpload] Attempt ${attempts} error:`, error);
        
        // Check if it's a network error
        if (error.name === 'TypeError' || error.message.includes('Failed to fetch') || error.name === 'AbortError') {
          console.log(`[DirectUpload] Network error detected: ${error.message}`);
          
          if (attempts < maxAttempts) {
            // Wait before retrying (exponential backoff)
            const waitTime = Math.min(1000 * Math.pow(2, attempts), 8000);
            console.log(`[DirectUpload] Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue; // Try again
          }
        }
        
        // If we've exhausted retries or it's not a network error, rethrow
        throw error;
      }
    }
    
    throw new Error('Failed to upload after multiple attempts. Please check your network connection.');
  };

  const uploadImages = async () => {
    if (selectedFiles.length === 0) return formData.images;

    setUploading(true);
    try {
      const formDataObj = new FormData();
      
      // Log the number of files being uploaded for debugging
      console.log(`Uploading ${selectedFiles.length} files`);
      
      // Log file sizes for debugging
      selectedFiles.forEach((file, index) => {
        console.log(`File ${index}: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)} MB, type: ${file.type}`);
        
        // Append files with unique names to prevent conflicts
        const uniqueName = `${Date.now()}_${index}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        console.log(`Renamed to: ${uniqueName}`);
        
        const fileWithNewName = new File([file], uniqueName, { type: file.type });
        formDataObj.append("images", fileWithNewName);
      });

      // Try multiple API endpoints for upload
      let uploadData;
      let error;
      
      // Define all possible upload endpoints
      const endpoints = [
        // 1. Local API route
        `${window.location.origin}/api/products/upload-images`,
        
        // 2. API from env variable if available
        process.env.NEXT_PUBLIC_API_URL ? 
          `${process.env.NEXT_PUBLIC_API_URL}/api/products/upload-images` : null,
        
        // 3. Direct seller service if available
        process.env.NEXT_PUBLIC_SELLER_SERVICE_URL ? 
          `${process.env.NEXT_PUBLIC_SELLER_SERVICE_URL}/api/products/upload-images` : null,
          
        // 4. Fallback to localhost
        "http://localhost:8000/api/products/upload-images"
      ].filter(Boolean); // Remove null entries
      
      // Remove duplicates
      const uniqueEndpoints = [...new Set(endpoints)];
      console.log(`Will try ${uniqueEndpoints.length} different upload endpoints:`, uniqueEndpoints);
      
      // Try each endpoint in sequence
      for (let i = 0; i < uniqueEndpoints.length; i++) {
        const endpoint = uniqueEndpoints[i];
        console.log(`[Upload] Trying endpoint ${i+1}/${uniqueEndpoints.length}: ${endpoint}`);
        
        try {
          // Use directUpload for all attempts
          uploadData = await directUpload(endpoint, formDataObj);
          console.log(`[Upload] Success with endpoint ${i+1}: ${endpoint}`);
          error = null; // Clear error if successful
          break; // Exit loop on success
        } catch (endpointError) {
          console.error(`[Upload] Endpoint ${i+1} failed:`, endpointError);
          error = endpointError;
          
          // Continue to next endpoint
          if (i < uniqueEndpoints.length - 1) {
            console.log(`[Upload] Trying next endpoint...`);
          }
        }
      }
      
      // If we still have an error after all attempts, throw it
      if (error) throw error;
      
      // Check for upload data
      if (!uploadData || !uploadData.imageUrls) {
        console.warn("[Upload] No image URLs returned from upload");
        return formData.images;
      }
      
      console.log("[Upload] Upload successful, received URLs:", uploadData.imageUrls?.length || 0);
      return [...formData.images, ...(uploadData.imageUrls || [])];
    } catch (error) {
      console.error("[Upload] Image upload error:", error);
      toast.error("Failed to upload images: " + error.message);
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
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
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

      // Prepare clean size quantities - ensure sizes with 0 quantity are explicitly set to 0
      const cleanSizeQuantities = {};
      SIZES.forEach(size => {
        // Default all sizes to 0
        cleanSizeQuantities[size] = 0;
      });
      
      // Then set only the sizes that have quantities from our form
      Object.entries(formData.sizeQuantities).forEach(([size, qty]) => {
        cleanSizeQuantities[size] = parseInt(qty) || 0;
      });
      
      // Add detailed logging
      console.log("Original sizeQuantities:", formData.sizeQuantities);
      console.log("Cleaned sizeQuantities:", cleanSizeQuantities);
      console.log("Sizes with quantities > 0:", 
        Object.entries(cleanSizeQuantities)
          .filter(([_, qty]) => qty > 0)
          .map(([size, qty]) => `${size}: ${qty}`)
      );

      // Update product
      console.log("Updating product:", productId);
      const apiUrl = PRODUCT_ENDPOINTS.UPDATE(productId);
      console.log("API URL:", apiUrl);

      // Prepare payload with color inventories
      const payload = {
        ...formData,
        mrpPrice: parseFloat(formData.mrpPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        images: imageUrls,
        sizeQuantities: cleanSizeQuantities,
        colorInventories: colorInventories.map((item) => ({
          color: item.color,
          colorCode: item.colorCode || "",
          inventory: item.inventory,
        })),
      };

      console.log("Update payload:", JSON.stringify(payload));

      const response = await authFetch(
        apiUrl,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
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
      
      // Force a refresh of the products list cache by setting a flag in localStorage
      localStorage.setItem('product_list_updated', Date.now().toString());
      
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
    <div className="max-w-4xl mx-auto p-6 bg-background min-h-screen">
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
            <FiEdit2 className="w-6 h-6 stroke-2 text-white" />
          </span>
          Edit Product
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

          {/* Category and Subcategory Selection */}
          <div className="grid grid-cols-2 gap-4">
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
                <option value="">Select Category</option>
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
                <option value="">Select Subcategory</option>
                {availableSubcategories.map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Returnable/Non-Returnable Field - Place after Category and Subcategory */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Returnable/Non-Returnable
            </label>
            <div className="relative">
              <select
                name="isReturnable"
                value={formData.isReturnable ? "true" : "false"}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    isReturnable: e.target.value === "true"
                  }));
                }}
                className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors appearance-none pr-10"
                required
              >
                <option value="true">Returnable :- 8% Commission</option>
                <option value="false">Non-Returnable :- 12% Commission</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Product Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
            />
          </div>

          {/* Color Palette */}
          <div className="bg-background-alt p-6 rounded-lg border border-ui-border">
            <label className="block text-sm font-medium text-text-dark mb-4">
              Color Options
            </label>

            <div className="grid grid-cols-6 gap-3">
              {COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => handleColorSelect(color)}
                  className={`relative flex flex-col items-center space-y-1 p-2 rounded-md transition-all ${
                    selectedColor && selectedColor.name === color.name
                      ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-yellow-500"
                      : "hover:bg-background"
                  }`}
                >
                  <div
                    className="relative w-8 h-8 rounded-full border border-ui-border shadow-sm flex items-center justify-center"
                    style={{ backgroundColor: color.hex }}
                  >
                  {selectedColor && selectedColor.name === color.name && (
                    <FiCheck
                      className={`w-5 h-5 ${
                        color.name === "White" || color.name === "Yellow" || color.name === "Lime" || color.name === "Silver" || color.name === "Beige" || color.name === "Cyan"
                          ? "text-black"
                          : "text-white"
                      }`}
                    />
                  )}
                  </div>
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

          {/* Quantity by Size */}
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

            <div className="grid grid-cols-6 gap-4 mb-4">
              {SIZES.slice(0, 6).map((size) => {
                // Determine quantity value based on whether a color is selected
                const sizeData = selectedColor 
                  ? currentColorSizes.find(s => s.size === size)
                  : selectedSizes.find(s => s.size === size);
                const quantity = sizeData?.quantity || "";
                
                return (
                  <div key={size} className="flex flex-col items-center">
                    <div className="bg-background-alt p-2 w-12 h-12 flex items-center justify-center mb-2 rounded-md rotate-45">
                      <span className="text-sm font-medium -rotate-45">{size}</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      className="w-full p-2 border border-ui-border rounded-md text-center"
                      placeholder="0"
                      value={quantity}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        if (selectedColor) {
                          // Update color inventory
                          const existing = currentColorSizes.find(
                            (item) => item.size === size
                          );
                          let updatedColorSizes;

                          if (existing) {
                            // Update existing size
                            updatedColorSizes = currentColorSizes.map((item) =>
                              item.size === size
                                ? { ...item, quantity: value }
                                : item
                            );
                          } else if (value > 0) {
                            // Add new size
                            updatedColorSizes = [
                              ...currentColorSizes,
                              {
                                size,
                                quantity: value,
                              },
                            ];
                          } else {
                            updatedColorSizes = currentColorSizes;
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
                            inventoryObj[size] = value;

                            updatedInventories[existingColorIndex] = {
                              ...updatedInventories[existingColorIndex],
                              inventory: inventoryObj,
                            };

                            setColorInventories(updatedInventories);
                          } else if (value > 0) {
                            // Create new color inventory
                            const inventoryObj = {};
                            inventoryObj[size] = value;
                            
                            setColorInventories([
                              ...colorInventories,
                              {
                                color: selectedColor.name,
                                colorCode: selectedColor.hex,
                                inventory: inventoryObj,
                              },
                            ]);
                          }
                        } else {
                          // Update default inventory
                          const newSizes = [...selectedSizes];
                          const index = newSizes.findIndex(s => s.size === size);
                          
                          if (index >= 0) {
                            if (value > 0) {
                              newSizes[index].quantity = value;
                            } else {
                              newSizes.splice(index, 1);
                            }
                          } else if (value > 0) {
                            newSizes.push({ size, quantity: value });
                          }
                          
                          setSelectedSizes(newSizes);
                          
                          // Update formData
                          const updatedSizeQuantities = { ...formData.sizeQuantities };
                          updatedSizeQuantities[size] = value;
                          setFormData((prev) => ({
                            ...prev,
                            sizeQuantities: updatedSizeQuantities,
                          }));
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Price */}
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
              Price
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase">
                  MRP Price
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
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase">
                  Selling Price
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
          </div>

          {/* Current Images */}
          {previewImages.length > 0 && (
            <div className="bg-background-alt p-6 rounded-lg border border-ui-border">
              <label className="block text-sm font-medium text-text-dark mb-3">
                Current Images
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {previewImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square relative overflow-hidden rounded-lg border border-ui-border bg-background-alt shadow-sm transition-transform group-hover:scale-105">
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
                      className="absolute -top-2 -right-2 bg-error text-white rounded-full p-1 shadow-sm hover:bg-opacity-90 transition-colors"
                    >
                      <FiX className="h-4 w-4 stroke-2" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Images */}
          <div className="border border-ui-border border-dashed rounded-lg bg-background-alt">
            <label className="block text-sm font-medium text-text-dark p-4 pb-0">
              Add More Photos
            </label>
            <div className="flex justify-center px-6 pt-4 pb-6">
              <div className="space-y-1 text-center">
                <FiUpload className="mx-auto h-14 w-14 text-secondary opacity-80 stroke-[1.5]" />
                <div className="flex text-sm text-text-muted">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-background rounded-md font-medium text-secondary hover:text-secondary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-secondary transition-colors"
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
          </div>

          {error && (
            <div className="bg-error bg-opacity-10 text-error px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Form Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-ui-border">
            <button
              type="button"
              onClick={() => router.push("/seller/products")}
              className="px-5 py-2.5 text-text-dark border border-ui-border rounded-md hover:bg-background-alt transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="bg-secondary text-black px-6 py-3 rounded-md hover:bg-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {uploading ? "Uploading..." : "Updating..."}
                </span>
              ) : (
                "Update Product"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
