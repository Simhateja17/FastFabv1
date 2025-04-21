export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">{children}</div>
      </div>
    </div>
  );
}
// hi