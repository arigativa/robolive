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
