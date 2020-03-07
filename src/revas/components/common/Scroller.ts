import { RevasTouchEvent } from '../../core/Node'
import { clamp } from '../../core/utils'

export interface RevasScrollEvent {
  x: number,
  y: number,
  vx: number,
  vy: number,
  timestamp: number
}

export default class Scroller {
  private _timestamp = 0
  private _x = new Handler()
  private _y = new Handler()
  private _tid = ''

  horizontal?: boolean = false

  constructor(
    private listener: (e: RevasScrollEvent) => any,
  ) { }

  set maxX(value: number) {
    this._x.max = value
  }

  get maxX() {
    return this._x.max
  }

  set maxY(value: number) {
    this._y.max = value
  }

  get maxY() {
    return this._y.max
  }

  private _sign(e: RevasTouchEvent) {
    e.extra = {
      ...e.extra,
      scroll: { x: this.horizontal, y: !this.horizontal }
    }
    if (this.horizontal) {
      if (this._x.offset > 0 && this._x.offset < this._x.max)
        e.extra.scroll.x = false
    } else {
      if (this._y.offset > 0 && this._y.offset < this._y.max)
        e.extra.scroll.y = false
    }
  }

  private _check(e: RevasTouchEvent) {
    if (this.horizontal && e.extra && e.extra.scroll && e.extra.scroll.x === false) {
      return this.touchEnd()
    }
    if (!this.horizontal && e.extra && e.extra.scroll && e.extra.scroll.y === false) {
      return this.touchEnd()
    }
    return true
  }

  touchStart = (e: RevasTouchEvent) => {
    if (!this._tid) {
      this._tid = Object.keys(e.touches)[0]
      this._timestamp = e.timestamp
      const { x, y } = e.touches[this._tid]
      this.horizontal
        ? this._x.capture(x)
        : this._y.capture(y)
    }
  }

  touchMove = (e: RevasTouchEvent) => {
    if (this._tid && e.touches[this._tid] && this._check(e)) {
      const { x, y } = e.touches[this._tid]
      const duration = e.timestamp - this._timestamp
      this._timestamp = e.timestamp
      this.horizontal
        ? this._x.onMove(x, duration)
        : this._y.onMove(y, duration)
      this.emit()
      this._sign(e)
    }
  }

  touchEnd = () => {
    if (this._tid) {
      this._tid = ''
      this._timestamp = Date.now()
      this._x.onEnd()
      this._y.onEnd()
      requestAnimationFrame(this.afterEnd)
    }
  }

  afterEnd = () => {
    const timestamp = Date.now()
    const duration = timestamp - this._timestamp
    this._timestamp = timestamp
    if (this._x.afterEnd(duration) || this._y.afterEnd(duration)) {
      this.emit()
      requestAnimationFrame(this.afterEnd)
    }
  }

  emit() {
    this.listener({
      x: this._x.offset, vx: this._x.velocity,
      y: this._y.offset, vy: this._y.velocity,
      timestamp: this._timestamp
    })
  }
}

class Handler {
  offset = 0
  velocity = 0
  max = -1

  private _last = -1

  capture(value: number) {
    if (this._last < 0) {
      this._last = value
    }
  }
  onMove(value: number, duration: number) {
    if (this._last >= 0) {
      const move = this._last - value
      this.velocity = move / duration
      this._last = value
      this.change(move)
    }
  }
  onEnd() {
    if (this._last >= 0) {
      this._last = -1
    }
  }

  afterEnd(duration: number) {
    if (this._last < 0) {
      if (Math.abs(this.velocity) > 0.05) {
        this.velocity = friction(this.velocity, duration)
        const move = this.velocity * duration
        this.change(move)
        return true
      } else {
        this.velocity = 0
      }
    }
    return false
  }

  change(move: number) {
    const _offset = clamp(this.offset + move, 0, this.max > 0 ? this.max : 0)
    // check validate
    if (_offset !== this.offset) {
      this.offset = _offset
    } else if (this._last < 0) {
      this.velocity = 0
    }
  }
}

function friction(v: number, duration: number) {
  return v - (duration * 0.004 * v)
}