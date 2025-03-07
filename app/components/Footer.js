const Footer = () => {
  return (
    <footer className="bg-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">About</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="/our-story"
                  className="text-gray-600 hover:text-primary"
                >
                  Our Story
                </a>
              </li>
              <li>
                <a
                  href="/sustainability"
                  className="text-gray-600 hover:text-primary"
                >
                  Sustainability
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="/privacy-policy"
                  className="text-gray-600 hover:text-primary"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/terms-of-service"
                  className="text-gray-600 hover:text-primary"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-gray-500 text-center">
            © 2025 Fast and Fab. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
