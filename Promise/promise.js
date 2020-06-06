
/*
 1. Promise 返回值(instance)可能为 Promise 对象或普通值.
 2. 状态更改不可逆, pending => resolved, rejected.
 3. 可使用链式调用,每次 .then() 后都返回新的 Promise 对象.
 4. all, race, resolve, catch, finally ...
*/

var P = (function () {

  const Pending = 'pending';
  const Resolved = 'resolved';
  const Rejected = 'rejected';

  // 实例过程中调用 resolve()
  function immediateResolve (value) {
    
    if (this.state === Pending) {
      // 决定 Promise 状态 (不可逆)
      this.state = Resolved;
      
      // 实现异步流程控制
      setTimeout(() => {
        if (value instanceof P) {
          // value 为 Promise 对象
          value.then(result => {
            runResolved.bind(this, result);
          }, error => {
            runRejected.bind(this, error);
          })
        } else {
          // value 为普通对象
          runResolved.bind(this, value);
        }
      })
      this.value = value
    } 
    
  }

  // 实例过程中调用 reject()
  function immediateReject (reason) {
    if(this.state === Pending) {
      // 决定 Promise 状态 (不可逆)
      this.state = Rejected;

      // 实现异步流程控制
      setTimeout(() => {
        runRejected.bind(this, reason);
      })
      this.reason = reason;
    }
  }


  // .then() 第一个回调函数
  function runResolved (value) {
    console.log(value, this.successFuncs)
    while (this.successFuncs.length) {
      var cb = this.successFuncs.shift();
      cb(value);
    }
  }

  // .then() 第二个回调函数
  function runRejected (reason) {
    while (this.failFuncs.length) {
      var cb = this.failFuncs.shift();
      cb(reason);
    }
  }

  function P (execFunc) {
    if (typeof execFunc !== 'function') { throw new Error(`${execFunc} is not a function.`) }

    // 声明 Promise 实例的状态, 返回值, 错误信息
    this.state = 'pending'; /* 3 种状态: pending, resolved, rejected */

    // Promise的设计文档中说了，[[PromiseValue]]是个内部变量，外部无法得到，只能在then中获取
    // 所以我们是可以声明私有变量来存储的, 并通过一个实例方法来获取(看后期怎么修改吧 -- 个人理解)
    this.value = undefined; 
    this.reason = undefined;
    
    // 声明函数队列(成功 | 失败)
    this.successFuncs = [];
    this.failFuncs = [];

    // 立即执行
    execFunc(immediateResolve.bind(this), immediateReject.bind(this))
  }

  P.prototype.then = function (onResolved, onRejected) {
    const { state, value, reason } = this;
    
    // 解决 Promise 链式调用
    return new P((resolve, reject) => {
      
      const compPreResolved = v => {
        try {
          if (typeof onResolved !== 'function') {
            resolve(v);
          } else {
            // 上一个 .then() 第一个参数是否 return Promise 对象,继续异步操作
            const res = onResolved(v);
            if (res instanceof P) {
              res.then(resolve, reject);
            } else {
              resolve(v);
            }
          }
        } catch (error) {
          reject(error);
        }
      };

      const compPreRejected = s => {
        try {
          if (typeof onRejected !== 'function') {
            reject(s);
          } else {
            const res = onRejected(s);
            if (res instanceof P) {
              res.then(resolve, reject);
            } else {
              reject(s);
            }
          }
        } catch (error) {
          reject(error);
        }
      }

      switch (state) {
        case Pending:
          console.log('switch pending');
          this.successFuncs.push(compPreResolved);
          this.failFuncs.push(compPreRejected);
          break;
        case Resolved:
          console.log('switch resolved');
          // 返回用户 resolve() 的结果
          compPreResolved(value);
          break;
        case Rejected:
          console.log('switch rejected');
          // 返回用户 reject() 的结果
          compPreRejected(reason);
          break;
        default: break;
      }

    });
  }
  
  // 静态方法 resolve
  P.resolve = function (value) {
    if (value instanceof P) { return value; }
    return new P(resolve => resolve(value));
  }

  // 静态方法 reject
  P.reject = function (reason) {
    return new P((resolve, reject) => reject(reason));
  }


  return P;
}());


var p = new P((res, rej) => rej(100))
.then(result => {
  console.log(result)
  return new P((res, rej) => res(300))
}, error => {
  console.log(error)
})
.then(result => {
  console.log(result)
}, error => {
  console.log(error)
})


var d = new P((res, rej) => res(888))
console.log(d.value)