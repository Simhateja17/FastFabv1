"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { FiMail, FiPhone, FiMapPin, FiClock, FiUser } from "react-icons/fi";
import LoadingButton from "@/app/components/LoadingButton";

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // In a real implementation, you would send an email to simhateja@fastandfab.in
    // For now, we'll simulate the form submission
    setTimeout(() => {
      toast.success("Your message has been sent to simhateja@fastandfab.in!");
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-primary text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-4 text-center">Contact Us</h1>
          <p className="text-lg text-center max-w-2xl mx-auto">
            We're here to help! Reach out to us with any questions or concerns.
          </p>
          <p className="text-sm text-center mt-2">
            Last updated on 15-03-2025 19:11:27
          </p>
        </div>
      </div>

      {/* Contact Information and Form */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-background-card rounded-lg shadow-sm overflow-hidden">
          <div className="grid md:grid-cols-2">
            {/* Contact Information */}
            <div className="bg-primary text-white p-6">
              <h2 className="text-xl font-semibold mb-6">Get in Touch</h2>

              <div className="space-y-4">
                <div className="flex items-center">
                  <FiUser className="h-5 w-5 mr-3" />
                  <div>
                    <p className="font-medium">Legal Entity</p>
                    <p>COUTURE SERVICES PRIVATE LIMITED</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <FiMail className="h-5 w-5 mr-3" />
                  <div>
                    <p className="font-medium">Email</p>
                    <a
                      href="mailto:simhateja@fastandfab.in"
                      className="hover:underline"
                    >
                      simhateja@fastandfab.in
                    </a>
                  </div>
                </div>

                <div className="flex items-center">
                  <FiPhone className="h-5 w-5 mr-3" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <p>+91 6301658275</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <FiMapPin className="h-5 w-5 mr-3 mt-1" />
                  <div>
                    <p className="font-medium">Registered Address</p>
                    <p>
                      2/61, EGUVAVAMANDAPALLI, Mandapalli, Rajampet, Cuddapah-
                      516150, Andhra Pradesh, PIN: 516150
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <FiMapPin className="h-5 w-5 mr-3 mt-1" />
                  <div>
                    <p className="font-medium">Operational Address</p>
                    <p>
                      2/61, EGUVAVAMANDAPALLI, Mandapalli, Rajampet, Cuddapah-
                      516150, Andhra Pradesh, PIN: 516150
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-text-dark mb-4">
                Send Us a Message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-text mb-1"
                  >
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-input"
                    placeholder="Enter your name"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-text mb-1"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-input"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-text mb-1"
                  >
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-input"
                    placeholder="Enter subject"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-text mb-1"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-3 py-2 border border-ui-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-input"
                    placeholder="Enter your message"
                    required
                  ></textarea>
                </div>

                <LoadingButton
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={loading}
                  loadingText="Sending..."
                >
                  Send Message
                </LoadingButton>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
