var express = require('express');
var async = require('async');
var baseQuery = require('../modules/base-query.js');
var router = express.Router();
var auth = require('../modules/ym-auth.js');

/* GET users listing. */
router.get('/',
    function(req, res) {
    generateBaseData( req, res, function( req, res, data ) {
        var today_date = new Date();
        var date = today_date.format('yyyy-MM-dd');
        var start_date = new Date( today_date.getTime() - 3600 * 24 * 7 * 1000).format('yyyy-MM-dd');
        res.render('base-data', {
            'regions':gServerIds,
            'channels': gChannels,
            'refresh_time': date,//date.toLocaleTimeString(),
            'new_user_count': data.new_user_count,
            'DAU': data.DAU,
            'new_user_count_machine': data.new_user_count_machine,
            'DAU_Machine': data.DAU_Machine,
            'l1_keep': parseInt(data.l1_keep * 1000)/10+ "%",
            'l1_keep_machine': parseInt(data.l1_keep_machine * 1000)/10+ "%",
            'log_pay_user': data.log_pay_user,
            'log_new_pay_user': data.log_new_pay_user,
            'log_pay_rate': (data.log_pay_rate * 100).toFixed(2) + "%",
            'ARPPU': data.log_ARPPU.toFixed(1),
            'ARPU': data.log_ARPU.toFixed(1),
            'log_new_pay_rate': (data.log_new_pay_rate * 100).toFixed(2) + "%",
            'log_income': data.log_income,
            'log_details':data.log_details,
            'start_date':start_date,
            'end_date':date,
            'title':'基础数据'
        });
    });
});

router.post('/', function( req, res ){

    generateBaseData( req, res, function( req, res, data ) {
        var date = new Date();
        res.render('base-data', {
            'regions':gServerIds,
            'channels': gChannels,
            'refresh_time': date.toLocaleTimeString(),
            'new_user_count': data.new_user_count,
            'DAU': data.DAU,
            'new_user_count_machine': data.new_user_count_machine,
            'DAU_Machine': data.DAU_Machine,
            'l1_keep': parseInt(data.l1_keep * 1000)/10+ "%",
            'l1_keep_machine': parseInt(data.l1_keep_machine * 1000)/10+ "%",
            'log_pay_user': data.log_pay_user,
            'log_new_pay_user': data.log_new_pay_user,
            'log_pay_rate': (data.log_pay_rate * 100 ).toFixed(1)+ "%",
            'ARPPU': data.log_ARPPU.toFixed(1),
            'ARPU': data.log_ARPU.toFixed(1),
            'log_new_pay_rate': (data.log_new_pay_rate * 100).toFixed(2)+"%",
            'log_income': data.log_income,
            'log_details':data.log_details,
            'start_date':req.body.start_date,
            'end_date':req.body.end_date,
            'title':'基础数据'
        });
    });
});

function generateBaseData( req, res, cb ) {

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

    // 获得新增玩家数量 new_user_count
    var queryNewUserCount = function(cb){
        var query = "select distinct account_id from player where register_time >= %d and register_time < %d";
        query += gCombineFactor( channel_id, server_id );

        query = ym.sprintf( query, start_today.getTime()/1000, end_today.getTime()/1000);
        ymdb.query( query, function ( err, row, field ){
            if( err ){
                ym.log( err ); cb(); return;
            }
            data.new_user_count = row.length;
            cb();
        });
    };

    // 获得新增玩家数量——机器码 new_user_count_machine
    var queryNewUserCountMachine = function(cb){
        var query = "select distinct machine_code from player where register_time >= %d and register_time < %d";
        query += gCombineFactor( channel_id, server_id );

        query = ym.sprintf( query, start_today.getTime()/1000, end_today.getTime()/1000);
        ymdb.query( query, function ( err, row, field ){
            if( err ){
                ym.log( err ); cb(); return;
            }
            data.new_user_count_machine = row.length;
            cb();
        });
    };

    // DAU
    var queryDAU = function(cb){
        var query = "select distinct account_id from player where login_time >= %d and login_time < %d";
        query += gCombineFactor( channel_id, server_id );
        query = ym.sprintf( query, start_today.getTime()/1000, end_today.getTime()/1000);
        ymdb.query( query, function ( err, row, field ){
            if( err ){
                throw err;
            }
            data.DAU = row.length;
            cb();
        });
    };

    // DAU machine
    var queryDAUMachine = function(cb){
        var query = "select distinct machine_code from player where login_time >= %d and login_time < %d";
        query += gCombineFactor( channel_id, server_id );
        query = ym.sprintf( query, start_today.getTime()/1000, end_today.getTime()/1000);
        ymdb.query( query, function ( err, row, field ){
            if( err ){
                throw err;
            }
            data.DAU_Machine = row.length;
            cb();
        });
    };

    // 次日留存
    var queryDay1Keep = function( cb ){
        // 先获得前一日的新注册账号
        var query = "select distinct account_id from player where register_time >= %d and register_time < %d";
        query += gCombineFactor( channel_id, server_id );

        var s_today = ym.getOffsetDate( start_today, -1 ).getTime()/1000;
        var e_today = ym.getOffsetDate( end_today, -1 ).getTime()/1000;

        query = ym.sprintf( query, s_today, e_today );
        ymdb.query( query, function( err, row, field ){
            if( err ){
                throw err;
            }

            // 昨天没有人注册，返回0
            if( row.length == 0 ){
                data.l1_keep = 0;
                cb();
                return;
            }

            // 继续查找今天的登录用户数
            var last_day_login = row;
            query = "select distinct account_id from login_detail where login_time >= %d and login_time < %d";
            query += gCombineFactor( channel_id, server_id );
            query = ym.sprintf( query,
                    start_today.getTime()/1000,
                    end_today.getTime()/1000);
            ymdb.query( query, function( err, row, field ){
                if( err ){
                    throw err;
                }

                // 今天没有人登录，返回0
                if( row.length == 0 ){
                    data.l1_keep = 0;
                    cb();
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
                data.l1_keep = left_count / last_day_login.length;

                // cb
                cb();
            });

        });
    };

    // 次日留存Machine
    var queryDay1KeepMachine = function( cb ){
        // 先获得前一日的新注册账号
        var query = "select distinct machine_code from player where register_time >= %d and register_time < %d";
        query += gCombineFactor( channel_id, server_id );

        var s_today = ym.getOffsetDate( start_today, -1 ).getTime()/1000;
        var e_today = ym.getOffsetDate( end_today, -1 ).getTime()/1000;

        query = ym.sprintf( query, s_today, e_today );
        ymdb.query( query, function( err, row, field ){
            if( err ){
                throw err;
            }

            // 昨天没有人注册，返回0
            if( row.length == 0 ){
                data.l1_keep_machine = 0;
                cb();
                return;
            }

            // 继续查找今天的登录用户数
            var last_day_login = row;
            query = "select distinct machine_code from login_detail where login_time >= %d and login_time < %d";
            query += gCombineFactor( channel_id, server_id );
            query = ym.sprintf( query,
                    start_today.getTime()/1000,
                    end_today.getTime()/1000);
            ymdb.query( query, function( err, row, field ){
                if( err ){
                    throw err;
                }

                // 今天没有人登录，返回0
                if( row.length == 0 ){
                    data.l1_keep_machine = 0;
                    cb();
                    return;
                }

                // 计算昨天的登录用户中在今天再次登录的个数
                var left_count = 0;
                _.each( last_day_login, function( l_login ){
                    _.each( row, function( t_login ){
                        if( t_login.machine_code == l_login.machine_code ){
                            ++left_count;
                        }
                    });
                });

                // 计算留存 left_count / total_count
                data.l1_keep_machine = left_count / last_day_login.length;

                // cb
                cb();
            });

        });
    };

    // log_new_user
    function queryLogNewUser( log_detail, log_date, ccb ){
//            ym.log( "new user date_f:%s", log_date.toLocaleString() );
        var query = "select distinct account_id from player where register_time > %d and register_time <= %d";
        query += gCombineFactor( channel_id, server_id );
        query = ym.sprintf( query, log_date.getTime()/1000, (log_date.getTime() + dayInMill)/1000 );
        ymdb.query( query, function( err, rows, field ){
            if( err ){
                throw err;
            }
            log_detail.log_new_user = rows.length;

            // 计算新增消费用户
            query = "select distinct account_id from recharge_realtime where buy_time > %d and buy_time <= %d";
            query += gCombineFactor( channel_id, server_id -10000);
            query = ym.sprintf( query, log_date.getTime()/1000, (log_date.getTime() + dayInMill)/1000 );
            ymdb.query( query, function( err, rows_recharge, field ) {
                if (err) {
                    throw err;
                }

                log_detail.log_new_pay_user = 0;
                _.each( rows, function( row){
                    _.each( rows_recharge, function( row_recharge ){
                        if( row.account_id == row_recharge.account_id ){
                            log_detail.log_new_pay_user++;
                        }
                    });
                });
                ccb();
            })
        })
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

            log_detail.log_income = row[0].total_cash;
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

            log_detail.log_pay_user = row[0].total;
            ccb();
        });
    }

    // 计算当天的充值用户
    function calcTodayPayUser( cb ){
        calcDayAccount(data, start_today, cb );
    }

    // 计算当天的总收入
    function calcTodayIncome( cb ){
        calcDayCash(data, start_today, cb );
    }

    // 计算当天新增付费用户
    function calcTodayNewPayUser( cb ){
        queryLogNewUser( data, start_today, cb );
    }

    // 计算当前其他数值
    function calcTodayOther( cb ){
        data.log_ARPU = parseInt(100*(data.log_income / data.DAU))/100;
        data.log_ARPPU = parseInt(100*(data.log_income / data.log_pay_user))/100;
        data.log_pay_rate = parseInt((data.log_pay_user / data.DAU)*1000)/1000;
        data.log_new_pay_rate = parseInt(1000*(data.log_new_pay_user / data.new_user_count))/1000;
        cb();
    }

    // 详细数据
    data.log_details = [];
    function queryDetails( cb ){
        // 从end_date倒数到 start_date
        // 一天的毫秒
        var end_time = end_date.getTime();
        var start_time = start_date.getTime();

        var total_count = 0;
        var ready = false;
        do{
            var log_detail = {};
            var log_date = new Date( end_time );
            log_detail.log_date = log_date.getFullYear()+"-"+(log_date.getMonth()+1)+"-"+log_date.getDate();
            log_detail.log_day = ym.getWeekDayString(log_date.getDay());

            // 查询
            async.applyEachSeries([ queryLogTotalUser, queryLogActive, queryLogNewUser, calcPreDayTotalCash, calcDayCash,
                calcDayAccount,calcOthers], log_detail, log_date, function(){
                --total_count;
                if( total_count == 0 && ready ){
                    cb();
                }
            });

            data.log_details.push( log_detail );

            total_count++;
        }while( ( (end_time = end_time - dayInMill) >= start_time ));

        ready = true;

        // log_total_user
        function queryLogTotalUser( log_detail, log_date, ccb ){
//            ym.log( "total user date:%s", log_date.toLocaleString() );
            var query =
                "select distinct account_id from player where register_time <= %d";
            query += gCombineFactor( channel_id, server_id );
            query = ym.sprintf( query, (log_date.getTime() + dayInMill)/1000 );
            ymdb.query( query, function( err, rows, field ){
                if( err ){
                    throw err;
                }
                log_detail.log_total_user = rows.length;
                ccb();
            })
        }

        // 计算此天前的所有收入
        function calcPreDayTotalCash( log_detail, log_date, ccb ){
            var query = "select sum(cash) as total_cash from recharge_realtime where buy_time <= %d";
            var end = ( log_date.getTime() + 3600 * 24 * 1000 )/ 1000;
            query = ym.sprintf( query, end );
            query += gCombineFactor( channel_id, server_id-10000 );
            ymdb.query( query, function( err, row, field ) {
                if( err ){
                    throw err;
                }

                log_detail.log_total_income = row[0].total_cash;
                ccb();
            });
        }

        // log_active
        function queryLogActive( log_detail, log_date, ccb ){
            var query =
                "select distinct account_id from login_detail where login_time > %d and login_time <= %d";
            query += gCombineFactor( channel_id, server_id );
            query = ym.sprintf( query, log_date.getTime()/1000, (log_date.getTime() + dayInMill)/1000 );
            ymdb.query( query, function( err, rows, field ){
                if( err ){
                    throw err;
                }
                log_detail.log_active = rows.length;
                ccb();
            });
        }



        // 最后计算ARPU,ARPPU,付费率
        function calcOthers( log_detail, log_date, ccb ){
            log_detail.total_income = log_detail.total_income || 0;

            log_detail.log_ARPU = parseInt( 1000*(log_detail.log_income / log_detail.log_active)) / 1000;
            log_detail.log_ARPPU = parseInt( 1000*(log_detail.log_income / log_detail.log_pay_user ))/1000;
            log_detail.log_pay_rate = parseInt( 1000*(log_detail.log_pay_user / log_detail.log_active ) ) / 1000;
            log_detail.log_new_pay_rate = parseInt( 1000*(log_detail.log_new_pay_user / log_detail.log_new_user ) ) / 1000;

            log_detail.log_ARPU = ((log_detail.log_ARPU || 0)).toFixed(1);
            log_detail.log_ARPPU = ((log_detail.log_ARPPU || 0)).toFixed(1);
            log_detail.log_pay_rate = ((log_detail.log_pay_rate || 0)*100).toFixed(2) + "%";
            log_detail.log_new_pay_rate = ((log_detail.log_new_pay_rate || 0)*100).toFixed(2) + "%";
            ccb();
        }
    }

    async.series( [ queryNewUserCount, queryNewUserCountMachine, baseQuery.queryChannel, baseQuery.queryRegion,
        queryDAU, queryDAUMachine, queryDay1Keep, queryDay1KeepMachine,  queryDetails, calcTodayPayUser,calcTodayIncome
        ,calcTodayNewPayUser, calcTodayOther], function(){
        cb( req, res, data );
    } );
}

module.exports = router;
