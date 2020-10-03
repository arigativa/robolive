/* eslint-disable no-undefined */
import { callOrElse, once, round } from './'

describe('callOrElse', () => {
  // we assume it should not happen, sorry static types
  it('fails when both functions are not defined', () => {
    expect(() => callOrElse(undefined, undefined)).toThrow(
      new Error('defaultFn is not a function')
    )
  })

  it('calls defaultFn when fn is not defined', () => {
    expect(callOrElse(() => 'default', undefined)).toBe('default')
  })

  it('calls fn when it is defined', () => {
    expect(callOrElse(undefined, () => 'no args')).toBe('no args')
  })

  it('passes arguments to fn', () => {
    expect(
      callOrElse(
        () => ['0', 0, false],
        (...args) => args,
        '1',
        2,
        true
      )
    ).toEqual(['1', 2, true])
  })
})

describe('once', () => {
  it('callback is called only once', () => {
    const spy = jest.fn()
    const callOnce = once(spy)

    expect(spy).not.toBeCalled()

    callOnce()
    expect(spy).toBeCalledTimes(1)

    callOnce()
    expect(spy).toBeCalledTimes(1)
  })

  it('calls callback with arguments', () => {
    const spy = jest.fn()
    const callOnce = once(spy)

    callOnce(1, '2', true)
    expect(spy).toBeCalledWith(1, '2', true)
  })
})

describe('round', () => {
  it('rounds regularly when no precision passed', () => {
    expect(round(3.1415)).toBe(3)
  })

  it('rounds regularly when precision less than 1', () => {
    expect(round(3.1415, 0)).toBe(3)
    expect(round(3.1415, -1)).toBe(3)
  })

  it('rounds according precision', () => {
    expect(round(3.1415, 1)).toBe(3.1)
    expect(round(3.1415, 2)).toBe(3.14)
    expect(round(3.1415, 3)).toBe(3.142)
    expect(round(3.1415, 4)).toBe(3.1415)
    expect(round(3.1415, 5)).toBe(3.1415)
  })
})
