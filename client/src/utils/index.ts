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

type CaseOfSchema<A extends CaseOf<string, unknown>, R> = {
  [K in A['type']]: (payload: Extract<A, { type: K }>['payload']) => R
}

type ExtractPayloadFor<
  K extends string,
  A extends CaseOf<string, unknown>
> = Extract<A, { type: K }>['payload']

export type Schema<A extends CaseOf<string, unknown>, R> =
  | CaseOfSchema<A, R>
  | (Partial<CaseOfSchema<A, R>> & { _(): R })

// rename to Case and create -> of
export class CaseOf<T extends string, P = never> {
  public static of<C extends CaseOf<string, unknown>, TT extends C['type']>(
    type: TT
  ): [ExtractPayloadFor<TT, C>] extends [never]
    ? C
    : CreateCaseWithPayload<TT, ExtractPayloadFor<TT, C>>
  public static of<TT extends C['type'], C extends CaseOf<string, unknown>>(
    type: TT
  ): [ExtractPayloadFor<TT, C>] extends [never]
    ? C
    : CreateCaseWithPayload<TT, ExtractPayloadFor<TT, C>>
  public static of<TT extends string, PP>(
    type: TT
  ): CreateCaseWithPayload<TT, PP> {
    const creator = (payload: PP): CaseOf<TT, PP> => new CaseOf(type, payload)

    creator.type = type

    return creator
  }

  private constructor(public readonly type: T, public readonly payload: P) {}

  public match<R>(schema: Schema<CaseOf<T, P>, R>): R
  public match<R>(schema: { [K in T]: (payload: P) => R } & { _(): R }): R {
    if (this.type in schema) {
      return schema[this.type](this.payload)
    }

    return schema._()
  }

  public is<TT extends string, RR>(
    probe: CaseOf<TT, RR> | CreateCaseWithPayload<TT, RR>
  ): this is CaseOf<TT, RR> {
    return (probe.type as string) === this.type
  }
}

interface CreateCaseWithPayload<T extends string, P> {
  type: T
  (payload: P): CaseOf<T, P>
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
