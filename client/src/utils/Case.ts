type FullSchema<A extends Case<string, unknown>, R> = Record<
  A['type'],
  (payload: A['payload']) => R
>

export type CaseMatchSchema<A extends Case<string, unknown>, R> =
  | FullSchema<A, R>
  | (Partial<FullSchema<A, R>> & { _(): R })

type ExtractPayloadFor<
  K extends string,
  A extends Case<string, unknown>
> = Extract<A, { type: K }>['payload']

type ExtractCaseCreator<
  T extends C['type'],
  C extends Case<string, unknown>
> = [ExtractPayloadFor<T, C>] extends [never]
  ? () => C
  : (payload: ExtractPayloadFor<T, C>) => C

export class Case<T extends string, P = never> {
  public static of<C extends Case<string, unknown>, TT extends C['type']>(
    type: TT
  ): ExtractCaseCreator<TT, C>
  public static of<TT extends C['type'], C extends Case<string, unknown>>(
    type: TT
  ): ExtractCaseCreator<TT, C>
  public static of<TT extends string, PP>(
    type: TT
  ): (payload: PP) => Case<TT, PP> {
    return payload => new Case(type, payload)
  }

  private constructor(public readonly type: T, public readonly payload: P) {}

  protected toString(): string {
    return this.type
  }

  protected toJSON(): unknown {
    return {
      type: this.type,
      payload: this.payload
    }
  }

  public match<R>(schema: CaseMatchSchema<Case<T, P>, R>): R
  public match<R>(schema: { [K in T]: (payload: P) => R } & { _(): R }): R {
    if (this.type in schema) {
      return schema[this.type](this.payload)
    }

    return schema._()
  }
}
