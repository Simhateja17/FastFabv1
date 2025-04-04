import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Providers } from "./providers";
import { LocationProvider } from "./context/LocationContext";
import { UserAuthProvider } from "./context/UserAuthContext";
import { AuthProvider } from "./context/AuthContext";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import LocationPermissionHandler from "./components/LocationPermissionHandler";
import { Suspense } from "react";

// Load Inter font
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  icons: {
    icon: "./logo.svg",
  },
  title: "Fast & Fab",
  description: "Seller registration and management platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`antialiased ${inter.variable}`}>
      <head>
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=AIzaSyA4WvieKAF244D5NoE4DceVPTYw_UndgEQ&libraries=places&callback=Function.prototype`}
          strategy="afterInteractive"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <Providers>
          <AuthProvider>
            <UserAuthProvider>
              <LocationProvider>
                <Navbar />
                <main className="flex-grow">
                  <LocationPermissionHandler>
                    <Suspense fallback={
                      <div className="min-h-screen flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
                      </div>
                    }>
                      {children}
                    </Suspense>
                  </LocationPermissionHandler>
                </main>
                <Footer />
              </LocationProvider>
            </UserAuthProvider>
          </AuthProvider>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
