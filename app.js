require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require('lodash');
const mongoose=require('mongoose');
const encrypt=require('mongoose-encryption');

mongoose.connect("mongodb://localhost:27017/secretsDB",{useNewUrlParser:true,useUnifiedTopology: true });

const app = express();



app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const secretSchema=new mongoose.Schema(
{
email:String,
password:String
}
);

secretSchema.plugin(encrypt,{secret:process.env.SECRET_ENCRYPT ,encryptedFields:['password']});

const secrets=new mongoose.model("secrets",secretSchema);

app.get("/",function(req,res)

{
res.render("home");
});

app.get("/login",function(req,res)
{
res.render("login");
});

app.get("/register",function(req,res)
{
res.render("register");
});

app.post("/register",function(req,res)
{
  const email=req.body.username;
  const password=req.body.password;
  const secret=new secrets
  ({
  email:email,
    password:password
  });
  secret.save(function(err)
{
  if(!err)
  {
    res.render("secrets");
  }
});
});

app.post("/login",function(req,res)
{
  const loginUser=req.body.logusername;
  const loginpass=req.body.logpassword;
  secrets.findOne({email:loginUser},function(err,details)
{
  if(details)
  {
    if(details.password===loginpass)
    {
      console.log(details.password);
    res.render("secrets");
    }
  else
  {
    res.render("tryagain");
  }
}
  else
  {
  res.render("tryagain");
  }
  });
});

app.listen(3000,function()
{
  console.log("Server started on port 3000");
});
