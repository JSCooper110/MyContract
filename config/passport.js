var LocalStrategy = require('passport-local').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var GitHubStrategy = require('passport-github').Strategy;
var configAuth = require('./auth');
var fs = require('fs');
var path = require('path');
var db = require('../database/models/index');
var client = db.client;
var User = db.user;
var Currency = db.currency;
var Address = db.userCurrencyAddress;
var Transactions = db.icotransactions;
var Project = db.projectConfiguration;
let Promise = require('bluebird');
var bcrypt = require('bcrypt-nodejs');
const Web3 = require('web3');
const web3 = new Web3();

// methods ======================
function generateHash(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

function generateNewAccount(password) {
  return web3.eth.accounts.create(web3.utils.randomHex(32));

};

module.exports = function(passport) {


  // used to serialize the user for the session
  passport.serializeUser(function(user, done) {

    done(null, user.email);
  });

  // used to deserialize the user
  passport.deserializeUser(function(email, done) {
    client.find({
      where: {
        'email': email
      }
    }).then(client => {
      done(null, client.dataValues);
    });
  });

  //user signup strategy for passport
  passport.use('user-signup', new LocalStrategy({
      // by default, local strategy uses username and password, we will override with email
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) {
      console.log(req.body);
      process.nextTick(function() {
        // find a user whose email is the same as the forms email
        User.find({
          where: {
            'email': email,
            'projectConfigurationCoinName': req.body.projectName
          }
        }).then(async user => {
          // check to see if theres already a user with that email
          if (user) {
            return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
          } else {
            // if there is no user with that email
            // create the user
            var ethCurrency = await db.currency.findOrCreate({
              where: {
                'name': "Ethereum"
              }
            });

            var projectCurrency = await db.currency.findOrCreate({
              where: {
                'name': req.body.projectName
              }
            });

            console.log(req.body.projectName);
            //Find project details and map user
            var project = await Project.findOrCreate({
              where: {
                'coinName': req.body.projectName
              }
            });

            Promise.all([generateEthAddress(), generateEthAddress(), createNewUser(req)]).then(([createdEthAddress, createdCoinAddress, createdUser]) => {
              ethCurrency[0].addUserCurrencyAddress(createdEthAddress);
              projectCurrency[0].addUserCurrencyAddress(createdCoinAddress);
              createdUser.addUserCurrencyAddresses([createdEthAddress, createdCoinAddress]);
              project[0].addUserCurrencyAddress([createdEthAddress, createdCoinAddress]);
              project[0].addUser(createdUser);
              return done(null, createdUser.dataValues);
            });
          }
        });
      });
    }));

  //local login strategy for passport
  passport.use('user-login', new LocalStrategy({
      // by default, local strategy uses username and password, we will override with email
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true // allows us to pass back the entire request to the callback
    },
    async function(req, email, password, done) {
      // callback with email and password from our form
      // find a user whose email is the same as the forms email
      console.log(email);
      User.find({
        where: {
          'email': email,
          'projectConfigurationCoinName': req.body.projectName
        },
        attributes: ['email', 'password', 'projectConfigurationCoinName', 'emailVerified']
      }).then(user => {
        console.log("Hey there", user);

        // if no user is found, return the message
        if (!user) {
          return done(null, false, req.flash('loginMessage', 'No user found.'));
        } else if (!user.emailVerified) {
          return done(null, false, req.flash('loginMessage', 'That email is yet to be verified.'));
        }
        // if the user is found but the password is wrong
        if (!bcrypt.compareSync(password, user.password))
          return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));
        // all is well, return successful user
        return done(null, user.dataValues);
      });
    }));

  //local login strategy for passport
  passport.use('local-login', new LocalStrategy({
      // by default, local strategy uses username and password, we will override with email
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) {
      // callback with email and password from our form
      // find a user whose email is the same as the forms email
      client.find({
        where: {
          'email': email
        }
      }).then(client => {
        // if there are any errors, return the error before anything else
        // if (!client)
        // return done(client);

        // if no user is found, return the message
        if (!client)
          return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash
        // if the user is found but the password is wrong
        if (!bcrypt.compareSync(password, client.password))
          return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata
        // all is well, return successful user
        return done(null, client.dataValues);
      });
    }));

  //local signup strategy for passport
  passport.use('local-signup', new LocalStrategy({
      // by default, local strategy uses username and password, we will override with email
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) {
      process.nextTick(function() {
        // find a user whose email is the same as the forms email
        client.find({
          where: {
            'email': email
          }
        }).then(async result => {
          // check to see if theres already a user with that email
          if (result) {
            return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
          } else {
            // if there is no user with that email
            // create the user
            var newUser = new Object();

            // set the user's local credentials
            newUser.email = email;
            newUser.password = generateHash(password);
            var currencyname = await db.currency.findOrCreate({
              where: {
                'name': "Ethereum"
              }
            });
            Promise.all([generateEthAddress(), createNewClient(req)]).then(([createdEthAddress, createdClient]) => {
              currencyname[0].addUserCurrencyAddress(createdEthAddress);
              createdClient.addUserCurrencyAddress(createdEthAddress);
              global.paymentAddresses.push(createdEthAddress.address);
              return done(null, createdClient.dataValues);
            });
          }
        });
      });
    }));

  // passport strategy for google login
  passport.use(new GoogleStrategy({

      clientID: configAuth.googleAuth.clientID,
      clientSecret: configAuth.googleAuth.clientSecret,
      callbackURL: configAuth.googleAuth.callbackURL,

    },
    function(token, refreshToken, profile, done) {

      // make the code asynchronous
      // User.findOne won't fire until we have all our data back from Google
      process.nextTick(function() {
        // try to find the user based on their google id
        client.find({
          where: {
            'email': profile.emails[0].value
          }
        }).then(async result => {
          if (result) {
            result.google_id = profile.id;
            await result.save();
            return done(null, result.dataValues);
          } else {
            // if the user isnt in our database, create a new user
            var newUser = new Object();
            // set all of the relevant information
            newUser.google_id = profile.id;
            newUser.name = profile.displayName;
            newUser.email = profile.emails[0].value; // pull the first email
            var currencyname = await Currency.findOrCreate({
              where: {
                'name': "Ethereum"
              }
            });
            Promise.all([generateEthAddress()]).then(async ([createdEthAddress]) => {
              currencyname[0].addUserCurrencyAddress(createdEthAddress);
              var createdClient = await client.create(newUser);
              createdClient.addUserCurrencyAddress(createdEthAddress);
              global.paymentAddresses.push(createdEthAddress.address);
              return done(null, createdClient.dataValues);
            })
          }
        });
      });

    }));

  //passport strategy for github login
  passport.use(new GitHubStrategy({
      clientID: configAuth.githubAuth.clientID,
      clientSecret: configAuth.githubAuth.clientSecret,
      callbackURL: configAuth.githubAuth.callbackURL,
      scope: 'user:email'
    },
    function(token, refreshToken, profile, done) {
      // console.log(" in github 1.1",profile);
      // make the code asynchronous
      // User.findOne won't fire until we have all our data back from Google
      process.nextTick(function() {

        // try to find the user based on their google id
        client.find({
          where: {
            'email': profile.emails[0].value
          }
        }).then(async result => {
          if (result) {
            result.github_id = profile.id;
            await result.save();
            return done(null, result.dataValues);
          } else {
            // if the user isnt in our database, create a new user
            var newUser = new Object();
            // set all of the relevant information
            newUser.github_id = profile.id;
            newUser.name = profile.displayName;
            newUser.email = profile.emails[0].value; // pull the first email
            var currencyname = await Currency.findOrCreate({
              where: {
                'name': "Ethereum"
              }
            });
            Promise.all([generateEthAddress()]).then(async ([createdEthAddress]) => {
              currencyname[0].addUserCurrencyAddress(createdEthAddress);
              var createdClient = await client.create(newUser);
              createdClient.addUserCurrencyAddress(createdEthAddress);
              global.paymentAddresses.push(createdEthAddress.address);
              return done(null, createdClient.dataValues);
            });
          }
        });
      });
    }
  ));
}

function generateEthAddress() {
  return new Promise(async function(resolve, reject) {
    var newEthAddress = new Object();
    var keyStore = generateNewAccount();
    console.log(keyStore);
    newEthAddress.privateKey = keyStore.privateKey;
    newEthAddress.address = keyStore.address;
    var createdEthAddress = await Address.create(newEthAddress);
    resolve(createdEthAddress);
  });
}

function createNewUser(req) {
  return new Promise(async function(resolve, reject) {
    var newUser = new Object();
    // set the user's local credentials
    newUser.email = req.body.email;
    newUser.password = generateHash(req.body.password);
    newUser.firstName = req.body.first_name;
    newUser.lastName = req.body.last_name;
    newUser.country = req.body.country_id;
    var createdUser = await User.create(newUser);
    sendVerificationMail(req, createdUser.email, createdUser.firstName, createdUser.uniqueId);
    resolve(createdUser);
  });
}


function createNewClient(req) {
  return new Promise(async function(resolve, reject) {
    var newUser = new Object();
    // set the user's local credentials
    newUser.email = req.body.email;
    newUser.password = generateHash(req.body.password);
    var createdClient = await client.create(newUser);
    resolve(createdClient);
  });
}

function sendVerificationMail(req, userEmail, userName, userHash){
  var nodemailerservice = require('../emailer/impl');
  nodemailerservice.sendVerificationMail(req, userEmail, userName, userHash);
}
