import ProtectedRoute from "@/app/components/ProtectedRoute";

export const metadata = {
  title: "Seller Dashboard - Fast&Fab",
  description: "Manage your products and orders",
};

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#faf9f8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-gray-600 my-4">Seller Dashboard</p>
          {children}
        </div>
      </div>
    </ProtectedRoute>
  );
}
