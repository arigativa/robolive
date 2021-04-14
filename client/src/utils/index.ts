import { Sub } from 'core'

export { Case } from './Case'
export type { CaseMatchSchema } from './Case'

export interface ActionOf<A extends Array<unknown>, R> {
  update(...args: A): R
}

class ActionWithPayload<T, A extends Array<unknown>, R>
  implements ActionOf<A, R> {
  public constructor(
    private readonly payload: T,
    private readonly handler: (value: T, ...args: A) => R
  ) {}

  public update(...args: A): R {
    return this.handler(this.payload, ...args)
  }
}

export function ActionOf<T, A extends ActionOf<Array<unknown>, unknown>>(
  handler: (
    payload: T,
    ...args: Parameters<A['update']>
  ) => ReturnType<A['update']>
): (payload: T) => A
export function ActionOf<A extends ActionOf<Array<unknown>, unknown>>(
  handler: A['update']
): () => A
export function ActionOf<A extends Array<unknown>, R>(
  handler: (...args: A) => R
): () => ActionOf<A, R>
export function ActionOf<T, A extends Array<unknown>, R>(
  handler: (payload: T, ...args: A) => R
): (payload: T) => ActionOf<A, R>
// eslint-disable-next-line @typescript-eslint/no-redeclare
export function ActionOf<T, A extends Array<unknown>, R>(
  handler: (payload: T, ...args: A) => R
) {
  return (payload?: T) =>
    typeof payload === 'undefined'
      ? { update: handler }
      : new ActionWithPayload(payload, handler)
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

export const every = <T>(ms: number, action: (ts: number) => T): Sub<T> => {
  return Sub.create(`int-${ms}`, action, tick => {
    const intId = setInterval(() => {
      tick(Date.now())
    }, ms)

    return () => {
      clearInterval(intId)
    }
  })
}
