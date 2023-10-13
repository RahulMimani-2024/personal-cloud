const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
var serviceAccount = require("../../personal-cloud-79669-firebase-adminsdk-zjp0o-87f447b409.json");
initializeApp({
  credential: cert(serviceAccount),
});
const db = getFirestore();
module.exports = db;
