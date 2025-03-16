import ProtectedRoute from "@/app/components/ProtectedRoute";

export const metadata = {
  title: "Complete Your Profile - Fast&Fab",
  description: "Complete your seller profile to start selling on Fast&Fab",
};

export default function OnboardingLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#faf9f8]">
      <div className="max-w-7xl mx-auto">
        {/* Logo section */}
        <div className="py-8 text-center">
          <h1 className="text-2xl font-semibold text-[#8B6E5A]">Fast&Fab</h1>
          <p className="text-gray-600 mt-2">Seller Onboarding</p>
        </div>

        {/* Main content */}
        {children}
      </div>
    </div>
  );
}
