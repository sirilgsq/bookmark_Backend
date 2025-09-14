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
    
    // Get current bookmarks count to set position
    const existingBookmarks = await getBookmarksV2(userId, groupId);
    const position = existingBookmarks.length; // Position will be the next available index
    
    // Scrape favicon from the URL
    const { getFaviconWithFallback } = require('./favicon');
    const favicon = await getFaviconWithFallback(bookmarkData.url);
    
    const newBookmark = {
      bookmarkId,
      title: bookmarkData.title,
      url: bookmarkData.url,
      favicon: favicon,
      position: position,
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
const updateBookmarkV2 = async (userId, newGroupId, bookmarkId, bookmarkData) => {
  try {
    // Ensure Firebase is initialized
    initFirebaseV2();
    
    // First, find the bookmark in any group
    const groups = await getGroupsV2(userId);
    let foundBookmark = null;
    let currentGroupId = null;
    
    for (const group of groups) {
      const searchBookmarkRef = getUserBookmarkItemsCollection(userId, group.groupId).doc(bookmarkId);
      const searchBookmarkDoc = await searchBookmarkRef.get();
      
      if (searchBookmarkDoc.exists) {
        foundBookmark = searchBookmarkDoc.data();
        currentGroupId = group.groupId;
        break;
      }
    }
    
    if (!foundBookmark) {
      throw new Error(`Bookmark with ID ${bookmarkId} not found in any group`);
    }
    
    // Check if URL has changed to determine if we need to scrape favicon
    const urlChanged = foundBookmark.url !== bookmarkData.url;
    
    const updatedBookmark = {
      title: bookmarkData.title,
      url: bookmarkData.url,
      updatedAt: timestamp(),
    };

    // If URL changed, scrape new favicon
    if (urlChanged) {
      const { getFaviconWithFallback } = require('./favicon');
      const favicon = await getFaviconWithFallback(bookmarkData.url);
      updatedBookmark.favicon = favicon;
    }
    
    // Check if we need to move the bookmark to a different group
    if (currentGroupId === newGroupId) {
      // Same group, just update the bookmark
      const bookmarkRef = getUserBookmarkItemsCollection(userId, newGroupId).doc(bookmarkId);
      await bookmarkRef.update(updatedBookmark);
      return { 
        success: true, 
        message: "Bookmark updated in same group"
      };
    } else {
      // Different group, move the bookmark
      // 1. Create bookmark in new group with updated data
      const newBookmarkRef = getUserBookmarkItemsCollection(userId, newGroupId).doc(bookmarkId);
      const newBookmarkData = {
        ...foundBookmark,
        ...updatedBookmark,
        updatedAt: timestamp(),
      };
      await newBookmarkRef.set(newBookmarkData);
      
      // 2. Delete bookmark from old group
      const oldBookmarkRef = getUserBookmarkItemsCollection(userId, currentGroupId).doc(bookmarkId);
      await oldBookmarkRef.delete();
      
      // 3. Get group names for response
      const currentGroup = groups.find(g => g.groupId === currentGroupId);
      const newGroup = groups.find(g => g.groupId === newGroupId);
      
      return { 
        success: true, 
        message: `Bookmark moved from "${currentGroup?.groupName}" to "${newGroup?.groupName}"`,
        moved: true,
        fromGroupId: currentGroupId,
        toGroupId: newGroupId
      };
    }
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

    // First, try to delete in the specified group
    const bookmarkRef = getUserBookmarkItemsCollection(userId, groupId).doc(bookmarkId);
    const bookmarkDoc = await bookmarkRef.get();
    
    if (bookmarkDoc.exists) {
      // Bookmark exists in the specified group, delete it
      await bookmarkRef.update(updates);
      return { success: true };
    } else {
      // Bookmark not found in specified group, search across all groups
      const groups = await getGroupsV2(userId);
      
      for (const group of groups) {
        const searchBookmarkRef = getUserBookmarkItemsCollection(userId, group.groupId).doc(bookmarkId);
        const searchBookmarkDoc = await searchBookmarkRef.get();
        
        if (searchBookmarkDoc.exists) {
          // Found the bookmark in this group, delete it
          await searchBookmarkRef.update(updates);
          return { 
            success: true, 
            message: `Bookmark deleted from group: ${group.groupName}`,
            actualGroupId: group.groupId
          };
        }
      }
      
      // Bookmark not found in any group
      throw new Error(`Bookmark with ID ${bookmarkId} not found in any group`);
    }
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

    // Sort by position first, then by createdAt
    bookmarks.sort((a, b) => {
      // If both have position, sort by position
      if (a.position !== undefined && b.position !== undefined) {
        return a.position - b.position; // Ascending order by position
      }
      // If only one has position, prioritize it
      if (a.position !== undefined && b.position === undefined) {
        return -1;
      }
      if (a.position === undefined && b.position !== undefined) {
        return 1;
      }
      // If neither has position, sort by createdAt
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA; // Descending order by date
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
    const targetPosition = parseInt(position, 10);

    if (fromGroupId === toGroupId) {
      // Moving within the same group - reorder positions
      const allBookmarks = await getBookmarksV2(userId, fromGroupId);
      const currentIndex = allBookmarks.findIndex(b => b.id === bookmarkId);
      
      if (currentIndex === -1) {
        throw new Error("Bookmark not found in group");
      }

      // Remove the bookmark from its current position
      const [movedBookmark] = allBookmarks.splice(currentIndex, 1);
      
      // Insert at new position
      allBookmarks.splice(targetPosition, 0, movedBookmark);
      
      // Update positions for all bookmarks
      const batch = db.batch();
      for (let i = 0; i < allBookmarks.length; i++) {
        const bookmarkRef = getUserBookmarkItemsCollection(userId, fromGroupId).doc(allBookmarks[i].id);
        batch.update(bookmarkRef, {
          position: i,
          updatedAt: timestamp()
        });
      }
      await batch.commit();
      
      return { 
        success: true, 
        message: `Bookmark position updated to ${targetPosition} in same group`
      };
    } else {
      // Moving to a different group
      // 1. Get all bookmarks from destination group
      const destBookmarks = await getBookmarksV2(userId, toGroupId);
      
      // 2. Insert bookmark at target position
      destBookmarks.splice(targetPosition, 0, {
        ...bookmarkData,
        position: targetPosition,
        updatedAt: timestamp()
      });
      
      // 3. Update positions for all bookmarks in destination group
      const batch = db.batch();
      for (let i = 0; i < destBookmarks.length; i++) {
        const bookmarkRef = getUserBookmarkItemsCollection(userId, toGroupId).doc(destBookmarks[i].id);
        if (destBookmarks[i].id === bookmarkId) {
          // Create new bookmark in destination group
          batch.set(bookmarkRef, {
            ...destBookmarks[i],
            position: i,
            updatedAt: timestamp()
          });
        } else {
          // Update existing bookmark position
          batch.update(bookmarkRef, {
            position: i,
            updatedAt: timestamp()
          });
        }
      }
      
      // 4. Delete from source group
      await sourceBookmarkRef.delete();
      
      // 5. Commit all changes
      await batch.commit();
      
      // 6. Get group names for response
      const groups = await getGroupsV2(userId);
      const fromGroup = groups.find(g => g.groupId === fromGroupId);
      const toGroup = groups.find(g => g.groupId === toGroupId);
      
      return { 
        success: true, 
        message: `Bookmark moved from "${fromGroup?.groupName}" to "${toGroup?.groupName}" at position ${targetPosition}`,
        moved: true,
        fromGroupId,
        toGroupId,
        position: targetPosition
      };
    }
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
