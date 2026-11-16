export type Controls = {
  mode: string
  speed: number
  running: boolean
  timer: string
  timerEnd: number | null
  warning: number
  danger: number
  autoSafety: boolean
  nightMode: boolean
  alerts: boolean
  simulated: boolean
  muted: boolean
}

export type DemoDevice = {
  id: string
  name: string
  model: string
  icon: 'devices' | 'wind' | 'thermometer'
  value: string
  status: string
}

export type Activity = {
  id: string
  title: string
  detail: string
  time: string
  type: 'shield' | 'wind' | 'bell' | 'check'
  tone: 'green' | 'blue' | 'amber'
}

export type Workspace = {
  schemaVersion: 1
  revision: number
  updatedAt: number
  controls: Controls
  devices: DemoDevice[]
  events: Activity[]
  appliedIds: string[]
}

export type WorkspaceOperation =
  | { id: string; type: 'controls'; patch: Partial<Controls> }
  | { id: string; type: 'addDevice'; name: string }
  | { id: string; type: 'addEvent'; title: string; detail: string }

export class WorkspaceValidationError extends Error {}

export function createWorkspace(): Workspace {
  return {
    schemaVersion: 1,
    revision: 0,
    updatedAt: 0,
    controls: {
      mode: 'Auto',
      speed: 45,
      running: true,
      timer: 'Never',
      timerEnd: null,
      warning: 250,
      danger: 500,
      autoSafety: true,
      nightMode: false,
      alerts: true,
      simulated: false,
      muted: false,
    },
    devices: [
      {
        id: 'sensor-gas',
        name: 'Gas sensor',
        model: 'MQ-2 · GV-S001',
        icon: 'devices',
        value: '42 ppm',
        status: 'Online',
      },
      {
        id: 'fan',
        name: 'Ventilation fan',
        model: 'DC Motor · GV-F001',
        icon: 'wind',
        value: '45% speed',
        status: 'Running',
      },
      {
        id: 'sensor-climate',
        name: 'Climate sensor',
        model: 'DHT22 · GV-T001',
        icon: 'thermometer',
        value: '24.6 °C',
        status: 'Online',
      },
    ],
    events: [
      {
        id: 'seed-air',
        title: 'Air quality is back to normal',
        detail: 'Gas level dropped below 50 ppm',
        time: '10:42 AM',
        type: 'shield',
        tone: 'green',
      },
      {
        id: 'seed-fan',
        title: 'Ventilation adjusted automatically',
        detail: 'Fan speed set to 45%',
        time: '10:38 AM',
        type: 'wind',
        tone: 'blue',
      },
      {
        id: 'seed-gas',
        title: 'Elevated gas level detected',
        detail: '128 ppm · Ventilation activated',
        time: '09:24 AM',
        type: 'bell',
        tone: 'amber',
      },
    ],
    appliedIds: [],
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function validText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max
}

function assertControls(value: unknown): asserts value is Controls {
  if (!record(value)) throw new WorkspaceValidationError('Invalid controls.')
  const initial = createWorkspace().controls
  if (
    Object.keys(value).length !== Object.keys(initial).length ||
    Object.keys(value).some((key) => !Object.hasOwn(initial, key))
  ) {
    throw new WorkspaceValidationError('Unknown control fields.')
  }
  for (const key of ['running', 'autoSafety', 'nightMode', 'alerts', 'simulated', 'muted']) {
    if (typeof value[key] !== 'boolean')
      throw new WorkspaceValidationError('Invalid control value.')
  }
  for (const key of ['speed', 'warning', 'danger']) {
    if (!Number.isInteger(value[key]))
      throw new WorkspaceValidationError('Invalid numeric control.')
  }
  const { speed, warning, danger, timerEnd } = value as Controls
  if (
    speed < 0 ||
    speed > 100 ||
    warning < 50 ||
    danger > 1000 ||
    danger - warning < 50 ||
    !['Auto', 'Manual'].includes(String(value.mode)) ||
    !['Never', '15 min', '30 min', '60 min'].includes(String(value.timer)) ||
    (timerEnd !== null && (!Number.isSafeInteger(timerEnd) || timerEnd < 0))
  ) {
    throw new WorkspaceValidationError('Control values are out of range.')
  }
}

export function parseOperations(value: unknown): WorkspaceOperation[] {
  if (!Array.isArray(value) || !value.length || value.length > 64) {
    throw new WorkspaceValidationError('Send between 1 and 64 operations.')
  }
  return value.map((item) => {
    if (!record(item) || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(item.id)) {
      throw new WorkspaceValidationError('Invalid operation identifier.')
    }
    if (item.type === 'controls') {
      if (
        !record(item.patch) ||
        !Object.keys(item.patch).length ||
        Object.keys(item).some((key) => !['id', 'type', 'patch'].includes(key))
      ) {
        throw new WorkspaceValidationError('Invalid control operation.')
      }
      const initial = createWorkspace().controls
      if (Object.keys(item.patch).some((key) => !Object.hasOwn(initial, key))) {
        throw new WorkspaceValidationError('Unknown control field.')
      }
      for (const [key, field] of Object.entries(item.patch)) {
        if (
          ['running', 'autoSafety', 'nightMode', 'alerts', 'simulated', 'muted'].includes(key) &&
          typeof field !== 'boolean'
        )
          throw new WorkspaceValidationError('Invalid boolean control.')
        if (
          ['speed', 'warning', 'danger'].includes(key) &&
          (!Number.isInteger(field) ||
            typeof field !== 'number' ||
            (key === 'speed' && (field < 0 || field > 100)) ||
            (key === 'warning' && (field < 50 || field > 950)) ||
            (key === 'danger' && (field < 100 || field > 1000)))
        ) {
          throw new WorkspaceValidationError('Invalid numeric control.')
        }
        if (key === 'mode' && !['Auto', 'Manual'].includes(String(field))) {
          throw new WorkspaceValidationError('Invalid mode.')
        }
        if (key === 'timer' && !['Never', '15 min', '30 min', '60 min'].includes(String(field))) {
          throw new WorkspaceValidationError('Invalid timer.')
        }
        if (
          key === 'timerEnd' &&
          field !== null &&
          (typeof field !== 'number' || !Number.isSafeInteger(field) || field < 0)
        ) {
          throw new WorkspaceValidationError('Invalid timer value.')
        }
      }
      return { id: item.id, type: 'controls', patch: item.patch as Partial<Controls> }
    }
    if (
      item.type === 'addDevice' &&
      validText(item.name, 40) &&
      Object.keys(item).every((key) => ['id', 'type', 'name'].includes(key))
    ) {
      return { id: item.id, type: 'addDevice', name: item.name.trim() }
    }
    if (
      item.type === 'addEvent' &&
      validText(item.title, 120) &&
      validText(item.detail, 240) &&
      Object.keys(item).every((key) => ['id', 'type', 'title', 'detail'].includes(key))
    ) {
      return { id: item.id, type: 'addEvent', title: item.title.trim(), detail: item.detail.trim() }
    }
    throw new WorkspaceValidationError('Unknown operation.')
  })
}

export function normalizeControls(controls: Controls, now: number): Controls {
  const next = { ...controls }
  if (next.timerEnd !== null && next.timerEnd <= now) {
    next.running = false
    next.timerEnd = null
    next.timer = 'Never'
  }
  if (next.simulated && next.autoSafety && 612 >= next.danger) {
    next.running = true
    next.speed = 100
    next.mode = 'Auto'
    next.timerEnd = null
    next.timer = 'Never'
    next.nightMode = false
  }
  return next
}

export function parseWorkspace(value: unknown): Workspace {
  if (
    !record(value) ||
    value.schemaVersion !== 1 ||
    !Number.isSafeInteger(value.revision) ||
    Number(value.revision) < 0 ||
    !Number.isSafeInteger(value.updatedAt) ||
    Number(value.updatedAt) < 0
  ) {
    throw new WorkspaceValidationError('Unsupported workspace format.')
  }
  const controls = record(value.controls)
    ? { ...value.controls, timerEnd: value.controls.timerEnd ?? null }
    : value.controls
  assertControls(controls)
  const devices = value.devices ?? []
  const events = value.events ?? []
  const appliedIds = value.appliedIds ?? []
  if (
    !Array.isArray(devices) ||
    devices.length > 32 ||
    !devices.every(
      (item) =>
        record(item) &&
        validText(item.id, 80) &&
        validText(item.name, 40) &&
        validText(item.model, 100) &&
        ['devices', 'wind', 'thermometer'].includes(String(item.icon)) &&
        validText(item.value, 40) &&
        validText(item.status, 30),
    )
  ) {
    throw new WorkspaceValidationError('Invalid device list.')
  }
  if (
    !Array.isArray(events) ||
    events.length > 100 ||
    !events.every(
      (item) =>
        record(item) &&
        validText(item.id, 80) &&
        validText(item.title, 120) &&
        validText(item.detail, 240) &&
        validText(item.time, 40) &&
        ['shield', 'wind', 'bell', 'check'].includes(String(item.type)) &&
        ['green', 'blue', 'amber'].includes(String(item.tone)),
    )
  ) {
    throw new WorkspaceValidationError('Invalid activity list.')
  }
  if (
    !Array.isArray(appliedIds) ||
    appliedIds.length > 256 ||
    !appliedIds.every((id) => typeof id === 'string' && id.length <= 80)
  ) {
    throw new WorkspaceValidationError('Invalid operation history.')
  }
  return {
    schemaVersion: 1,
    revision: Number(value.revision),
    updatedAt: Number(value.updatedAt),
    controls: { ...controls },
    devices: devices as DemoDevice[],
    events: events as Activity[],
    appliedIds,
  }
}

export function applyOperations(
  previous: Workspace,
  operations: WorkspaceOperation[],
  now: number,
): Workspace {
  const next: Workspace = {
    ...previous,
    controls: { ...previous.controls },
    devices: [...previous.devices],
    events: [...previous.events],
    appliedIds: [...previous.appliedIds],
  }
  let changed = false
  for (const operation of operations) {
    if (next.appliedIds.includes(operation.id)) continue
    changed = true
    if (operation.type === 'controls') {
      if (
        typeof operation.patch.timerEnd === 'number' &&
        operation.patch.timerEnd > now + 86_400_000
      ) {
        throw new WorkspaceValidationError('Simulation timers cannot exceed 24 hours.')
      }
      if (
        previous.controls.simulated &&
        previous.controls.autoSafety &&
        previous.controls.danger <= 612 &&
        operation.patch.autoSafety === false
      ) {
        throw new WorkspaceValidationError('End the safety test before disabling automatic safety.')
      }
      next.controls = { ...next.controls, ...operation.patch }
    } else if (operation.type === 'addDevice') {
      if (!next.devices.some((device) => device.id === operation.id)) {
        if (next.devices.length >= 32)
          throw new WorkspaceValidationError('Maximum of 32 demo devices.')
        next.devices.push({
          id: operation.id,
          name: operation.name,
          model: `Demo sensor · ${operation.id.slice(-8)}`,
          icon: 'devices',
          value: '32 ppm',
          status: 'Online',
        })
      }
    } else if (!next.events.some((event) => event.id === operation.id)) {
      next.events.unshift({
        id: operation.id,
        title: operation.title,
        detail: operation.detail,
        time: new Date(now).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
        }),
        type: 'check',
        tone: 'green',
      })
      next.events = next.events.slice(0, 100)
    }
    next.appliedIds.push(operation.id)
  }
  assertControls(next.controls)
  const normalized = normalizeControls(next.controls, now)
  if (JSON.stringify(normalized) !== JSON.stringify(next.controls)) changed = true
  next.controls = normalized
  next.appliedIds = next.appliedIds.slice(-256)
  if (changed) {
    next.revision = previous.revision + 1
    next.updatedAt = now
  }
  return next
}
