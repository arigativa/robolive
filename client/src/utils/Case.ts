type FullSchema<A extends Case<string, unknown>, R> = {
  [K in A['type']]: (payload: Extract<A, { type: K }>['payload']) => R
}

export type CaseMatchSchema<A extends Case<string, unknown>, R> =
  | FullSchema<A, R>
  | (Partial<FullSchema<A, R>> & { _(): R })

type ExtractPayloadFor<
  K extends string,
  A extends Case<string, unknown>
> = Extract<A, { type: K }>['payload']

interface CaseCreatorWithoutPayload<T extends string> {
  type: T
  (): Case<T>
}

interface CaseCreatorWithPayload<T extends string, P> {
  type: T
  (payload: P): Case<T, P>
}

type ExtractCaseCreator<
  T extends C['type'],
  C extends Case<string, unknown>
> = [ExtractPayloadFor<T, C>] extends [never]
  ? CaseCreatorWithoutPayload<T>
  : CaseCreatorWithPayload<T, ExtractPayloadFor<T, C>>

export class Case<T extends string, P = never> {
  public static of<C extends Case<string, unknown>, TT extends C['type']>(
    type: TT
  ): ExtractCaseCreator<TT, C>
  public static of<TT extends C['type'], C extends Case<string, unknown>>(
    type: TT
  ): ExtractCaseCreator<TT, C>
  public static of<TT extends string, PP>(
    type: TT
  ): CaseCreatorWithPayload<TT, PP> {
    const creator = (payload: PP): Case<TT, PP> => new Case(type, payload)

    creator.type = type

    return creator
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

  public is<TT extends string, RR>(
    probe: TT | Case<TT, RR> | CaseCreatorWithPayload<TT, RR>
  ): this is Case<TT, RR> {
    if (typeof probe === 'string') {
      return (probe as string) === this.type
    }

    return (probe.type as string) === this.type
  }
}
