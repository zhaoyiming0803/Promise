/**
 * 模拟 ES6-Promise 实现原理，可运行于浏览器或服务端
 * @author: zhaoyiming
 * @since:  2018/02/25
 * License: MIT, https://github.com/zymfe/Promise
 */

; (function (window, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define([], function () { return factory(); }) :
      (window.Promise = factory());
})(this, function () {
  'use strict';

  function isArray(arry) {
    return Object.prototype.toString.call(arry) === '[object Array]';
  }

  function isNative(Ctor) {
    return typeof Ctor === 'function' && /native code/.test(Ctor.toString());
  }

  // 既然使用 Promise，那么肯定要解决异步问题
  // 所以在实例化 Promise 时，方法体内最好是异步代码
  // 否则 setImmediate 和 MessageChannel 会有问题
  var timer = (function () {
    var macroTimerFunc;

    // 高版本 IE 和 Edge 才支持的特性
    if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
      macroTimerFunc = function (fn) {
        setImmediate(fn);
      }
    } else if (
      typeof MessageChannel !== 'undefined' && (
        isNative(MessageChannel) ||
        // PhantomJS
        MessageChannel.toString() === '[object MessageChannelConstructor]'
      )
    ) {
      macroTimerFunc = function (fn) {
        var channel = new MessageChannel(),
          port2 = channel.port2;
        channel.port1.onmessage = function () {
          fn();
        }
        // postMessage 参数如果是对象，只能有一个属性，所以这里使用闭包修改 self、value、fn
        port2.postMessage(1);
      }
    } else {
      macroTimerFunc = function (fn) {
        setTimeout(fn, 0);
      }
    }

    return macroTimerFunc;
  })();

  function resolve(self, value) {
    var resolves = self.handles.resolves,
      len = resolves.length;

    if (len === 0) return false;

    self.handles.rejects.length = 0;
    self.status === 0 && (self.status = 1) && (self.value = value);

    for (var i = 0; i < len; i += 1) {
      resolves[i].call(self, value);
    }
  }

  function reject(self, reason) {
    var rejects = self.handles.rejects,
      len = rejects.length;

    if (len === 0) return false;

    self.handles.resolves.length = 0;
    self.status === 0 && (self.status = 2) && (self.value = reason);

    for (var i = 0; i < len; i += 1) {
      rejects[i].call(self, reason);
    }
  }

  function doResolve(self, fn) {
    timer(function () {
      fn(function (value) {
        resolve(self, value);
      }, function (reason) {
        reject(self, reason);
      });
    });
  }

  function multiplePromise(promiseList, resolve, reject) {
    var successRes = [],
      errorRes = [],
      len = promiseList.length;

    if (len === 0) return false;

    for (var i = 0; i < len; i += 1) {
      promiseList[i].then((function (i) {
        return function (val) {
          successRes[i] = val;
          if (--len === 0) {
            resolve(successRes);
          }
        }
      })(i), function (val) {
        if (errorRes.length === 0) {
          errorRes.push(val);
          reject(val);
        }
      });
    }
  }

  function racePromise(promiseList, resolve, reject) {
    var status = 0;
    for (var i = 0, len = promiseList.length; i < len; i += 1) {
      promiseList[i].then(function (val) {
        status === 0 && (status = 1) && resolve(val);
      }, function (val) {
        status === 0 && (status = 2) && reject(val);
      });
    }
  }

  function Promise(fn) {
    this.handles = {
      resolves: [],
      rejects: []
    };
    this.status = 0; // 0: pending 1: resolve 2: reject
    this.value = null;
    doResolve(this, fn);
  }

  Promise.all = function (promiseList) {
    if (!isArray(promiseList)) {
      throw Error('The param of Promise.all must be an Array!');
    }
    return new Promise(function (resolve, reject) {
      multiplePromise(promiseList, resolve, reject);
    });
  };

  Promise.race = function (promiseList) {
    if (!isArray(promiseList)) {
      throw Error('The param of Promise.race must be an Array!');
    }
    return new Promise(function (resolve, reject) {
      racePromise(promiseList, resolve, reject);
    });
  };

  Promise.prototype.then = function (resolve, reject) {
    switch (this.status) {
      case 0:
        addQueue(this, resolve, reject);
        break;
      case 1:
        resolve(this.value);
        break;
      default:
        reject(this.value);
    }
    return this;
  };

  function addQueue(self, resolve, reject) {
    typeof resolve === 'function' && self.handles.resolves.push(resolve);
    typeof reject === 'function' && self.handles.rejects.push(reject);
  }

  return Promise;
});
