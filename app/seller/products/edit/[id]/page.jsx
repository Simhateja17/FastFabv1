import EditProductClient from "./EditProductClient";
import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";

export default function EditProductPage({ params }) {
  return (
    <div className="bg-background min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-background-alt border-b border-ui-border">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center text-sm text-text-muted">
            <Link href="/seller/dashboard" className="hover:text-primary">
              Dashboard
            </Link>
            <FiChevronRight className="mx-2" />
            <Link href="/seller/products" className="hover:text-primary">
              Products
            </Link>
            <FiChevronRight className="mx-2" />
            <span className="text-text-dark">Edit Product</span>
          </div>
        </div>
      </div>

      <EditProductClient productId={params.id} />
    </div>
  );
}
