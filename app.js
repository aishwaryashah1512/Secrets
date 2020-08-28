require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require('lodash');
const mongoose=require('mongoose');
//const encrypt=require('mongoose-encryption');
//const md5=require('md5');
const bcrypt=require('bcrypt');
const session=require('express-session');
const passport=require('passport');
const passportLocalMongoose=require('passport-local-mongoose');
const passportLocal=require('passport-local');
const GoogleStrategy = require('passport-google-oauth20').Strategy;  //step1
const findOrCreate=require("mongoose-findorcreate"); //step 4

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
//app.use(bodyParser.json());

app.use(session({
  secret: 'Our little secret.',                          //kind of encryption key that will be stored in .env file........
  resave: false,                                 //Forces the session to be saved back to the session store, even if the session was never modified during the request. Depending on your store this may be necessary, but it can also create race conditions where a client makes two parallel requests to your server and changes made to the session in one request may get overwritten when the other request ends, even if it made no changes (this behavior also depends on what store you're using).*/
  saveUninitialized: false                       //Forces a session that is "uninitialized" to be saved to the store. A session is uninitialized when it is new but not modified. Choosing false is useful for implementing login sessions, reducing server storage usage, or complying with laws that require permission before setting a cookie. Choosing false will also help with race conditions where a client makes multiple parallel requests without a session.
}));

app.use(passport.initialize());
app.use(passport.session());

//const saltrounds=10;                           //used in bcrypt..............

mongoose.connect("mongodb://localhost:27017/secretsDB",{useNewUrlParser:true,useUnifiedTopology: true });
//console.log(md5(password)); ........md5 can be logged in console which can be then tracked back.
mongoose.set('useCreateIndex', true);

const secretSchema=new mongoose.Schema(
{
email:String,
password:String,
googleId:String,
secret:[]
}
);

secretSchema.plugin( passportLocalMongoose);    //plugin for schema.....
secretSchema.plugin(findOrCreate);   //step 5

//md5(secretSchema.plugin(encrypt,{secret:process.env.SECRET_ENCRYPT ,encryptedFields:['password']});
const User=new mongoose.model("User",secretSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {

  done(null, user.id);

});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {

    done(err, user);

  });
});

passport.use(new GoogleStrategy({       //step2
    clientID: process.env.CLIENT_ID,
    clientSecret:process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",//authorized redirect uri that eas set in googl credentials
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"   //step3 from github as google+ apis are deprecated we need to use infor dirctly from google account user info
  },
  function(accessToken, refreshToken, profile, cb) {

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res)
{
res.render("home");
});

app.get("/auth/google",//function(req,res)  //step 6
  passport.authenticate("google",{scope:['profile']}) // use passport to auhenticate user using google Strategy.profile includes email and userId on google
);

app.get("/login",function(req,res)
{
res.render("login");
});

app.get("/register",function(req,res)
{
res.render("register");
});

app.get("/secrets",function(req,res)
{
  /*if(req.isAuthenticated())
  {
    res.render("secrets");
  }
  else
  {
    console.log(req.isAuthenticated());
  res.redirect('/login');
  }
});*/
User.find({"secret":{$ne:null}},function (err,founduser) {
  if(err)
  {
    console.log(err);
  }
  else {
    if(founduser)
    {
      console.log(founduser);
      res.render("secrets",{userswithssecrets:founduser});
    }
  }
});
});

app.get("/logout",function(req,res)
{
  req.logout();    ///deauthenticates the user
  res.redirect("/");
});

app.get("/submit",function(req,res)
{
  if(req.isAuthenticated())
  {
    res.render("submit");
  }
  else
  {
    console.log(req.isAuthenticated());
  res.redirect('/login');
  }
});

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/secrets');
  });

app.post("/register",function(req,res)
{
    User.register({username:req.body.username},req.body.password,function(err,user)
  {
  if(err)
  {
    console.log(res.json(err));
    res.redirect("/register");
  }
    else
    {
      passport.authenticate("local")(req,res,function()
      {
        res.redirect("/secrets");
      });
    }
});
});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local",{failureRedirect:'/login'})(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});


app.post("/submit",function (req,res)
{
  const submitsecret=req.body.secret;
  User.findById(req.user.id,function(err,founduser)
{
  if(err)
  {
    console.log(err);
  }
  else {
    if(founduser)
    {
      founduser.secret.push(submitsecret);
      founduser.save(function () {
        res.redirect("/secrets")
      });
    }
  }
});
});

app.listen(3000,function()
{
  console.log("Server started on port 3000");
});
