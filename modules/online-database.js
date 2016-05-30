/**
 * Created by jiayi on 14/11/14.
 */

var onlinedb = onlinedb || {};
module.exports = ( function(m){

    var mysql = require('mysql');
    var ym = require('../ym-function.js');

    m.connection = 0;
    m.pools = [];

    var usePool = true;

    // 数据库pool
    m.initDBPool = function( server_id ){
        var pool_data = getPoolData( server_id );
        if( pool_data ){
            return;
        }

        var pool = mysql.createPool({
            host     : 'game'+server_id+'.mysql.rds.aliyuncs.com',
            user     : 'game_ym_web',
            password : 'ym_web_2014_lori',
            database : 'django'
        });

        m.pools.push( { 'server_id':server_id,'pool':pool } );
    };

    // 返回pool
    function getPoolData( server_id ){
        return _.find(m.pools, function( pool_data ){
            return( pool_data.server_id == server_id )
        });
    }

    // 查询
    m.query = function( server_id, query, cb ) {
        var pool_data = getPoolData( server_id );
        if( !pool_data ){
            ym.log('not find server_id:%d', server_id );
            return;
        }
        pool_data.pool.getConnection(function (err, connection) {
            if (connection) {
                connection.query(query, function (err, rows, field) {
                    cb(err, rows, field);
                    connection.release();
                });
            }
        })
    };

    //

    return m;
})( onlinedb );