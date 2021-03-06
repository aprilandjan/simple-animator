## Tiny Tween
> A tiny javascript Tween library, supplies fast tween on object prop values.
Also Wrap up with HTMLElement with specific props such as ``x, y, scale, scaleX, scaleX, skewX, skewY, rotation, opacity` to make it useful when targeting html element.

> 极简的js 缓动类库, 提供对象属性值的快速缓动.
也对 HTMLElement 进行了封装, 提供这些元素基于 `x, y, scale, scaleX, scaleY, skewX, skewY, rotation, opacity` 等常用2D变换的快速缓动

---

### API

- 引入

    ```javascript
    import Tween from 'tween'
    ```

- ```Tween.Ticker``` 动画的时钟对象。通过它可以定义FPS、注册以及删除自定义回调。

    ```javascript
    //  设置全局的时钟频率, 默认是60FPS
    Tween.Ticker.setFPS(30)
    //  注册一个每帧事件
    var onTick = function () {
      console.log('tick call', Date.now)
    }
    Tween.Ticker.register(onTick)
    //  删除一个已注册的每帧事件回调
    setTimeout(() => {
      Tween.Ticker.unregister(onTick)
    }, 3000)
    ```

- ```Tween.Ease``` 是一些已定义好的缓动方程, 可以在实例的 `to`, `append` 方法里按需采用。

- ```Tween.get``` 创建一个 Tween 实例对象, 随后便可以定义各种序列缓动方法。

    ```javascript
    var obj = {val: 0}
    var t = Tween.get(obj)
    ```

- ```to```, ```append``` 开启缓动&应用改变

    ```javascript
    var p = {x: 0, y: 0}
    var t = Tween.get(p)
    t.to({x: 100, y: 100}, 1000, Tween.Ease.cubicInOut);   //  p = {x:100, y:100} after 1000ms
    t.append({x:50, y: -50}, 1000);  //  p = {x:150, y:50} after 1000ms
    ```

- ```wait```, ```call```, ```set``` 等待&回调&设置

    ```javascript
    // 延迟1000ms执行后续缓动
    tween.wait(1000);    //  wait for 1000ms
    tween.to({x: 300, y: 300}, 1000);    //  tween to target state in 1000ms

    // call: 在下一帧执行自定义回调, 相当于 nextTick
    tween.call(()=>{
        console.log('finished!');   //  called when previous steps are done
    }

    // set: 将目标的属性立即设置为指定值。占用1帧
    tween.to({x:300, y: 300}, 1000).set({x: 100, y: 100});
    ```

- chained call 链式调用

    ```javascript
    Tween.get(p).to({x: 100, y: 100}, 1000).wait(300).call(()=>{
        console.log('now x=100, y=100!');
    }).to({x: 300, y: 300}).call(() => {
        console.log('now x=300, y=300!');
    });
    ```

- ```paused```, ```pausedAll``` 暂停/恢复缓动.

    ```javascript
    //  全局暂停
    Tween.pauseAll()
    //  查看暂停状态
    Tween.isPaused() // true
    //  全局恢复暂停
    Tween.resumeAll()

    //  对于每个单独的tween实例, 也可以设置自身的暂停状态
    t.paused = true
    //  取消暂停
    t.paused = false
    ```

- ```kill```, ```killAll``` 移除缓动

    ```javascript
    Tween.get(p).to({x: 100, y: 100}, 1000);
    //  移除某对象上的全部缓动
    Tween.kill(p)

    //  移除所有正在进行的缓动
    Tween.killAll()
    ```

- ```get``` 参数配置

    ```javascript
    var scope = {
        state: 'some props'
    }
    var config = {
        //  当该缓动序列结束时调用
        onComplete: function() { console.log(this.state) },
        //  结束回调的作用域
        onCompleteObj: scope,
        //  当该缓动序列有属性值变更时调用
        onChange: function () { console.log(this.state) },
        //  变更回调的作用域
        onChangeObj: scope,
        //  是否覆盖之前的全部缓动, 避免同一个对象的多个缓动实例之间的干扰
        override: true,
        //  缓动是否循环
        loop: true
    }
    Tween.get(p, config).to({x: 100, y: 100}, 1000);
    ```

### HTMLElementWrapper

- 如果传入的对象是HTMLElement 或者是一个可以通过 ```document.querySelector``` 选择到的元素, 那么会使用 ```Element.get```包装起来, 然后使用具体属性名对其操作

- 可以使用的属性有:

    -  x 水平位移, 单位px
    -  y 垂直位移, 单位px
    -  scaleX 水平缩放
    -  scaleY 垂直缩放
    -  scale  总体缩放, 当设置此属性时, 等同于设置 scaleX/scaleY
    -  regX 水平注册中心
    -  regY 垂直注册中心
    -  rotation 旋转角度, 单位px
    -  opacity  透明度, 值域[0, 1]
    -  scrollY  垂直滚动位置

- 对同一个 HTMLElement, ```Tween``` 返回的是这个元素的单例

- 如需使用 ElementWrapper, 简单的通过 ```Tween.wrapper``` 获取单例并使用 ```validateNow()``` 来自定义属性值。

### Todo

- alternative loop

### Dev

- 项目使用 [npm-lib-seed](https://github.com/4f2e/npm-lib-seed) 构建
- 开发: `npm run dev`
- 发布: `npm run build


### Change Log

#### 2017.04.01

- 修复了通过 `Tikcer` 注册及删除自定义回调时的错误，并分离自定义回调和缓动实例，以保证每一帧内都是先执行完全部的缓动，再按照注册顺序执行自定义回调。

- 给 `window` 对象增加了一个属性 `__t_cb_n__` 指示当前激活的自定义回调数。
