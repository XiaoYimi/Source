
var P = (function () {

  // Promise 3 种状态
  const Pending = 'pending';
  const Resolved = 'resolved';
  const Rejected = 'rejected';

  // 开发者使用 Promise 时, resolve() 的调用
  function immediateResolve (value) {
    if (this.state === Pending) {
      // Promise 状态改变(pending => resolved)
      this.state = Resolved;

      // 进行异步操作
      setTimeout(() => {
        if (value instanceof P) {
          // Promise 对象
          value.then(val => {
            successQueueFuncs.bind(this, val);
          }, err => {
            failQueueFuncs.bind(this, err);
          })
        } else {
          // 普通对象
          successQueueFuncs.bind(this, value);
        }
      });

      // 捕获异步操作的返回值
      this.value = value;
    }
  }

  // 开发者使用 Promise 时, reject() 的调用
  function immediateReject (value) {
    if (this.state === Pending) {
      this.state = Rejected;

      setTimeout(() => {
        failQueueFuncs.bind(this, value); 
      });

      this.value = value;
    }
  }

  // 异步操作 -- 执行成功函数的回调
  function successQueueFuncs (value) {
    while (this.successQueue.length) {
      this.successQueue.shift()(value)
    }
  }

  // 异步操作 -- 执行失败函数的回调
  function failQueueFuncs (value) {
    while (this.failQueue.length) {
      this.failQueue.shift()(value)
    }
  }
  

  // 声明构造器
  function P (execFunc) {
    // 判断 execFunc 是否是一个函数
    if (typeof execFunc !== 'function') { throw new Error(`arguments ${execFunc} is not a function.`); }

    // 声明 Promise 状态和异步操作返回值
    this.state = Pending;
    this.value = undefined;

    // 记录 Promise 成功 | 失败状态的回调函数
    this.successQueue = [];
    this.failQueue = [];

    // 通过 bind(this) 将实例绑定到函数 immediateResolve, immediateReject
    execFunc(immediateResolve.bind(this), immediateReject.bind(this));

  }

  // Promise.then() 回调函数
  P.prototype.then = function (onResolved, onRejected) {
    const { state, value } = this

    // 实现 then() 后返回新的 Promise 对象,可用于链式调用
    return new P((resolve, reject) => {
      // 声明 then() 的成功回调
      const thenResolved = v => {
        try {
          if (typeof onResolved !== 'function') {
            resolve(v); // 不是函数对象,则返回上一次结果
          } else {
            // 执行 then() 成功回调函数
            const res = onResolved(v);
            
            if (res instanceof P) {
              // 结果为 Promise 对象,继续 then()
              res.then(resolve, reject)
            } else {
              // 结果为普通对象
              resolve(v);
            }
          }

        } catch (err) {
          reject(err);
        }
      }

      // 声明 then() 的失败回调
      const thenRejected = v => {
        try {
          if (typeof onRejected !== 'function') {
            reject(v);
          } else {
            var res = onRejected(v);
            if (res instanceof P) {
              res.then(resolve, reject);
            } else {
              reject(v);
            }
          }
        } catch (err) {
          reject(v);
        }
      }


      switch (state) {
        case Pending:
          this.successQueue.push(thenResolved);
          this.failQueue.push(thenRejected);
          break;
        case Resolved:
          thenResolved(value);
          break;
        case Rejected:
          thenRejected(value);
          break;
        default: break;
      }

    })
  }

  // Promise.catch() 回调函数
  P.prototype.catch = function (cb) {
    return this.then(undefined, cb);
  }

  // Promise.finally() 回调函数
  P.prototype.finally = function (cb) {
    return this.then(
      res => P.resolve(cb()).then(() => res),
      err => P.resolve(cb()).then(() => new Error(err))
    );
  }

  // 静态方法 resolve(), 返回执行异步完成的 Promise 对象
  P.resolve = function (res) {
    if (res instanceof P) {
      return res;
    } else {
      return new P(resolve => resolve(res));
    }
  }

  // 静态方法 reject(), 返回执行异步完成的 Promise 对象
  P.reject = function (res) {
    return new P(reject => reject(res));
  }

  // 将多个 Promise 异步执行并按顺序返回新的 Promise 对象
  P.all = function (list) {
    if (list instanceof Array) {
      return new P ((resolve, reject) => {
        var values = [];
        var length = 0;
  
        // 通过 键值对形式 记录异步操作结果,并返回
        for (const [i, v] of list.entries()) {
          // 使用 P.resolve() 返回新的 Promise 对象(防止某元素不是 Promise 对象)
          this.resolve(v).then(res => {
            values[i] = res;
            length ++;
          }, err => {
            reject(err);
          })
        }

        if (length === list.length) { resolve(values); }
      });
    } else {
      throw new Error(`arguments ${list} is not an array.`);
    }
  }

  P.race = function (list) {
    if (list instanceof Array) {
      return new P ((resolve, reject) => {
        // 通过 键值对形式 记录异步操作结果,并返回
        for (const v of list) {
          // 使用 P.resolve() 返回新的 Promise 对象(防止某元素不是 Promise 对象)
          this.resolve(v).then(res => {
            resolve(res);
          }, err => {
            reject(err);
          })
        }
      });
    } else {
      throw new Error(`arguments ${list} is not an array.`);
    }
  }

  return P;
}());


new P((res, rej) => { res(456) })
.then(result => console.log(result))
.catch(err => console.log(err))
.finally(console.log('ok'))
