# Promise

根据官方Promise用法，结合个人思路，试着实现Promise，通过每次git提交，记录自己的思路，持续修改更新中！

注意：熟悉Promise基本用法之后再阅读此文会更好，可参考中文版《Promises/A+规范》：http://www.ituring.com.cn/article/66566 。

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
从以上代码可以看出，Promise是一个构造函数，实例化之后，可以通过它的then方法【注册】promise异步操作成功时执行的回调，使得异步调用变得非常简单方便。

之所以说是注册，是因为它就是一种【发布订阅模式】。

### 2、试着实现一个Promise雏形
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
通过then方法，将执行成功或失败之后的回调函数放入队列里边（Promise内部定义的handles对象，resolves存放成功时的回调，rejects存放失败时的回调）。

既然是发布订阅模式，那么首先得订阅，就像我们看到某些杂志的文章非常好，就可以订阅他们的邮箱，这样每天有新的文章更新时，我们的邮箱才能收到并提醒我们去阅读。

所以，resolve和reject的执行必须是包含在一个异步方法内（ajax，setTimeout等等），这个时候，会首先执行then，最后异步执行完成之后再依次执行通过then注册的回调。

then中return Promise 实例，实现了链式调用。

### 3、Promise内部加入延时机制

理论上，Promise内都是做异步操作的，但是没法保证所有的人都这样做（心急写代码忘了呢^-^）.

也就是在then方法注册回调之前，resolve或reject函数就执行了。

这显然是不允许的，Promises/A+规范明确要求回调需要通过异步方式执行，用以保证一致可靠的执行顺序。
``` javascript
var p = new Promise(function (resolve, reject) {
  // do something...
  resolve(value);
});

p.then(function (res) {
  console.log(res);
});
```
我们可以做一些处理，保证在resolve执行之前，then方法已经注册完所有的回调：在Promise内部，将resolve或reject包裹在setTimeout内：
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
但是，这样好像还存在一个问题，可以细想一下：如果Promise异步操作已经成功，这时，在异步操作成功之前注册的回调都会执行，但是在Promise异步操作成功这之后调用的then注册的回调就再也不会执行了，这肯定是不行的。

### 4、通过状态来决定回调什么时候执行

Promises/A+规范中的2.1 Promise States中明确规定了，pending可以转化为fulfilled或rejected并且只能转化一次，也就是说如果pending转化到fulfilled状态，那么就不能再转化到rejected。并且fulfilled和rejected状态只能由pending转化而来，两者之间不能互相转换。如图所示：

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

通过Promise.prototype.then方法将观察者方法注册到被观察者Promise对象中，同时返回一个新的Promise对象，以便可以链式调用。

被观察者管理内部pending、fulfilled和rejected的状态转变，同时通过构造函数中传递的resolve和reject方法以主动触发状态转变和通知观察者。

了解了Promise执行原理，再去扩展then之后的其他方法就很好做了。例如Promise.all() Promise.rece()等等。

这里 https://github.com/zhaoyiming0803/Promise/blob/master/src/Promise.js 实现了Promise，可以作为参考。

### 个人微信&QQ：1047832475

![image](https://github.com/zhaoyiming0803/VueNode/blob/dev/wechat.png)

### --- 分割线 ---

如果对您有帮助，您可以点右上角 "Star" 支持一下 谢谢！ ^_^

或者您可以 "follow" 一下，我会不断开源更多的有趣的项目。
