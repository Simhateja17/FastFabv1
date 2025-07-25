"use client";

import { useState, useEffect, useCallback } from "react";
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
  FiInfo,
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

  // Multi-page product management
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [productPages, setProductPages] = useState([{
    name: "",
    description: "",
    mrpPrice: "",
    sellingPrice: "",
    category: "",
    subcategory: "",
    selectedColor: "",
    selectedSizes: [],
    images: [],
    files: [],
    isReturnable: true
  }]);

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
  });
  const [selectedCategory, setSelectedCategory] = useState("");
  const [availableSubcategories, setAvailableSubcategories] = useState([]);

  const saveCurrentPageData = useCallback(() => {
    if (currentPage === 0) return; // Skip if on introduction screen
    
    // Deep clone the current form data for this page
    let pageData = {
      name: formData.name,
      description: formData.description,
      mrpPrice: formData.mrpPrice,
      sellingPrice: formData.sellingPrice,
      category: formData.category,
      subcategory: formData.subcategory,
      isReturnable: formData.isReturnable,
    };
    
    // If this is the base variant, include size quantities directly
    if (currentPage === 1) {
      pageData.sizeQuantities = { ...formData.sizeQuantities };
    }
    
    // Save data for this specific variant (color/size page)
    let allPageData = [...productPages];
    
    // For the current page, store both form data and selected sizes/color
    allPageData[currentPage - 1] = {
      ...pageData,
      selectedColor: selectedColor,
      selectedSizes: selectedSizes,
      files: selectedFiles,
      images: previewImages,
    };
    
    setProductPages(allPageData);
    
    console.log(`Page ${currentPage} data saved:`, allPageData[currentPage - 1]);
  }, [currentPage, formData, selectedColor, selectedSizes, selectedFiles, previewImages, productPages]);

  // Remove current variant page
  const removeVariant = () => {
    if (totalPages <= 1) {
      toast.error("Cannot remove the only page");
      return;
    }

    // Release image preview URLs to prevent memory leaks
    previewImages.forEach(url => URL.revokeObjectURL(url));

    // Remove the current page
    const updatedPages = [...productPages];
    const pageToRemove = updatedPages[currentPage - 1];
    if (pageToRemove && pageToRemove.images) {
      pageToRemove.images.forEach(url => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    }
    updatedPages.splice(currentPage - 1, 1);
    
    // Update the pages
    setProductPages(updatedPages);
    setTotalPages(updatedPages.length);
    
    // Update the current page - go to previous page if we're removing the last page
    // or stay on the same page number otherwise (which will show the next variant)
    const newCurrentPage = currentPage > updatedPages.length 
      ? updatedPages.length 
      : currentPage;
    
    setCurrentPage(newCurrentPage);
    
    // Load the data for the new current page
    loadPageData(newCurrentPage);
    
    toast.success("Variant removed");
  };

  // Load the data for a specific page
  const loadPageData = (page) => {
    if (page < 1 || page > productPages.length) {
      console.warn(`Invalid page number: ${page}`);
      return;
    }
    
    const pageData = productPages[page - 1];
    console.log(`Loading data for page ${page}:`, pageData);
    
    // Set form field values
    setFormData({
      name: pageData.name || "",
      description: pageData.description || "",
      mrpPrice: pageData.mrpPrice || "",
      sellingPrice: pageData.sellingPrice || "",
      category: pageData.category || "",
      subcategory: pageData.subcategory || "",
      isReturnable: pageData.isReturnable !== undefined ? pageData.isReturnable : true
    });
    
    // Set color, sizes, images
    setSelectedColor(pageData.selectedColor || "");
    setSelectedSizes(pageData.selectedSizes || []);
    
    // Handle images with care - don't overwrite with empty arrays
    if (pageData.files && pageData.files.length > 0) {
      setSelectedFiles(pageData.files);
    } else {
      setSelectedFiles([]);
    }
    
    if (pageData.images && pageData.images.length > 0) {
      setPreviewImages(pageData.images);
    } else {
      setPreviewImages([]);
    }
    
    console.log(`Loaded ${pageData.files?.length || 0} files and ${pageData.images?.length || 0} image previews for page ${page}`);
  };

  // Go to a specific page
  const goToPage = (page) => {
    if (page < 1 || page > totalPages) {
      return;
    }
    
    // Save current page data before switching
    saveCurrentPageData();
    
    setCurrentPage(page);
    loadPageData(page);
  };

  // Create a new page for adding another color variant
  const createNewPage = () => {
    // Save current page data first - ensuring current page images are captured
    saveCurrentPageData();
    
    // Create a new page with some defaults
    const newPage = {
      name: formData.name || "", // Copy name from current product
      description: formData.description || "",
      mrpPrice: formData.mrpPrice || "",
      sellingPrice: formData.sellingPrice || "",
      category: formData.category || "",
      subcategory: formData.subcategory || "",
      isReturnable: formData.isReturnable,
      selectedColor: "",
      selectedSizes: [],
      images: [],
      files: []
    };
    
    // Add the new page to our array
    const updatedPages = [...productPages, newPage];
    setProductPages(updatedPages);
    
    // Update total pages count
    setTotalPages(updatedPages.length);
    
    // Save current files and images for safety - we'll restore them if they navigate back
    const previousPageIndex = currentPage - 1;
    if (previousPageIndex >= 0 && previousPageIndex < productPages.length) {
      const previousPage = {...productPages[previousPageIndex]};
      
      // Ensure files and images are saved securely for the previous page
      previousPage.files = selectedFiles;
      previousPage.images = previewImages;
      
      // Update the stored page data
      const updatedWithSavedPreviousPage = [...updatedPages];
      updatedWithSavedPreviousPage[previousPageIndex] = previousPage;
      setProductPages(updatedWithSavedPreviousPage);
      
      console.log(`Securely saved image data for page ${currentPage} before creating new variant`);
    }
    
    // Navigate to the new page
    setCurrentPage(updatedPages.length);
    
    // Clear certain fields for the new variant
    // Do this AFTER updating productPages to ensure we don't lose references
    setSelectedColor("");
    setSelectedSizes([]);
    setSelectedFiles([]);
    setPreviewImages([]);
    
    toast.success("New variant page created");
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
    console.log(`Files selected for variant page ${currentPage}:`, files.length);

    if (files.length === 0) return; // Early return if no files selected

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

    if (validFiles.length === 0) {
      toast.error("No valid files selected");
      // Reset the file input
      e.target.value = "";
      return;
    }

    // Create preview URLs for new valid files
    const newPreviewUrls = validFiles.map((file) => URL.createObjectURL(file));
    
    // Clear *only the current page's* previous preview URLs to prevent memory leaks
    const currentPageData = productPages[currentPage - 1];
    if (currentPageData && currentPageData.images) {
        currentPageData.images.forEach(url => {
            if (typeof url === 'string' && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
    }
    
    // Set the new files and previews in the component's state
    setSelectedFiles(validFiles);
    setPreviewImages(newPreviewUrls);
    
    // Reset the file input to allow selecting the same file again
    e.target.value = "";
    
    // Auto-save the changes
    saveCurrentPageData();
  };

  const uploadVariantImages = async (variantFiles) => {
    if (!variantFiles || variantFiles.length === 0) {
      console.warn("No files provided for upload");
      return [];
    }

    setUploading(true);
    try {
      // Create FormData
      const formData = new FormData();
      
      console.log(`Uploading ${variantFiles.length} files`);
      
      // Append files directly
      variantFiles.forEach((file) => {
        formData.append("images", file);
      });

      // Upload to seller service and get the processed response directly
      const response = await authFetch(
        PRODUCT_ENDPOINTS.UPLOAD_IMAGES,
        {
          method: "POST",
          body: formData,
        }
      );

      // Response is already JSON processed by authFetch
      if (!response.success) {
        console.error("Upload failed:", response);
        throw new Error(response.message || 'Failed to upload images');
      }

      // Validate response data structure
      if (!response.imageUrls || !Array.isArray(response.imageUrls)) {
        console.error("Invalid response format:", response);
        throw new Error("Server returned invalid response format");
      }

      console.log(`Successfully uploaded ${response.imageUrls.length} images`);
      toast.success(`Successfully uploaded ${response.imageUrls.length} images for variant`);
      return response.imageUrls;

    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error(`Upload failed: ${error.message}`);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Save current page data before validation
    saveCurrentPageData();
    
    // Validate all pages
    let isValid = true;
    let errorPage = 0;
    
    // Validate required fields on all pages
    for (let i = 0; i < productPages.length; i++) {
      const page = productPages[i]; // Data saved from previous interactions/saves
      const isCurrentPage = (i + 1 === currentPage);

      // Use live state for the current page, otherwise use saved page data
      const nameToCheck = isCurrentPage ? formData.name : page.name;
      const categoryToCheck = isCurrentPage ? formData.category : page.category;
      const subcategoryToCheck = isCurrentPage ? formData.subcategory : page.subcategory;
      const mrpPriceToCheck = isCurrentPage ? formData.mrpPrice : page.mrpPrice;
      const sellingPriceToCheck = isCurrentPage ? formData.sellingPrice : page.sellingPrice;
      const colorToCheck = isCurrentPage ? selectedColor : page.selectedColor;
      const sizesToCheck = isCurrentPage ? selectedSizes : page.selectedSizes;
      const filesToCheck = isCurrentPage ? selectedFiles : page.files;
      const imagesToCheck = isCurrentPage ? previewImages : page.images;
      
      // Page 1: Basic product information (Checked only on the first iteration)
      if (i === 0) {
        // Use the potentially live data for validation if page 1 is the current page
        if (!nameToCheck || !categoryToCheck || !subcategoryToCheck || !mrpPriceToCheck || !sellingPriceToCheck) {
          isValid = false;
          errorPage = 1;
          console.error("Missing required fields on page 1:", isCurrentPage ? {name: nameToCheck, category: categoryToCheck, subcategory: subcategoryToCheck, mrpPrice: mrpPriceToCheck, sellingPrice: sellingPriceToCheck } : page);
          break;
        }
      }
      
      // All variant pages should have color
      if (!colorToCheck) {
        isValid = false;
        errorPage = i + 1;
        console.error(`Missing color selection on page ${i + 1}:`, isCurrentPage ? { selectedColor: colorToCheck } : page);
        break;
      }
      
      // Check for images - consider both live state files/previews and saved page files/images
      const hasImages = 
        (filesToCheck && filesToCheck.length > 0) || 
        (imagesToCheck && imagesToCheck.length > 0 && 
         typeof imagesToCheck[0] === 'string' && 
         (imagesToCheck[0].startsWith('http') || imagesToCheck[0].startsWith('blob:'))); // Check for uploaded URLs or local blob previews
         
      if (!hasImages) {
        isValid = false;
        errorPage = i + 1;
        console.error(`Missing product images on page ${i + 1}:`, isCurrentPage ? { files: filesToCheck, images: imagesToCheck } : page);
        break;
      }
      
      // Ensure at least one size is selected with quantity
      if (!sizesToCheck || sizesToCheck.length === 0) {
        isValid = false;
        errorPage = i + 1;
        console.error(`Missing size selection on page ${i + 1}:`, isCurrentPage ? { selectedSizes: sizesToCheck } : page);
        break;
      }
    }
    
    if (!isValid) {
      toast.error("Please fill in all required fields");
      
      // Navigate to the page with errors
      if (errorPage !== currentPage) {
        goToPage(errorPage);
      }
      
      return;
    }
    
    // Proceed with form submission
    setLoading(true);
    setError("");
    
    try {
      // Process each page as a separate product
      for (let i = 0; i < productPages.length; i++) {
        const page = productPages[i];
        setCurrentPage(i + 1);
        
        // Get image URLs for this variant - USE LIVE STATE FOR CURRENT PAGE
        let variantImageUrls = [];
        const isCurrentPageForProcessing = (i + 1 === currentPage);
        const filesToUse = isCurrentPageForProcessing ? selectedFiles : page.files;
        const imagesToUse = isCurrentPageForProcessing ? previewImages : page.images; // These could be blob URLs or http URLs

        // If files exist (live or saved), upload them
        if (filesToUse && filesToUse.length > 0) {
          console.log(`Uploading ${filesToUse.length} images for variant ${i + 1}`);
          variantImageUrls = await uploadVariantImages(filesToUse);
        } 
        // If no files, check if existing images are valid HTTP URLs
        else if (imagesToUse && imagesToUse.length > 0) {
          const httpUrls = imagesToUse.filter(url => typeof url === 'string' && url.startsWith('http'));
          if (httpUrls.length > 0) {
             console.log(`Using existing ${httpUrls.length} image URLs for variant ${i + 1}`);
             variantImageUrls = httpUrls;
          } else {
             // This case implies imagesToUse contained only blob URLs or was unexpectedly empty.
             // Validation should ideally prevent reaching here with only blob URLs if no files were present.
             console.warn(`Variant ${i+1}: No files to upload and no existing http image URLs found in imagesToUse state/data.`);
          }
        }
        
        // Final check if we obtained valid URLs either via upload or existing ones
        if (!variantImageUrls || variantImageUrls.length === 0) {
          throw new Error(`No valid images available for variant on page ${i + 1}`);
        }
        
        // Convert size quantities array to object format
        const sizeQuantitiesObj = {};
        SIZES.forEach(size => {
          const sizeItem = page.selectedSizes.find(item => item.size === size);
          sizeQuantitiesObj[size] = sizeItem ? sizeItem.quantity : 0;
        });
        
        // Prepare color inventory
        const colorInventory = {
          color: page.selectedColor,
          colorCode: COLORS.find(c => c.name === page.selectedColor)?.hex || "",
          inventory: page.selectedSizes.reduce((acc, curr) => {
            acc[curr.size] = curr.quantity;
            return acc;
          }, {})
        };
        
        // Create the product
        const productPayload = {
          name: page.name,
          description: page.description,
          mrpPrice: parseFloat(page.mrpPrice),
          sellingPrice: parseFloat(page.sellingPrice),
          images: variantImageUrls,
          category: page.category,
          subcategory: page.subcategory,
          isReturnable: page.isReturnable,
          sizeQuantities: sizeQuantitiesObj,
          colorInventories: [colorInventory]
        };
        
        console.log(`Creating product for page ${i + 1}`, productPayload);
        
        // Use authFetch for product creation
        const response = await authFetch(
          PRODUCT_ENDPOINTS.CREATE,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(productPayload),
          }
        );

        // Check for success based on the success message from the backend
        // Adjust this string if the backend message changes
        if (response.message !== "Product created successfully") { 
          console.error(`Failed to create product for page ${i + 1}:`, response);
          // Use response.message if available, otherwise provide a default error
          throw new Error(response.message || `Failed to create product for variant ${i + 1}. Unexpected response from server.`);
        }

        // Log success based on the successful message check
        console.log(`Successfully created product for page ${i + 1}:`, response);
      }

      toast.success(`Successfully added ${productPages.length} products!`);
      router.push("/seller/products");
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error(error.message || "Failed to create product. Please try again.");
      setError(error.message || "Failed to create product");
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

    // Also update the productPages state immediately
    const updatedProductPages = [...productPages];
    if (updatedProductPages[currentPage - 1]) {
      updatedProductPages[currentPage - 1] = {
        ...updatedProductPages[currentPage - 1],
        files: newSelectedFiles,
        images: newPreviews
      };
      setProductPages(updatedProductPages);
    }
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setSelectedCategory(category);
    setFormData((prev) => ({ ...prev, category }));

    // Update available subcategories based on selected category
    const categoryObj = CATEGORIES.find((c) => c.name === category);
    setAvailableSubcategories(categoryObj ? categoryObj.subcategories : []);
  };

  // Add cleanup effect for object URLs on unmount
  useEffect(() => {
    // This function will run when the component unmounts
    return () => {
      console.log("Cleaning up object URLs on unmount...");
      productPages.forEach(page => {
        if (page.images) {
          page.images.forEach(url => {
            if (typeof url === 'string' && url.startsWith('blob:')) {
              URL.revokeObjectURL(url);
            }
          });
        }
      });
    };
  }, [productPages]); // Depend on productPages so it has the latest URLs

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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-text-dark flex items-center">
            <span className="bg-secondary bg-opacity-20 text-secondary p-2 rounded-full mr-3">
              <FiPlus className="w-6 h-6 stroke-2 text-white" />
            </span>
            Add New Product
          </h1>
          <div className="flex items-center gap-3">
            {currentPage > 1 && (
              <button
                type="button"
                onClick={removeVariant}
                className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors text-sm flex items-center"
              >
                <FiX className="mr-1" /> Remove
              </button>
            )}
            <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
              {currentPage}/{totalPages}
            </div>
          </div>
        </div>

        {/* Variant indicator */}
        {totalPages > 1 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center">
              <FiInfo className="text-blue-500 mr-2" />
              <span className="text-blue-800 font-medium">
                Editing Variant {currentPage} of {totalPages}
              </span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Images uploaded here will be associated with the {" "}
              {selectedColor ? (
                <span className="font-medium" style={{ color: COLORS.find(c => c.name === selectedColor)?.hex || "#000" }}>
                  {selectedColor}
                </span>
              ) : "current"} variant only.
            </p>
          </div>
        )}

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

          {/* Returnable Option */}
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
              Description (optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your product"
              rows={4}
              className="w-full p-3 border border-ui-border rounded-md bg-background focus:ring-2 focus:ring-secondary focus:border-secondary focus:outline-none transition-colors"
            />
          </div>

          {/* Quantity by Size */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Quantity by Size
            </label>
            <div className="grid grid-cols-6 gap-4 mb-4">
              {SIZES.slice(0, 6).map((size) => (
                <div key={size} className="flex flex-col items-center">
                  <div className="bg-background-alt p-2 w-12 h-12 flex items-center justify-center mb-2 rounded-md rotate-45">
                    <span className="text-sm font-medium -rotate-45">{size}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    className="w-full p-2 border border-ui-border rounded-md text-center"
                    placeholder="0"
                    value={selectedSizes.find(s => s.size === size)?.quantity || ""}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
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
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Colour
            </label>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="mb-1 text-xs text-gray-500">Color Options</div>
              <div className="grid grid-cols-6 gap-y-6">
                {COLORS.map((color) => (
                  <div key={color.name} className="flex flex-col items-center">
                    <button
                      type="button"
                      className={`relative w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                        selectedColor === color.name
                          ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-yellow-500"
                          : "border-ui-border hover:border-ui-border-hover"
                      }`}
                      style={{ backgroundColor: color.hex }}
                      onClick={() => setSelectedColor(color.name)}
                      title={color.name}
                    >
                      {selectedColor === color.name && (
                        <FiCheck
                          className={`w-6 h-6 ${
                            color.name === "White" || color.name === "Yellow" || color.name === "Lime" || color.name === "Silver" || color.name === "Beige" || color.name === "Cyan"
                              ? "text-black"
                              : "text-white"
                          }`}
                        />
                      )}
                    </button>
                    <span className="text-xs mt-1">{color.name}</span>
                  </div>
                ))}
              </div>
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
              </div>
            </div>
          </div>

          {/* Create New Page Option */}
          <div className="text-center border-t border-ui-border pt-4">
            <p className="text-sm text-text-muted mb-2">
              Available in another color? Create a new page and add details.
            </p>
            <button
              type="button"
              onClick={createNewPage}
              className="px-4 py-2 border border-ui-border rounded-md bg-background hover:bg-background-alt transition-colors"
            >
              Create a page
            </button>
          </div>

          {/* Product Images */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Product Images
            </label>
            <div className="border-2 border-dashed border-ui-border rounded-lg p-6 text-center">
              <input
                type="file"
                id="imageUpload"
                multiple
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              {previewImages.length > 0 ? (
                <div>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
                    {previewImages.map((url, index) => (
                      <div
                        key={index}
                        className="relative group rounded-md overflow-hidden border border-ui-border"
                      >
                        <div className="relative h-24 w-full">
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
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {previewImages.length < 5 && (
                      <label
                        htmlFor="imageUpload"
                        className="relative h-24 w-full border-2 border-dashed border-ui-border rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-background-alt transition-colors"
                      >
                        <FiPlus className="w-6 h-6 text-text-muted" />
                        <span className="text-sm text-text-muted mt-1">
                          Add More
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="imageUpload"
                  className="w-full h-40 flex flex-col items-center justify-center cursor-pointer"
                >
                  <div className="w-full h-40 flex flex-col items-center justify-center">
                    <span className="text-xl font-medium text-text-dark mb-2">Add Photos</span>
                    <FiUpload className="w-6 h-6 text-text-muted mb-1" />
                    <span className="text-sm text-text-muted">
                      Upload files or drag and drop
                    </span>
                    <span className="text-xs text-text-muted mt-1">
                      PNG, JPG, GIF up to 10MB
                    </span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Page Navigation */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 py-4">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goToPage(index + 1)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentPage === index + 1
                      ? "bg-primary text-white"
                      : "bg-background-alt text-text-muted hover:bg-background-alt-light"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          )}

          {/* Submit button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || uploading}
              className="w-full p-3 bg-primary hover:bg-primary-dark text-black font-bold rounded-md transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading || uploading ? (
                <>
                  <span className="mr-2">
                    {uploading ? "Uploading..." : "Adding Product..."}
                  </span>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
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
