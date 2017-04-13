
export class NormalizedPromise {
  isNormalizedPromise = true

  constructor(value, error) {
    this.value = value
    this.error = error
  }

  then(onFulfilled, onRejected) {
    if (onRejected && this.error) {
      this.value = onRejected(this.error)
    } else if (onFulfilled) {
      this.value = onFulfilled(this.value)
    }
    return this
  }

  catch(onRejected) {
    if (onRejected && this.error) {
      this.value = onRejected(this.error)
    }
    return this
  }
}

export function isThenable(p) {
  return p && p.then
}

export function isNormalizedPromise(p) {
  return p.isNormalizedPromise
}

export function normalizePromise(func) {
  try {
    const p = typeof func === 'function' ? func() : func
    if (isThenable(p)) {
      return p
    } else {
      return new NormalizedPromise(p)
    }
  } catch (err) {
    return Promise.reject(err)
  }
}

export default normalizePromise
