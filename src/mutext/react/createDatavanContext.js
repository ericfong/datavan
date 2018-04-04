import { createElement, Component } from 'react'
import createReactContext from 'create-react-context'

import bitsObserver from './bitsObserver'
import createDb from '../db'
import { createAsyncCache } from '../cache-util'

const renderProp = (Comp, props, mixin) => createElement(Comp, props, db => props.children(mixin(db)))

const createDatavanContext = (config, defaultValue = {}) => {
  const { calcChangedBits, getObservedBits } = bitsObserver(config)
  const { Provider, Consumer } = createReactContext(defaultValue, calcChangedBits)

  class VanProvider extends Component {
    constructor(props) {
      super(props)
      // TODO may pass upper provider db instead of config here
      let db = createDb(config)
      if (props.initDb) db = props.initDb(db)
      this.state = db
      this.unsubscribe = db.subscribe(change => this.setState(change))
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
          this.cache.newBatch()
          return { ...consumerDb, cache: this.cache, consumerState: this.state }
        }
      )
    }
  }

  Object.assign(VanConsumer, {
    Provider: VanProvider,
    config,
  })

  return VanConsumer
}

export default createDatavanContext
