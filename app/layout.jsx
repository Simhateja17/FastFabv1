import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./providers";

export const metadata = {
  title: "Fast & Fab",
  description: "Seller registration and management platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen flex flex-col font-montserrat">
        <AuthProvider>
          <ToastProvider />
          <Navbar />
          <main className="flex-grow">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
