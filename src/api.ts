
import axios, {AxiosResponse} from "axios";
import {
  AuthError,
  AuthErrorDetails, FutureResult, futureResultFromPromise,
  InternalError,
  Result,
  Success,
  UnreachableError,
  ValidError,
  ValidErrorDetails
} from "./result";

export class Encoder<T> {
  contentType: string
  encode: (obj: T) => ArrayBuffer

  constructor(contentType: string, encode: (obj: T) => ArrayBuffer) {
    this.contentType = contentType
    this.encode = encode
  }
}

export class Decoder<T>{
  contentType: string
  decode: (input: ArrayBuffer) => T

  constructor(contentType: string, decode: (input: ArrayBuffer) => T) {
    this.contentType = contentType
    this.decode = decode
  }

  map<S>(fun: (t: T) => S): Decoder<S>{
    return new Decoder<S>(this.contentType, (input: ArrayBuffer) => fun(this.decode(input)))
  }
}

export function ackDecoder(): Decoder<any>{
  return new Decoder<any>("*/*", () => 0)
}

export class API<V> {

  urlPrefix: string
  validErrorDecoder: Decoder<ValidErrorDetails>
  authErrorDecoder: Decoder<AuthErrorDetails>
  timeoutMillis: number

  constructor(urlPrefix: string,
              validErrorDecoder: Decoder<ValidErrorDetails>,
              authErrorDecoder: Decoder<AuthErrorDetails>,
              timeoutMillis: number) {
    this.urlPrefix = urlPrefix
    this.validErrorDecoder = validErrorDecoder
    this.authErrorDecoder = authErrorDecoder
    this.timeoutMillis = timeoutMillis
  }

  makeFullUrl(url: string): string {
    return this.urlPrefix + url
  }

  makeAcceptHeader(successType: string): string {
    const types = new Set([successType, this.validErrorDecoder.contentType, this.authErrorDecoder.contentType])
    return Array.from(types).join(", ")
  }

  handleResponse<T>(resp: Promise<AxiosResponse>, successParser: Decoder<T>): FutureResult<T> {
    const promise = new Promise<Result<T>>((resolve, reject) => {
      resp
        .then(response => {
          const result = new Success(successParser.decode(response.data))
          resolve(result)
        })
        .catch(err => {
          const response: AxiosResponse = err.response

          if(response){
            switch (response.status) {
              case 400:
                resolve(new ValidError(this.validErrorDecoder.decode(response.data)))
                break
              case 401:
              case 403:
                resolve(new AuthError(this.authErrorDecoder.decode(response.data)))
                break
              default:
                console.error("An unexpected API error occurred", response)
                resolve(new InternalError(`${response.status} - ${response.statusText}`))
            }
          }
          else{
            resolve(new UnreachableError())
          }
        })
    })

    return futureResultFromPromise(promise)
  }

  post<S, T>(url: string,
             s: S,
             encoder: Encoder<S>,
             decoder: Decoder<T>): FutureResult<T> {

    const fullUrl = this.makeFullUrl(url)
    const payload = encoder.encode(s)
    const resp = axios
      .post(fullUrl, payload,{
        headers: {
          "Content-Type": encoder.contentType,
          "Accept": this.makeAcceptHeader(decoder.contentType)
        },
        responseType: "arraybuffer",
        timeout: this.timeoutMillis
      })

    return this.handleResponse(resp, decoder)
  }

  put<S, T>(url: string,
            s: S,
            encoder: Encoder<S>,
            decoder: Decoder<T>): FutureResult<T> {

    const fullUrl = this.makeFullUrl(url)
    const payload = encoder.encode(s)
    const resp = axios
      .put(fullUrl, payload, {
        headers: {
          "Content-Type": encoder.contentType,
          "Accept": this.makeAcceptHeader(decoder.contentType)
        },
        responseType: "arraybuffer",
        timeout: this.timeoutMillis
      })

    return this.handleResponse(resp, decoder)
  }

  get<T>(url: string,
         decoder: Decoder<T>): FutureResult<T> {
    const fullUrl = this.makeFullUrl(url)

    const resp = axios
      .get(fullUrl, {
        responseType: "arraybuffer",
        timeout: this.timeoutMillis,
        headers: {
          "Accept": this.makeAcceptHeader(decoder.contentType)
        }
      })

    return this.handleResponse(resp, decoder)
  }

  delete<T>(url: string,
            decoder: Decoder<T>): FutureResult<T> {
    const fullUrl = this.makeFullUrl(url)
    const resp = axios
      .delete(fullUrl, {
        responseType: "arraybuffer",
        timeout: this.timeoutMillis,
        headers: {
          "Accept": this.makeAcceptHeader(decoder.contentType)
        }
      })

    return this.handleResponse(resp, decoder)
  }

}

