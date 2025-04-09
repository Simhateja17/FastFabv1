import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from '@vercel/analytics/react';
import { AuthContextProvider } from "@/app/context/AuthContext";
import { UserAuthProvider } from "@/app/context/UserAuthContext";
import { Toaster } from "react-hot-toast";

// For consistent font across the app
const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata = {
  title: "FastFab - Ultra-fast Fashion Delivery",
  description: "Get the latest fashion delivered to your doorstep in 30 minutes",
  keywords: "fashion, delivery, clothing, fast delivery, hyderabad",
  authors: [{ name: "FastFab Team", url: "https://fastandfab.in" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://fastandfab.in"),
  openGraph: {
    title: "FastFab - Ultra-fast Fashion Delivery",
    description: "Get the latest fashion delivered to your doorstep in 30 minutes",
    url: "https://fastandfab.in",
    siteName: "FastFab",
    locale: "en_IN",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          async
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        ></script>
      </head>
      <body className={inter.className}>
        <AuthContextProvider>
          <UserAuthProvider>
            {children}
            <Toaster
              position="top-center"
              reverseOrder={false}
              toastOptions={{
                duration: 3000,
                style: {
                  background: "#363636",
                  color: "#fff",
                },
              }}
            />
          </UserAuthProvider>
        </AuthContextProvider>
        <Analytics />
      </body>
    </html>
  );
} 