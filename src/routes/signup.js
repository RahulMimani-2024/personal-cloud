const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
const db = require("../firestore/index");
async function generateRandomPassword(length) {
  const uuid = uuidv4();
  const password = uuid.replace(/-/g, "").substr(0, length);
  return password;
}
router.post("/signup", async function (req, res, next) {
  const usersRef = db.collection("Users");
  const query = usersRef.where("email", "==", req.body.email);
  const userInDatabase = await query.get();
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MY_EMAIL,
      pass: process.env.MY_EMAIL_PASS,
    },
  });
  const password =
    userInDatabase.docs.length === 0
      ? await generateRandomPassword(18)
      : userInDatabase.docs[0].data().password;
  const email = {
    from: process.env.MY_EMAIL,
    to: req.body.email,
    subject: "Password Generation",
    html: `
    <html>
      <body>
        <h1>Personal Cloud Password</h1>
        <p>Password:<b>${password}</b></p>
        <p>Thanks for using our service. See you soon!</p>
      </body>
    </html>
  `,
  };
  transporter.sendMail(email, async function (error, success) {
    if (error) {
      return res.status(500).json({
        code: 500,
        message: "Email could not be sent",
        data: null,
        error: error,
      });
    } else {
      if (userInDatabase.docs.length != 0) {
        return res.status(200).json({
          code: 200,
          message: "User already Exists , email sent succesfully",
          data: null
        });
      }
      const user = {
        email: req.body.email,
        password: password,
      };
      db.collection("Users")
        .add(user)
        .then((docRef) => {
          return res.status(200).json({
            code: 200,
            message: "Email sent Successfully, User created in Firestore",
            data: {
              messageId: success.messageId,
              userId: docRef.id,
            },
          });
        })
        .catch((error) => {
          return res.status(500).json({
            code: 500,
            message: "Email sent, but failed to create user in Firestore",
            data: null,
            error: error,
          });
        });
    }
  });
});
module.exports = router;
