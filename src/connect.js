import {createConnect} from 'react-redux/lib/connect/connect'
import {whenMapStateToPropsIsMissing} from 'react-redux/lib/connect/mapStateToProps'
import {whenMapDispatchToPropsIsMissing} from 'react-redux/lib/connect/mapDispatchToProps'
import {getDependsOnOwnProps} from 'react-redux/lib/connect/wrapMapToProps'
import verifyPlainObject from 'react-redux/lib/utils/verifyPlainObject'

import {CONNECT_GET_STORE} from './defineCollections'

export {Provider} from 'react-redux'

function toReduxMapToProps(ourMapToPropsFunc, store) {
  const collections = store.collections
  return function mapToProps(stateOrDispatch, ownProps) {
    return ourMapToPropsFunc(collections, ownProps, stateOrDispatch)
  }
}

// copy from react-redux/lib/connect/mapStateToProps
function wrapMapToPropsFunc(_mapToProps, methodName) {
  return function initProxySelector(dispatch, { displayName }) {
    const proxy = function mapToPropsProxy(stateOrDispatch, ownProps) {
      return proxy.dependsOnOwnProps
        ? proxy.mapToProps(stateOrDispatch, ownProps)
        : proxy.mapToProps(stateOrDispatch)
    }

    proxy.dependsOnOwnProps = getDependsOnOwnProps(_mapToProps)


    // HACK wrap our _mapToProps to redux mapToProps
    const store = dispatch({type: CONNECT_GET_STORE}).store
    if (process.env.NODE_ENV !== 'production' && !store) {
      throw new Error('Cannot found hacking attachment of store in dispatch function')
    }
    const mapToProps = toReduxMapToProps(_mapToProps, store)


    proxy.mapToProps = function detectFactoryAndVerify(stateOrDispatch, ownProps) {
      proxy.mapToProps = mapToProps
      let props = proxy(stateOrDispatch, ownProps)

      if (typeof props === 'function') {
        proxy.mapToProps = props
        proxy.dependsOnOwnProps = getDependsOnOwnProps(props)
        props = proxy(stateOrDispatch, ownProps)
      }

      if (process.env.NODE_ENV !== 'production')
        verifyPlainObject(props, displayName, methodName)

      return props
    }

    return proxy
  }
}


// copy from react-redux/lib/connect/mapStateToProps
function whenMapStateToPropsIsFunction(mapStateToProps) {
  return (typeof mapStateToProps === 'function')
    ? wrapMapToPropsFunc(mapStateToProps, 'mapStateToProps')
    : undefined
}


// copy from react-redux/lib/connect/mapDispatchToProps
function whenMapDispatchToPropsIsFunction(mapDispatchToProps) {
  return (typeof mapDispatchToProps === 'function')
    ? wrapMapToPropsFunc(mapDispatchToProps, 'mapDispatchToProps')
    : undefined
}


export default createConnect({
  mapStateToPropsFactories: [
    whenMapStateToPropsIsFunction,
    whenMapStateToPropsIsMissing,
  ],
  mapDispatchToPropsFactories: [
    whenMapDispatchToPropsIsFunction,
    whenMapDispatchToPropsIsMissing,
    // whenMapDispatchToPropsIsObject,
  ],
})
