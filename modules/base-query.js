/**
 * Created by jiayi on 14/11/18.
 */
// 获得渠道 channels
var queryChannel = function(cb) {
    gChannels = [];
    ymdb.query("select distinct channel from player", function (err, row, field) {
        if (err) {
            throw err;
        }
        // push 0,显示全部
        gChannels.push("0");

        // push channels
        _.each(row, function (channel) {
            gChannels.push(channel.channel);
        });
        cb();
    });
};

// 获得服务器 regions
var queryRegion = function( cb ){
    gServerIds = [];
    ymdb.query("select distinct server_id from player", function( err, row, field ){
        if (err) {
            throw err;
        }
        // push 0,显示全部
        gServerIds.push("All");

        // push channels
        _.each(row, function (servers) {
            gServerIds.push(servers.server_id);
        });
        cb();
    });
};

module.exports.queryChannel = queryChannel;
module.exports.queryRegion = queryRegion;