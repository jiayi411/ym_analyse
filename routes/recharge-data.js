/**
 * Created by jiayi on 15/1/7.
 */

var express = require('express');
var async = require('async');
var baseQuery = require('../modules/base-query.js');
var router = express.Router();
var auth = require('../modules/ym-auth.js');

/* GET users listing. */
router.get('/', auth.isLoggedIn, function(req, res) {
    generateRechargeData( req, res, function( req, res, data ) {
        var date = new Date().format('yyyy-MM-dd');
        res.render('recharge-data', {
            'regions':gServerIds,
            'channels': gChannels,
            'start_date':date,
            'end_date':date,
            'title_hours':data.title_hours,
            'log_details':data.log_details,
            'title':'每日收费'
        });
    });
});

router.post('/', function( req, res ){
    generateRechargeData( req, res, function( req, res, data ) {
        res.render('recharge-data', {
            'regions':gServerIds,
            'channels': gChannels,
            'start_date':req.body.start_date,
            'end_date':req.body.end_date,
            'title_hours':data.title_hours,
            'log_details':data.log_details,
            'title':'每日收费'
        });
    });
});

// 生成信息
function generateRechargeData( req, res, cb ) {
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

    // 计算每天的数据
    function queryDayCash( fcb ){
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
            log_detail.value_hours = [];

            // 查询总收入
            ++total_count;
            calcDayCash( log_detail, log_date, function(){
                --total_count;
                if( !total_count && ready ){
                    // finish
                    fcb();
                }
            });

            ++total_count;
            async.applyEachSeries( [calcDayAccount, calcDayActive, calcOthers], log_detail, log_date, function(){
                --total_count;
                if( !total_count && ready ){
                    // finish
                    fcb();
                }
            } );

            // 查询每小时数据
            _.each( hours, function( hour ){
                ++total_count;
                var day_info = {};
                log_detail.value_hours.push( day_info );
                calcHourCash( day_info, log_date, hour, function(){
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

        // 计算整天的收入
        function calcDayCash( log_detail, log_date, ccb ){
            var query = "select sum(cash) as total_cash from recharge_realtime where buy_time > %d and buy_time <= %d";
            var start = log_date.getTime() / 1000;
            var end = ( log_date.getTime() + 3600 * 24 * 1000 )/ 1000;
            query = ym.sprintf( query, start, end );
            query += gCombineFactor( channel_id, server_id-10000 );
            ymdb.query( query, function( err, row, field ) {
                if( err ){
                    throw err;
                }

                log_detail.total_income = parseInt(row[0].total_cash);
                ccb();
            });
        }

        // 计算整天的充值人数
        function calcDayAccount( log_detail, log_date, ccb ){
            var query = "select count(distinct account_id) as total from recharge_realtime where buy_time > %d and buy_time <= %d";
            var start = log_date.getTime() / 1000;
            var end = ( log_date.getTime() + 3600 * 24 * 1000 )/ 1000;
            query = ym.sprintf( query, start, end );
            query += gCombineFactor( channel_id, server_id-10000 );
            ymdb.query( query, function( err, row, field ) {
                if( err ){
                    throw err;
                }

                log_detail.total_account = row[0].total;
                ccb();
            });
        }

        // 计算整天的登录总人数
        function calcDayActive( log_detail, log_date, ccb ){
            var query =
                "select count(distinct account_id) as total from login_detail where login_time > %d and login_time <= %d";
            query += gCombineFactor( channel_id, server_id );
            query = ym.sprintf( query, log_date.getTime()/1000, (log_date.getTime() + dayInMill)/1000 );
            ymdb.query( query, function( err, rows, field ){
                if( err ){
                    throw err;
                }
                log_detail.log_active = rows[0].total;
                ccb();
            });
        }

        // 最后计算ARPU,ARPPU,付费率
        function calcOthers( log_detail, log_date, ccb ){
            // 现在有了付费总数，付费人数，活跃人数
            log_detail.ARPU = parseInt( 1000*(log_detail.total_income / log_detail.log_active)) / 1000;
            log_detail.ARPPU = parseInt( 1000*(log_detail.total_income / log_detail.total_account ))/1000;
            log_detail.pay_rate = ((parseInt( 1000*(log_detail.total_account / log_detail.log_active ) ) / 1000)*100).toFixed(2) + "%";
            ccb();
        }

        // 计算第n点时的收入
        function calcHourCash( day_info, log_date, n, ccb ){
            // 查看第n日是否小于今日，否则为0
            if (log_date.getTime() + n * 3600000 >= end_today.getTime()) {
                ccb();
                return 0;
            }

            // 从player里找出注册时间在这区间的
            var query = "select sum(cash) as total_cash from recharge_realtime where buy_time >= %d and buy_time < %d";
            var time = log_date.getTime() + n * 3600 * 1000;
            query = ym.sprintf(query, time / 1000, (time + 3600 * 1000)/1000 );
            query += gCombineFactor( channel_id, server_id-10000 );
            ym.log( (new Date( time).toLocaleString() ) );
            ym.log( ( new Date( time + 3600*1000).toLocaleString() ) );
            ymdb.query(query, function (err, row, field) {
                if (err) {
                    throw err;
                }

                day_info.cash = 0;
                if( row.length > 0){
                    day_info.cash = row[0].total_cash;
                }
                ccb();
            });
        } // calcHourNewUser
    }// queryDayHour func

    // 生成标题
    function generateTitleTops(){
        // 头标题
        data.title_hours = [];
        for( var i = 0; i < 24; ++ i ){
            var title_top = i + '点';
            data.title_hours.push( title_top );
        }
    }
    generateTitleTops();
    async.parallel( [baseQuery.queryChannel, baseQuery.queryRegion, queryDayCash], function(){
        cb( req, res, data );
    });
}

module.exports = router;
