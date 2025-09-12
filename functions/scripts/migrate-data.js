const admin = require("firebase-admin");
const { initFirebase } = require("../utils/firebase");
const timestamp = require("../utils/timestamp");

/**
 * Migration script to move existing bookmarks to user-based structure
 * This script should be run once to migrate existing data
 */
const migrateBookmarksToUserStructure = async () => {
  try {
    console.log("Starting migration...");
    
    // Initialize Firebase
    initFirebase();
    const db = admin.firestore();
    
    // Get all existing bookmarks from the old structure
    const oldBookmarksRef = db.collection("bookmarks");
    const oldBookmarksSnapshot = await oldBookmarksRef.get();
    
    if (oldBookmarksSnapshot.empty) {
      console.log("No existing bookmarks found to migrate.");
      return;
    }
    
    console.log(`Found ${oldBookmarksSnapshot.size} groups to migrate.`);
    
    // For each group, we need to assign it to a user
    // Since we don't have user information in the old data,
    // we'll create a default user or you can specify a user ID
    const DEFAULT_USER_ID = "migrated-user"; // Change this to a real user ID
    
    for (const doc of oldBookmarksSnapshot.docs) {
      const groupData = doc.data();
      const groupId = doc.id;
      
      console.log(`Migrating group: ${groupData.name} (${groupId})`);
      
      // Create the new group structure
      const newGroupData = {
        groupId: groupId,
        groupName: groupData.name,
        createdAt: groupData.created_at || timestamp(),
        updatedAt: groupData.updated_at || timestamp(),
        deleted: groupData.deleted || false,
        deletedAt: groupData.deleted_at || null,
      };
      
      // Create the group in the new structure
      const newGroupRef = db
        .collection("bookmarks")
        .doc(DEFAULT_USER_ID)
        .collection("groups")
        .doc(groupId);
      
      await newGroupRef.set(newGroupData);
      
      // Migrate bookmarks within the group
      if (groupData.bookmarks && Array.isArray(groupData.bookmarks)) {
        for (const bookmark of groupData.bookmarks) {
          if (!bookmark.deleted) {
            const bookmarkData = {
              bookmarkId: bookmark.id,
              title: bookmark.name,
              url: bookmark.link,
              createdAt: bookmark.created_at || timestamp(),
              updatedAt: bookmark.updated_at || timestamp(),
              deleted: bookmark.deleted || false,
              deletedAt: bookmark.deleted_at || null,
            };
            
            // Create the bookmark in the new structure
            const newBookmarkRef = newGroupRef
              .collection("items")
              .doc(bookmark.id);
            
            await newBookmarkRef.set(bookmarkData);
            console.log(`  - Migrated bookmark: ${bookmark.name}`);
          }
        }
      }
    }
    
    console.log("Migration completed successfully!");
    console.log(`Migrated data to user: ${DEFAULT_USER_ID}`);
    console.log("You can now update the DEFAULT_USER_ID and re-run for other users.");
    
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
};

/**
 * Function to assign existing data to a specific user
 */
const assignDataToUser = async (userId) => {
  try {
    console.log(`Assigning migrated data to user: ${userId}`);
    
    initFirebase();
    const db = admin.firestore();
    
    // Get all groups from the migrated user
    const migratedGroupsRef = db
      .collection("bookmarks")
      .doc("migrated-user")
      .collection("groups");
    
    const migratedGroupsSnapshot = await migratedGroupsRef.get();
    
    if (migratedGroupsSnapshot.empty) {
      console.log("No migrated data found.");
      return;
    }
    
    // Copy each group to the new user
    for (const groupDoc of migratedGroupsSnapshot.docs) {
      const groupData = groupDoc.data();
      
      // Create group for the new user
      const newGroupRef = db
        .collection("bookmarks")
        .doc(userId)
        .collection("groups")
        .doc(groupDoc.id);
      
      await newGroupRef.set(groupData);
      
      // Copy bookmarks
      const bookmarksSnapshot = await groupDoc.ref.collection("items").get();
      
      for (const bookmarkDoc of bookmarksSnapshot.docs) {
        const bookmarkData = bookmarkDoc.data();
        
        const newBookmarkRef = newGroupRef
          .collection("items")
          .doc(bookmarkDoc.id);
        
        await newBookmarkRef.set(bookmarkData);
      }
      
      console.log(`Assigned group: ${groupData.groupName} to user: ${userId}`);
    }
    
    console.log(`Successfully assigned all data to user: ${userId}`);
    
  } catch (error) {
    console.error("Assignment failed:", error);
    throw error;
  }
};

// Export functions for use
module.exports = {
  migrateBookmarksToUserStructure,
  assignDataToUser,
};

// Run migration if this file is executed directly
if (require.main === module) {
  migrateBookmarksToUserStructure()
    .then(() => {
      console.log("Migration script completed.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}
