const admin = require("firebase-admin");
const { status } = require("../utils/constants");

/**
 * Authentication middleware to protect routes
 * Verifies the Firebase ID token from Authorization header
 * Adds user information to req.user for use in route handlers
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Initialize Firebase services
    if (!admin.apps.length) {
      admin.initializeApp();
    }

    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No authorization token provided",
        status: status.UNAUTHORIZED,
      });
    }

    // Extract the token
    const idToken = authHeader.split("Bearer ")[1];
    
    if (!idToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization header format",
        status: status.UNAUTHORIZED,
      });
    }

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log("decodedToken", decodedToken);
    // Add user information to the request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
      email_verified: decodedToken.email_verified,
    };

    // Continue to the next middleware/route handler
    next();
    
  } catch (error) {
    console.error("Authentication middleware error:", error);

    // Handle specific Firebase Auth errors
    if (error.code === "auth/invalid-id-token") {
      return res.status(401).json({
        success: false,
        message: "Invalid ID token",
        status: status.UNAUTHORIZED,
      });
    }

    if (error.code === "auth/id-token-expired") {
      return res.status(401).json({
        success: false,
        message: "ID token has expired",
        status: status.UNAUTHORIZED,
      });
    }

    if (error.code === "auth/argument-error") {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
        status: status.UNAUTHORIZED,
      });
    }

    // Generic error response
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
      status: status.UNAUTHORIZED,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Optional middleware to check if user exists in Firestore
 * Use this if you need to ensure the user is registered in your database
 */
const requireUserInDatabase = async (req, res, next) => {
  try {
    if (!admin.apps.length) {
      admin.initializeApp();
    }

    const db = admin.firestore();
    const usersCollection = db.collection("users");
    
    // Check if user exists in Firestore
    const userDoc = await usersCollection.doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User not found in database. Please complete registration first.",
        status: status.NOT_FOUND,
      });
    }

    // Add user data from Firestore to request
    req.userData = userDoc.data();
    
    next();
    
  } catch (error) {
    console.error("User database check error:", error);
    
    return res.status(500).json({
      success: false,
      message: "Error checking user registration",
      status: status.INTERNAL_SERVER_ERROR,
    });
  }
};

/**
 * Middleware to check if user has specific permissions
 * Example: Check if user owns a resource
 */
const requireOwnership = (resourceField = 'userId') => {
  return (req, res, next) => {
    try {
      // Get the resource ID from params or body
      const resourceId = req.params.id || req.body.id;
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: "Resource ID is required",
          status: status.BAD_REQUEST,
        });
      }

      // This is a placeholder - you'll need to implement the actual ownership check
      // based on your data structure. For example:
      // const resource = await getResourceById(resourceId);
      // if (resource[resourceField] !== req.user.uid) {
      //   return res.status(403).json({
      //     success: false,
      //     message: "Access denied. You don't own this resource.",
      //     status: status.FORBIDDEN,
      //   });
      // }

      next();
      
    } catch (error) {
      console.error("Ownership check error:", error);
      
      return res.status(500).json({
        success: false,
        message: "Error checking resource ownership",
        status: status.INTERNAL_SERVER_ERROR,
      });
    }
  };
};

module.exports = {
  authenticateToken,
  requireUserInDatabase,
  requireOwnership,
};
