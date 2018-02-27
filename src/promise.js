/**
 * Description: 模拟ES6-Promise实现原理，可运行于浏览器或服务端
 * User: zhaoyiming
 * Date: 2018/02/25
 * License: MIT, https://github.com/zymseo/Promise
 */

;(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define([], function () {return factory();}) :
  (global.Promise = factory());
})(this, function () {
  'use strict';

  function isArray (arry) {
    return Object.prototype.toString.call(arry) === '[object Array]';
  }

  function timer (self, value, fn) {
    var timeout = setTimeout(function () {
      fn(self, value);
      clearTimeout(timeout);
      timeout = null;
    }, 0);
  }

  function resolve (self, value) {
    var resolves = self.handles.resolves,
      len = resolves.length;
    self.status === 0 && (self.status = 1) && (self.value = value);
    if (len === 0) {return false;}
    for (var i = 0; i < len; i += 1) {
      resolves[i].call(self, value);
    }
  }

  function reject (self, reason) {
    var rejects = self.handles.rejects,
      len = rejects.length;
    self.status === 0 && (self.status = 2) && (self.value = reason);
    if (len === 0) {return false;}
    for (var i = 0; i < len; i += 1) {
      rejects[i].call(self, reason);
    }
  }

  function doResolve (self, fn) {
    fn(function (value) {
      self.handles.rejects.length = 0;
      timer(self, value, resolve);
    }, function (reason) {
      self.handles.resolves.length = 0;
      timer(self, reason, reject);
    });
  }

  function multiplePromise (promiseList, resolve, reject) {
    var successRes = [],
      errorRes = [],
      len = promiseList.length;
    if (len === 0) {return false;}
    for (var i = 0; i < len; i += 1) {
      promiseList[i].then(function (val) {
        successRes.push(val);
        if (successRes.length === len) {
          resolve(successRes);
        }
      }, function (val) {
        if (errorRes.length === 0) {
          errorRes.push(val);
          reject(val);
        }
      });
    }
  }

  function Promise (fn) {
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
      throw Error('The param of Promise.all must be a Array!');
    }
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        multiplePromise(promiseList, resolve, reject);
        clearTimeout(timer);
        timer = null;
      }, 0);
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

  function addQueue (self, resolve, reject) {
    typeof resolve === 'function' && self.handles.resolves.push(resolve);
    typeof reject === 'function' && self.handles.rejects.push(reject);
  }

  return Promise;
});