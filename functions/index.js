const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const { initFirebase } = require("./utils/firebase");
const cors = require("cors");

const BookmarksRoute = require("./routes/Bookmarks");
const GroupsRoute = require("./routes/Groups");
const HelloWorldRoute = require("./routes/HelloWorld");
const { status } = require("./utils/constants");

const corsOptions = {
  origin: ["http://localhost:3000", "https://p-dashboard-server.web.app","chrome-extension://gnabjnaopiklehbdbedkpigehcjemndn"],
  methods: "GET,PUT,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

const app = express();

app.use(cors(corsOptions));

const checkIPAcess = (req, res, next) => {
  // console.log(req,'req');
  const ALLOWED_IP6 = [
    // "2001:df0:b240:1b31:157c:b65:e52:c50a",
    "2001:df0:b240:1b31:7da7:5240:9fbd:890",
  ];
  const currentIP = req.headers["x-forwarded-for"];
  console.log(currentIP);
  if (ALLOWED_IP6.includes(currentIP)) {
    next();
  } else {
    res.json({
      status: status.FORBIDDEN,
    });
  }
};

app.use(checkIPAcess);

// Initialize Firebase Admin SDK
initFirebase();

// Middleware to parse JSON bodies
app.use(express.json());

app.use("/bookmarks", BookmarksRoute);
app.use("/groups", GroupsRoute);
app.use("/helloworld", HelloWorldRoute);

exports.api = onRequest(app);
