import { AuthProvider } from "@/app/context/AuthContext";
import { UserAuthProvider } from "@/app/context/UserAuthContext";
import { LocationProvider } from "@/app/context/LocationContext";
import { Toaster } from "react-hot-toast";
import "@/styles/globals.css";
import { Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Fast&Fab - Premium Ethnic Wear",
  description: "Discover the finest ethnic wear in your locality",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background`}>
        <NextTopLoader color="#FF2400" showSpinner={false} shadow={false} />
        <Toaster
          toastOptions={{
            style: {
              background: "#363636",
              color: "#fff",
            },
          }}
        />
        <AuthProvider>
          <UserAuthProvider>
            <LocationProvider>
              {children}
            </LocationProvider>
          </UserAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
} 