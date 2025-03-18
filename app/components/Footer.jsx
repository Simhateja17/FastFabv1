import Link from "next/link";
import Image from "next/image";
import { FaInstagram, FaFacebook } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const Footer = () => {
  return (
    <footer className="bg-background py-12 border-t border-ui-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-start justify-between">
          {/* Logo and Description Section */}
          <div className="mb-8 lg:mb-0 lg:max-w-xs">
            <Link href="/" className="inline-block mb-4">
              <Image
                src="/logo.svg"
                alt="Fast&Fab Logo"
                width={150}
                height={50}
                className="h-12 w-auto"
              />
            </Link>
            <p className="text-text-muted mb-6">
              Your ultra-fast fashion delivery service. Get stylish outfits
              delivered in just 30 minutes in Hyderabad.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://www.instagram.com/fastandfab2025/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <FaInstagram size={20} />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61574085060609#"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <FaFacebook size={20} />
              </a>
              <a
                href="https://x.com/fast_and_fab"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-primary transition-colors"
                aria-label="Twitter"
              >
                <FaXTwitter size={20} />
              </a>
            </div>
          </div>

          {/* Links Sections */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-16">
            {/* About Section */}
            <div>
              <h3 className="text-lg font-semibold text-primary mb-4">About</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/about"
                    className="text-text hover:text-primary transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/our-story"
                    className="text-text hover:text-primary transition-colors"
                  >
                    Our Story
                  </Link>
                </li>
                <li>
                  <Link
                    href="/sustainability"
                    className="text-text hover:text-primary transition-colors"
                  >
                    Sustainability
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Section */}
            <div>
              <h3 className="text-lg font-semibold text-primary mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/privacy-policy"
                    className="text-text hover:text-primary transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms-of-service"
                    className="text-text hover:text-primary transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/returns-refunds"
                    className="text-text hover:text-primary transition-colors"
                  >
                    Returns & Refunds
                  </Link>
                </li>
              </ul>
            </div>

            {/* Customer Service Section */}
            <div>
              <h3 className="text-lg font-semibold text-primary mb-4">Help</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/contact-us"
                    className="text-text hover:text-primary transition-colors"
                  >
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/faq"
                    className="text-text hover:text-primary transition-colors"
                  >
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/shipping-policy"
                    className="text-text hover:text-primary transition-colors"
                  >
                    Shipping Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-ui-border">
          <p className="text-text-muted text-center">
            © 2025 Fast and Fab. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
