import "./globals.css";
import { Inter } from "next/font/google";
import Script from "next/script";
import ClientLayout from "./client-layout";

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
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
