/**
 * Created by jiayi on 14/11/17.
 */

var express = require('express');
var async = require('async');
var baseQuery = require('../modules/base-query.js');
var router = express.Router();
var auth = require('../modules/ym-auth.js');

/* GET users listing. */
router.get('/', auth.isLoggedIn, function(req, res) {
    generateKeepData( req, res, function( req, res, datas ) {
        var today_date = new Date();
        var date = today_date.format('yyyy-MM-dd');
        var start_date = new Date( today_date.getTime() - 3600 * 24 * 7 * 1000).format('yyyy-MM-dd');
        res.render('keep-data', {
            'channels': gChannels,
            'regions':gServerIds,
            'log_details': datas,
            'start_date':start_date,
            'end_date':date,
            'title':'留存率统计'
        });
    });
});

router.post('/', function( req, res ){
    generateKeepData( req, res, function( req, res, datas ) {
        res.render('keep-data', {
            'channels': gChannels,
            'regions':gServerIds,
            'log_details': datas,
            'start_date':req.body.start_date,
            'end_date':req.body.end_date,
            'title':'留存率统计'
        });
    });
});

// 生成信息
function generateKeepData( req, res, cb ) {
    var data = data || {};

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
    function queryKeep( fcb ){
        // 从end_date倒数到 start_date
        // 一天的毫秒
        var end_time = end_date.getTime();
        var start_time = start_date.getTime();

        // 天数数组
        var days = [ 1,2,3,4,5,6,9,14,19,29 ];
        var total_count = 0;
        var ready = false;
        do{
            var log_detail = {};
            var log_date = new Date( end_time );
            log_detail.log_date = /*log_date.getFullYear()+"-"+*/(log_date.getMonth()+1)+"-"+log_date.getDate();
            log_detail.log_day = ym.getWeekDayString(log_date.getDay());

            // 查询
            _.each( days, function( day ){
                ++total_count;
                calcKeep( log_detail, log_date, day, function(){
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

        // 计算第n[1~x]日留存率
        function calcKeep( log_detail, log_date, n, ccb ){
            // 查看第n日是否小于今日，否则为0
            if( log_date.getTime() + n * dayInMill >= start_today.getTime() ){
                ccb();
                return 0;
            }

            // 新增玩家
            log_detail.log_new_user = 0;

            // 查询log_date当天的新增玩家
            var query = "select distinct account_id from player where register_time >= %d and register_time < %d";
            query += gCombineFactor( channel_id, server_id );

            var s_log_date = log_date.getTime()/1000;
            var e_log_date = ym.getOffsetDate( log_date, 1 ).getTime()/1000;

            query = ym.sprintf( query, s_log_date, e_log_date );
            ymdb.query( query, function( err, row, field ){
                if( err ){
                    throw err;
                }

                // 昨天没有人注册，返回0
                if( row.length == 0 ){
                    log_detail = getKeepDetail( log_detail, n, 0 );
                    ccb();
                    return;
                }

                log_detail.log_new_user = row.length;

                // 继续查找第n天的登录用户数
                var last_day_login = row;
                query = "select distinct account_id from login_detail where login_time >= %d and login_time < %d";
                query += gCombineFactor( channel_id, server_id );
                query = ym.sprintf( query,
                        ym.getOffsetDate( log_date, n ).getTime()/1000,
                        ym.getOffsetDate( log_date, n+1).getTime()/1000);
                ymdb.query( query, function( err, row, field ){
                    if( err ){
                        throw err;
                    }

                    // 第n天没有人登录，返回0
                    if( row.length == 0 ){
                        log_detail = getKeepDetail( log_detail, n, 0 );
                        ccb();
                        return;
                    }

                    // 计算昨天的登录用户中在今天再次登录的个数
                    var left_count = 0;
                    _.each( last_day_login, function( l_login ){
                        _.each( row, function( t_login ){
                            if( t_login.account_id === l_login.account_id ){
                                ++left_count;
                            }
                        });
                    });

                    // 计算留存 left_count / total_count
                    log_detail = getKeepDetail( log_detail, n, left_count, last_day_login.length );

                    // cb
                    ccb();
                });

            });
        }// calcKeep func

        // 设置第n日的留存率
        function getKeepDetail( detail, n, left, total ){
            detail = detail || {};

            // 百分化
            var rate = 0;
            if( total > 0 ) {
                rate = parseInt(left / total * 1000) / 10;
            }
            rate += '%';
            switch( n ){
                case 1:
                    detail.l2_keep = left;
                    detail.l2_keep_rate = rate; break;
                case 2:
                    detail.l3_keep = left;
                    detail.l3_keep_rate = rate; break;
                case 3:
                    detail.l4_keep = left;
                    detail.l4_keep_rate = rate; break;
                case 4:
                    detail.l5_keep = left;
                    detail.l5_keep_rate = rate; break;
                case 5:
                    detail.l6_keep = left;
                    detail.l6_keep_rate = rate; break;
                case 6:
                    detail.l7_keep = left;
                    detail.l7_keep_rate = rate; break;
                case 9:
                    detail.l10_keep = left;
                    detail.l10_keep_rate = rate; break;
                case 14:
                    detail.l15_keep = left;
                    detail.l15_keep_rate = rate; break;
                case 19:
                    detail.l20_keep = left;
                    detail.l20_keep_rate = rate; break;
                case 29:
                    detail.l30_keep = left;
                    detail.l30_keep_rate = rate; break;
                default : return 0;
            }
            return detail;
        }
    }// queryKeep func

    async.parallel( [baseQuery.queryChannel, baseQuery.queryRegion, queryKeep], function(){
        cb( req, res, data.log_details );
    });
}

module.exports = router;
