"use client";

import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";
import { IoLeafOutline } from "react-icons/io5";

export default function SustainabilityPage() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-secondary to-secondary-dark text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white p-4 rounded-full mb-6 text-secondary">
              <IoLeafOutline size={32} />
            </div>
            <h1 className="text-4xl font-bold mb-4">
              Our Sustainability Initiatives
            </h1>
            <p className="text-xl max-w-3xl mx-auto opacity-90">
              Discover how Fast&Fab is committed to sustainable fashion and
              ethical practices
            </p>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-background-alt border-b border-ui-border">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center text-sm text-text-muted">
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
            <FiChevronRight className="mx-2" />
            <span className="text-text-dark">Sustainability</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-background-card rounded-lg shadow-md overflow-hidden border border-ui-border">
          <div className="p-8">
            {/* Last Updated Info */}
            <div className="mb-8 pb-6 border-b border-ui-border">
              <p className="text-text-muted text-sm">
                Last updated: <span className="font-medium">March 2024</span>
              </p>
            </div>

            {/* Our Vision */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  1
                </span>
                Our Sustainability Vision
              </h2>
              <div className="space-y-6 ml-11 text-text">
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    Our Commitment
                  </h3>
                  <p className="mt-2">
                    At Fast&Fab, we believe in{" "}
                    <span className="font-medium">
                      fashion that doesn't cost the earth
                    </span>
                    . Our commitment extends beyond quick commerce to ensuring
                    environmental responsibility.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    Balancing Speed and Sustainability
                  </h3>
                  <p className="mt-2">
                    We're proving that{" "}
                    <span className="font-medium">
                      fast delivery and sustainable practices
                    </span>{" "}
                    can coexist. Our innovative approach minimizes environmental
                    impact while maintaining our 30-minute delivery promise.
                  </p>
                </div>
              </div>
            </section>

            {/* Sustainable Materials */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  2
                </span>
                Sustainable Materials
              </h2>
              <div className="space-y-6 ml-11 text-text">
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    Eco-Friendly Fabrics
                  </h3>
                  <p className="mt-2">
                    We prioritize partnering with brands that use{" "}
                    <span className="font-medium">
                      organic cotton, recycled polyester, and other eco-friendly
                      materials
                    </span>
                    . By 2025, we aim to have 50% of our product range made from
                    sustainable materials.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    Reducing Harmful Chemicals
                  </h3>
                  <p className="mt-2">
                    We're working with manufacturers who are committed to{" "}
                    <span className="font-medium">
                      reducing harmful chemicals in the dyeing and production
                      processes
                    </span>
                    , protecting both the environment and our customers.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    Sustainable Product Labels
                  </h3>
                  <p className="mt-2">
                    Look for our{" "}
                    <span className="font-medium">"Earth-Friendly" labels</span>{" "}
                    that highlight products meeting our sustainability criteria.
                  </p>
                </div>
              </div>
            </section>

            {/* Carbon Footprint Reduction */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  3
                </span>
                Carbon Footprint Reduction
              </h2>
              <div className="space-y-6 ml-11 text-text">
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    Green Delivery Fleet
                  </h3>
                  <p className="mt-2">
                    Our delivery fleet includes{" "}
                    <span className="font-medium">
                      electric vehicles and bicycles
                    </span>{" "}
                    in many urban areas, reducing emissions while maintaining
                    our quick delivery promise.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    Carbon Offsetting
                  </h3>
                  <p className="mt-2">
                    For deliveries that still require traditional vehicles, we{" "}
                    <span className="font-medium">
                      invest in carbon offset programs
                    </span>{" "}
                    to neutralize our environmental impact.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    Micro-Fulfillment Centers
                  </h3>
                  <p className="mt-2">
                    Our{" "}
                    <span className="font-medium">
                      strategically located micro-fulfillment centers
                    </span>{" "}
                    reduce delivery distances and lower the carbon footprint of
                    each order.
                  </p>
                </div>
              </div>
            </section>

            {/* Circular Fashion */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  4
                </span>
                Circular Fashion Initiatives
              </h2>
              <div className="space-y-6 ml-11 text-text">
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    Clothing Recycle Program
                  </h3>
                  <p className="mt-2">
                    Our <span className="font-medium">"Give Back" program</span>{" "}
                    allows customers to return old clothing items during
                    delivery of new orders, which we then recycle or upcycle.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    Repair Services
                  </h3>
                  <p className="mt-2">
                    We partner with local tailors to offer{" "}
                    <span className="font-medium">quick repair services</span>{" "}
                    for minor damages, extending the life of your favorite
                    fashion items.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    Second-Life Marketplace
                  </h3>
                  <p className="mt-2">
                    Coming soon: Our{" "}
                    <span className="font-medium">second-hand marketplace</span>{" "}
                    will allow customers to buy and sell pre-loved fashion
                    items, further extending the lifecycle of clothing.
                  </p>
                </div>
              </div>
            </section>

            {/* Ethical Practices */}
            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                <span className="bg-primary bg-opacity-10 text-primary rounded-full w-8 h-8 inline-flex items-center justify-center mr-3 text-sm">
                  5
                </span>
                Ethical Manufacturing
              </h2>
              <div className="space-y-6 ml-11 text-text">
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    Fair Labor Practices
                  </h3>
                  <p className="mt-2">
                    We only partner with manufacturers who commit to{" "}
                    <span className="font-medium">
                      fair wages and safe working conditions
                    </span>{" "}
                    for their employees.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    Transparent Supply Chain
                  </h3>
                  <p className="mt-2">
                    We're working towards{" "}
                    <span className="font-medium">
                      100% supply chain transparency
                    </span>{" "}
                    by 2026, allowing customers to trace the journey of their
                    products from raw materials to delivery.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-dark">
                    Supporting Local Artisans
                  </h3>
                  <p className="mt-2">
                    Our{" "}
                    <span className="font-medium">"Artisan Collection"</span>{" "}
                    showcases products from local craftspeople, preserving
                    traditional techniques while providing sustainable
                    livelihoods.
                  </p>
                </div>
              </div>
            </section>

            {/* Get Involved */}
            <section className="mt-12">
              <div className="bg-background-alt rounded-lg p-6 border border-ui-border">
                <h2 className="text-xl font-semibold text-primary mb-2">
                  Join Our Sustainability Journey
                </h2>
                <p className="text-text mb-4">
                  We're constantly working to improve our sustainability
                  practices. Have suggestions or want to learn more? Contact our
                  sustainability team at{" "}
                  <a
                    href="mailto:sustainability@fastandfab.in"
                    className="text-secondary hover:text-secondary-dark font-medium underline"
                  >
                    sustainability@fastandfab.in
                  </a>
                </p>
                <p className="text-text">
                  Follow our{" "}
                  <a
                    href="#"
                    className="text-secondary hover:text-secondary-dark font-medium underline"
                  >
                    #FashionWithPurpose
                  </a>{" "}
                  campaign on social media to stay updated on our latest
                  initiatives.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
