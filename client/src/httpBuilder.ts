import { Cata } from 'frctl/Basics'
import Either, { Right } from 'frctl/Either'
import Maybe, { Nothing, Just } from 'frctl/Maybe'
import Decode from 'frctl/Json/Decode'
import Encode from 'frctl/Json/Encode'

import { Case, Effect } from 'core'
import { callOrElse } from 'utils'

/**
 * Adapts frctl/Http to use with redux
 *
 * https://github.com/owanturist/Fractal/blob/master/src/Http.ts
 */

/* H E L P E R S */

const queryEscape = (str: string): string => {
  return encodeURIComponent(str).replace(/%20/g, '+')
}

const queryPair = ([key, value]: [string, string]): string => {
  return queryEscape(key) + '=' + queryEscape(value)
}

const buildUrlWithQuery = (
  url: string,
  queryParams: Array<[string, string]>
): string => {
  if (queryParams.length === 0) {
    return url
  }

  return url + '?' + queryParams.map(queryPair).join('&')
}

const parseHeaders = (rawHeaders: string): Record<string, string> => {
  const headers: Record<string, string> = {}
  const headerPairs = rawHeaders.split('\u000d\u000a')

  if (headerPairs.length === 0) {
    return headers
  }

  for (const headerPair of headerPairs) {
    const delimiterIndex = headerPair.indexOf('\u003a\u0020')

    if (delimiterIndex > 0) {
      const key = headerPair.substring(0, delimiterIndex)
      const value = headerPair.substring(delimiterIndex + 2)
      const oldValue = headers[key]

      headers[key] = oldValue ? value + ', ' + oldValue : value
    }
  }

  return headers
}

/* E R R O R */

export type ErrorPattern<T> = Cata<{
  Timeout(): T
  NetworkError(): T
  BadUrl(url: string): T
  BadStatus(response: Response<string>): T
  BadBody(error: Decode.Error, response: Response<string>): T
}>

export type Error = {
  cata<T>(pattern: ErrorPattern<T>): T
}

const Timeout: Error = {
  cata<T>(pattern: ErrorPattern<T>): T {
    return callOrElse(pattern._, pattern.Timeout)
  }
}

const NetworkError: Error = {
  cata<T>(pattern: ErrorPattern<T>): T {
    return callOrElse(pattern._, pattern.NetworkError)
  }
}

class BadUrl implements Error {
  constructor(private readonly url: string) {}

  public cata<T>(pattern: ErrorPattern<T>): T {
    return callOrElse(pattern._, pattern.BadUrl, this.url)
  }
}

class BadStatus implements Error {
  constructor(private readonly response: Response<string>) {}

  public cata<T>(pattern: ErrorPattern<T>): T {
    return callOrElse(pattern._, pattern.BadStatus, this.response)
  }
}

class BadBody implements Error {
  constructor(
    private readonly error: Decode.Error,
    private readonly response: Response<string>
  ) {}

  public cata<T>(pattern: ErrorPattern<T>): T {
    return callOrElse(pattern._, pattern.BadBody, this.error, this.response)
  }
}

export const Error = {
  Timeout,
  NetworkError,
  BadUrl: (url: string): Error => new BadUrl(url),
  BadStatus: (response: Response<string>): Error => new BadStatus(response),
  BadBody: (error: Decode.Error, response: Response<string>): Error =>
    new BadBody(error, response)
}

/* H E A D E R */

export type Header = Readonly<{
  name: string
  value: string
}>

export const header = (name: string, value: string): Header => ({ name, value })

/* R E S P O N S E */

export type Response<T> = Readonly<{
  url: string
  statusCode: number
  statusText: string
  headers: Record<string, string>
  body: T
}>

/* E X P E C T */

export type Expect<T> = Readonly<{
  responseType: XMLHttpRequestResponseType
  responseToResult(response: Response<string>): Either<Decode.Error, T>
}>

export const expectResponse = <T>(
  responseToResult: (response: Response<string>) => Either<Decode.Error, T>
): Expect<T> => ({ responseType: 'text', responseToResult })

export const expectWhatever: Expect<null> = expectResponse(() => Right(null))

export const expectString: Expect<string> = expectResponse(response =>
  Right(response.body)
)

export const expectJson = <T>(decoder: Decode.Decoder<T>): Expect<T> => {
  return expectResponse(response => decoder.decodeJSON(response.body))
}

/* B O D Y */

export type BodyContent = Readonly<{
  type: string
  value: string
}>

export type Body = Readonly<{
  content: Maybe<BodyContent>
}>

export const emptyBody: Body = {
  content: Nothing
}

export const stringBody = (type: string, value: string): Body => {
  return {
    content: Just({ type, value })
  }
}

export const jsonBody = (encoder: Encode.Value): Body => {
  return stringBody('application/json', encoder.encode(4))
}

/* R E Q U E S T */

export type Request<T> = {
  withHeader(name: string, value: string): Request<T>
  withHeaders(headers: Array<Header>): Request<T>

  withBody(body: Body): Request<T>
  withStringBody(type: string, value: string): Request<T>
  withJsonBody(encoder: Encode.Value): Request<T>

  withTimeout(timeout: number): Request<T>
  withoutTimeout(): Request<T>

  withCredentials(): Request<T>
  withoutCredentials(): Request<T>

  withQueryParam(key: string, value: string): Request<T>
  withQueryParams(queries: Array<[string, string]>): Request<T>

  expect<R>(expect: Expect<R>): Request<R>
  expectResponse<R>(
    responseToResult: (response: Response<string>) => Either<Decode.Error, R>
  ): Request<R>
  expectString(): Request<string>
  expectJson<R>(decoder: Decode.Decoder<R>): Request<R>

  send<A extends Case>(tagger: (result: Either<Error, T>) => A): Effect<A>
}

class RequestImpl<T> implements Request<T> {
  public constructor(
    private readonly method: string,
    private readonly url: string,
    private readonly headers: Array<Header>,
    private readonly body: Body,
    private readonly expect_: Expect<T>,
    private readonly timeout: number,
    private readonly withCredentials_: boolean,
    private readonly queryParams: Array<[string, string]>
  ) {}

  private merge<R>({
    method = this.method,
    url = this.url,
    headers = this.headers,
    body = this.body,
    expect = (this.expect_ as unknown) as Expect<R>,
    timeout = this.timeout,
    withCredentials = this.withCredentials_,
    queryParams = this.queryParams
  }: {
    method?: string
    url?: string
    headers?: Array<Header>
    body?: Body
    expect?: Expect<R>
    timeout?: number
    withCredentials?: boolean
    queryParams?: Array<[string, string]>
  }): Request<R> {
    return new RequestImpl(
      method,
      url,
      headers,
      body,
      expect,
      timeout,
      withCredentials,
      queryParams
    )
  }

  public withHeader(name: string, value: string): Request<T> {
    return this.withHeaders([header(name, value)])
  }

  public withHeaders(headers: Array<Header>): Request<T> {
    return this.merge({
      headers: this.headers.concat(headers)
    })
  }

  public withBody(body: Body): Request<T> {
    return this.merge({ body })
  }

  public withStringBody(type: string, value: string): Request<T> {
    return this.withBody(stringBody(type, value))
  }

  public withJsonBody(encoder: Encode.Value): Request<T> {
    return this.withBody(jsonBody(encoder))
  }

  public withTimeout(milliseconds: number): Request<T> {
    return this.merge({ timeout: milliseconds })
  }

  public withoutTimeout(): Request<T> {
    return this.withTimeout(0)
  }

  public withCredentials(): Request<T> {
    return this.merge({ withCredentials: true })
  }

  public withoutCredentials(): Request<T> {
    return this.merge({ withCredentials: false })
  }

  public withQueryParam(key: string, value: string): Request<T> {
    return this.withQueryParams([[key, value]])
  }

  public withQueryParams(queries: Array<[string, string]>): Request<T> {
    return this.merge({
      queryParams: this.queryParams.concat(queries)
    })
  }

  public expect<R>(expect: Expect<R>): Request<R> {
    return this.merge({ expect })
  }

  public expectResponse<R>(
    responseToResult: (response: Response<string>) => Either<Decode.Error, R>
  ): Request<R> {
    return this.expect(expectResponse(responseToResult))
  }

  public expectString(): Request<string> {
    return this.expect(expectString)
  }

  public expectJson<R>(decoder: Decode.Decoder<R>): Request<R> {
    return this.expect(expectJson(decoder))
  }

  public send<A extends Case>(
    tagger: (result: Either<Error, T>) => A
  ): Effect<A> {
    return dispatch => {
      const xhr = new XMLHttpRequest()

      xhr.addEventListener('error', () => {
        dispatch(tagger(Either.Left(Error.NetworkError)))
      })

      xhr.addEventListener('timeout', () => {
        dispatch(tagger(Either.Left(Error.Timeout)))
      })

      xhr.addEventListener('load', () => {
        const stringResponse: Response<string> = {
          url: xhr.responseURL,
          statusCode: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders()),
          body: xhr.responseText
        }

        if (xhr.status < 200 || xhr.status >= 300) {
          dispatch(tagger(Either.Left(Error.BadStatus(stringResponse))))
        } else {
          dispatch(
            tagger(
              this.expect_
                .responseToResult({
                  ...stringResponse,
                  body: xhr.response as string
                })
                .mapLeft(decodeError =>
                  Error.BadBody(decodeError, stringResponse)
                )
            )
          )
        }
      })

      try {
        xhr.open(
          this.method,
          buildUrlWithQuery(this.url, this.queryParams),
          true
        )
      } catch (e) {
        dispatch(tagger(Either.Left(Error.BadUrl(this.url))))

        return
      }

      for (const requestHeader of this.headers) {
        xhr.setRequestHeader(requestHeader.name, requestHeader.value)
      }

      xhr.responseType = this.expect_.responseType
      xhr.withCredentials = this.withCredentials_

      if (this.timeout > 0) {
        xhr.timeout = this.timeout
      }

      this.body.content.cata({
        Nothing() {
          xhr.send()
        },

        Just(content) {
          xhr.setRequestHeader('Content-Type', content.type)
          xhr.send(content.value)
        }
      })
    }
  }
}

const setupRequest = (method: string) => (url: string): Request<null> => {
  return new RequestImpl(
    method,
    url,
    [],
    emptyBody,
    expectWhatever,
    0,
    false,
    []
  )
}

export default {
  get: setupRequest('GET'),
  post: setupRequest('GET'),
  put: setupRequest('PUT'),
  patch: setupRequest('PATCH'),
  delete: setupRequest('DELETE'),
  options: setupRequest('OPTIONS'),
  trace: setupRequest('TRACE'),
  head: setupRequest('HEAD')
}
