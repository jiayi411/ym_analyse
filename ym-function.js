/**
 * Created by jiayi on 14/11/14.
 */
var ym = ym || {};
module.exports = ( function(m){

    // 直接log
//    m.log = console.log;

    // sprintf log
    m.log = function(){
        if( arguments.length > 1 )
        { console.log( ( m.sprintf.apply( m, arguments ) )); }
        else
        { console.log.apply(console, arguments ); }
    };

    // 通过指定日期返回之前/之后的日期
    // date: 指定日期，为空则是今天
    // offset: 偏移的天(+,-)
    m.getOffsetDate = function( date, offset_day ){
        date = date || new Date();
        return new Date( date.getTime() + offset_day * 24 * 3600 * 1000 );
    };

    // 获得星期n(0-6)
    var week_string = ['日','一','二','三','四','五','六'];
    m.getWeekDayString = function( day ){
        if( day >= 0 && day <= 6 ){
            return week_string[day];
        }
        return "";
    };

    // 获得yy-mm-dd
    Date.prototype.format = function(fmt)
    { //author: meizz
        var o = {
            "M+" : this.getMonth()+1,                 //月份
            "d+" : this.getDate(),                    //日
            "h+" : this.getHours(),                   //小时
            "m+" : this.getMinutes(),                 //分
            "s+" : this.getSeconds(),                 //秒
            "q+" : Math.floor((this.getMonth()+3)/3), //季度
            "S"  : this.getMilliseconds()             //毫秒
        };
        if(/(y+)/.test(fmt))
            fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));
        for(var k in o)
            if(new RegExp("("+ k +")").test(fmt))
                fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
        return fmt;
    };


    // 获得时间,转化为Date
    m.parseDate = function( date_string ){
        var yy = date_string.slice( 0, 4 );
        var mm = date_string.slice( 5, 7 ) - 1;
        var dd = date_string.slice( 8, 10 );
        var hh = 0, m = 0, ss = 0;
        if( date_string.length > 10 ){
            hh = date_string.slice( 11, 13 );
            m = date_string.slice( 14, 16 );
            ss = date_string.slice( 17, 19 );
        }
        return new Date( yy, mm, dd, hh, m, ss, 0 );
//        ym.log( date_string );
//        ym.log( date.toLocaleString() );
    };

    // sprintf
    m.sprintf = function() {
        var i = 0, a, f = arguments[i++], o = [], m, p, c, x, s = '';
        while (f) {
            if (m = /^[^\x25]+/.exec(f)) {
                o.push(m[0]);
            }
            else if (m = /^\x25{2}/.exec(f)) {
                o.push('%');
            }
            else if (m = /^\x25(?:(\d+)\$)?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(f)) {
                if (((a = arguments[m[1] || i++]) == null) || (a == undefined)) {
                    throw('Too few arguments.');
                }
                if (/[^s]/.test(m[7]) && (typeof(a) != 'number')) {
                    throw('Expecting number but found ' + typeof(a));
                }
                switch (m[7]) {
                    case 'b':
                        a = a.toString(2);
                        break;
                    case 'c':
                        a = String.fromCharCode(a);
                        break;
                    case 'd':
                        a = parseInt(a);
                        break;
                    case 'e':
                        a = m[6] ? a.toExponential(m[6]) : a.toExponential();
                        break;
                    case 'f':
                        a = m[6] ? parseFloat(a).toFixed(m[6]) : parseFloat(a);
                        break;
                    case 'o':
                        a = a.toString(8);
                        break;
                    case 's':
                        a = ((a = String(a)) && m[6] ? a.substring(0, m[6]) : a);
                        break;
                    case 'u':
                        a = Math.abs(a);
                        break;
                    case 'x':
                        a = a.toString(16);
                        break;
                    case 'X':
                        a = a.toString(16).toUpperCase();
                        break;
                }
                a = (/[def]/.test(m[7]) && m[2] && a >= 0 ? '+' + a : a);
                c = m[3] ? m[3] == '0' ? '0' : m[3].charAt(1) : ' ';
                x = m[5] - String(a).length - s.length;
                p = m[5] ? str_repeat(c, x) : '';
                o.push(s + (m[4] ? a + p : p + a));
            }
            else {
                throw('Huh ?!');
            }
            f = f.substring(m[0].length);
        }
        return o.join('');
    };
    return m;

})(ym);