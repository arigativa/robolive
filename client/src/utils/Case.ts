export type Case<T extends string, P = null> = { type: T; payload: P }

type ExtractPayload<
  T extends C['type'],
  C extends Case<string, unknown>
> = Extract<C, { type: T }>['payload']

type ExtractCaseCreator<
  T extends C['type'],
  C extends Case<string, unknown>
> = [keyof ExtractPayload<T, C>] extends [never]
  ? () => C
  : (payload: ExtractPayload<T, C>) => C

interface CaseOf {
  <C extends Case<string, unknown>, T extends C['type']>(
    type: T
  ): ExtractCaseCreator<T, C>

  <T extends C['type'], C extends Case<string, unknown>>(
    type: T
  ): ExtractCaseCreator<T, C>
}

const of: CaseOf = <T extends string, P>(type: T) => (payload: P) => ({
  ...payload,
  type
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Case = { of }
