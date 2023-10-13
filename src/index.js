const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
const passport = require("passport");
require("../passport");
app.use(passport.initialize());
const auth = require("./routes/auth");
const user = require("./routes/user");
const signup = require("./routes/signup.js");
app.use("/auth", auth);
app.use(signup);
app.use("/user", user);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
