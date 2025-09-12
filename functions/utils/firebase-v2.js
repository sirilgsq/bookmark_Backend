const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const timestamp = require("./timestamp");
const { constants } = require("./constants");

let db;

const initFirebaseV2 = () => {
  // Check if Firebase is already initialized
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  db = admin.firestore();
};

// Helper function to get user's bookmarks collection
const getUserBookmarksCollection = (userId) => {
  return db.collection("bookmarks").doc(userId).collection("groups");
};

// Helper function to get user's bookmarks items collection
const getUserBookmarkItemsCollection = (userId, groupId) => {
  return db
    .collection("bookmarks")
    .doc(userId)
    .collection("groups")
    .doc(groupId)
    .collection("items");
};

/**
 * Create a new group for a user
 */
const createGroupV2 = async (userId, groupName) => {
  try {
    // Ensure Firebase is initialized
    initFirebaseV2();
    
    const groupId = `GZIMD_${Date.now()}`;
    const newGroup = {
      groupId,
      groupName,
      createdAt: timestamp(),
      updatedAt: timestamp(),
      deleted: false,
      deletedAt: null,
    };

    const groupRef = getUserBookmarksCollection(userId).doc(groupId);
    await groupRef.set(newGroup);

    return { groupId, ...newGroup };
  } catch (error) {
    throw new Error(`[FIREBASE_ERROR]: ${error.toString()}`);
  }
};

/**
 * Update a group for a user
 */
const updateGroupV2 = async (userId, groupId, groupName) => {
  try {
    // Ensure Firebase is initialized
    initFirebaseV2();
    const updatedGroup = {
      groupName,
      updatedAt: timestamp(),
    };

    const groupRef = getUserBookmarksCollection(userId).doc(groupId);
    await groupRef.update(updatedGroup);

    return { success: true };
  } catch (error) {
    throw new Error(`[FIREBASE_ERROR]: ${error.toString()}`);
  }
};

/**
 * Get all groups for a user
 */
const getGroupsV2 = async (userId) => {
  try {
    // Ensure Firebase is initialized
    initFirebaseV2();
    
    // First, get all groups without filtering to avoid index issues
    const groupsSnapshot = await getUserBookmarksCollection(userId)
      .get();

    const groups = [];
    groupsSnapshot.forEach((doc) => {
      const data = doc.data();
      // Filter out deleted groups in code instead of query
      if (!data.deleted) {
        groups.push({
          id: doc.id,
          ...data,
        });
      }
    });

    // Sort by createdAt in code
    groups.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA; // Descending order
    });

    return groups;
  } catch (error) {
    throw new Error(`[FIREBASE_ERROR]: ${error.toString()}`);
  }
};

/**
 * Create a new bookmark for a user in a specific group
 */
const createBookmarkV2 = async (userId, groupId, bookmarkData) => {
  try {
    // Ensure Firebase is initialized
    initFirebaseV2();
    const bookmarkId = `BZIMD_${Date.now()}`;
    const newBookmark = {
      bookmarkId,
      title: bookmarkData.title,
      url: bookmarkData.url,
      createdAt: timestamp(),
      updatedAt: timestamp(),
      deleted: false,
      deletedAt: null,
    };

    const bookmarkRef = getUserBookmarkItemsCollection(userId, groupId).doc(bookmarkId);
    await bookmarkRef.set(newBookmark);

    return { bookmarkId, ...newBookmark };
  } catch (error) {
    throw new Error(`[FIREBASE_ERROR]: ${error.toString()}`);
  }
};

/**
 * Update a bookmark for a user
 */
const updateBookmarkV2 = async (userId, groupId, bookmarkId, bookmarkData) => {
  try {
    // Ensure Firebase is initialized
    initFirebaseV2();
    const updatedBookmark = {
      title: bookmarkData.title,
      url: bookmarkData.url,
      updatedAt: timestamp(),
    };

    const bookmarkRef = getUserBookmarkItemsCollection(userId, groupId).doc(bookmarkId);
    await bookmarkRef.update(updatedBookmark);

    return { success: true };
  } catch (error) {
    throw new Error(`[FIREBASE_ERROR]: ${error.toString()}`);
  }
};

/**
 * Delete a bookmark (soft delete)
 */
const deleteBookmarkV2 = async (userId, groupId, bookmarkId) => {
  try {
    // Ensure Firebase is initialized
    initFirebaseV2();
    const updates = {
      deleted: true,
      updatedAt: timestamp(),
      deletedAt: timestamp(),
    };

    const bookmarkRef = getUserBookmarkItemsCollection(userId, groupId).doc(bookmarkId);
    await bookmarkRef.update(updates);

    return { success: true };
  } catch (error) {
    throw new Error(`[FIREBASE_ERROR]: ${error.toString()}`);
  }
};

/**
 * Get all bookmarks for a user in a specific group
 */
const getBookmarksV2 = async (userId, groupId) => {
  try {
    // Ensure Firebase is initialized
    initFirebaseV2();
    
    // Get all bookmarks without filtering to avoid index issues
    const bookmarksSnapshot = await getUserBookmarkItemsCollection(userId, groupId)
      .get();

    const bookmarks = [];
    bookmarksSnapshot.forEach((doc) => {
      const data = doc.data();
      // Filter out deleted bookmarks in code instead of query
      if (!data.deleted) {
        bookmarks.push({
          id: doc.id,
          ...data,
        });
      }
    });

    // Sort by createdAt in code
    bookmarks.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA; // Descending order
    });

    return bookmarks;
  } catch (error) {
    throw new Error(`[FIREBASE_ERROR]: ${error.toString()}`);
  }
};

/**
 * Get all bookmarks for a user across all groups
 */
const getAllBookmarksV2 = async (userId) => {
  try {
    // Ensure Firebase is initialized
    initFirebaseV2();
    // Get all groups first
    const groups = await getGroupsV2(userId);
    const allBookmarks = [];
    const groupsList = [];

    // Get bookmarks for each group
    for (const group of groups) {
      const bookmarks = await getBookmarksV2(userId, group.groupId);
      allBookmarks.push({
        group: {
          id: group.groupId,
          name: group.groupName,
          createdAt: group.createdAt,
        },
        bookmarks: bookmarks,
      });
      
      // Add group to groups list
      groupsList.push({
        id: group.groupId,
        name: group.groupName
      });
    }

    return {
      bookmarks: allBookmarks,
      groups: groupsList
    };
  } catch (error) {
    throw new Error(`[FIREBASE_ERROR]: ${error.toString()}`);
  }
};

/**
 * Move a bookmark from one group to another
 */
const moveBookmarkV2 = async (userId, fromGroupId, toGroupId, bookmarkId, position) => {
  try {
    // Ensure Firebase is initialized
    initFirebaseV2();
    // Get the bookmark from source group
    const sourceBookmarkRef = getUserBookmarkItemsCollection(userId, fromGroupId).doc(bookmarkId);
    const sourceBookmarkDoc = await sourceBookmarkRef.get();

    if (!sourceBookmarkDoc.exists) {
      throw new Error("Bookmark not found");
    }

    const bookmarkData = sourceBookmarkDoc.data();

    if (fromGroupId === toGroupId) {
      // Moving within the same group - just update the position
      // Note: Firestore doesn't have built-in ordering, so we might need to add a position field
      bookmarkData.updatedAt = timestamp();
      await sourceBookmarkRef.update(bookmarkData);
    } else {
      // Moving to a different group
      // 1. Create bookmark in destination group
      const destBookmarkRef = getUserBookmarkItemsCollection(userId, toGroupId).doc(bookmarkId);
      bookmarkData.updatedAt = timestamp();
      await destBookmarkRef.set(bookmarkData);

      // 2. Delete from source group
      await deleteBookmarkV2(userId, fromGroupId, bookmarkId);
    }

    return { success: true };
  } catch (error) {
    throw new Error(`[FIREBASE_ERROR]: ${error.toString()}`);
  }
};

/**
 * Delete a group (soft delete)
 */
const deleteGroupV2 = async (userId, groupId) => {
  try {
    // Ensure Firebase is initialized
    initFirebaseV2();
    const updates = {
      deleted: true,
      updatedAt: timestamp(),
      deletedAt: timestamp(),
    };

    const groupRef = getUserBookmarksCollection(userId).doc(groupId);
    await groupRef.update(updates);

    // Also soft delete all bookmarks in the group
    const bookmarksSnapshot = await getUserBookmarkItemsCollection(userId, groupId).get();
    const batch = db.batch();

    bookmarksSnapshot.forEach((doc) => {
      const bookmarkRef = doc.ref;
      batch.update(bookmarkRef, {
        deleted: true,
        updatedAt: timestamp(),
        deletedAt: timestamp(),
      });
    });

    await batch.commit();

    return { success: true };
  } catch (error) {
    throw new Error(`[FIREBASE_ERROR]: ${error.toString()}`);
  }
};

module.exports = {
  initFirebaseV2,
  createGroupV2,
  updateGroupV2,
  getGroupsV2,
  deleteGroupV2,
  createBookmarkV2,
  updateBookmarkV2,
  deleteBookmarkV2,
  getBookmarksV2,
  getAllBookmarksV2,
  moveBookmarkV2,
};
