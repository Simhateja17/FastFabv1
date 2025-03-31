import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Providers } from "./providers";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";

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
  description: "Seller re gistration and management platform",
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
          <Navbar />
          <main className="flex-grow">{children}</main>
          <Footer />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
