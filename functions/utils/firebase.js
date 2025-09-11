const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore"); // Import FieldValue correctly
const timestamp = require("./timestamp");
const { constants } = require("./constants");
let db;

let bookmarksCollection;


const initFirebase = () => {
  admin.initializeApp();
  db = admin.firestore();
  bookmarksCollection = db.collection(constants.BOOKMARKS_COLLECTION);
};

const createBookmark = async (bookmark) => {
  try {
    const id = `BZIMD_${Date.now()}`;
    const newBookmark = {
      id,
      name: bookmark.name,
      link: bookmark.link,
      deleted: false,
      created_at: timestamp(),
      updated_at: timestamp(),
    };
    // await db.collection(constants.BOOKMARKS_COLLECTION).doc(bookmark.group_id).set(newBookmark);
    const docRef = bookmarksCollection.doc(bookmark.group_id);
    await docRef.update({
      bookmarks: FieldValue.arrayUnion(newBookmark),
    });
  } catch (error) {
    throw new Error(`\n[FIREBASE_ERROR]\n${error.toString()}\n`);
  }
};

const updateBookmark = async (bookmark) => {
  try {
    const newBookmark = {
      id: bookmark.id,
      name: bookmark.name,
      link: bookmark.link,
      updated_at: timestamp(),
    };
    // await db.collection(constants.BOOKMARKS_COLLECTION).doc(bookmark.group_id).set(newBookmark);
    const docRef = bookmarksCollection.doc(bookmark.group_id);

    // 1. Fetch the document to get the current bookmarks array
    const docSnapshot = await docRef.get();
    const currentBookmarks = docSnapshot.data().bookmarks;

    // 2. Find the index of the bookmark to update
    const bookmarkIndex = currentBookmarks.findIndex(
      (existingBookmark) => existingBookmark.id === bookmark.id
    );

    if (bookmarkIndex === -1) {
      throw `Invalid bookmark id : ${bookmark.id} or can't find the bookmark`;
    }

    // 3. Create a new bookmarks array with the updated bookmark
    const updatedBookmarks = [
      ...currentBookmarks.slice(0, bookmarkIndex),
      { ...currentBookmarks[bookmarkIndex], ...newBookmark },
      ...currentBookmarks.slice(bookmarkIndex + 1),
    ];

    await docRef.update({ bookmarks: updatedBookmarks });
  } catch (error) {
    throw new Error(`[FIREBASE_ERROR]:${error.toString()}`);
  }
};

const deleteBookmark = async (bookmark) => {
  try {
    const updates = {
      deleted: true,
      updated_at: timestamp(),
      deleted_at: timestamp(),
    };
    // await db.collection(constants.BOOKMARKS_COLLECTION).doc(bookmark.group_id).set(newBookmark);
    const docRef = bookmarksCollection.doc(bookmark.group_id);

    // 1. Fetch the document to get the current bookmarks array
    const docSnapshot = await docRef.get();
    const currentBookmarks = docSnapshot.data().bookmarks;

    // 2. Find the index of the bookmark to update
    const bookmarkIndex = currentBookmarks.findIndex(
      (existingBookmark) => existingBookmark.id === bookmark.id
    );

    if (bookmarkIndex === -1) {
      throw `Invalid bookmark id : ${bookmark.id} or can't find the bookmark`;
    }

    // 3. Create a new bookmarks array with the updated bookmark
    const updatedBookmarks = [
      ...currentBookmarks.slice(0, bookmarkIndex),
      { ...currentBookmarks[bookmarkIndex], ...updates },
      ...currentBookmarks.slice(bookmarkIndex + 1),
    ];

    await docRef.update({ bookmarks: updatedBookmarks });
  } catch (error) {
    throw new Error(`[FIREBASE_ERROR]:${error.toString()}`);
  }
};

const getBookmarks = async () => {
  try {
    const queryRef = bookmarksCollection
      .where("deleted", "==", false)
      .orderBy("created_at", "desc");

    const docSnapshot = await queryRef.get();

    let docs = [];
    if (docSnapshot._size > 0) {
      docSnapshot.forEach((doc) => {
        const filteredBookmarks = doc
          .data()
          .bookmarks.filter((bookmark) => !bookmark.deleted);
        const result = {
          title: doc.data().name,
          id: doc.data().id,
          bookmarks: filteredBookmarks,
        };
        docs.push(result);
      });
    }
    return docs;
  } catch (error) {
    throw new Error(`[FIREBASE_ERROR]:${error.toString()}`);
  }
};

const moveBookmark = async (fromGroupId, toGroupId, bookmarkId, position) => {
  try {
    const fromDocRef = bookmarksCollection.doc(fromGroupId);
    const toDocRef = bookmarksCollection.doc(toGroupId);

    // Fetch the documents for both groups
    const fromDoc = await fromDocRef.get();
    const toDoc = await toDocRef.get();

    if (!fromDoc.exists || !toDoc.exists) {
      throw constants.BOOKMARK_NOT_EXIST;
    }

    const fromGroupData = fromDoc.data();
    let toGroupData = toDoc.data();

    const deletedToGroupData = toGroupData.bookmarks.filter(
      (bookmark) => bookmark.deleted
    );

    toGroupData.bookmarks = toGroupData.bookmarks.filter(
      (bookmark) => !bookmark.deleted
    );

    // Find the bookmark in the fromGroup
    const bookmarkIndex = fromGroupData.bookmarks.findIndex(
      (bm) => bm.id === bookmarkId
    );
    if (bookmarkIndex === -1) {
      throw constants.BOOKMARK_NOT_FOUND;
    }

    // Remove the bookmark from the fromGroup
    const [bookmark] = fromGroupData.bookmarks.splice(bookmarkIndex, 1);
    bookmark.updated_at = timestamp();

    if (fromGroupId !== toGroupId) {
      // Only perform these operations if fromGroupId and toGroupId are different
      // Insert the bookmark into the toGroup at the specified position
      toGroupData.bookmarks.splice(position, 0, bookmark);
      // Update the Firestore
      await fromDocRef.update({ bookmarks: fromGroupData.bookmarks });
      await toDocRef.update({
        bookmarks: [...toGroupData.bookmarks, ...deletedToGroupData],
      });
    } else {
      toGroupData.bookmarks.splice(bookmarkIndex, 1);
      // If fromGroupId and toGroupId are the same, update the position in the same group
      toGroupData.bookmarks.splice(position, 0, bookmark);
      // Update the Firestore for the same group
      await toDocRef.update({
        bookmarks: [...toGroupData.bookmarks, ...deletedToGroupData],
      });
    }
  } catch (error) {
    throw new Error(`[FIREBASE_ERROR]: ${error.toString()}`);
  }
};

const createGroup = async (name) => {
  try {
    const id = `GZIMD_${Date.now()}`;
    const newGroup = {
      id,
      name,
      deleted: false,
      bookmarks: [],
      created_at: timestamp(),
      updated_at: timestamp(),
      deleted_at: null,
    };
    await bookmarksCollection.doc(id).set(newGroup);
  } catch (error) {
    throw ("firebase error", error);
  }
};

const updateGroup = async (group) => {
  try {
    const updatedGroup = {
      name: group.name,
      updated_at: timestamp(),
    };
    const docRef = bookmarksCollection.doc(group.group_id);

    await docRef.update(updatedGroup);
  } catch (error) {
    throw new Error(`[FIREBASE_ERROR]:${error.toString()}`);
  }
};

module.exports = {
  createBookmark,
  updateBookmark,
  deleteBookmark,
  getBookmarks,
  moveBookmark,
  createGroup,
  updateGroup,
  initFirebase,
};
