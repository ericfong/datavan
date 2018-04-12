import _ from 'lodash'
import { createElement, Component } from 'react'
import createReactContext from 'create-react-context'

import bitsObserver from './bitsObserver'
import createDb from '../db'
import { createBatchMemoizer } from '../cache-util'

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
    // state = { setState: this.setState } // eslint-disable-line react/no-unused-state

    // eslint-disable-next-line
    UNSAFE_componentWillReceiveProps(nextProps) {
      if (this.props.observe !== nextProps.observe) {
        this.observedBits = getObservedBits(nextProps.observe)
      }
    }

    observedBits = getObservedBits(this.props.observe)

    memoizer = createBatchMemoizer({
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
        db => props.children(this.memoizer.newBatch(db))
      )
    }
  }

  Object.assign(VanConsumer, {
    Provider: VanProvider,
    config,

    hoc: (propKeys, mapFunc) => {
      propKeys = _.uniq(_.compact(propKeys))
      return BaseComponent => props =>
        createElement(VanConsumer, props, db => {
          const dataProps = mapFunc && db.memoize(mapFunc, _.pick(props, propKeys), props)
          return createElement(BaseComponent, { ...props, db, ...dataProps })
        })
    },
  })

  return VanConsumer
}

export default createDatavanContext
