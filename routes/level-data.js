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
    generateLevelData( req, res, function( req, res, data ) {
        var date = new Date().format('yyyy-MM-dd');
        res.render('level-data', {
            'regions':gServerIds,
            'channels': gChannels,
            'start_date':date,
            'end_date':date,
            'title_tops':data.title_tops,
            'log_details':data.log_details,
            'title':'等级分布'
        });
    });
});

router.post('/', function( req, res ){
    generateLevelData( req, res, function( req, res, data ) {
        res.render('level-data', {
            'regions':gServerIds,
            'channels': gChannels,
            'start_date':req.body.start_date,
            'end_date':req.body.end_date,
            'title_tops':data.title_tops,
            'log_details':data.log_details,
            'title':'等级分布'
        });
    });
});

// 生成信息
function generateLevelData( req, res, cb ) {
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

    // 计算等级
    function queryDayHour( fcb ){
        // 从end_date倒数到 start_date
        // 一天的毫秒
        var end_time = end_date.getTime();
        var start_time = start_date.getTime();

        // 等级数组
        var levels = [];
        for( var i = 0 ; i < 50 ; ++ i ){
            levels.push(i+1);
        }
        var total_count = 0;
        var ready = false;
        do{
            var log_detail = {};
            var log_date = new Date( end_time );
            log_detail.log_date = /*log_date.getFullYear()+"-"+*/(log_date.getMonth()+1)+"-"+log_date.getDate();
            log_detail.log_day = ym.getWeekDayString(log_date.getDay());
            log_detail.level_infos = [];

            // 查询
            _.each( levels, function( level ){
                ++total_count;
                var level_info = {};
                log_detail.level_infos.push( level_info );
                async.applyEach( [calcLevelUser], level_info, log_date, level, function(){
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
        function calcLevelUser( level_info, log_date, level, ccb ){

            // 新增玩家
            var log_new_user = 0;

            // 查询log_date当天的新增玩家
            ym.log( "level user date:%s", log_date.toLocaleString() );
            var query = "select distinct account_id from player where register_time >= %d and register_time < %d" +
                " and level = %d";
            query += gCombineFactor( channel_id, server_id );

            var s_log_date = log_date.getTime()/1000;
            var e_log_date = ym.getOffsetDate( log_date, 1 ).getTime()/1000;

            query = ym.sprintf( query, s_log_date, e_log_date, level );
            ymdb.query( query, function( err, row1, field ){
                if( err ){
                    throw err;
                }

                // 昨天没有人注册，返回0
                if( row1.length == 0 ){
                    level_info.count = 0;
                    ccb();
                    return;
                }
                var count = row1.length;

                // 继续查找第n天的登录用户数
                query = "select distinct account_id from login_detail where login_time >= %d and login_time < %d";
                query += gCombineFactor( channel_id, server_id );
                query = ym.sprintf( query,
                        ym.getOffsetDate( log_date, 1 ).getTime()/1000,
                        ym.getOffsetDate( log_date, 2).getTime()/1000);
                ymdb.query( query, function( err, row2, field ){
                    if( err ){
                        throw err;
                    }

                    // 第n天没有人登录，返回0
                    if( row2.length == 0 ){
                        level_info.count = 0;
                        ccb();
                        return;
                    }

                    // 计算昨天的登录用户中在今天再次登录的个数
                    _.each( row1, function( l_login ){
                        _.each( row2, function( t_login ){
                            if( t_login.account_id === l_login.account_id ){
                                --count;
                            }
                        });
                    });
                    level_info.count = count;

                    // cb
                    ccb();
                });

            });
        }// calcKeep func


    }// queryDayHour func

    // 生成标题
    function generateTitleTops(){
        // 头标题
        data.title_tops = [];
        for( var i = 1; i <= 50; ++ i ){
            var title_top = i + '级';
            data.title_tops.push( title_top );
        }
    }
    generateTitleTops();
    async.parallel( [baseQuery.queryChannel, baseQuery.queryRegion, queryDayHour], function(){
        cb( req, res, data );
    });
}

module.exports = router;
