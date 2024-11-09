import { describe, it, expect, vi } from 'vitest'
import { task, TypeHooks } from '../task'

describe('task', () => {
  it('should initialize with idle state', () => {
    const mockFn = vi.fn(async () => 'result')
    const wrappedTask = task(mockFn)

    expect(wrappedTask.state.status).toBe('idle')
    expect(wrappedTask.state.isLoading).toBe(false)
    expect(wrappedTask.state.isError).toBe(false)
    expect(wrappedTask.state.data).toBeNull()
    expect(wrappedTask.state.error).toBe('')
  })

  it('should update state to pending when task starts', async () => {
    const mockFn = vi.fn(async () => 'result')
    const wrappedTask = task(mockFn)

    const taskPromise = wrappedTask()
    expect(wrappedTask.state.status).toBe('pending')
    expect(wrappedTask.state.isLoading).toBe(true)
    expect(wrappedTask.state.isError).toBe(false)
    expect(wrappedTask.state.error).toBe('')

    await taskPromise
  })

  it('should set state to succeeded and store result on success', async () => {
    const mockFn = vi.fn(async () => 'result')
    const wrappedTask = task(mockFn)

    await wrappedTask()

    expect(wrappedTask.state.status).toBe('succeeded')
    expect(wrappedTask.state.isLoading).toBe(false)
    expect(wrappedTask.state.isError).toBe(false)
    expect(wrappedTask.state.data).toBe('result')
    expect(wrappedTask.state.error).toBe('')
  })

  it('should set state to failed and store error message on failure', async () => {
    const mockError = new Error('Test error')
    const mockFn = vi.fn(async () => {
      throw mockError
    })
    const wrappedTask = task(mockFn)

    await wrappedTask()

    expect(wrappedTask.state.status).toBe('failed')
    expect(wrappedTask.state.isLoading).toBe(false)
    expect(wrappedTask.state.isError).toBe(true)
    expect(wrappedTask.state.data).toBeNull()
    expect(wrappedTask.state.error).toBe(mockError)
  })

  it('should call onBeforeLoad, onFailed, and onAfterLoad hooks correctly', async () => {
    const mockFn = vi.fn(async () => {
      throw new Error('Test error')
    })

    const onBeforeLoad = vi.fn()
    const onFailed = vi.fn()
    const onAfterLoad = vi.fn()

    const hooks: TypeHooks<unknown, []> = {
      onBeforeLoad,
      onFailed,
      onAfterLoad
    }

    const wrappedTask = task(mockFn, { hooks })

    await wrappedTask()

    expect(onBeforeLoad).toHaveBeenCalledOnce()
    expect(onFailed).toHaveBeenCalledOnce()
    expect(onAfterLoad).toHaveBeenCalledOnce()
  })

  it('should call onAfterLoad only once after multiple concurrent calls finish', async () => {
    const mockFn = vi.fn(async () => 'result')

    const onAfterLoad = vi.fn()
    const hooks: TypeHooks<unknown, []> = {
      onAfterLoad
    }

    const wrappedTask = task(mockFn, { hooks })

    const promise1 = wrappedTask()
    const promise2 = wrappedTask()
    await Promise.all([promise1, promise2])

    expect(onAfterLoad).toHaveBeenCalledOnce()
  })
})
