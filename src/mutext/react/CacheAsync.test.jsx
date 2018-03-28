/* eslint-disable react/no-multi-comp, no-bitwise */
import delay from 'delay'
import React from 'react'
import Enzyme, { mount } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'

import CacheAsync from './CacheAsync'

Enzyme.configure({ adapter: new Adapter() })

test('basic', async () => {
  const App = props => {
    const dom = (
      <CacheAsync
        username={props.username}
        fetch={({ username }) => {
          console.log('>>> fetch', username)
          return Promise.resolve(`Hi ${username}`)
        }}
      >
        {result => {
          return <button>{result}</button>
        }}
      </CacheAsync>
    )

    console.log('>>> here first')
    // return <div>Hihi</div>
    return (
      <div>
        {dom}
        <StatelessComp />
      </div>
    )
  }
  const wrap = mount(<App username="Eric" />)

  const btn = wrap.find('button')
  expect(btn.text()).toBe('')
  await delay(100)
  expect(btn.text()).toBe('Hi Eric')
  wrap.setProps({ username: 'Eric Fong' })
  expect(btn.text()).toBe('')
  await delay(100)
  expect(btn.text()).toBe('Hi Eric Fong')

  // expect(wrap.text()).toBe('Hihi')
})

// test('basic', async () => {
//   const StatelessComp = () => {
//     console.log('StatelessComp')
//     return <div>hhh</div>
//   }
//
//   const App = props => {
//     const dom = (
//       <CacheAsync
//         username={props.username}
//         fetch={({ username }) => {
//           console.log('>>> fetch', username)
//           return Promise.resolve(`Hi ${username}`)
//         }}
//       >
//         {result => {
//           return <button>{result}</button>
//         }}
//       </CacheAsync>
//     )
//
//     console.log('>>> here first')
//     // return <div>Hihi</div>
//     return (
//       <div>
//         {dom}
//         <StatelessComp />
//       </div>
//     )
//   }
//   const wrap = mount(<App username="Eric" />)
//
//   const btn = wrap.find('button')
//   expect(btn.text()).toBe('')
//   await delay(100)
//   expect(btn.text()).toBe('Hi Eric')
//   wrap.setProps({ username: 'Eric Fong' })
//   expect(btn.text()).toBe('')
//   await delay(100)
//   expect(btn.text()).toBe('Hi Eric Fong')
//
//   // expect(wrap.text()).toBe('Hihi')
// })
