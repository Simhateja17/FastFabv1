import React from "react";

const page = () => {
  return (
    <div className="min-h-screen bg-[#faf9f8]">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 shadow-sm">
        <h1 className="text-3xl md:text-4xl font-light mb-8 text-[#9B6D4C]">
          Privacy Policy
        </h1>

        <div className="prose prose-lg max-w-none text-[#666666]">
          <p className="mb-6">Effective Date: 22/02/2025</p>

          <p className="mb-8">
            Welcome to Couture Services Private Limited. We value your privacy
            and are committed to protecting your personal data. This Privacy
            Policy outlines how we collect, use, and protect your information
            when you use our website, mobile app, and services (collectively,
            the "Services").
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-light mb-4 text-[#9B6D4C]">
              1. Information We Collect
            </h2>
            <p>
              We may collect the following types of information when you use our
              Services:
            </p>

            <h3 className="text-xl font-light mt-6 mb-3 text-[#9B6D4C]">
              a. Personal Information
            </h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Delivery address</li>
              <li>
                Payment details (processed securely through third-party payment
                providers)
              </li>
            </ul>

            <h3 className="text-xl font-light mt-6 mb-3 text-[#9B6D4C]">
              b. Non-Personal Information
            </h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>
                Device information (IP address, browser type, operating system)
              </li>
              <li>
                Usage data (pages visited, time spent on the website, order
                history)
              </li>
              <li>Cookies and tracking technologies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-light mb-4 text-[#9B6D4C]">
              2. How We Use Your Information
            </h2>
            <p>We use your information for the following purposes:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>To process and fulfill your orders</li>
              <li>To provide customer support and respond to inquiries</li>
              <li>To improve and personalize your experience</li>
              <li>
                To send order updates, promotions, and service-related
                notifications
              </li>
              <li>
                To detect and prevent fraud, security threats, or illegal
                activities
              </li>
              <li>To comply with legal and regulatory requirements</li>
            </ul>
          </section>

          {/* Continue with other sections... */}
          <section className="mb-8">
            <h2 className="text-2xl font-light mb-4 text-[#9B6D4C]">
              3. How We Share Your Information
            </h2>
            <p>
              We do not sell your personal data. However, we may share your
              information with:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Delivery partners: To fulfill and deliver your orders</li>
              <li>Payment processors: For secure payment transactions</li>
              <li>
                Service providers: Who help us with website hosting, analytics,
                marketing, etc.
              </li>
              <li>
                Legal authorities: When required by law or to protect our rights
              </li>
            </ul>
          </section>

          {/* Add remaining sections with the same styling pattern */}
          <section className="mb-8">
            <h2 className="text-2xl font-light mb-4 text-[#9B6D4C]">
              9. Contact Us
            </h2>
            <p>If you have any questions or concerns, reach out to us at:</p>
            <p>Couture Services Private Limited</p>
            <p>Email: simhateja@fastandfab.in</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default page;
