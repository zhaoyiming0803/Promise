# Promise

根据官方 Promise 用法，结合个人思路，试着实现 Promise，通过每次 git 提交，记录自己的思路，持续修改更新中！

注意：熟悉 Promise 基本用法之后再阅读此文会更好，可参考中文版《Promises/A+规范》：http://www.ituring.com.cn/article/66566 。

### 个人理解：

Promise 本身没有解决「异步回调地狱」的问题，async await 才解决了。

Promise 真正解决的是「信任问题」，把回调函数的执行权放到开发者手中，

比如 [demo](https://github.com/zhaoyiming0803/test-code/blob/master/test288.js) 所示：

就算第三方库 ajax 执行多次（resolve 或 reject），注册的 then 回调也只会执行一次。

Promise 本身不会回调过晚，只要决议了，它就会按照规定运行。至于服务器或者网络的问题，并不是 Promise 能解决的，一般这种情况会使用 Promise 的竞态 catch。
### 1、简易实例
``` javascript
var p = new Promise(function (resolve, reject) {
  $.ajax({
    type: 'POST',
    url: 'http://www.zymseo.com/qianduan',
    data: {
      uname: 'zhaoyiming',
      upwd: '123456'
    },
    dataType: 'json',
    success: function (res) {
      res.errorCode === 200 ? resolve(res) : reject(res);
    },
    error: function (res) {
      reject(res);
    }
  });
});

p.then(function (value) {
  console.log(value);
}, function (reason) {
  console.log(reason);
});
```
从以上代码可以看出，Promise 是一个构造函数，实例化之后，可以通过它的 then 方法【注册】promise 异步操作成功时执行的回调，使得异步调用变得非常简单方便。

之所以说是注册，是因为它就是一种【发布订阅模式】。

### 2、试着实现一个 Promise 雏形
``` javascript
function Promise (fn) {
  this._resolves = []
  this._rejects = []
}

Promise.prototype.then = function (onFulfilled, onRejected) {
  return new Promise((onFulfilledNext, onRejectedNext) => {

  });
};
```
通过 then 方法，将执行成功或失败之后的回调函数放入队列里边（Promise 内部定义的 handles 对象，resolves 存放成功时的回调，rejects 存放失败时的回调）。

既然是发布订阅模式，那么首先得订阅，就像我们看到某些杂志的文章非常好，就可以订阅他们的邮箱，这样每天有新的文章更新时，我们的邮箱才能收到并提醒我们去阅读。

所以，resolve 和 reject 的执行必须是包含在一个异步方法内（ajax，setTimeout 等等），这个时候，会首先执行 then，最后异步执行完成之后再依次执行通过 then 注册的回调。

then 中 return Promise 实例，实现了链式调用。

### 3、Promise 内部加入延时机制

理论上，Promise 内都是做异步操作的，但是没法保证所有的人都这样做（心急写代码忘了呢^-^）.

也就是在 then 方法注册回调之前，resolve 或 reject 函数就执行了。

这显然是不允许的，Promises/A+ 规范明确要求回调需要通过异步方式执行，用以保证一致可靠的执行顺序。
``` javascript
var p = new Promise(function (resolve, reject) {
  // do something...
  resolve(value);
});

p.then(function (res) {
  console.log(res);
});
```
我们可以做一些处理，保证在 resolve 执行之前，then 方法已经注册完所有的回调：在 Promise 内部，将 resolve 或 reject 包裹在 setTimeout 内：
``` javascript
function Promise (fn) {
  this._resolves = []
  this._rejects = []

  var _this = this;

  fn(function (value) {
    setTimeout(function () {
      for (var i = 0, len = _this.handles.resolves.length; i < len; i += 1) {
        _this.handles.resolves[i]();
      }
    }, 0);
  }, function (reason) {
    setTimeout(function () {
      for (var i = 0, len = _this.handles.rejects.length; i < len; i += 1) {
        _this.handles.rejects[i]();
      }
    }, 0);
  });
}
```
但是，这样好像还存在一个问题，可以细想一下：如果 Promise 异步操作已经成功，这时，在异步操作成功之前注册的回调都会执行，但是在 Promise 异步操作成功这之后调用的 then 注册的回调就再也不会执行了，这肯定是不行的。

### 4、通过状态来决定回调什么时候执行

Promises/A+ 规范中的 2.1 Promise States 中明确规定了，pending可 以转化为 fulfilled 或 rejected 并且`只能转化一次`，也就是说如果 pending 转化到 fulfilled 状态，那么就不能再转化到rejected。并且 fulfilled 和 rejected 状态只能由 pending 转化而来，两者之间不能互相转换。如图所示：

![image](https://github.com/zhaoyiming0803/Promise/blob/dev/promise.png)
``` javascript
function Promise (fn) {
  this._resolves = []
  this._rejects = []
  this._status = 0; // 0: pending 1: resolve 2: reject
}

Promise.prototype.then = function (fulfilled, rejected) {
  return new Promise((onFulfilledNext, onRejectedNext) => {
    // ...
    switch (this._status) {
      case 0: // 如果是pedding状态，则将回调加入到队列
        this._resolves.push(fulfilled)
        this._rejects.push(rejected)
        break
      case 1: // 如果异步已经执行成功，则立刻执行then中注册的resolve方法
        fulfilled(this._value)
        break
      case 2: // 如果异步已经执行失败，则立刻执行then中注册的reject方法
        rejected(this._value)
        break
    }
  })
};
```

### 5、总结

通过 Promise.prototype.then 方法将观察者方法注册到被观察者 Promise 对象中，同时返回一个新的 Promise 对象，以便可以链式调用。

被观察者管理内部 pending、fulfilled 和 rejected 的状态转变，同时通过构造函数中传递的 resolve 和 reject 方法以主动触发状态转变和通知观察者。

了解了 Promise 执行原理，再去扩展 then 之后的其他方法就很好做了。例如 Promise.all() Promise.rece() 等等。

这里 https://github.com/zhaoyiming0803/Promise/blob/master/src/Promise.js 实现了 Promise，可以作为参考。

### 个人微信&QQ：1047832475

![image](https://github.com/zhaoyiming0803/zhaoyiming0803/raw/master/wechat.jpg)

### --- 分割线 ---

如果对您有帮助，您可以点右上角 "Star" 支持一下 谢谢！ ^_^

或者您可以 "follow" 一下，我会不断开源更多的有趣的项目。
