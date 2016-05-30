/**
 * Created by jiayi on 14/11/14.
 */

var ymdb = ymdb || {};
module.exports = ( function(m){

    var mysql = require('mysql');
    var ym = require('../ym-function.js');

    m.connection = 0;
    m.pool = 0;

    var usePool = true;

    // 数据库pool
    m.initDBPool = function(){
        m.pool = mysql.createPool({
            host     : 'platform.mysql.rds.aliyuncs.com',
            user     : 'platform_analyse',
            password : '99_abc-123',
            database : 'analyse'
        });
    };

    // 查询
    m.query = function( query, cb ){
        if( usePool ){
            m.pool.getConnection( function( err, connection ){
                if( connection ) {
                    connection.query(query, function (err, rows, field) {
                        cb(err, rows, field);
                        connection.release();
                    });
                }
            })
        }else{
            m.connection.query( query, cb );
        }
    };

    // 数据库
    m.initDB = function(){
        m.connection = mysql.createConnection({
            host     : 'platform.mysql.rds.aliyuncs.com',
            user     : 'platform_analyse',
            password : '99_abc-123',
            database : 'analyse'
        });

        m.connection.connect(function(err) {              // The server is either down
            if(err) {                                     // or restarting (takes a while sometimes).
                console.log('error when connecting to db:', err);
                setTimeout(m.initDB, 2000); // We introduce a delay before attempting to reconnect,
            }                                     // to avoid a hot loop, and to allow our node script to
        });                                     // process asynchronous requests in the meantime.
        // If you're also serving http, display a 503 error.
        m.connection.on('error', function(err) {
            console.log('db error', err);
            if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
                m.initDB();                         // lost due to either server restart, or a
            } else {                                      // connnection idle timeout (the wait_timeout
                throw err;                                  // server variable configures this)
            }
        });
    };

    // 断开
    m.end = function(){
        if(m.connection){
            m.connection.end();
            ym.log('db disconnected');
            return;
        }
        ym.log('no db connection');
    };

    //

    return m;
})( ymdb );