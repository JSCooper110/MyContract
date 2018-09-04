var db = require('../database/models/index');
var User = db.user;
var fs = require('fs');
var configAuth = require('../config/auth');
const Binance = require('node-binance-api');
module.exports = {

  getTransactions: (req, res, next) => {
    if (!req.user.kyc_verified) {
      res.render('userKYCPage', {
        user: req.user
      });
    } else {
      console.log(req.user);
      var projectConfiguration = req.user.projectConfiguration;
      res.render('userTransactionHistory', {
        user: req.user,
        projectConfiguration: projectConfiguration,
        transactions: req.user.icotransactions
      });
    }
  },

  getWallets: (req, res, next) => {
    if (!req.user.kyc_verified) {
      res.render('userKYCPage', {
        user: req.user
      });
    } else {
      var projectConfiguration = req.user.projectConfiguration;
      res.render('userWalletPage', {
        user: req.user,
        projectConfiguration: projectConfiguration,
        addresses: req.user.userCurrencyAddresses
      });
    }
  },

  getKYC: (req, res, next) => {
    if (!req.user.kyc_verified) {
      res.render('userKYCPage', {
        user: req.user
      });
    } else {
      res.render('kycComplete', {
        user: req.user
      });
    }
  },

  getContactPage: (req, res, next) => {
    if (!req.user.kyc_verified) {
      res.render('userKYCPage', {
        user: req.user
      });
    } else {
      res.render('userContactPage', {
        user: req.user
      });
    }
  },

  getProfileEditPage: (req, res, next) => {
    if (!req.user.kyc_verified) {
      res.render('userKYCPage', {
        user: req.user
      });
    } else {
      res.render('userProfileEdit', {
        user: req.user
      });
    }
  },

  logout: (req, res, next) => {
    var projectConfiguration = req.user.projectConfiguration;
    console.log(projectConfiguration);
    res.redirect('http://' + projectConfiguration.homeURL);
  },

  getDashboard: async (req, res, next) => {
    if (!req.user.kyc_verified) {
      res.render('userKYCPage', {
        user: req.user
      });
    } else {
      var projectConfiguration = req.user.projectConfiguration;
      res.render('userDashboard', {
        user: req.user,
        projectConfiguration: projectConfiguration,
      });
    }
  },

  getUSDPrice: async (req, res, next) => {
    console.log("Getting price");
    const binance = Binance().options({
      APIKEY: configAuth.binanceKey.apiKey,
      APISECRET: configAuth.binanceKey.apiSecret,
      useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
      test: true // If you want to use sandbox mode where orders are simulated
    });

    binance.prices((error, ticker) => {
      res.send({
        ETH: ticker.ETHUSDT,
        BTC: ticker.BTCUSDT
      });
    });
  },

  uploadKYC: (req, res, next) => {
    User.update({
      'kycDoc1': fs.readFileSync(req.files[0].path),
      'kycDoc2': fs.readFileSync(req.files[1].path),
      'kycDoc3': fs.readFileSync(req.files[2].path)
    }, {
      where: {
        'email': req.user.email
      }
    }).then(() => {
      res.redirect('/user/dashboard');
    });
  }
}
