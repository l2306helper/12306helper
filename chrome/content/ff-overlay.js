(function() {
  let Cu = Components.utils;
  let Cc = Components.classes;
  let Ci = Components.interfaces;

  function exposeReadOnly(obj) {
    if (null == obj) {
      return obj;
    }

    if (typeof obj !== "object") {
      return obj;
    }

    if (obj["__exposedProps__"]) {
      return obj;
    }

    // If the obj is a navite wrapper, can not modify the attribute.
    try {
      obj.__exposedProps__ = {};
    } catch (e) {
      return;
    }

    var exposedProps = obj.__exposedProps__;
    for (let i in obj) {
      if (i === "__exposedProps__") {
        continue;
      }

      if (i[0] === "_") {
        continue;
      }

      exposedProps[i] = "r";

      exposeReadOnly(obj[i]);
    }

    return obj;
  }

  var l2306helper = {};
  l2306helper.onFirefoxLoad = function(event) {
    document.getElementById("contentAreaContextMenu")
            .addEventListener("popupshowing", function (e) {
      l2306helper.showFirefoxContextMenu(e);
    }, false);

    function _log(str) {
      // dump(str + "\n");
      Cu.reportError(str);
    }

    function _getContentFromURL(url) {
      var ioService = Cc['@mozilla.org/network/io-service;1']
                        .getService(Ci.nsIIOService);
      var scriptableStream = Cc['@mozilla.org/scriptableinputstream;1']
                               .getService(Ci.nsIScriptableInputStream);

      var channel = ioService.newChannel(url, null, null);
      var input = channel.open();
      scriptableStream.init(input);
      var str = scriptableStream.read(input.available());
      scriptableStream.close()
      input.close();

      var utf8Converter = Cc["@mozilla.org/intl/utf8converterservice;1"].
      getService(Ci.nsIUTF8ConverterService);
      return utf8Converter.convertURISpecToUTF8 (str, "UTF-8");
    }

    var alertsService = Cc["@mozilla.org/alerts-service;1"]
                          .getService(Ci.nsIAlertsService);
    function GM_notification(str) {
      alertsService.showAlertNotification("", str, "");
    }

    var audio = null;
    function playAudio() {
        if (!audio) {
          audio = new Audio("chrome://l2306helper/content/song.ogg");
          audio.loop = false;
        }
        audio.play();
    }

    function _injectJS(view, js_src) {
      try {
        var sandbox = new Cu.Sandbox(view);
        sandbox.unsafeWindow = view.window.wrappedJSObject;
        sandbox.window = view.window;
        sandbox.document = sandbox.window.document;
        sandbox.JSON = JSON;
        sandbox.GM_notification = GM_notification;
        sandbox.playAudio = playAudio;
        sandbox.__proto__ = sandbox.window;

        js_src.forEach(function(src) {
           Cu.evalInSandbox(_getContentFromURL(src), sandbox);
        });
      } catch (e) {
        _log(e);
      }
    }

    document.getElementById("appcontent").addEventListener("DOMContentLoaded",
                                                           function(evt) {
      if (!evt.originalTarget instanceof HTMLDocument) {
        return;
      }

      var view = evt.originalTarget.defaultView;
      if (!view) {
        return;
      }

      let pref = "extensions.l2306helper@gmail.com.12306page";
      var pageUrl = Application.prefs.getValue(pref, "^$");

      if (new RegExp(pageUrl, "ig").test(view.document.location.href)) {
        _injectJS(view, ["chrome://l2306helper/content/jquery.min.js",
                         "chrome://l2306helper/content/12306_ticket_helper.user.js"]);
      }
    }, false);
  };

  window.addEventListener("load", function () {
    l2306helper.onFirefoxLoad();
  }, false);
})();

