export type FabricSchema<O, P> = {
  [K in keyof O]: O[K] | ((payload: P, defaults: O[K]) => O[K])
}

export interface Fabric<O> {
  <P>(schema: Partial<FabricSchema<O, P>>): (payload: P) => O
  defaults: O
}

export const make = <O>(defaults: O): Fabric<O> => {
  const fabric: Fabric<O> = schema => payload => {
    const result = {} as O

    for (const key in defaults) {
      if (Object.prototype.hasOwnProperty.call(defaults, key)) {
        const field = schema[key]
        const defaultValue = defaults[key]

        if (!(key in schema)) {
          result[key] = defaultValue
        } else if (typeof field === 'function') {
          result[key] = field(payload, defaultValue)
        } else {
          result[key] = field as O[typeof key]
        }
      }
    }

    return result
  }

  fabric.defaults = defaults

  return fabric
}
