// copy from : http://em.tiande.com/fish/_softdownload/12306_ticket_helper_for_firefox.user.js

// ==UserScript==
// @name 			12306.CN 订票助手 for Firefox
// @namespace		http://www.u-tide.com/fish/
// @description		帮你订票的小助手 :-)
// @match			http://dynamic.12306.cn/otsweb/*
// @match			https://dynamic.12306.cn/otsweb/*
// @require			https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js
// @icon			http://www.12306.cn/mormhweb/images/favicon.ico
// @run-at			document-idle
// @version 		1.1.3
// @updateURL		http://www.u-tide.com/fish/Service.asmx/Download/44/46/12306_ticket_helper_for_firefox.user.js
// @supportURL		http://www.u-tide.com/fish/soft/44/
// @homepage		http://www.u-tide.com/fish/soft/44/
// ==/UserScript==

/*
Version 1.1 - 2012/1/9
+ 集成自动提交订单功能（致谢 gist: 12306 auto submit）

Vesion 1.1.1 - 2012/1/9
+ 增加取消自动提交订单的功能

Version 1.1.2.1 - 2012/1/9
* 修改自动登录判断逻辑

Version 1.1.3
+ 增加改签页面的自动刷新支持

*/

//-----------------执行环境兼容----------------------


function withJQuery(callback) {
	var cb = document.createElement("script");
	cb.type = "text/javascript";
	cb.textContent = buildCallbackWithJQuery(callback);

	document.head.appendChild(cb);
}

function buildCallbackWithJQuery(callback) {
	var content = "window.__cb=" + callback + ";\
	if(jQuery)window.__cb();\
	else{\
		var script=document.createElement('script'); script.src='https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js'; script.type='text/javascript'; \
		script.addEventListener('load', window.__cb);\
		document.head.appendChild(srcipt);\
	}";

	return content;
}

//-----------------执行环境兼容----------------------


var loginUrl = "/otsweb/loginAction.do";
var queryActionUrl = "/otsweb/order/querySingleAction.do";
//预定
var confirmOrderUrl = "/otsweb/order/confirmPassengerAction.do";

//-----------------入口----------------------

function entryPoint() {
	var location = window.location;
	var path = location.pathname;

	if ((path == loginUrl && location.search == "?method=init") || path == "/otsweb/login.jsp") {
		//登录页
		initLogin();
	} else if (path == queryActionUrl) {
		initTicketQuery();
	} else if (path == "/otsweb/order/myOrderAction.do" && location.search.indexOf("method=resign")!=-1) {
		withJQuery(initTicketQuery);
	} else if (path == confirmOrderUrl) {
		withJQuery(initAutoCommitOrder);
	}
}

if (navigator.userAgent.indexOf("Gecko") == -1) {
	alert("提醒：本脚本适合于 Firefox ，您当前的浏览器不兼容，请使用 Chrome 版本的脚本！");
} else {
	entryPoint();
}

//-----------------入口----------------------

//-----------------工具----------------------
function notify(str, timeout, skipAlert) {
	GM_notification(str);
}

function setCookie(name, value) {
	var Days = 30;
	var exp = new Date();
	exp.setTime(exp.getTime() + Days * 24 * 60 * 60 * 1000);
	document.cookie = name + "=" + escape(value) + ";expires=" + exp.toGMTString();
}

function getCookie(name) {
	var arr = document.cookie.match(new RegExp("(^| )" + name + "=([^;]*)(;|$)"));
	if (arr != null) return unescape(arr[2]); return '';
}

//获得时间信息
function getTimeInfo() {
	var d = new Date();
	return d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
}
//-----------------工具----------------------

//-----------------自动提交----------------------
function initAutoCommitOrder() {
	var count = 0;
	var breakFlag = 0;
	function notify(msg) {
		alert(msg);
	}
	
	function stop(msg) {
		$("#tipresult").html("错误 - " + msg);
		$("div.tj_btn button, div.tj_btn input").each(function () { this.disabled = false; $(this).removeClass().addClass("long_button_u"); });
		$("#btnCancelAuto").hide();
	}

	function submitForm() {
		if (!window.submit_form_check || !submit_form_check("confirmPassenger")) { notify("信息没有填写完整，或当前表单出现异常！"); return; }

		count++;
		$("#tipinfo").html("第 " + count + " 次提交");

		if (breakFlag) {
			$("#tipresult").html("已取消自动提交");
			breakFlag = 0;
			return;
		}
		$("#btnCancelAuto").show().removeClass().addClass("long_button_u_down")[0].disabled = false; //阻止被禁用
		breakFlag = 0;

		jQuery.ajax({
			url: $("#confirmPassenger").attr('action'),
			data: $('#confirmPassenger').serialize(),
			type: "POST",
			timeout: 30000,
			success: function (msg) {
				var match = msg && msg.match(/org\.apache\.struts\.taglib\.html\.TOKEN['"]?\s*value=['"]?([^'">]+)/i);
				var newToken = match && match[1];
				if (newToken) {
					$("input[name='org.apache.struts.taglib.html.TOKEN']").val(newToken);
				}
				if (msg.indexOf('席位已成功锁定') > -1) {
					$("#tipresult").html("订票已成功！");
					alert("车票预订成功，恭喜!");
					window.location.replace("/otsweb/order/myOrderAction.do?method=queryMyOrderNotComplete&leftmenu=Y");
					return;
				}
				if (msg.indexOf('还有未处理的订单') > -1) {
					$("#tipresult").html("系统发现未处理的订单，可能上次已成功，请验证！");
					alert("系统发现未处理的订单，可能上次已成功，请验证!");
					window.location.replace("/otsweb/order/myOrderAction.do?method=queryMyOrderNotComplete&leftmenu=Y");
					return;
				}
				var reTryMessage = ['用户过多', '确认客票的状态后再尝试后续操作', '请不要重复提交'];
				for (var i = reTryMessage.length - 1; i >= 0; i--) {
					if (msg.indexOf(reTryMessage[i]) > -1) {
						$("#tipresult").html(reTryMessage[i]);
						submitForm();
						return;
					}
				};
				msg = msg.match(/var\s+message\s*=\s*"([^"]*)/);
				stop(msg && msg[1] || '出错了。。。。 啥错？ 我也不知道。。。。。');
			},
			error: function (msg) {
				$("#tipresult").html("当前请求发生错误");
				submitForm();
			}
		});
	}

    // Auto submit does not work any more.
	/*$("div.tj_btn")
		.before("<div style='text-align:center;'><span id='tipinfo'></span>：<span id='tipresult'></span></div>")
		.append("<button class='long_button_u_down' type='button' id='btnAutoSubmit'>自动提交</button>" +
				" <button class='long_button_u_down' type='button' id='btnCancelAuto' style='display:none;'>取消自动</button>");
	$("#btnAutoSubmit").click(function () { count = 0; breakFlag = 0; submitForm(); });
	$("#btnCancelAuto").click(function () {
		$(this).hide();
		breakFlag = 1;
	});*/
}

//-----------------自动提交----------------------


//-----------------自动刷新----------------------
function initTicketQuery() {
	//初始化表单
	var form = $("form[name=querySingleForm] .cx_from");
	form.find("tr:last").after("<tr><td colspan='9'><label><input type='checkbox' id='keepinfo' checked='checked' />记住信息</label> <label><input checked='checked' type='checkbox' id='autoRequery' />自动重新查询</label>，刷新周期(秒)：<input type='text' value='6' size='4' id='refereshInterval' style='text-align:center;' />(不得小于6) " +
	"<label style='display:none;'><input type='checkbox' checked='checked' id='chkAudioOn'>声音提示</label> <label><input type='checkbox' id='chkSeatOnly'>仅座票</label> <label><input type='checkbox' id='chkSleepOnly'>仅卧铺</label>" +
	"<input type='button' id='enableNotify' onclick='window.webkitNotifications.requestPermission();' value='请点击以启用通告' style='line-height:25px;padding:5px;' /> <span id='refreshinfo'>已刷新 0 次，最后查询：--</span> <span id='refreshtimer'></span></td></tr>" +
	"<tr><td colspan='9'><input style='line-height:25px;padding:5px;' disabled='disabled'  type='button' value='停止刷新' id='btnStopRefresh' /></td></tr>");

	//操作控制
	$("#btnStopRefresh").click(function () {
		resetTimer();
	});

	//显示座级选择UI
	var ticketType = [];
	$(".hdr tr:eq(2) td").each(function (i, e) {
		ticketType.push(false);
		if (i < 3) return;
		ticketType[i] = true;

		var c = $("<input/>").attr("type", "checkBox").attr("checked", true);
		c[0].ticketTypeId = i;
		c.change(function () {
			ticketType[this.ticketTypeId] = this.checked;
		}).appendTo(e);
	});
	//座级选择
	$("#chkSeatOnly").click(function () {
		if (!this.checked) return;
		$(".hdr tr:eq(2) td").each(function (i, e) {
			$(this).find("input").attr("checked", $(this).text().indexOf("座") != -1).change();
		});
		$("#chkSleepOnly")[0].checked = false;
	});
	$("#chkSleepOnly").click(function () {
		if (!this.checked) return;
		$(".hdr tr:eq(2) td").each(function (i, e) {
			$(this).find("input").attr("checked", $(this).text().indexOf("卧") != -1).change();
		});
		$("#chkSeatOnly")[0].checked = false;
	});

	//通知权限
	$("#enableNotify").remove();

	//保存信息
	function saveStateInfo() {
		if (!$("#keepinfo")[0].checked||$("#fromStationText")[0].disabled) return;
		setCookie("_from_station_text", $("#fromStationText").val());
		setCookie("_from_station_telecode", $("#fromStation").val());
		setCookie("_to_station_text", $("#toStationText").val());
		setCookie("_to_station_telecode", $("#toStation").val());
		setCookie("_depart_date", $("#startdatepicker").val());
		setCookie("_depart_time", $("#startTime").val());
	}
	$("#submitQuery, #stu_submitQuery").click(saveStateInfo);

	//是否是学生票？
	var buttonid = "";
	var autoRefresh = false;
	$("#submitQuery, #stu_submitQuery").click(function () {
		buttonid = this.getAttribute("id");
		timeCount = Math.max(6, parseInt($("#refereshInterval").val()));
		autoRefresh = ($("#autoRequery")[0].checked);
	});
	$("#autoRequery").change(function () {
		autoRefresh = this.checked;
		if (!this.checked) return;

		resetTimer();
	});

	//定时查询
	var timeCount = 0;
	var queryCount = 0;
	var timer = null;
	var isTicketAvailable = false;
	var audio = null; //通知声音
	var timerCountDown = 0;
	function resetTimer() {
		queryCount = 0;
		$("#btnStopRefresh")[0].disabled = true;
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		$("#refreshtimer").html("");
	}
	function countDownTimer() {
		timerCountDown--;
		$("#refreshtimer").html(" 【" + timerCountDown + "秒后自动查询...】");

		if (timerCountDown > 0) {
			timer = setTimeout(countDownTimer, 1000);
		} else {
			doQuery();
		}
	}
	function displayQueryInfo() {
		queryCount++;
		$("#refreshinfo").html("已刷新 " + queryCount + " 次，最后查询：" + getTimeInfo());
		$("#refreshtimer").html("正在查询");
	}
	function doQuery() {
		timer = null;
		displayQueryInfo();
		$("#" + buttonid).click();
	}

	var highLightRow = function (row) {
		row.css("background-color", "#FD855C");
	}
	var highLightCell = function (cell) {
		cell.css("background-color", "#95AFFD");
	}
	var onticketAvailable = function () {
		resetTimer();
		$("#refreshinfo").html("已经有票鸟！");

		setTimeout(function () {
			if (window.Audio && $("#chkAudioOn")[0].checked) {
                // hacked
                playAudio();
				notify("可以订票了！", null, false);
			} else {
				notify("可以订票了！", null, false);
			}
		}, 100);
	}

	//检查是否可以订票
	var checkTickets = function (row) {
		if ($("input.yuding_x", row).length > 0) return false;

		var hasTicket = false;
		$("td", row).each(function (i, e) {
			if (!ticketType[i - 1]) return;
			var el = $(e);

			var info = $.trim(el.text());
			if (info != "--" && info != "无") {
				highLightCell(el);
				hasTicket= true;
			}
		});

		return hasTicket;
	}

	//目标表格
	var g = $(".obj")[0];
	g.addEventListener("DOMNodeInserted", function (e) {
		e = e || event;
		var row = $(e.target);

		if (checkTickets(row)) {
			if (!isTicketAvailable) {
				onticketAvailable();
			}

			isTicketAvailable = true;
			highLightRow(row);
		}
		if (!timer && !isTicketAvailable && autoRefresh) {
			timerCountDown = timeCount + 1;
			//没有定时器的时候，开启定时器准备刷新
			$("#btnStopRefresh")[0].disabled = false;
			countDownTimer();
		}
	}, true);
	g.addEventListener("DOMNodeRemoved", function () {
		isTicketAvailable = false;
	});

	//回填信息
	if(!$("#fromStationText")[0].disabled){
		var FROM_STATION_TEXT = getCookie('_from_station_text');  // 出发站名称
		var FROM_STATION_TELECODE = getCookie('_from_station_telecode');  // 出发站电报码
		var TO_STATION_TEXT = getCookie('_to_station_text');  // 到达站名称
		var TO_STATION_TELECODE = getCookie('_to_station_telecode');  // 到达站电报码
		var DEPART_DATE = getCookie('_depart_date');  // 出发日期
		var DEPART_TIME = getCookie('_depart_time'); // 出发时间
		$("#fromStationText").val(FROM_STATION_TEXT);
		$("#fromStation").val(FROM_STATION_TELECODE);
		$("#toStationText").val(TO_STATION_TEXT);
		$("#toStation").val(TO_STATION_TELECODE);
		$("#startdatepicker").val(DEPART_DATE);
		$("#startTime").val(DEPART_TIME);
	}
}

//-----------------自动刷新----------------------

//-----------------自动登录----------------------

function initLogin() {
	//login
	var url = "https://dynamic.12306.cn/otsweb/loginAction.do?method=login";
	var queryurl = "https://dynamic.12306.cn/otsweb/order/querySingleAction.do?method=init";
	//Check had login, redirect to query url
	if (parent && parent.$) {
		var str = parent.$("#username_ a").attr("href");
		if (str && str.indexOf("sysuser/user_info") != -1) {
			window.location.href = queryurl;
			return;
		}
	}

	//插入登录标记
	var form = $("#loginForm");
	form.find("table tr:eq(3)").before('<tr><td>记录</td><td colspan="2"><label><input type="checkbox" id="keepInfo" /> 记录用户名和密码</label> (<span style="color:red;">警告：可能会泄漏您的密码！</span>)</td></tr><tr><td colspan="3">' +
	'<input type="button" id="enableNotify" onclick="$(this).hide();window.webkitNotifications.requestPermission();" value="请点击以启用通告" style="line-height:25px;padding:5px;" /><input type="button" id="refreshButton" value="自动登录" style="line-height:25px;padding:5px;" /> (闪跳回登录页面时，请再试 :-)，淡定 | <a href="http://www.u-tide.com/fish/Service.asmx/Download/44/46/12306_ticket_helper_for_firefox.user.js" target="_blank">更新脚本</a>)</td></tr>');

	if (window.webkitNotifications && window.webkitNotifications.checkPermission() != 0) {
		window.webkitNotifications.requestPermission();
	} else {
		$("#enableNotify").remove();
	}


	function submitForm() {
		var submitUrl = url;
		var un = $("#UserName").val();
		var up = $("#password").val();
		var rand = $("#randCode").val();

		if (!rand || rand.length != 4) {
			alert("请输入验证码！");
			stopLogin();
			return;
		}

		if ($("#keepInfo")[0].checked) {
			setCookie("__un", un);
			setCookie("__up", up)
		}
		$.ajax({
			type: "POST",
			url: submitUrl,
			data: {
				"loginUser.user_name": un
			  , "user.password": up
			  , "randCode": rand
			},
			timeout: 30000,
			success: function (msg) {
				if (msg.indexOf('请输入正确的验证码') > -1) {
					stopLogin();
					alert('请输入正确的验证码！');
					return;
				};
				if (msg.indexOf("欢迎您！")!=-1) {
					notify('登录成功，开始查询车票吧！');
					window.location.href = queryurl;
				};
				reLogin();
			},
			error: function (msg) {
				reLogin();
			},
			beforeSend: function (XHR) {
			}
		});
	}

	var count = 1;
	function reLogin() {
		count++;
		$('#refreshButton').val("(" + count + ")次登录中...").disabled = true;
		notify("自动登录中：(" + count + ") 次登录中...");
		setTimeout(submitForm, 3000);
	}
	function stopLogin() {
		$('#refreshButton').val("自动登录")[0].disabled = false;
	}
	//初始化
	$("#refreshButton").click(function () {
		count = 1;
		$(this).val("(1) 次登录中...");
		notify("自动登录中：(1) 次登录中...");
		submitForm();
		return false;
	});

	var kun = getCookie("__un");
	var kup = getCookie("__up");
	if (kun && kup) {
		$("#UserName").val(kun);
		$("#password").val(kup);
		$("#randCode")[0].focus();
	}
}

//-----------------自动登录----------------------
