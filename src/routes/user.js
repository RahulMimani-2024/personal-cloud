const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../firestore/index");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const passport = require("passport");

router.get("/home", function (req, res, next) {
  passport.authenticate("jwt", { session: false }, async (err, user, info) => {
    if (err || !user) {
      return res
        .status(401)
        .json({ message: "Authentication failed", error: info.message });
    }
    const documentRef = db.collection("userFiles").doc(user);
    const values = (await documentRef.get()).data();
    res.status(200).send({ filenames: Object.keys(values) });
  })(req, res);
});

router.post("/upload", upload.single("file"), async function (req, res, next) {
  passport.authenticate("jwt", { session: false }, async (err, user, info) => {
    if (err || !user) {
      return res
        .status(401)
        .send({ message: "Authentication failed", error: info.message });
    }
    if (!req.file) {
      return res
        .status(404)
        .json({ message: "File Not Found", error: "file not provided" });
    }
    const userId = user;
    const buffer = req.file.buffer.toString("base64");
    const chunkSize = 1040000;
    const chunks = [];
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.slice(
        i,
        i + chunkSize > buffer.length ? buffer.length : i + chunkSize
      );
      chunks.push(chunk);
    }
    const fileId = `name:${req.file.originalname},type:${req.file.mimetype}`;
    const userFileDocRef = db.collection("userFiles").doc(user);
    const userFileDocFilenames = (await userFileDocRef.get()).data() || {};
    if (userFileDocFilenames[fileId]) {
      return res
        .status(200)
        .json({ code: 200, message: "File Already Present", data: null });
    }
    userFileDocFilenames[fileId] = chunks.length;
    await userFileDocRef.set(userFileDocFilenames, { merge: true });
    const startAt = Date.now();
    const promises = chunks.map(async (chunk, index) => {
      const key = `userId:${userId},fileId:${fileId},part:${index + 1}`;
      const hex = new Buffer(key).toString("hex");
      const data = { data: chunk };
      const collectionRef = db.collection("usersDatabases").doc(hex);
      await collectionRef.set(data);
      return `Stored part ${index + 1}`;
    });
    try {
      await Promise.all(promises);
      const endAt = Date.now();
      res.status(200).send({
        status: 200,
        message: "File parts uploaded and stored successfully",
        data: { uploadingStart: startAt, uploadingEnd: endAt },
      });
    } catch (error) {
      console.error("Error storing file parts:", error);
      res.status(500).json({
        status: 500,
        message: "Error storing file parts",
        data: error.message,
      });
    }
  })(req, res);
});

router.post("/download", function (req, res, next) {
  passport.authenticate("jwt", { session: false }, async (err, user, info) => {
    if (err || !user) {
      return res
        .status(401)
        .json({ message: "Authentication failed", error: info.message });
    }
    const userFileDocRef = db.collection("userFiles").doc(user);
    try {
      const fileId = `name:${req.body.name},type:${req.body.type}`;
      const userFileDocFilenames = (await userFileDocRef.get()).data();
      if (!userFileDocFilenames[fileId]) {
        return res.status(404).json({
          message: "File not found for the user",
          error: "File not found",
        });
      }
      const numberOfParts = userFileDocFilenames[fileId];
      const downloadPromises = [];
      const startAt = Date.now();
      for (let i = 0; i < numberOfParts; i++) {
        const docKey = `userId:${user},fileId:${fileId},part:${i + 1}`;
        const hex = new Buffer(docKey).toString("hex");
        const docRef = db.collection("usersDatabases").doc(hex);
        downloadPromises.push(
          docRef
            .get()
            .then((docSnapshot) => {
              if (docSnapshot.exists) {
                const data = docSnapshot.data();
                return data.data;
              }else{
								console.log("error")
								return ".";
							}
            })
            .catch((error) => {
              console.error("Error fetching document:", error);
              return res.status(401).json({
                message: "error in fetching document",
              });
            })
        );
      }
      const downloadedChunks = await Promise.all(downloadPromises);
      const endAt = Date.now();
      return res.status(200).send({
        code: 200,
        message: "Success",
        downloadStart: startAt,
        downloadEnd: endAt,
        data: downloadedChunks,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Error downloading file parts", error });
    }
  })(req, res);
});
module.exports = router;
