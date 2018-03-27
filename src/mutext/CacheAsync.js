/* eslint-disable react/no-multi-comp */
import { Component, createElement } from 'react'

export default class CacheAsync2 extends Component {
  state = {}
  read = (...args) => {
    const { result } = this.state
    if (!result) {
      this.promise = this.asyncFunc(args, ret => {
        this.setState({ result: ret })
      })
    }
    return result
  }
  render() {
    return this.props.children({ cacheAsync: this.cacheAsync })
  }
}

class Compose2 extends Component {
  render() {
    return createElement(CacheAsync2, null, read => {
      return createElement(CacheAsync2, null, read2 => {
        return this.props.children(read, read2)
      })
    })
  }
}

// class CacheAsync extends Component {
//   state = this.refetch(this.props)
//
//   componentWillReceiveProps(nextProps) {
//     this.setState(this.refetch(nextProps))
//   }
//
//   refetch(props) {
//     const { fetch } = props
//     if (fetch) {
//       // TODO get fetch function from context?
//       const promise = fetch(props)
//
//       if (promise && promise.then) {
//         promise.then(
//           result => {
//             this.setState({ result, error: undefined, promise: undefined })
//           },
//           error => {
//             this.setState({ result: undefined, error, promise: undefined })
//           }
//         )
//
//         return { result: undefined, error: undefined, promise }
//       }
//       return { result: promise, error: undefined, promise: undefined }
//     }
//     return { result: undefined, error: undefined, promise: undefined }
//   }
//
//   render() {
//     const { state } = this
//     // if result is instance of Promise, means loading
//     return this.props.children(state.result, state.error, state.promise)
//   }
// }

// const wrapCallbackToSyncFunc = (func, report) => {
//   return (...args) => {
//     let ret
//     func(...args, result => {
//       report(result, args)
//       return result
//     })
//     return ret
//   }
// }

// class ComposeRenderProp extends Component {
//   state = this.refetch(this.props)
//
//   componentWillReceiveProps(nextProps) {
//     this.setState(this.refetch(nextProps))
//
//     this.funcs = {
//       // fetch1 should be provided by global context?
//       fetch1: wrapCallbackToSyncFunc(nextProps.fetch1, ret => this.setState({ cacheKey: ret })),
//     }
//   }
//
//   render() {
//     const { state } = this
//     return createElement(
//       CacheAsync,
//       {
//         fetch: this.funcs.fetch1,
//       },
//       () => {
//         return this.props.children(state.result)
//       }
//     )
//   }
// }

// export function cacheAsync(mapper, renderProp, props) {
//   return createElement(CacheAsync, props, renderProp)
// }

/*
cacheAsync(fetch, (x) => {
  return children.map(x)
})

cacheAsync(props, fetch, (x) => {
  return children.map(x)
})

cosnt Comp = () => {
  return van([Consumer1, Consumer2], (syncFunc1, syncFunc2) => {
    const data = syncFunc1()
    cosnt data2 = syncFunc2(data.ids)
    return allData
  }, (allData) => {
    return <div>{allData.text}</div>
  })
}
*/
