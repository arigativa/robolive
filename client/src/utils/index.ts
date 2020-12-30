import { Sub } from 'core'

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

export interface CaseOf<T extends string = string, P = never> {
  type: T
  payload: P
}

export interface CreateCaseWithoutPayload<T extends string = string> {
  type: T
  (): CaseOf<T>
}

export interface CreateCaseWithPayload<T extends string = string, P = never> {
  type: T
  (payload: P): CaseOf<T, P>
}

type ExtractPayloadFor<
  K extends string,
  A extends CaseOf<string, unknown>
> = Extract<A, { type: K }>['payload']

export type CaseCreator<A extends CaseOf<string, unknown>> = {
  [K in A['type']]: [ExtractPayloadFor<K, A>] extends [never]
    ? CreateCaseWithoutPayload<K>
    : CreateCaseWithPayload<K, ExtractPayloadFor<K, A>>
}[A['type']]

export function CaseOf<T extends string>(type: T): CreateCaseWithoutPayload<T>
export function CaseOf<T extends string, P>(
  type: T
): CreateCaseWithPayload<T, P>
// eslint-disable-next-line @typescript-eslint/no-redeclare
export function CaseOf<T extends string, P>(
  type: T
): CreateCaseWithPayload<T, P> {
  const creator = (payload: P): CaseOf<T, P> => ({ type, payload })

  creator.type = type

  return creator
}

type CaseOfSchema<A extends CaseOf<string, unknown>, R> = {
  [K in A['type']]: (payload: Extract<A, { type: K }>['payload']) => R
}

export type Schema<A extends CaseOf<string, unknown>, R> =
  | CaseOfSchema<A, R>
  | (Partial<CaseOfSchema<A, R>> & { _(): R })

export const match = <A extends CaseOf<string, unknown>, R>(
  case_: A,
  schema: Schema<A, R>
): R => {
  if (case_.type in schema) {
    return (schema as Record<string, (payload: unknown) => R>)[case_.type](
      case_.payload
    )
  }

  return (schema as { _(): R })._()
}

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
