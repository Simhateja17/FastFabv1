import Link from "next/link";
import { FaInstagram, FaFacebook } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const Footer = () => {
  return (
    <footer className="bg-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">About</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-text hover:text-primary">
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/our-story"
                  className="text-text hover:text-primary"
                >
                  Our Story
                </Link>
              </li>
              <li>
                <Link
                  href="/sustainability"
                  className="text-text hover:text-primary"
                >
                  Sustainability
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-text hover:text-primary"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-of-service"
                  className="text-text hover:text-primary"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/returns-refunds"
                  className="text-text hover:text-primary"
                >
                  Returns & Refunds
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">
              Customer Service
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/contact-us"
                  className="text-text hover:text-primary"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-text hover:text-primary">
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/shipping-policy"
                  className="text-text hover:text-primary"
                >
                  Shipping Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">Connect</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href=" https://www.instagram.com/fastandfab2025/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text hover:text-primary flex items-center"
                >
                  <FaInstagram className="mr-2" />
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href=" https://www.facebook.com/profile.php?id=61574085060609# "
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text hover:text-primary flex items-center"
                >
                  <FaFacebook className="mr-2" />
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/fast_and_fab"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text hover:text-primary flex items-center"
                >
                  <FaXTwitter className="mr-2" />
                  Twitter
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-ui-border">
          <p className="text-text-muted text-center">
            © 2025 Fast and Fab. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
