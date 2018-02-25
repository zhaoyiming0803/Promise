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

  function resolve (self, value) {
    self.handles.resolves.length && self.handles.resolves.forEach(function (cbItem) {
      cbItem.call(self, value);
    });
  }

  function reject (self, reason) {
    self.handles.rejects.length && self.handles.rejects.forEach(function (cbItem) {
      cbItem.call(self, reason);
    });
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

  function Promise (fn) {
    this.handles = {
      resolves: [],
      rejects: []
    };
    doResolve(this, fn);
  }

  Promise.all = function (list) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        var successRes = [];
        var errorRes = [];
        list.length && list.forEach(function (item, index) {
          item.then(function (val) {
            successRes.push(val);
            if (successRes.length === list.length) {
              resolve(successRes);
            }
          }, function (val) {
            if (errorRes.length === 0) {
              errorRes.push(val);
              reject(val);
            }
          });
        });
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