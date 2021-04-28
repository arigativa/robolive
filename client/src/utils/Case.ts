type Compute<O> = { [K in keyof O]: O[K] } & unknown

type CasePayload = null | (Record<string, unknown> & { type?: never })

export type Case<
  T extends string,
  P extends CasePayload = null
> = P extends null ? { type: T } : Compute<P & { type: T }>

type ExtractPayload<
  T extends C['type'],
  C extends Case<string, CasePayload>
> = Compute<Omit<Extract<C, { type: T }>, 'type'>>

type ExtractCaseCreator<
  T extends C['type'],
  C extends Case<string, CasePayload>
> = keyof ExtractPayload<T, C> extends null
  ? () => C
  : (payload: ExtractPayload<T, C>) => C

function of<C extends Case<string, CasePayload>, T extends C['type']>(
  type: T
): ExtractCaseCreator<T, C>
function of<T extends C['type'], C extends Case<string, CasePayload>>(
  type: T
): ExtractCaseCreator<T, C>
function of<T extends string, P extends CasePayload>(type: T) {
  return (payload?: P) => (payload == null ? { type } : { ...payload, type })
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Case = { of }
