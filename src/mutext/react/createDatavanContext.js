import { createElement, Component } from 'react'
import createReactContext from 'create-react-context'

import bitsObserver from './bitsObserver'
import createDb from '../db'
import { createBatchMemoize } from '../cache-util'

const createDatavanContext = config => {
  const { calcChangedBits, getObservedBits } = bitsObserver(config)
  const { Provider, Consumer } = createReactContext(null, calcChangedBits)

  class VanProvider extends Component {
    constructor(props) {
      super(props)
      // TODO may pass upper provider db instead of config here
      let db = props.db || createDb(config)
      if (props.initDb) db = props.initDb(db)
      this.state = db
    }
    componentDidMount() {
      this.unsubscribe = this.state.subscribe(change => this.setState(change))
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

    UNSAFE_componentWillReceiveProps(nextProps) {
      if (this.props.observe !== nextProps.observe) {
        this.observedBits = getObservedBits(nextProps.observe)
      }
    }

    observedBits = getObservedBits(this.props.observe)

    memoize = createBatchMemoize({
      onSuccess: () => this.setState({ cacheAt: Date.now() }), // eslint-disable-line react/no-unused-state
    })

    render() {
      const { props } = this
      return createElement(
        Consumer,
        {
          ...props,
          observedBits: this.observedBits,
        },
        db => {
          this.memoize.newBatch()
          return props.children({ ...db, memoize: this.memoize, consumerState: this.state })
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
