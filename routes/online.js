var express = require('express');
var async = require('async');
var onlinedb = require('../modules/online-database.js');
var router = express.Router();
var auth = require('../modules/ym-auth.js');

/* GET users listing. */
router.get('/',//auth.isLoggedIn,
    function(req, res) {
        generateOnlineData(req, res, function (req, res, datas) {
            res.render('online', { 'datas':datas,'title':'实时在线人数'
            });
        });
    });

// 选出0-24点所有点
function generateOnlineData( req, res, cb ){
    // 查询
    var query = 'select * from online';
    ymdb.query( query, function( err, rows ){
        if( err ){
            throw err;
        }
        // 合并所有服的在线人数
        var datas = [];
        _.each( rows, function( row1 ){
            // date
            var count = row1.count;
            // 如果找到同样时间的，跳过
            var finddata = _.find( datas, function( data ){
                return ( data[0] == row1.time );
            });
            if( !finddata ) {
                _.each(rows, function (row2) {
                    if (row2.time == row1.time && row1.server_id != row2.server_id) {
                        count += row2.count;
                    }
                });
                // 生成数组元素
                datas.push([ row1.time, count ]);
            }
        });
        cb( req, res, datas );
    });
}
module.exports = router;

