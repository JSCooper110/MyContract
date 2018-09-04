var passport = require('passport');
const jwt = require('jsonwebtoken');
var configAuth = require('../config/auth');
const ImageDataURI = require('image-data-uri');
var path = require('path');
var db = require('../database/models/index');
var client = db.client;
var ProjectConfiguration = db.projectConfiguration;
var fs = require('fs');



module.exports = {
  //client setup
  icoDashboardSetup: function (req, res) {
    console.log(req.params, "project")
    res.render('siteConfiguration', {
      user: req.user,
      projectName: req.params.projectName
    });
  },

  // siteConfiguration: function (req, res) {
  //   res.render('siteConfiguration', {
  //     user: req.user
  //   });
  // },
  getSiteConfiguration: function (req, res) {
    client.findAll({
      where: {
        'email': req.user.email,
      },
      include: [{
        model: ProjectConfiguration,
        where: { coinName: req.params.projectName }
      }],
    }).then(values => {
      if (!values) {
        res.send({ message: "null!" });
      } else {
        var dataobj = new Object();
        dataobj= values[0].projectConfigurations[0].dataValues;
        dataobj.siteLogo='data:image/bmp;base64,'+Buffer.from( values[0].projectConfigurations[0].dataValues.siteLogo).toString('base64')
        res.send({
          data: dataobj,
          message: "updated!"
        })
      }
    });
  },
  updateSiteConfiguration: async function (req, res) {
    // ImageDataURI.encodeFromFile("kycdump/" + req.file.originalname)
    //   .then(async imgurl => {
    //     var projectdata = await client.find({
    //       where: {
    //         'email': req.user.email
    //       },
    //       include: ['projectConfigurations'],
    //     })
    //     await ProjectConfiguration.update(
    //       {
    //         siteName: req.body.site_name,
    //         siteLogo: imgurl,
    //         coinName: req.body.coin_name,
    //         softCap: req.body.soft_cap,
    //         hardCap: req.body.hard_cap,
    //         startDate: req.body.start_date,
    //         endDate: req.body.end_date,
    //         homeURL: req.body.website_url,
    //       },
    //       { where: { client_id: projectdata.projectConfigurations[0].dataValues.client_id } }).then(updatedata => {
    //         if (!updatedata)
    //           console.log("Project update failed !");
    //         console.log("Project updated successfully!");
    //         res.redirect("/icoDashboardSetup/project/" +req.body.coin_name)
    //       })
    //   })
    var projectdata = await client.find({
            where: {
              'email': req.user.email
            },
            include: ['projectConfigurations'],
          })
    ProjectConfiguration.update({
      'siteLogo': fs.readFileSync(req.files[0].path),
      "siteName": req.body.site_name,
      "coinName": req.body.coin_name,
      "softCap": req.body.soft_cap,
      "hardCap": req.body.hard_cap,
      "startDate": req.body.start_date,
      "endDate": req.body.end_date,
      "homeURL": req.body.website_url,
    }, {
        where: {
          "client_id": projectdata.projectConfigurations[0].dataValues.client_id
        }
      }).then(updatedata => {
        if (!updatedata)
          console.log("Project update failed !");
        console.log("Project updated successfully!");
        res.redirect("/icoDashboardSetup/project/" + req.body.coin_name)
      });
  },



  //user login
  userLogin: function (req, res) {
    res.render("userLogin.ejs");
  },
  getUserSignup: function (req, res) {
    res.render("userSignup.ejs", {});
  },

  getUserLogin: function (req, res) {
    res.render("userLogin.ejs", {});
  },

  postUserLogin: async function (req, res, next) {
    passport.authenticate('user-login', {
      session: false
    }, async (err, user, info) => {
      console.log("This is :" + user);
      try {
        if (err || !user) {
          const error = new Error('An Error occured')
          return next(error);
        }
        req.login(user, {
          session: false
        }, async (error) => {
          if (error) return next(error)
          const token = jwt.sign({
            user: user
          }, configAuth.jwtAuthKey.secret, {
              expiresIn: configAuth.jwtAuthKey.tokenLife
            });
          //Send back the token to the user
          res.cookie('token', token, { expire: 360000 + Date.now() });
          return res.json({
            'token': "success"
          });
        });
      } catch (error) {
        return next(error);
      }
    })(req, res, next);
  },

  postUserSignup: async function (req, res, next) {
    passport.authenticate('user-signup', {
      session: false
    }, async (err, user, info) => {
      console.log(user);
      try {
        if (err || !user) {
          const error = new Error('An Error occured')
          return next(error);
        }
        req.login(user, {
          session: false
        }, async (error) => {
          if (error) return next(error)
          const token = jwt.sign({
            user: user
          }, configAuth.jwtAuthKey.secret, {
              expiresIn: configAuth.jwtAuthKey.tokenLife
            });
          //Send back the token to the user
          res.cookie('token', token, { expire: 1800000 + Date.now() });
          return res.json({
            "token": "success"
          });
        });
      } catch (error) {
        return next(error);
      }
    })(req, res, next);
  }

}
