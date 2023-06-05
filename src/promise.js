/**
 * 模拟 ES6-Promise
 */

; (function (window, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define([], function () { return factory(); }) :
      (window.Promise = factory());
})(this, function () {
  'use strict';

  const isNative = Ctor => typeof Ctor === 'function' && /native code/.test(Ctor.toString())
  const isFunction = fn => typeof fn === 'function'

  const timer = (function () {
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

  function runResolves(self, value) {
    let cb = null
    while (cb = self._resolves.shift()) {
      cb(value)
    }
  }

  function runRejects(self, value) {
    let cb = null
    while (cb = self._rejects.shift()) {
      cb(value)
    }
  }

  function Promise(fn) {
    this._resolves = []
    this._rejects = []
    this._status = 0 // 0: pending 1: resolve 2: reject
    this._value = null

    try {
      fn(this._resolve.bind(this), this._reject.bind(this))
    } catch (e) {
      this._reject(e)
    }
  }

  Promise.prototype._resolve = function (value) {
    if (this._status !== 0) {
      return
    }
    this._value = value
    this._status = 1
    runResolves(this, value)
  }

  Promise.prototype._reject = function (error) {
    if (this._status !== 0) {
      return
    }
    this._value = error
    this._status = 2
    runRejects(this, error)
  }

  Promise.prototype.then = function (onFulfilled, onRejected) {
    return new Promise((onFulfilledNext, onRejectedNext) => {
      timer(() => {
        const fulfilled = value => {
          try {
            if (isFunction(onFulfilled)) {
              const res = onFulfilled(value)
              if (res instanceof Promise) {
                res.then(onFulfilledNext, onRejectedNext)
              } else {
                onFulfilledNext(res)
              }
            } else {
              onFulfilledNext(value)
            }
          } catch (e) {
            onRejectedNext(e)
          }
        }

        const rejected = error => {
          try {
            if (isFunction(onRejected)) {
              const res = onRejected(error)
              if (res instanceof Promise) {
                res.then(onFulfilledNext, onRejectedNext)
              } else {
                onRejectedNext(error)
              }
            } else {
              onRejectedNext(error)
            }
          } catch (e) {
            onRejectedNext(e)
          }
        }

        switch (this._status) {
          case 0:
            this._resolves.push(fulfilled)
            this._rejects.push(rejected)
            break
          case 1:
            fulfilled(this._value)
            break
          case 2:
            rejected(this._value)
            break
        }
      })
    })
  }

  Promise.prototype.catch = function (onRejected) {
    return this.then(undefined, onRejected)
  }

  Promise.prototype.finally = function (cb) {
    this.then(value => cb(value), error => cb(error))
  }

  Promise.resolve = function (value) {
    if (value instanceof Promise) return value
    return new Promise(resolve => resolve(value))
  }

  Promise.all = function (promises) {
    return new Promise((resolve, reject) => {
      const values = []
      // 可以用 let，省去闭包
      for (var i = 0; i < promises.length; i++) {
        ; (function (i) {
          promises[i].then(value => {
            values[i] = value
            if (values.length === promises.length) {
              resolve(values)
            }
          }, error => reject(error))
        })(i)
      }
    })
  }

  Promise.race = function (promises) {
    return new Promise((resolve, reject) => {
      promises.forEach(p => {
        p.then(value => resolve(value), error => reject(error))
      })
    })
  }

  return Promise
});
