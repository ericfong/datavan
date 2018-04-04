import { createElement, Component } from 'react'
import createReactContext from 'create-react-context'
import stringify from 'fast-stable-stringify'

import bitsObserver from './bitsObserver'

const createAsyncCache = ({ handler, onSuccess, onError } = {}) => {
  const results = {}
  const promises = {}
  const cache = (key, inlineFunc) => {
    if (typeof key !== 'string') key = stringify(key)
    if (key in results) return results[key]

    const promise = (inlineFunc || handler)(key)
    let ret
    if (promise && promise.then) {
      promise.then(
        result => {
          results[key] = result
          delete promises[key]
          return onSuccess(result, key)
        },
        error => {
          promises[key] = error
          return onError(error, key)
        }
      )
      promises[key] = promise
    } else {
      ret = promise
    }
    return (results[key] = ret) // eslint-disable-line
  }
  cache.results = results
  cache.promises = promises
  return cache
}

const renderProp = (Comp, props, mixin) => createElement(Comp, props, db => props.children(mixin(db)))

const createDatavanContext = globalDb => {
  const { calcChangedBits, getObservedBits } = bitsObserver(globalDb.getConfig())
  const { Provider, Consumer } = createReactContext(globalDb, calcChangedBits)

  class VanProvider extends Component {
    constructor(props) {
      super(props)
      const providerDb = props.db || globalDb
      this.state = providerDb
      this.unsubscribe = providerDb.subscribe(change => this.setState(change))
    }
    componentWillUnmount() {
      this.unsubscribe()
    }
    render() {
      return createElement(Provider, { value: this.state }, this.props.children)
    }
  }

  /* eslint-disable react/no-multi-comp */
  class VanConsumer extends Component {
    state = { setState: this.setState } // eslint-disable-line react/no-unused-state

    componentWillReceiveProps(nextProps) {
      if (this.props.observe !== nextProps.observe) {
        this.observedBits = getObservedBits(nextProps.observe)
      }
    }

    observedBits = getObservedBits(this.props.observe)

    cache = createAsyncCache({
      onSuccess: () => this.setState({ cacheAt: Date.now() }), // eslint-disable-line react/no-unused-state
    })

    render() {
      const { props } = this
      return renderProp(
        Consumer,
        {
          ...props,
          observedBits: this.observedBits,
        },
        consumerDb => {
          return { ...consumerDb, cache: this.cache, consumerState: this.state }
        }
      )
    }
  }

  Object.assign(VanConsumer, {
    Provider: VanProvider,
    db: globalDb,
  })

  return VanConsumer
}

export default createDatavanContext
