import { action, observable, runInAction } from 'mobx'

export type TypeTaskStatus = 'pending' | 'succeeded' | 'failed' | 'idle'

export type TypeTaskState<T> = {
  data: T | null
  status: TypeTaskStatus
  isLoading: boolean
  isError: boolean
  error: unknown
}

export type TypeHooks<R, Args extends any[]> = {
  onBeforeLoad?: (task: TypeTaskReturn<R, Args>) => Promise<void> | void
  onFailed?: (
    task: TypeTaskReturn<R, Args>,
    error: unknown
  ) => Promise<void> | void
  onAfterLoad?: (task: TypeTaskReturn<R, Args>) => Promise<void> | void
}

export type TypeFnAsync<T, Args extends any[]> = (...args: Args) => Promise<T>

export type TypeTaskReturn<R, Args extends any[]> = ((
  ...args: Args
) => Promise<R>) & {
  state: TypeTaskState<R>
}

export type TypeSettings<T, Args extends any[]> = {
  hooks?: TypeHooks<T, Args>
}

export const task = <T, Args extends any[]>(
  fn: TypeFnAsync<T, Args>,
  settings?: TypeSettings<T, Args>
): TypeTaskReturn<T, Args> => {
  let taskRunCount = 0

  const state: TypeTaskState<T> = observable({
    data: null,
    status: 'idle',
    isLoading: false,
    isError: false,
    error: ''
  })

  const wrappedAction = action(async function wrap(...args: Args) {
    runInAction(() => {
      taskRunCount++
      state.status = 'pending'
      state.isLoading = true
      state.isError = false
      state.error = ''
    })

    await settings?.hooks?.onBeforeLoad?.(wrappedAction)

    try {
      const result = await fn(...args)

      runInAction(() => {
        state.status = 'succeeded'
        state.data = result
        state.isError = false
        state.error = ''
      })
    } catch (error) {
      runInAction(() => {
        state.status = 'failed'
        state.data = null
        state.isError = true
        state.error = error
      })

      await settings?.hooks?.onFailed?.(wrappedAction, error)
    } finally {
      taskRunCount--
      if (taskRunCount === 0) {
        runInAction(() => {
          state.isLoading = false
        })

        await settings?.hooks?.onAfterLoad?.(wrappedAction)
      }
    }
  }) as unknown as TypeTaskReturn<T, Args>

  wrappedAction.state = state

  return wrappedAction
}
