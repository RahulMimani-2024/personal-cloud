const passport = require("passport");
const passportJWT = require("passport-jwt");
const ExtractJWT = passportJWT.ExtractJwt;
const LocalStrategy = require("passport-local").Strategy;
const JWTStrategy = passportJWT.Strategy;
const db = require("./src/firestore/index")
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async function (email, password, cb) {
      try {
        const usersRef = db.collection("Users");
        const query = usersRef.where("email", "==", email);
        const querySnapshot = await query.get();
        if (querySnapshot.empty) {
          return cb(null, false, { message: "User Not Found" });
        } else {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          const isPasswordCorrect = userData.password === password;
          if (isPasswordCorrect) {
            return cb(null, userData, { message: "Logged In Successfully" });
          } else {
            return cb(null, false, { message: "Password Incorrect" });
          }
        }
      } catch (error) {
        return cb(error);
      }
    }
  )
);

// middlewares
passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_TOKEN,
    },
    async function (jwtPayload, cb) {
      try {
        const { email, password } = jwtPayload;
        const usersRef = db.collection("Users");
        const query = usersRef.where("email", "==", email);
        const querySnapshot = await query.get();

        if (querySnapshot.empty) {
          return cb(null,false,{ message: "User Not Found" });
        } else {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          const isPasswordCorrect = userData.password === password;

          if (isPasswordCorrect) {
            return cb(null,userDoc.id,{message : "set successfully"});
          } else {
            return cb(null, null,{ message: "Password Incorrect" });
          }
        }
      } catch (error) {
        return cb(error);
      }
    }
  )
);
