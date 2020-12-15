import { Sub } from 'core'

/**
 * Tricky helper to handle tricky Cata default '_' case.
 * In Cata we assume that default case is always present
 * in case of current is not provided.
 *
 * @param defaultFn usually '_' pattern case
 * @param fn target optional case
 * @param args arguments for optional case
 */
export const callOrElse = <A extends Array<unknown>, R>(
  defaultFn: (() => R) | undefined,
  fn: ((...args: A) => R) | undefined,
  ...args: A
): R => {
  return typeof fn === 'function' ? fn(...args) : (defaultFn as () => R)()
}

const noop = (): void => {
  /* noop */
}

/**
 * Decorator guarantees to run fn just once.
 *
 * @param fn
 */
export const once = <A extends Array<unknown>>(
  fn: (...args: A) => void
): ((...args: A) => void) => {
  let cb = fn

  return (...args: A): void => {
    cb(...args)
    cb = noop
  }
}

/**
 * Rounds a float number with specific precision.
 *
 * @param float
 * @param precision
 */
export const round = (float: number, precision?: number): number => {
  if (typeof precision === 'undefined' || precision < 1) {
    return Math.round(float)
  }

  const pow = 10 ** precision

  return Math.round(pow * float) / pow
}

export const hasWhitespaces = (input: string): boolean => {
  return /.*\s+.*/.test(input)
}

export const range = (start: number, end?: number): Array<number> => {
  const [start_, end_] = typeof end === 'undefined' ? [0, start] : [start, end]
  const vector = start_ < end_ ? 1 : -1
  const N = vector * (end_ - start_)
  const acc = new Array(N)

  for (let index = 0; index < N; index++) {
    acc[index] = start_ + vector * index
  }

  return acc
}

export const repeat = <T>(n: number, element: T): Array<T> => {
  const N = Math.max(0, n)
  const acc = new Array(N)

  for (let index = 0; index < N; index++) {
    acc[index] = element
  }

  return acc
}

export const every = <T>(ms: number, action: (ts: number) => T): Sub<T> =>
  Sub.create(`int-${ms}`, action, tick => {
    const intId = setInterval(() => {
      tick(Date.now())
    }, ms)

    return () => {
      clearInterval(intId)
    }
  })
