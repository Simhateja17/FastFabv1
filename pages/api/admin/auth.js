// Next.js API route for admin authentication
export default function handler(req, res) {
  // Only allow POST method for login
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Hardcoded admin credentials
  const ADMIN_EMAIL = "simhateja@fastandfab.in";
  const ADMIN_PASSWORD = "FabandFast@963258741";

  try {
    const { email, password } = req.body;

    // Validate request body
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Check credentials
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      // Return success with admin user object
      return res.status(200).json({
        success: true,
        admin: {
          email: ADMIN_EMAIL,
          name: "Admin",
          role: "SUPER_ADMIN",
        },
      });
    } else {
      // Invalid credentials
      return res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
