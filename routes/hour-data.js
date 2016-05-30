/**
 * Created by jiayi on 14/11/18.
 */

var express = require('express');
var async = require('async');
var baseQuery = require('../modules/base-query.js');
var router = express.Router();
var auth = require('../modules/ym-auth.js');

/* GET users listing. */
router.get('/', auth.isLoggedIn, function(req, res) {
    generateKeepData( req, res, function( req, res, data ) {
        var date = new Date().format('yyyy-MM-dd');
        res.render('hour-data', {
            'regions':gServerIds,
            'channels': gChannels,
            'start_date':date,
            'end_date':date,
            'title_tops':data.title_tops,
            'title_seconds':data.title_seconds,
            'log_details':data.log_details,
            'title':'小时新增和在线'
        });
    });
});

router.post('/', function( req, res ){
    generateKeepData( req, res, function( req, res, data ) {
        res.render('hour-data', {
            'regions':gServerIds,
            'channels': gChannels,
            'start_date':req.body.start_date,
            'end_date':req.body.end_date,
            'title_tops':data.title_tops,
            'title_seconds':data.title_seconds,
            'log_details':data.log_details,
            'title':'小时新增和在线'
        });
    });
});

// 生成信息
function generateKeepData( req, res, cb ) {
    var data = data || {};
    data.regions = [1,2,3,4,5,6];

    // 一天（毫秒）
    var dayInMill = 24 * 3600 * 1000;

    // 获得起始和结束时间
    var s_date= (req.body.start_date || "1970-01-01");
    var e_date = (req.body.end_date || "1970-01-01");

    var start_date = ym.parseDate( s_date );
    var end_date = ym.parseDate( e_date );

    // 获得今天的时间
    var now_time = new Date();
    var start_today = new Date( now_time.getFullYear(), now_time.getMonth(), now_time.getDate(), 0, 0, 0, 0 );
    var end_today = new Date( now_time.getFullYear(), now_time.getMonth(), now_time.getDate(), 23, 59, 59, 999 );

    // 获得表中渠道id
    var channel_id = req.body.channel || 0;

    // 获得表中的区域id
    var server_id = req.body.region || 0;

    // 记录每天的数据
    data.log_details = [];

    // 计算留存
    function queryDayHour( fcb ){
        // 从end_date倒数到 start_date
        // 一天的毫秒
        var end_time = end_date.getTime();
        var start_time = start_date.getTime();

        // 小时数组
        var hours = [ 0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];
        var total_count = 0;
        var ready = false;
        do{
            var log_detail = {};
            var log_date = new Date( end_time );
            log_detail.log_date = /*log_date.getFullYear()+"-"+*/(log_date.getMonth()+1)+"-"+log_date.getDate();
            log_detail.log_day = ym.getWeekDayString(log_date.getDay());
            log_detail.day_infos = [];

            // 查询
            _.each( hours, function( hour ){
                ++total_count;
                var day_info = {};
                log_detail.day_infos.push( day_info );
                async.applyEach( [calcHourNewUser, calcHourOnline, calcHourNewUserStrip], day_info, log_date, hour, function(){
                    --total_count;
                    if( !total_count && ready ){
                        // finish
                        fcb();
                    }
                } );
            });

            data.log_details.push( log_detail );

        }while( ( (end_time = end_time - dayInMill) >= start_time ));

        ready = true;
        if( !total_count ){
            fcb();
        }

        // 计算第n点时的新增
        function calcHourNewUser( day_info, log_date, n, ccb ){
            // 查看第n日是否小于今日，否则为0
            if (log_date.getTime() + n * 3600000 >= end_today.getTime()) {
                ccb();
                return 0;
            }

            // 从player里找出注册时间在这区间的
            var query = "select distinct account_id from player where register_time >= %d and register_time < %d";
            var time = log_date.getTime() + n * 3600 * 1000;
            query = ym.sprintf(query, time / 1000, (time + 3600 * 1000)/1000 );
            query += gCombineFactor( channel_id, server_id );
            ym.log( (new Date( time).toLocaleString() ) );
            ym.log( ( new Date( time + 3600*1000).toLocaleString() ) );
            ymdb.query(query, function (err, row, field) {
                if (err) {
                    throw err;
                }

                // 注册人数
                ym.log('new users:%d', row.length );
                day_info.new = row.length;
                ccb();
            });
        } // calcHourNewUser

        // 计算第n点时的新增(去重）
        function calcHourNewUserStrip( day_info, log_date, n, ccb ){
            // 查看第n日是否小于今日，否则为0
            if (log_date.getTime() + n * 3600000 >= end_today.getTime()) {
                ccb();
                return 0;
            }

            // 从player里找出注册时间在这区间的
            var query = "select distinct machine_code from player where register_time >= %d and register_time < %d";
            var time = log_date.getTime() + n * 3600 * 1000;
            query = ym.sprintf(query, time / 1000, (time + 3600 * 1000)/1000 );
            query += gCombineFactor( channel_id, server_id );

            ymdb.query(query, function (err, row, field) {
                if (err) {
                    throw err;
                }

                // 注册人数
//                ym.log(row.length);
                day_info.new_strip = row.length;
                ccb();
            });
        } // calcHourNewUser

        // 计算第n点时的在线
        function calcHourOnline( day_info, log_date, n, ccb ) {
            // 查看第n日是否小于今日，否则为0
            if (log_date.getTime() + n * 3600000 > end_today.getTime()) {
                ccb();
                return 0;
            }

            // 在线
//            log_detail.log_online = 0;
//            // 新增
//            log_detail.log_new_user = 0;

            // 从logoff_detail里找出在[n(h)]之后登出的并且logoff_time - online < n(h)+3600(s)
            var query = "select distinct account_id from login_detail where login_time >= %d " +
                "and login_time < %d";
            var time = (log_date.getTime() + n * 3600 * 1000)/1000;
            query = ym.sprintf(query, time, time + 3600 );
            query += gCombineFactor( channel_id, server_id );

            ymdb.query(query, function (err, row, field) {
                if (err) {
                    throw err;
                }

                // 在线人数
                day_info.online = row.length;
                ccb();
            });
        }// calcHourOnline func

    }// queryDayHour func

    // 生成标题
    function generateTitleTops(){
        // 头标题
        data.title_tops = [];
        // 次标题
        data.title_seconds = [];
        for( var i = 0; i < 24; ++ i ){
            var title_top = i + '点';
            data.title_tops.push( title_top );

            var title_second = {};
            title_second.online = '登录';
            title_second.new = '新增';
            title_second.new_strip = "去重";
            data.title_seconds.push( title_second );
        }
    }
    generateTitleTops();
    async.parallel( [baseQuery.queryChannel, baseQuery.queryRegion, queryDayHour], function(){
        cb( req, res, data );
    });
}

module.exports = router;
