import { createConnect } from 'react-redux/lib/connect/connect'
import { whenMapStateToPropsIsMissing } from 'react-redux/lib/connect/mapStateToProps'
import { whenMapDispatchToPropsIsMissing } from 'react-redux/lib/connect/mapDispatchToProps'
import { getDependsOnOwnProps } from 'react-redux/lib/connect/wrapMapToProps'
import verifyPlainObject from 'react-redux/lib/utils/verifyPlainObject'

import { CONNECT_GET_STORE } from './defineStore'

export { Provider } from 'react-redux'

function toReduxMapToProps(ourMapToPropsFunc, dv, methodName) {
  if (methodName === 'mapStateToProps') {
    return function mapToProps(stateOrDispatch, ownProps) {
      const context = dv.context
      context.duringMapState = true

      const props = ourMapToPropsFunc(dv, ownProps, stateOrDispatch)

      // NOTE maybe bad to inject dv, because hard to deprecate things
      // if (!('dv' in props)) {
      //   props.dv = dv
      // }

      // always set back to normal mode, if some find / queries set as serverPreloading
      context.serverPreloading = false

      context.duringMapState = false
      return props
    }
  }

  return function mapToProps(stateOrDispatch, ownProps) {
    return ourMapToPropsFunc(dv, ownProps, stateOrDispatch)
  }
}

// copy from react-redux/lib/connect/mapStateToProps
function wrapMapToPropsFunc(_mapToProps, methodName) {
  return function initProxySelector(dispatch, { displayName }) {
    const proxy = function mapToPropsProxy(stateOrDispatch, ownProps) {
      return proxy.dependsOnOwnProps ? proxy.mapToProps(stateOrDispatch, ownProps) : proxy.mapToProps(stateOrDispatch)
    }

    proxy.dependsOnOwnProps = getDependsOnOwnProps(_mapToProps)

    // HACK wrap our _mapToProps to redux mapToProps
    const dv = dispatch({ type: CONNECT_GET_STORE }).store
    if (process.env.NODE_ENV !== 'production' && !dv) {
      throw new Error('Cannot found hacking attachment of store in dispatch function')
    }
    const mapToProps = toReduxMapToProps(_mapToProps, dv, methodName)

    proxy.mapToProps = function detectFactoryAndVerify(stateOrDispatch, ownProps) {
      proxy.mapToProps = mapToProps
      let props = proxy(stateOrDispatch, ownProps)

      if (typeof props === 'function') {
        proxy.mapToProps = props
        proxy.dependsOnOwnProps = getDependsOnOwnProps(props)
        props = proxy(stateOrDispatch, ownProps)
      }

      if (process.env.NODE_ENV !== 'production') {
        verifyPlainObject(props, displayName, methodName)
      }

      return props
    }

    return proxy
  }
}

// copy from react-redux/lib/connect/mapStateToProps
function whenMapStateToPropsIsFunction(mapStateToProps) {
  return typeof mapStateToProps === 'function' ? wrapMapToPropsFunc(mapStateToProps, 'mapStateToProps') : undefined
}

// copy from react-redux/lib/connect/mapDispatchToProps
function whenMapDispatchToPropsIsFunction(mapDispatchToProps) {
  return typeof mapDispatchToProps === 'function' ? wrapMapToPropsFunc(mapDispatchToProps, 'mapDispatchToProps') : undefined
}

export default createConnect({
  mapStateToPropsFactories: [whenMapStateToPropsIsFunction, whenMapStateToPropsIsMissing],
  mapDispatchToPropsFactories: [
    whenMapDispatchToPropsIsFunction,
    whenMapDispatchToPropsIsMissing,
    // whenMapDispatchToPropsIsObject,
  ],
})
