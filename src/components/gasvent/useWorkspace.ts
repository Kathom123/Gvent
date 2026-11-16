'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react'
import {
  applyOperations,
  createWorkspace,
  parseWorkspace,
  type Controls,
  type Workspace,
  type WorkspaceOperation,
} from '@/domain/workspace'

type SyncStatus = 'connecting' | 'synced' | 'saving' | 'error'

async function requestWorkspace(method: 'GET' | 'PATCH', operations?: WorkspaceOperation[]) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetch('/api/workspace', {
      method,
      cache: 'no-store',
      signal: controller.signal,
      headers:
        method === 'PATCH'
          ? { 'Content-Type': 'application/json', 'X-GasVent-Request': '1' }
          : undefined,
      body: operations ? JSON.stringify({ operations }) : undefined,
    })
    if (response.status === 401) {
      window.location.replace('/')
      throw new Error('La sesión ha caducado.')
    }
    const result = await response.json()
    if (!response.ok) {
      const error = new Error(result.error || 'No se pudo sincronizar.') as Error & {
        status?: number
      }
      error.status = response.status
      throw error
    }
    return parseWorkspace(result.workspace)
  } finally {
    clearTimeout(timeout)
  }
}

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace>(createWorkspace)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting')
  const [syncError, setSyncError] = useState('')
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
  const current = useRef(workspace)
  const remote = useRef(workspace)
  const pending = useRef<WorkspaceOperation[]>([])
  const sending = useRef(false)
  const reading = useRef(false)
  const mounted = useRef(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushRef = useRef<() => Promise<void>>(async () => {})

  const publish = useCallback((snapshot: Workspace) => {
    current.current = snapshot
    if (mounted.current) setWorkspace(snapshot)
  }, [])

  const receive = useCallback(
    (snapshot: Workspace) => {
      if (snapshot.revision >= remote.current.revision) remote.current = snapshot
      const next = pending.current.length
        ? applyOperations(remote.current, pending.current, Date.now())
        : remote.current
      publish(next)
      if (mounted.current) setLastSyncAt(Date.now())
    },
    [publish],
  )

  const refresh = useCallback(async () => {
    if (sending.current || reading.current || pending.current.length) return
    reading.current = true
    try {
      const snapshot = await requestWorkspace('GET')
      if (!mounted.current) return
      receive(snapshot)
      setSyncError('')
      setSyncStatus(pending.current.length ? 'saving' : 'synced')
    } catch (error) {
      if (!mounted.current) return
      setSyncStatus('error')
      setSyncError(error instanceof Error ? error.message : 'No se pudo sincronizar.')
    } finally {
      reading.current = false
    }
  }, [receive])

  const flush = useCallback(async () => {
    if (!mounted.current || sending.current || !pending.current.length) return
    const batch = pending.current.slice(0, 64)
    let committed = false
    sending.current = true
    setSyncStatus('saving')
    try {
      const snapshot = await requestWorkspace('PATCH', batch)
      const completed = new Set(batch.map((operation) => operation.id))
      pending.current = pending.current.filter((operation) => !completed.has(operation.id))
      if (!mounted.current) return
      receive(snapshot)
      setSyncError('')
      setSyncStatus(pending.current.length ? 'saving' : 'synced')
      committed = true
    } catch (error) {
      if (!mounted.current) return
      if (error instanceof Error && 'status' in error && error.status === 422) {
        pending.current = []
        publish(remote.current)
      }
      setSyncStatus('error')
      setSyncError(error instanceof Error ? error.message : 'No se pudo sincronizar.')
    } finally {
      sending.current = false
    }
    if (mounted.current && committed && pending.current.length) {
      debounce.current = setTimeout(() => void flushRef.current(), 300)
    }
  }, [publish, receive])
  flushRef.current = flush

  const queue = useCallback(
    (operation: WorkspaceOperation) => {
      try {
        const next = applyOperations(current.current, [operation], Date.now())
        pending.current.push(operation)
        publish(next)
        setSyncStatus('saving')
        setSyncError('')
        if (debounce.current) clearTimeout(debounce.current)
        debounce.current = setTimeout(() => void flushRef.current(), 250)
        return true
      } catch (error) {
        setSyncStatus('error')
        setSyncError(error instanceof Error ? error.message : 'Operación no válida.')
        return false
      }
    },
    [publish],
  )

  const setters = useMemo(() => {
    function control<K extends keyof Controls>(key: K) {
      return (value: SetStateAction<Controls[K]>) => {
        const previous = current.current.controls[key]
        const next =
          typeof value === 'function'
            ? (value as (old: Controls[K]) => Controls[K])(previous)
            : value
        if (Object.is(previous, next)) return
        queue({ id: crypto.randomUUID(), type: 'controls', patch: { [key]: next } })
      }
    }
    return {
      setMode: control('mode'),
      setSpeed: control('speed'),
      setRunning: control('running'),
      setTimer: control('timer'),
      setTimerEnd: control('timerEnd'),
      setWarning: control('warning'),
      setDanger: control('danger'),
      setAutoSafety: control('autoSafety'),
      setNightMode: control('nightMode'),
      setAlerts: control('alerts'),
      setSimulated: control('simulated'),
      setMuted: control('muted'),
    }
  }, [queue])

  useEffect(() => {
    mounted.current = true
    const sync = () => {
      if (document.visibilityState === 'hidden') return
      if (pending.current.length) void flushRef.current()
      else void refresh()
    }
    sync()
    const interval = setInterval(sync, 5000)
    window.addEventListener('focus', sync)
    window.addEventListener('online', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      mounted.current = false
      clearInterval(interval)
      if (debounce.current) clearTimeout(debounce.current)
      window.removeEventListener('focus', sync)
      window.removeEventListener('online', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [refresh])

  return {
    workspace,
    setters,
    syncStatus,
    syncError,
    lastSyncAt,
    retry: () => (pending.current.length ? void flushRef.current() : void refresh()),
    addDevice: (name: string) => queue({ id: crypto.randomUUID(), type: 'addDevice', name }),
    addActivity: (title: string, detail: string) =>
      queue({ id: crypto.randomUUID(), type: 'addEvent', title, detail }),
  }
}
