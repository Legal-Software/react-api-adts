import {useState} from "react";

type FormState<T> = SuccessState<T> | ErrorState | LoadingState | ReadyState

interface SuccessState<T> {
  kind: "success"
  result: T
}

interface ErrorState {
  kind: "error"
  msg: string
}

interface LoadingState {
  kind: "loading"
}

interface ReadyState {
  kind: "ready"
}

function success<T>(t: T): SuccessState<T> {
  return {kind: "success", result: t}
}

function error(msg: string): ErrorState {
  return {kind: "error", msg: msg}
}

function loading(): LoadingState{
  return {kind: "loading"}
}

function ready(): ReadyState{
  return {kind: "ready"}
}

function mapState<T, S>(state: FormState<T>, fun: (t: T) => S): FormState<S> {
  if(state.kind === "success") return success(fun(state.result))
  else return state
}

type StateUpdateHandler<T> = (state: FormState<T>) => void

export class FormStateHandler<T = unknown> {

  readonly isSuccess: boolean
  readonly isError: boolean
  readonly isLoading: boolean
  readonly isReady: boolean

  readonly result: T | undefined
  readonly errorMsg: string | undefined

  readonly state: FormState<T>
  private readonly setState: StateUpdateHandler<T>
  private handlers: StateUpdateHandler<T>[]

  constructor(state: FormState<T>, setState: (state: FormState<T>) => void) {
    this.state = state
    this.isSuccess = state.kind === "success"
    this.isError = state.kind === "error"
    this.isLoading = state.kind === "loading"
    this.isReady = state.kind === "ready"
    this.errorMsg = state.kind === "error" ? state.msg : undefined
    this.result = state.kind === "success" ? state.result : undefined
    this.setState = setState
    this.handlers = []
  }

  match<S>(matchers: {
    success?: (t: T) => S,
    error?: (msg: string) => S,
    ready?: () => S,
    loading?: () => S
  }): S | undefined {
    switch (this.state.kind){
      case "success":
        return matchers.success?.(this.state.result)

      case "error":
        return matchers.error?.(this.state.msg)

      case "loading":
        return matchers.loading?.()

      case "ready":
        return matchers.ready?.()
    }
  }

  success(result: T): void{
    const suc = success(result)
    this.handlers.forEach(handler => handler(suc))
    this.setState(suc)
  }

  error(msg: string): void{
    const err = error(msg)
    this.handlers.forEach(handler => handler(err))
    this.setState(err)
  }

  loading(): void{
    const ld = loading()
    this.handlers.forEach(handler => handler(ld))
    this.setState(ld)
  }

  ready(): void{
    const rd = ready()
    this.handlers.forEach(handler => handler(rd))
    this.setState(rd)
  }

  handleSuccess(callback: (t: T) => void): void {
    this.handlers.push(state => (state.kind === "success" && callback(state.result)))
  }

  handleError(callback: (msg: string) => void): void {
    this.handlers.push(state => (state.kind === "error" && callback(state.msg)))
  }
}

export type FormResult<T> = SuccessState<T> | ErrorState

export function formResultPromise<T = unknown>(fun: (handler: FormStateHandler<T>) => void): Promise<FormResult<T>> {

  return new Promise<FormResult<T>>((resolve, reject) => {
    const handler = new FormStateHandler<T>(ready(), () => {})

    handler.handleSuccess((t: T) => resolve(success(t)))
    handler.handleError((msg: string) => resolve(error(msg)))

    fun(handler)
  })
}

export function useFormState<T = unknown>(): FormStateHandler<T> {

  const [state, setState] = useState<FormState<T>>(ready)

  return new FormStateHandler(state, setState)

}