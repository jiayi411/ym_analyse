var express = require('express');
//var fs = require('fs');
//var iconv = require('iconv-lite');
var lr = require('line-reader');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
    res.redirect('/base-data');
});

router.get('/logout', function( req, res ){
    req.logout();
    res.redirect( '/login' );
});

module.exports = router;
