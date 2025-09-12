const express = require("express");
const admin = require("firebase-admin");
const { status } = require("../utils/constants");
const timestamp = require("../utils/timestamp");

const router = express.Router();

// Initialize Firestore - but only after Firebase is initialized
let db;
let usersCollection;

// Function to initialize Firebase services
const initFirebaseServices = () => {
  // Check if Firebase is already initialized
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  if (!db) {
    db = admin.firestore();
    usersCollection = db.collection("users");
  }
};

/**
 * POST /auth/google
 * Authenticate user with Google Sign-In using Firebase Auth
 * Store user details in Firestore if not already present
 * Return user info and auth token
 */
router.post("/google", async (req, res) => {
  try {
    // Initialize Firebase services
    initFirebaseServices();
    
    const { idToken } = req.body;

    // Validate request body
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "ID token is required",
        status: status.BAD_REQUEST,
      });
    }

    // Verify the ID token with Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    // Check if user already exists in Firestore
    const userDoc = await usersCollection.doc(uid).get();

    let userData;
    if (!userDoc.exists) {
      // Create new user document if it doesn't exist
      userData = {
        uid,
        email,
        displayName: name,
        photoURL: picture,
        createdAt: timestamp(),
        updatedAt: timestamp(),
      };

      await usersCollection.doc(uid).set(userData);
    } else {
      // Update existing user's last login time
      userData = userDoc.data();
      await usersCollection.doc(uid).update({
        updatedAt: timestamp(),
      });
    }

    // Return success response with user data
    res.status(200).json({
      success: true,
      message: "Authentication successful",
      status: status.SUCCESS,
      data: {
        user: {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          createdAt: userData.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Authentication error:", error);

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

    // Generic error response
    res.status(500).json({
      success: false,
      message: "Internal server error during authentication",
      status: status.INTERNAL_SERVER_ERROR,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * GET /auth/verify
 * Verify if a user is authenticated (optional endpoint)
 */
router.get("/verify", async (req, res) => {
  try {
    // Initialize Firebase services
    initFirebaseServices();
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No authorization token provided",
        status: status.UNAUTHORIZED,
      });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Get user data from Firestore
    const userDoc = await usersCollection.doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User not found in database",
        status: status.NOT_FOUND,
      });
    }

    const userData = userDoc.data();

    res.status(200).json({
      success: true,
      message: "User verified successfully",
      status: status.SUCCESS,
      data: {
        user: {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          createdAt: userData.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      status: status.UNAUTHORIZED,
    });
  }
});

module.exports = router;
