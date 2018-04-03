// import _ from 'lodash'
import { createElement, Component } from 'react'
import createReactContext from 'create-react-context'
import bitsObserver from './bitsObserver'

import createDb from '../db'

const wrapRenderProp = (Comp, props, mixin) => createElement(Comp, props, db => props.children(mixin(db)))

const createDatavanContext = (confs, defaultValue = {}) => {
  const { calcChangedBits, getObservedBits } = bitsObserver(confs)
  const { Provider, Consumer } = createReactContext(defaultValue, calcChangedBits)

  class VanProvider extends Component {
    state = createDb(confs, db => {
      return {
        ...db,
        // ...defaultValue,
        onChange: change => {
          this.setState(change)
          // if (defaultValue.onChange) defaultValue.onChange(newDb, change)
        },
      }
    })
    render() {
      return createElement(Provider, { value: this.state }, this.props.children)
    }
  }

  /* eslint-disable react/no-multi-comp */
  class VanConsumer extends Component {
    componentWillReceiveProps(nextProps) {
      if (this.props.observe !== nextProps.observe) {
        this.observedBits = getObservedBits(nextProps.observe)
      }
    }
    observedBits = getObservedBits(this.props.observe)
    mixin = {
      vanConsumerMemory: {},
    }
    render() {
      const { props } = this
      return wrapRenderProp(
        Consumer,
        {
          ...props,
          observedBits: this.observedBits,
        },
        db => {
          return { ...db, ...this.mixin }
        }
      )
    }
  }

  return { Provider: VanProvider, Consumer: VanConsumer }
}

/*
const CompA = ({ p1 }) => (
  <C.Consumer observe="bar,foo">
    {ctx => {
      const data = ctx.cache(p1, ctx.s1, () => {

      })
      const data2 = ctx.cache(p2, data.s1, () => {

      })
      return <span prop={ctx.find('x', filter)} />
    }}
  </C.Consumer>
)
*/

export default createDatavanContext
