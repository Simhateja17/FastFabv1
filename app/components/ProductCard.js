const ProductCard = ({ product }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="relative h-64">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {product.category} • {product.subcategory}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-lg font-semibold text-[#8B6E5A]">
            ₹{product.price}
          </span>
          <span className="text-sm text-gray-500">
            {product.sizes.join(", ")}
          </span>
        </div>
        <button className="mt-4 w-full bg-[#8B6E5A] text-white py-2 rounded-md hover:bg-[#7d6351] transition-colors">
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
