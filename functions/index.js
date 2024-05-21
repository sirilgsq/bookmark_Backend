const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const { initFirebase } = require("./utils/firebase");

const BookmarksRoute = require("./routes/Bookmarks");
const GroupsRoute = require("./routes/Groups");
const HelloWorldRoute = require("./routes/HelloWorld");

const app = express();

// Initialize Firebase Admin SDK
initFirebase();

// Middleware to parse JSON bodies
app.use(express.json());

app.use("/bookmarks", BookmarksRoute);
app.use("/groups", GroupsRoute);
app.use("/helloworld", HelloWorldRoute);

exports.api = onRequest(app);
