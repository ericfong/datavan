// let mutateTime = 0
// let castTime = 0
// let castDefPropTime = 0
// const NS_PER_SEC = 1e9
// const calcNano = diff => diff[0] * NS_PER_SEC + diff[1]
// export const printTimes = () => {
//   console.log(`ratio=${_.round(mutateTime / castTime, 1)} ${_.round(
//     castDefPropTime / castTime,
//     2
//   )} mutateTime=${mutateTime} castTime=${castTime} castDefPropTime=${castDefPropTime}`)
// }

// FIXME test it
// const start1 = process.hrtime()

// castDefPropTime += calcNano(process.hrtime(start1))

// const start1 = process.hrtime()
// mutateTime += calcNano(process.hrtime(start1))

// const start2 = process.hrtime()
// castTime += calcNano(process.hrtime(start2))
