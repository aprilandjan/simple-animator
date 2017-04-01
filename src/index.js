/**
 * Created by Merlin on 16/8/19.
 */
/* eslint-disable */

import ElementWrapper from './ElementWrapper'
import Ease from './Ease'

window.requestAnimationFrame = (function(callback) {
  return window.requestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.oRequestAnimationFrame
    || window.msRequestAnimationFrame ||
    function(callback) {
      window.setTimeout(callback, 1000 / 60)
    }
})()

window.cancelAnimationFrame = (function(id) {
  return window.cancelAnimationFrame
    || window.webkitCancelAnimationFrame
    || window.mozCancelAnimationFrame
    || window.oCancelAnimationFrame
    || window.msCancelAnimationFrame
    || function(id) {
      window.clearTimeout(id)
    }
})()

//  总的每帧事件
var _raf = null
var _tList = []
var _cbList = []
var _lastTickTime
var _isPaused = false
var _id = 0

//  投影值
var mapping = function (val, inputMin, inputMax, outputMin, outputMax) {
  return ((outputMax - outputMin) * ((val - inputMin) / (inputMax - inputMin))) + outputMin
}

var _register = function (a, b) {
  if (a instanceof Tween) {
    if (_tList.indexOf(a) != -1) {
      return
    }
    _tList.push(a);
  } else {  //  register function
    for (var i = 0; i < _cbList.length; i++) {
      var item = _cbList[i]
      if (item instanceof Array && item[0] === a && item[1] === b) {
        return
      }
    }
    _cbList.push([a, b])
     window.__t_cb_n__ = _cbList.length
  }

  //  start raf
  if(!_raf){
    _lastTickTime = Date.now()
    _raf = window.requestAnimationFrame(_tick)
  }
}

var _unregister = function (a, b) {
  if (a instanceof Tween) {
    var index = _tList.indexOf(a)
    if (index >= 0) {
      _tList.splice(_tList.indexOf(a), 1)
    }
  } else {
    for (var i = 0; i < _cbList.length; i++) {
      var item = _cbList[i]
      if (item instanceof Array && item[0] === a && item[1] === b) {
        _cbList.splice(i, 1)
        // Tip: just to show how many callbacks are registered currently
        window.__t_cb_n__ = _cbList.length
        return
      }
    }
  }
}

var _fpsInterval

var _setFPS = function (fps) {
  _fpsInterval = Math.floor(1000 / fps)
}

_setFPS(30)

var Ticker = {
  register: _register,
  unregister: _unregister,
  setFPS: _setFPS
}

//  总的帧事件
var _tick = function () {
  _raf = window.requestAnimationFrame(_tick)
  var now = Date.now()
  //  tick duration
  var delta = now - _lastTickTime
  if (delta >= _fpsInterval) {
    _lastTickTime = now
    //  if paused, do not call tween tick
    if (!_isPaused) {
      _tList.forEach((item, index) => {
        _tweenTick(item, delta)
      })
      _cbList.forEach((item, index) => {
        item[0].call(item[1])
      })
    }
  }

  if (!(_tList.length + _cbList.length)) {
    window.cancelAnimationFrame(_raf)
    _raf = null
  }
}

var _pushState = function (t, state) {
  t.states.push(state)
  _readState(t)
  _register(t)
  return t
}

var _readState = function (t) {
  if(t.currentState || !t.states.length) {
    return
  }

  //  暂存当前状态, 作为这个state的启动状态
  var state = t.states[0]
  t.currentState = state
  var obj = t.obj
  switch(state.type) {
    case stateType.TO:
    case stateType.APPEND:
      let from = {};
      for(let key in state.to){
        if(state.to.hasOwnProperty(key)  && (obj.hasOwnProperty(key) || obj.__lookupGetter__(key))) {
          from[key] = obj[key];  //  start state
          if(state.type == stateType.APPEND) {
            state.to[key] += from[key]
          }
        }
      }

      if(state.type == stateType.APPEND) {
        state.type = stateType.TO
      }

      state.from = from;
      state.elapsedTime = 0;
      break;
    case stateType.WAIT:
      state.elapsedTime = 0;
      break;
    case stateType.CALL:
      state.duration = 0;
      state.elapsedTime = 0;
      break;
    case stateType.SET:
      state.duration = 0;     //  will not wait util next tick
      state.elapsedTime = 0
      _assignProps(t, state, 1)
      break;
  }
}

//  assign
var _assignProps = function (t, state, p) {
  var obj = t.obj
  var to = state.to
  for(var key in to){
    if(to.hasOwnProperty(key)){
      if(t.isElement) {
        obj.invalidate(key, to[key])
      }
      else{
        obj[key] = to[key]
      }
    }
  }

  if(t.isElement){
    obj.validate()
  }
}

var _tweenTick = function (t, delta) {
  //  当前所处的状态
  var state = t.currentState
  if(!t.currentState || t.paused) {
    return
  }

  state.elapsedTime += delta

  //  找到这个状态的百分比
  var p = state.duration == 0 ? 1 : (state.elapsedTime / state.duration)
  if (p > 1) {
    p = 1
  } else if (p < 0) {
    p = 0
  }

  //  判断状态类型
  switch(state.type){
    case stateType.TO:
    case stateType.APPEND:
      let from = state.from
      let to = state.to
      let ease = state.ease

      let ep = p
      if (p != 1 && ease && typeof ease == 'function') {
        ep = ease(p)
      }

      let obj = t.obj;
      for (let key in to) {
        if(to.hasOwnProperty(key)){
          let v = mapping(ep, 0, 1, from[key], to[key])
          if(t.isElement) {
            obj.invalidate(key, v)
          }
          else{
            obj[key] = v
          }
        }
      }

      //
      if (t.isElement) {
        obj.validate()
      }

      if (t.config && t.config.onChange) {
        t.config.onChange.call(t.config.onChangeObj)
      }
      break
    case stateType.WAIT:
      //  do nothing
      break
    case stateType.CALL:
      let callback = state.callback
      let scope = state.scope
      let args = state.args
      callback.apply(scope, args)
      break
    case stateType.SET:
      //  do nothing, just wait for one tick
      break
  }

  //  此状态结束了
  if(p >= 1){
    t.passedStates.push(t.states.shift())
    t.currentState = null
    if(t.states.length) {
      _readState(t)
    }
    else {
      //  loop, swap states
      //  如果是set调用的,会导致循环
      if(t.config && t.config.loop) {
        t.states = t.passedStates
        t.passedStates.slice(0)
        _readState(t)
      }
      else {
        if(t.config && t.config.onComplete){
          t.config.onComplete.call(t.config.onCompleteObj)
        }
        _unregister(t)
      }
    }
  }
}

//  定义不同的状态类型
var stateType = {
  TO: 0,
  WAIT: 1,
  CALL: 2,
  APPEND: 3,
  SET: 4
}

class Tween {

  /**
   * 可以配置:
   *
   *  onChange,
   *  onChangeObj,
   *
   *  onComplete,
   *  onCompleteObj,
   *
   *  override,
   *
   *  loop
   *
   * @param obj
   * @param config
   */
  constructor (obj, config) {
    this._uid = _id++
    if(typeof obj === 'string' || obj instanceof HTMLElement) {
      obj = ElementWrapper.get(obj)
      this.isElement = true
    }
    else if(obj instanceof ElementWrapper) {
      this.isElement = true
    }

    this.obj = obj;
    this.config = config;
    this.states = [];   //  状态列表
    this.passedStates = []; //  过去了的状态
  }

  static get(obj, config) {
    if(config && config.override){
      Tween.kill(obj)
    }
    //  如果动画没开始, 开启动画
    return new Tween(obj, config);
  }

  /**
   *
   * 移除某对象的全部缓动
   *
   * @param obj, DOM Element, Element ID, ElementWrapper instance
   *
   */
  static kill(obj) {
    _tList.forEach(t => {
      if (t instanceof Tween) {
        //  如果是字符串, 认为是id, 查找wrapper
        if (typeof obj === 'string' || obj instanceof HTMLElement){
          obj = ElementWrapper.get(obj)
        }

        if (t.obj == obj) {
          _unregister(t)
        }
      }
    })
  }

  /**
   * 移除队列里的全部缓动
   */
  static killAll () {
    _tList.length = 0
  }

  static pauseAll () {
    _isPaused = true
  }

  static resumeAll () {
    _isPaused = false
  }

  static get isPaused () {
    return _isPaused
  }

  /**
   *
   * 缓动到某种状态。当进入到当前状态的时候, 取这个状态的初始值
   * @param target
   * @param duration
   * @param ease, function from Ease.js
   *
   */
  to (target, duration, ease){
    //  定义一个状态
    var state = {
      type: stateType.TO,
      ease: ease,
      duration: duration || 0,
      to: target
    };

    if(this.isElement && target.hasOwnProperty('scale')) {
      target.scaleY = target.scaleX = target.scale
      delete target['scale']
    }

    return _pushState(this, state)
  }

  append (target, duration, ease) {
    var state = {
      type: stateType.APPEND,
      ease: ease,
      duration: duration || 0,
      to: target
    }

    if(this.isElement && target.hasOwnProperty('scale')) {
      target.scaleY = target.scaleX = target.scale
      delete target['scale']
    }

    return _pushState(this, state)
  }

  /**
   * 设置此 tween obj 的属性
   *
   * set 是立即的过程, 不会等到下一帧
   *
   * @param target
   */
  set (target) {
    var state = {
      type: stateType.SET,
      to: target
    }

    if(this.isElement && target.hasOwnProperty('scale')) {
      target.scaleX = target.scaleY = target.scale
      delete target['scale']
    }

    return _pushState(this, state)
  }

  /**
   *
   * 在当前状态等待多久
   *
   * @param duration
   */
  wait (duration) {
    var state = {
      type: stateType.WAIT,
      duration: duration
    }

    return _pushState(this, state)
  }

  /**
   *
   * 回调
   *
   * @param callback
   * @param scope
   * @param args 参数数组
   */
  call (callback, scope, args) {
    var state = {
      type: stateType.CALL,
      callback: callback,
      scope: scope,
      args: args
    }

    this.states.push(state);
    _readState(this);
    _register(this);
    return this;
  }
}

Tween.Ease = Ease
Tween.Wrapper = ElementWrapper
Tween.Ticker = Ticker

export default Tween
