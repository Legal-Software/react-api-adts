
export type ResultHandlers<T, S = void> = {
  success: (res: T) => S,
  invalid: (details: ValidErrorDetails) => S,
  denied: (details: AuthErrorDetails) => S,
  unreachable: () => S,
  error: (res: string) => S,
}

export type PreResultHandlers = {
  loading?: () => void
}

export type FutureResultHandlers<T> = ResultHandlers<T> & PreResultHandlers

export interface FutureResult<T>{
  promise(): Promise<Result<T>>
  then<S>(fun: (res: Result<T>) => S | PromiseLike<S>): Promise<S>
  handle(handlers: FutureResultHandlers<T>): void
}

export function futureResultFromPromise<T>(promise: Promise<Result<T>>): FutureResult<T> {
  return {
    promise(): Promise<Result<T>> {
      return promise
    },
    then<S>(fun: (res: Result<T>) => S | PromiseLike<S>): Promise<S> {
      return promise.then(fun)
    },
    handle(handlers: ResultHandlers<T> & PreResultHandlers) {
      handlers.loading?.()
      promise.then(res => res.handle(handlers))
    }
  }
}

export abstract class Result<T> {

  res: ADT.Result<T>

  protected constructor(res: ADT.Result<T>) {
    this.res = res
  }

  handle(handlers: ResultHandlers<T>): void {
    this.match(handlers)
  }

  match<S>(handlers: ResultHandlers<T, S>): S {
    switch (this.res.kind) {
      case "success":
        return handlers.success(this.res.response)

      case "validation-error":
        return handlers.invalid(this.res.details)

      case "authentication-error":
        return handlers.denied(this.res.details)

      case "internal-error":
        return handlers.error(this.res.errorMsg)

      case "unreachable-error":
        return handlers.unreachable()
    }
    throw "ADT type error: Unknown result type."
  }

  isSuccess(): boolean {
    return this.res.success
  }

  isError(): boolean {
    return !this.res.success
  }

}

export class Success<T> extends Result<T> {

  constructor(response: T) {
    super({
      kind: "success",
      success: true,
      response
    })
  }

}

export class ValidError extends Result<never> {

  constructor(details: ValidErrorDetails) {
    super({
      kind: "validation-error",
      success: false,
      details
    })
  }

}

export class AuthError extends Result<never> {

  constructor(details: AuthErrorDetails) {
    super({
      kind: "authentication-error",
      success: false,
      details
    })
  }

}

export class InternalError extends Result<never> {

  constructor(errorMsg: string) {
    super({
      kind: "internal-error",
      success: false,
      errorMsg
    })
  }

}

export class UnreachableError extends Result<never> {

  constructor() {
    super({
      kind: "unreachable-error",
      success: false
    })
  }

}

export type ValidErrorDetails = {
  errorCodes: string[]
}

export type AuthErrorDetails = {}

namespace ADT {
  export type Result<T> = Success<T> | ValidError | AuthError | InternalError | UnreachableError

  export interface Success<T>{
    kind: "success",
    success: true
    response: T
  }

  export interface ValidError {
    kind: "validation-error"
    success: false
    details: ValidErrorDetails
  }

  export interface AuthError {
    kind: "authentication-error"
    success: false
    details: AuthErrorDetails
  }

  export interface InternalError {
    kind: "internal-error"
    success: false
    errorMsg: string
  }

  export interface UnreachableError {
    kind: "unreachable-error"
    success: false
  }
}



