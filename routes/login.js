/**
 * Created by jiayi on 14/11/21.
 */
var express = require('express');
var async = require('async');
var router = express.Router();
var ymdb = require('../modules/ym-database.js');
var ym = require('../ym-function.js');
var passport = require('passport');

/* GET users listing. */
router.get('/', function(req, res) {
        res.render('login', {

    });
});

router.post('/', passport.authenticate('local', {
    failureRedirect:'/login'
}), function( req, res ){
    var url = req.flash('redirect');
    if( url.length == 0 ){
        url = '/base-data';
    }
    res.redirect( url );
});

module.exports = router;
