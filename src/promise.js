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

  function resolve (self, value) {
    var resolves = self.handles.resolves,
      len = resolves.length;
    if (len) {
      for (var i = 0; i < len; i += 1) {
        resolves[i].call(self, value);
      }
    }
  }

  function reject (self, reason) {
    var rejects = self.handles.rejects,
      len = rejects.length;
    if (len) {
      for (var i = 0; i < len; i += 1) {
        rejects[i].call(self, reason);
      }
    }
  }

  function doResolve (self, fn) {
    fn(function (value) {
      self.handles.rejects.length = 0;
      resolve(self, value);
    }, function (reason) {
      self.handles.resolves.length = 0;
      reject(self, reason);
    });
  }

  function multiplePromise (promiseList, resolve, reject) {
    var successRes = [],
      errorRes = [],
      len = promiseList.length;
    if (len) {
      for (var i = 0; i < len; i += 1) {
        promiseList[i].then(function (val) {
          successRes.push(val);
          if (successRes.length === promiseList.length) {
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
  }

  function Promise (fn) {
    this.handles = {
      resolves: [],
      rejects: []
    };
    doResolve(this, fn);
  }

  Promise.all = function (promiseList) {
    if (!isArray(promiseList)) {
      throw Error('The param of Promise.all must be a Array!');
    }
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        multiplePromise(promiseList, resolve, reject);
      }, 0);
    });
  };

  Promise.prototype.then = function (resolve, reject) {
    typeof resolve === 'function' && this.handles.resolves.push(resolve);
    typeof reject === 'function' && this.handles.rejects.push(reject);
    return this;
  };

  return Promise;
});