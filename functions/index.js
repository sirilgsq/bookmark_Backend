const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const { initFirebase } = require("./utils/firebase");
const cors = require("cors");

const BookmarksRoute = require("./routes/Bookmarks");
const GroupsRoute = require("./routes/Groups");
const HelloWorldRoute = require("./routes/HelloWorld");
const AuthRoute = require("./routes/Auth");
const { status } = require("./utils/constants");

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:34003",
    "https://p-dashboard-server.web.app",
    "chrome-extension://oomppafhkjglllpljleahobghckjkhdk",
    "chrome-extension://clgmgnbmeadpemlifafgmdnjhdgmhlcj",
  ],
  methods: "GET,PUT,POST,DELETE,PATCH",
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

const app = express();

app.use(cors(corsOptions));


// Initialize Firebase Admin SDK
initFirebase();

// Middleware to parse JSON bodies
app.use(express.json());

app.use("/bookmarks", BookmarksRoute);
app.use("/groups", GroupsRoute);
app.use("/helloworld", HelloWorldRoute);
app.use("/auth", AuthRoute);

exports.api = onRequest(app);
