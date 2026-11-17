'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { exportCsvToAndroid, subscribeToAndroidExports } from './androidBridge'
import { useWorkspace } from './useWorkspace'

import { FanIndicator, Icon, type IconName } from './Visuals'

const translations = {
  es: {
    Overview: 'Vista general',
    Devices: 'Dispositivos',
    History: 'Historial',
    Automations: 'Automatizaciones',
    Settings: 'Configuración',
    myHome: 'Mi hogar',
    personalWorkspace: 'Espacio de trabajo personal',
    workspace: 'Espacio de trabajo',
    helpSupport: 'Ayuda y soporte',
    homeAdmin: 'Administrador del hogar',
    simulation: 'Simulación',
    notifications: 'Notificaciones',
    notificationsTitle: 'Notificaciones',
    allCaughtUp: 'Estás al día.',
    markAllRead: 'Marcar todo como leído',
    allReadMsg: 'Todas las notificaciones marcadas como leídas.',
    addDevice: 'Agregar dispositivo',
    connectedDevices: 'Dispositivos conectados',
    manageDevices: 'Administrar dispositivos',
    device: 'DISPOSITIVO',
    reading: 'LECTURA',
    status: 'ESTADO',
    running: 'En ejecución',
    standby: 'En espera',
    recentActivity: 'Actividad reciente',
    viewAll: 'Ver todo',
    export: 'Exportar',
    gasHistory: 'Historial de concentración de gas',
    historyPeriod: 'Periodo del historial',
    h24: '24 horas',
    d7: '7 días',
    d30: '30 días',
    exportCsv: 'Exportar CSV de actividad',
    safetyFirst: 'La seguridad es primero',
    safetyDesc: (d: number) => `Cuando el gas supere ${d} ppm, se activará la ventilación máxima y se bloquearán los controles manuales.`,
    autoSafetyVent: 'Ventilación automática de seguridad',
    autoSafetyDesc: 'Anula la configuración manual durante una alerta de gas.',
    endSafetyTestAlert: 'Finaliza la prueba de seguridad antes de cambiar esta configuración.',
    runSafetyTest: 'Ejecutar prueba de seguridad',
    endSafetyTest: 'Finalizar prueba de seguridad',
    simulatedAlertDetected: 'Alerta de gas simulada detectada',
    safetyTestStarted: '612 ppm · Prueba de seguridad iniciada',
    simulatedNote: 'Las pruebas usan lecturas simuladas únicamente, no tu hardware físico.',
    quieterEvening: 'Una tarde más silenciosa',
    quieterDesc: 'Configura el ventilador de demostración al 25% para una ventilación más silenciosa. Las alertas de seguridad siempre tienen prioridad.',
    quietMode: 'Modo silencioso',
    quietModeDesc1: 'Ventilación manual a baja velocidad activa.',
    quietModeDesc2: 'Reducir velocidad del ventilador al 25%.',
    quietAlertWarning: 'El modo silencioso no está disponible durante una alerta de seguridad.',
    quietModeOn: 'El modo silencioso está activado. Ventilador funcionando al 25%.',
    quietModeOff: 'Activa el modo silencioso cuando necesites un poco de calma.',
    gasThresholds: 'Umbrales de gas',
    gasThresholdsDesc: 'Ajusta cuándo debe alertarte tu espacio de trabajo.',
    cautionThreshold: 'Umbral de precaución',
    dangerThreshold: 'Umbral de peligro',
    thresholdsNote: 'Los cambios actualizan la gráfica y la automatización de seguridad al instante. Esta demo no es un servicio de monitoreo de seguridad.',
    systemPreferences: 'Preferencias del sistema',
    inAppNotifications: 'Notificaciones en la app',
    inAppNotificationsDesc: 'Mostrar actualizaciones del sistema en el centro de notificaciones.',
    sensorCalibration: 'Calibración del sensor',
    sensorCalibrationDesc: 'Mantén el sensor en aire limpio durante la calibración.',
    recalibrateSensor: 'Recalibrar sensor',
    calibratingSensor: 'Calibrando sensor de demostración…',
    calibrationReady: 'Calibración de demostración completa. El sensor está listo.',
    firebaseNote: 'Los cambios se comparten mediante Firebase.',
    appLanguage: 'Idioma de la aplicación',
    appLanguageDesc: 'Selecciona el idioma de la interfaz del sistema.',
    spanish: 'Español',
    english: 'English',
    noHardware: 'Sin hardware conectado',
    logout: 'Cerrar sesión',
    loggingOut: 'Cerrando sesión…',
  },
  en: {
    Overview: 'Overview',
    Devices: 'Devices',
    History: 'History',
    Automations: 'Automations',
    Settings: 'Settings',
    myHome: 'My home',
    personalWorkspace: 'Personal workspace',
    workspace: 'Workspace',
    helpSupport: 'Help & support',
    homeAdmin: 'Home administrator',
    simulation: 'Simulation',
    notifications: 'Notifications',
    notificationsTitle: 'Notifications',
    allCaughtUp: 'You’re all caught up.',
    markAllRead: 'Mark all as read',
    allReadMsg: 'All notifications marked as read.',
    addDevice: 'Add device',
    connectedDevices: 'Connected devices',
    manageDevices: 'Manage devices',
    device: 'DEVICE',
    reading: 'READING',
    status: 'STATUS',
    running: 'Running',
    standby: 'Standby',
    recentActivity: 'Recent activity',
    viewAll: 'View all',
    export: 'Export',
    gasHistory: 'Gas concentration history',
    historyPeriod: 'History period',
    h24: '24 hours',
    d7: '7 days',
    d30: '30 days',
    exportCsv: 'Export activity CSV',
    safetyFirst: 'Safety comes first',
    safetyDesc: (d: number) => `When gas exceeds ${d} ppm, activate maximum ventilation and lock manual controls.`,
    autoSafetyVent: 'Automatic safety ventilation',
    autoSafetyDesc: 'Overrides manual settings during a gas alert.',
    endSafetyTestAlert: 'End the safety test before changing this setting.',
    runSafetyTest: 'Run a safety test',
    endSafetyTest: 'End safety test',
    simulatedAlertDetected: 'Simulated gas alert detected',
    safetyTestStarted: '612 ppm · Safety test started',
    simulatedNote: 'Tests use simulated readings only, not your physical hardware.',
    quieterEvening: 'A quieter evening',
    quieterDesc: 'Set the demo fan to a gentle 25% for quieter ventilation. Safety alerts always take priority.',
    quietMode: 'Quiet mode',
    quietModeDesc1: 'Low-speed manual ventilation is active.',
    quietModeDesc2: 'Reduce fan speed to 25%.',
    quietAlertWarning: 'Quiet mode is unavailable during a safety alert.',
    quietModeOn: 'Quiet mode is on. Fan running at 25%.',
    quietModeOff: 'Turn on quiet mode whenever you need a little calm.',
    gasThresholds: 'Gas thresholds',
    gasThresholdsDesc: 'Fine-tune when your workspace should alert you.',
    cautionThreshold: 'Caution threshold',
    dangerThreshold: 'Danger threshold',
    thresholdsNote: 'Thresholds update the chart and safety automation instantly. This demo is not a safety monitoring service.',
    systemPreferences: 'System preferences',
    inAppNotifications: 'In-app notifications',
    inAppNotificationsDesc: 'Show system updates in the notification center.',
    sensorCalibration: 'Sensor calibration',
    sensorCalibrationDesc: 'Keep the sensor in clean air during calibration.',
    recalibrateSensor: 'Recalibrate sensor',
    calibratingSensor: 'Calibrating demo sensor…',
    calibrationReady: 'Demo calibration complete. Sensor is ready.',
    firebaseNote: 'Changes are shared via Firebase.',
    appLanguage: 'App language',
    appLanguageDesc: 'Select interface language.',
    spanish: 'Español',
    english: 'English',
    noHardware: 'No hardware connected',
    logout: 'Log out',
    loggingOut: 'Logging out…',
  }
}

function App({ displayName }: { displayName: string }) {
  const [lang, setLang] = useState<'es' | 'en'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('gvent-language') as 'es' | 'en') || 'es'
    }
    return 'es'
  })
  const t = translations[lang]

  const navigation: { label: string; key: string; icon: IconName }[] = [
    { label: t.Overview, key: 'Overview', icon: 'grid' },
    { label: t.Devices, key: 'Devices', icon: 'devices' },
    { label: t.History, key: 'History', icon: 'chart' },
    { label: t.Automations, key: 'Automations', icon: 'bolt' },
    { label: t.Settings, key: 'Settings', icon: 'settings' },
  ]

  const { workspace, setters, addDevice, addActivity, syncStatus, syncError, lastSyncAt, retry } =
    useWorkspace()
  const { devices, events, controls } = workspace
  const {
    mode,
    speed,
    running,
    timer,
    timerEnd,
    warning,
    danger,
    autoSafety,
    nightMode,
    alerts,
    simulated,
    muted,
  } = controls
  const {
    setMode,
    setSpeed,
    setRunning,
    setTimer,
    setTimerEnd,
    setWarning,
    setDanger,
    setAutoSafety,
    setNightMode,
    setAlerts,
    setSimulated,
    setMuted,
  } = setters
  const [page, setPage] = useState('Overview')
  const [room, setRoom] = useState('Kitchen')
  const [period, setPeriod] = useState('24 hours')
  const [modal, setModal] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [notifications, setNotifications] = useState(false)
  const [deviceName, setDeviceName] = useState('')
  const [calibrating, setCalibrating] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const gas = simulated ? 612 : room === 'Kitchen' ? 42 : room === 'Living room' ? 28 : 35
  const hazard = gas >= danger
  const caution = !hazard && gas >= warning
  function notify(message: string) {
    setToast(message)
  }

  // 🔧 Helper central: traduce las habitaciones (clave estable → etiqueta visible)
  function getRoomLabel(r: string) {
    if (r === 'Kitchen') return lang === 'es' ? 'Cocina' : 'Kitchen'
    if (r === 'Living room') return lang === 'es' ? 'Sala' : 'Living room'
    if (r === 'Garage') return lang === 'es' ? 'Garaje' : 'Garage'
    return r
  }

  async function signOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      const response = await fetch('/api/app-auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-GasVent-Request': '1' },
        body: '{}',
      })
      if (!response.ok) throw new Error('Logout failed')
      window.location.replace('/')
    } catch {
      notify(lang === 'es' ? 'No se pudo cerrar la sesión. Comprueba tu conexión e inténtalo de nuevo.' : 'Logout failed. Check your connection and try again.')
      setSigningOut(false)
    }
  }
  useEffect(() => {
    const controller = new AbortController()
    const check = () => {
      if (document.visibilityState === 'hidden') return
      fetch('/api/app-auth/session', { cache: 'no-store', signal: controller.signal })
        .then((response) => {
          if (response.status === 401) window.location.replace('/')
        })
        .catch(() => {})
    }
    window.addEventListener('pageshow', check)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    const interval = setInterval(check, 60000)
    return () => {
      controller.abort()
      clearInterval(interval)
      window.removeEventListener('pageshow', check)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])
  function addEvent(title: string, detail: string) {
    addActivity(title, detail)
  }
  useEffect(
    () =>
      subscribeToAndroidExports((status) => {
        const messages = {
          saved: lang === 'es' ? 'Informe de actividad guardado.' : 'Activity report saved.',
          cancelled: lang === 'es' ? 'Exportación cancelada. No se guardó ningún archivo.' : 'Export cancelled. No file was saved.',
          error: lang === 'es' ? 'No se pudo guardar el informe. Inténtalo de nuevo.' : 'The report could not be saved. Please try again.',
          busy: lang === 'es' ? 'Termina la exportación actual antes de iniciar otra.' : 'Finish the current export before starting another.',
        }
        notify(messages[status])
      }),
    [lang],
  )
  useEffect(() => {
    const onAndroidBack = (event: Event) => {
      if (modal) {
        event.preventDefault()
        setModal(null)
      } else if (notifications) {
        event.preventDefault()
        setNotifications(false)
      } else if (page !== 'Overview') {
        event.preventDefault()
        setPage('Overview')
      }
    }
    window.addEventListener('gasvent:back', onAndroidBack)
    return () => window.removeEventListener('gasvent:back', onAndroidBack)
  }, [modal, notifications, page])
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(''), 4000)
    return () => clearTimeout(id)
  }, [toast])
  useEffect(() => {
    if (!timerEnd || (hazard && autoSafety)) return
    const id = setTimeout(
      () => {
        setRunning(false)
        setTimerEnd(null)
        setTimer('Never')
        notify(lang === 'es' ? 'Apagado programado completo. Ventilación detenida.' : 'Scheduled shutdown complete. Ventilation stopped.')
      },
      Math.max(0, timerEnd - Date.now()),
    )
    return () => clearTimeout(id)
  }, [timerEnd, hazard, autoSafety, lang])
  useEffect(() => {
    if (hazard && autoSafety) {
      setRunning(true)
      setSpeed(100)
      setMode('Auto')
      setTimerEnd(null)
      setTimer('Never')
      setNightMode(false)
    }
  }, [hazard, autoSafety])
  useEffect(() => {
    if (!modal) return
    closeRef.current?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModal(null)
      if (e.key === 'Tab') {
        const dialog = document.querySelector('[role="dialog"]')
        const controls = dialog?.querySelectorAll<HTMLElement>('button, input, select, a[href]')
        if (controls?.length) {
          const first = controls[0],
            last = controls[controls.length - 1]
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault()
            last.focus()
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [modal])
  function changeSpeed(value: number) {
    if (hazard && autoSafety) return notify(lang === 'es' ? 'La ventilación automática de seguridad está activa.' : 'Automatic safety ventilation is active.')
    setSpeed(value)
    setRunning(value > 0)
    setMode('Manual')
  }
  function toggleFan() {
    if (hazard && autoSafety) return notify(lang === 'es' ? 'El ventilador no se puede detener durante una alerta de gas.' : 'Fan cannot be stopped during a gas alert.')
    setRunning(!running)
    setMode('Manual')
    if (!running && !speed) setSpeed(45)
    addEvent(
      running ? (lang === 'es' ? 'Ventilación detenida manualmente' : 'Ventilation stopped manually') : (lang === 'es' ? 'Ventilación iniciada manualmente' : 'Ventilation started manually'),
      // 🔧 Usamos getRoomLabel para que el detalle quede limpio en el idioma activo
      `${getRoomLabel(room)} · ${lang === 'es' ? 'Control manual' : 'Manual control'}`,
    )
  }
  function exportData() {
    const rows = [
      'Time,Event,Details',
      ...events.map((e) =>
        [e.time, e.title, e.detail].map((v) => `"${v.replace(/"/g, '""')}"`).join(','),
      ),
    ]
    const csv = rows.join('\n')
    try {
      if (exportCsvToAndroid(csv)) return
    } catch {
      notify(lang === 'es' ? 'No se pudo iniciar la exportación en Android. Inténtalo de nuevo.' : 'The Android export could not be started. Please try again.')
      return
    }
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'Gvent-activity.csv'
    link.click()
    URL.revokeObjectURL(url)
    notify(lang === 'es' ? 'Informe de actividad exportado.' : 'Activity report exported.')
  }

  function getDeviceName(name: string) {
    if (lang === 'en') return name
    const map: Record<string, string> = {
      'Gas sensor': 'Sensor de gas',
      'Ventilation fan': 'Ventilador de ventilación',
      'Climate sensor': 'Sensor de clima',
    }
    return map[name] || name
  }

  function getDeviceStatus(status: string) {
    if (lang === 'en') return status
    const map: Record<string, string> = {
      Online: 'En línea',
      Offline: 'Desconectado',
      Running: 'En ejecución',
      Standby: 'En espera',
    }
    return map[status] || status
  }

  // 🔧 Título del modal centralizado y traducido
  function getModalTitle(m: string) {
    if (m === 'Add device') return t.addDevice
    if (m === 'Help & support') return t.helpSupport
    if (m === 'Your home') return t.myHome
    if (m === 'Demo workspace') return t.personalWorkspace
    return getDeviceName(m)
  }

  // 🔧 Traducción de marcas de tiempo relativas (bidireccional + patrones dinámicos)
  function getEventTime(time: string) {
    if (!time) return time
    if (lang === 'es') {
      // English → Spanish
      if (/^just now$/i.test(time)) return 'Ahora mismo'
      const m = time.match(/^(\d+)\s*(min|hr|hour|hours?)\s*ago$/i)
      if (m) {
        const n = m[1]
        const unit = m[2].toLowerCase()
        if (unit === 'min') return `Hace ${n} min`
        return `Hace ${n} h`
      }
      // Fixed mappings
      const fixedEnToEs: Record<string, string> = {
        'A moment ago': 'Hace un momento',
        '1 minute ago': 'Hace 1 min',
        '1 hour ago': 'Hace 1 h',
        'Yesterday': 'Ayer',
      }
      return fixedEnToEs[time] || time
    } else {
      // Spanish → English
      if (/^ahora mismo$/i.test(time)) return 'Just now'
      if (/^hace un momento$/i.test(time)) return 'A moment ago'
      if (/^ayer$/i.test(time)) return 'Yesterday'
      const m = time.match(/^hace\s*(\d+)\s*(min|h|hora|horas?)$/i)
      if (m) {
        const n = m[1]
        const unit = m[2].toLowerCase()
        if (unit === 'min') return `${n} min ago`
        return `${n} hr ago`
      }
      const fixedEsToEn: Record<string, string> = {
        'Hace 1 min': '1 min ago',
        'Hace 1 h': '1 hr ago',
        'Hace un momento': 'A moment ago',
      }
      return fixedEsToEn[time] || time
    }
  }

  function getEventTitle(title: string) {
    if (lang === 'es') {
      const map: Record<string, string> = {
        'Air quality is back to normal': 'Calidad del aire volvió a la normalidad',
        'Ventilation adjusted automatically': 'Ventilación ajustada automáticamente',
        'Elevated gas level detected': 'Nivel elevado de gas detectado',
        'Ventilation stopped manually': 'Ventilación detenida manualmente',
        'Ventilation started manually': 'Ventilación iniciada manualmente',
        'Simulated gas alert detected': 'Alerta de gas simulada detectada',
        'Demo device added': 'Dispositivo de demo agregado',
        'Demo sensor calibrated': 'Sensor de demo calibrado',
      }
      return map[title] || title
    } else {
      const map: Record<string, string> = {
        'Calidad del aire volvió a la normalidad': 'Air quality is back to normal',
        'Ventilación ajustada automáticamente': 'Ventilation adjusted automatically',
        'Nivel elevado de gas detectado': 'Elevated gas level detected',
        'Ventilación detenida manualmente': 'Ventilation stopped manually',
        'Ventilación iniciada manualmente': 'Ventilation started manually',
        'Alerta de gas simulada detectada': 'Simulated gas alert detected',
        'Dispositivo de demo agregado': 'Demo device added',
        'Sensor de demo calibrado': 'Demo sensor calibrated',
      }
      return map[title] || title
    }
  }

  function getEventDetail(detail: string) {
    if (lang === 'es') {
      const map: Record<string, string> = {
        'Gas level dropped below 50 ppm': 'El nivel de gas cayó por debajo de 50 ppm',
        'Fan speed set to 45%': 'Velocidad del ventilador al 45%',
        '128 ppm · Ventilation activated': '128 ppm · Ventilación activada',
        '612 ppm · Safety test started': '612 ppm · Prueba de seguridad iniciada',
        'Kitchen · Control manual': 'Cocina · Control manual',
        'Living room · Control manual': 'Sala · Control manual',
        'Garage · Control manual': 'Garaje · Control manual',
        'Kitchen · Manual control': 'Cocina · Control manual',
        'Living room · Manual control': 'Sala · Control manual',
        'Garage · Manual control': 'Garaje · Control manual',
        'Calibración completada con éxito': 'Calibración completada con éxito',
        'Calibration completed successfully': 'Calibración completada con éxito',
      }
      return (
        map[detail] ||
        detail
          .replace(' · Manual control', ' · Control manual')
          .replace('Kitchen', 'Cocina')
          .replace('Living room', 'Sala')
          .replace('Garage', 'Garaje')
      )
    } else {
      const map: Record<string, string> = {
        'El nivel de gas cayó por debajo de 50 ppm': 'Gas level dropped below 50 ppm',
        'Velocidad del ventilador al 45%': 'Fan speed set to 45%',
        'Velocidad del ventilador establecida al 45%': 'Fan speed set to 45%',
        '128 ppm · Ventilación activada': '128 ppm · Ventilation activated',
        '612 ppm · Prueba de seguridad iniciada': '612 ppm · Safety test started',
        'Cocina · Control manual': 'Kitchen · Manual control',
        'Sala · Control manual': 'Living room · Manual control',
        'Garaje · Control manual': 'Garage · Manual control',
        'Calibración completada con éxito': 'Calibration completed successfully',
      }
      return (
        map[detail] ||
        detail
          .replace(' · Control manual', ' · Manual control')
          .replace('Cocina', 'Kitchen')
          .replace('Sala', 'Living room')
          .replace('Garaje', 'Garage')
      )
    }
  }

  const deviceSection = (
    <section className="panel devices-panel">
      <div className="section-heading">
        <div>
          <h2>
            {t.connectedDevices} <span className="count">{devices.length}</span>
          </h2>
        </div>
        <button
          className="text-button"
          onClick={() => (page === 'Devices' ? setModal('Add device') : setPage('Devices'))}
        >
          {page === 'Devices' ? t.addDevice : t.manageDevices}
          <Icon name="arrow" size={15} />
        </button>
      </div>
      <div className="device-table">
        <div className="table-head">
          <span>{t.device}</span>
          <span>{t.reading}</span>
          <span>{t.status}</span>
          <span />
        </div>
        {devices.map((d, i) => (
          // 🔧 Guardamos el nombre en inglés (clave estable) y traducimos al renderizar
          <button className="device-row" key={d.model} onClick={() => setModal(d.name)}>
            <span className="device-info">
              <span className={`device-icon ${i === 1 ? 'mint-icon' : ''}`}>
                <Icon name={d.icon} />
              </span>
              <span>
                <strong>{getDeviceName(d.name)}</strong>
                <small>{d.model}</small>
              </span>
            </span>
            <span className="reading">
              {i === 0
                ? `${gas} ppm`
                : i === 1
                  ? running
                    ? `${speed}% ${lang === 'es' ? 'velocidad' : 'speed'}`
                    : lang === 'es'
                      ? '0% velocidad'
                      : '0% speed'
                  : d.value}
            </span>
            <span className={`device-status ${i === 1 && !running ? 'idle' : ''}`}>
              <i />
              {i === 1 ? (running ? t.running : t.standby) : getDeviceStatus(d.status)}
            </span>
            <Icon name="chevron" size={16} />
          </button>
        ))}
      </div>
      <div className="device-foot">
        <Icon name="wifi" size={14} />
        <span>
          {lang === 'es' ? 'Conectado a ' : 'Connected to '}<strong>Home_Network</strong>
        </span>
        <span className="signal">
          −58 dBm <span className="signal-bars">▂▄▆</span>
        </span>
      </div>
    </section>
  )
  const activitySection = (
    <section className="panel activity-panel">
      <div className="section-heading">
        <div>
          <h2>{t.recentActivity}</h2>
        </div>
        <button
          className="text-button"
          onClick={() => (page === 'History' ? exportData() : setPage('History'))}
        >
          {page === 'History' ? t.export : t.viewAll}
          <Icon name="arrow" size={15} />
        </button>
      </div>
      <div className="activity-list">
        {events.slice(0, page === 'History' ? events.length : 3).map((event, i) => (
          <div className="activity-item" key={event.title + i}>
            <span className={`activity-icon ${event.tone}`}>
              <Icon name={event.type} size={17} />
            </span>
            <div>
              <strong>{getEventTitle(event.title)}</strong>
              <p>{getEventDetail(event.detail)}</p>
              {/* 🔧 Traducimos la hora relativa según el idioma activo */}
              <small>{getEventTime(event.time)}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault()
            setPage('Overview')
          }}
        >
          <span className="brand-symbol">
            <Icon name="wind" size={26} />
          </span>
          Gvent
        </a>
        <button className="home-switch" onClick={() => setModal('Your home')}>
          <span className="home-icon">
            <Icon name="home" size={19} />
          </span>
          <span>
            <strong>{t.myHome}</strong>
            <small>{t.personalWorkspace}</small>
          </span>
          <Icon name="chevron" size={14} />
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {navigation.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${page === item.key ? 'active' : ''}`}
              onClick={() => setPage(item.key)}
            >
              <Icon name={item.icon} size={19} />
              {item.label}
              {item.key === 'Devices' && <span className="nav-count">{devices.length}</span>}
              {page === item.key && <span className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item help-link" onClick={() => setModal('Help & support')}>
            <Icon name="help" size={19} />
            {t.helpSupport}
            <Icon name="arrow" size={16} />
          </button>
          <button className="profile" onClick={() => setModal('Demo workspace')}>
            <span className="avatar">{displayName.slice(0, 2).toUpperCase()}</span>
            <span>
              <strong>{displayName}</strong>
              <small>{t.homeAdmin}</small>
            </span>
            <Icon name="settings" size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            {t.workspace}
            <Icon name="chevron" size={13} />
            <span>{typeof t[page as keyof typeof t] === 'string' ? (t[page as keyof typeof t] as string) : page}</span>
          </div>
          <div className="topbar-right">
            <div className="notification-wrap">
              <button
                className={`icon-button ${notifications ? 'selected' : ''}`}
                aria-label="Notifications"
                onClick={() => setNotifications(!notifications)}
              >
                <Icon name="bell" size={20} />
                {alerts && <i />}
              </button>
              {notifications && (
                <div className="notification-popover">
                  <h3>
                    {t.notificationsTitle} <span className="count">{alerts ? 1 : 0}</span>
                  </h3>
                  <p>
                    {alerts
                      ? (lang === 'es' ? 'La comprobación del sistema ha finalizado. Todos los dispositivos están en línea y el aire está limpio.' : 'Your system check is complete. All devices are online and your air is clean.')
                      : t.allCaughtUp}
                  </p>
                  <button
                    className="text-button"
                    onClick={() => {
                      setAlerts(false)
                      setNotifications(false)
                      notify(t.allReadMsg)
                    }}
                  >
                    {t.markAllRead}
                    <Icon name="check" size={15} />
                  </button>
                </div>
              )}
            </div>
            <button
              className="avatar small-avatar"
              onClick={() => setModal('Demo workspace')}
              aria-label="Open profile"
            >
              {displayName.slice(0, 2).toUpperCase()}
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <h1>{typeof t[page as keyof typeof t] === 'string' ? (t[page as keyof typeof t] as string) : page}</h1>
            </div>
            <button className="button primary" onClick={() => setModal('Add device')}>
              <Icon name="plus" size={17} />
              {t.addDevice}
            </button>
          </div>
          <div className="workspace-toolbar">
            <div className="room-tabs">
              {['Kitchen', 'Living room', 'Garage'].map((r) => (
                <button
                  key={r}
                  className={room === r ? 'selected' : ''}
                  onClick={() => {
                    setRoom(r)
                  }}
                >
                  <Icon
                    name={r === 'Kitchen' ? 'home' : r === 'Living room' ? 'grid' : 'devices'}
                    size={15}
                  />
                  {/* 🔧 Reutilizamos getRoomLabel */}
                  {getRoomLabel(r)}
                  {room === r && <i className="status-dot" />}
                </button>
              ))}
            </div>
          </div>
          {page === 'Overview' && (
            <div className="dashboard-grid">
              <section className="panel sensor-panel">
                <div className="section-heading">
                  <div>
                    <span className="badge">
                      <i className={`pulse ${hazard ? 'hazard' : caution ? 'caution' : ''}`} />
                      {hazard ? (lang === 'es' ? 'Peligro' : 'Danger') : caution ? (lang === 'es' ? 'Precaución' : 'Caution') : (lang === 'es' ? 'Normal' : 'Normal')}
                    </span>
                    <h2>{lang === 'es' ? 'Sensor de gas en aire' : 'Air gas sensor'}</h2>
                  </div>
                  <span className="ppm-value">
                    <strong>{gas}</strong> ppm
                  </span>
                </div>
                <div className="sensor-bar">
                  <div
                    className="sensor-fill"
                    style={{ width: `${Math.min(100, (gas / 400) * 100)}%` }}
                  />
                </div>
                <div className="sensor-labels">
                  <span>0 ppm</span>
                  <span>{warning} ppm ({lang === 'es' ? 'Aviso' : 'Caution'})</span>
                  <span>{danger} ppm ({lang === 'es' ? 'Peligro' : 'Danger'})</span>
                </div>
                <div className="fan-control-box">
                  <div className="fan-info">
                    <div className="fan-left">
                      <span
                        className="fan-disc"
                        title={lang === 'es' ? 'Presiona el icono para pausar/activar la animación' : 'Click icon to toggle animation'}
                      >
                        <FanIndicator running={running} speed={speed} />
                      </span>
                      <div>
                        <strong>
                          {running ? `${speed}% ${lang === 'es' ? 'velocidad' : 'speed'}` : (lang === 'es' ? 'Ventilador detenido' : 'Fan stopped')}
                        </strong>
                        <p>
                          {mode === 'Auto' ? (lang === 'es' ? 'Modo automático activo' : 'Automatic mode active') : (lang === 'es' ? 'Control manual' : 'Manual control')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`fan-power-btn ${running ? 'running' : 'stopped'}`}
                      onClick={toggleFan}
                      aria-label={running ? (lang === 'es' ? 'Apagar ventilador' : 'Turn off fan') : (lang === 'es' ? 'Encender ventilador' : 'Turn on fan')}
                      title={running ? (lang === 'es' ? 'Apagar ventilador' : 'Turn off fan') : (lang === 'es' ? 'Encender ventilador' : 'Turn on fan')}
                    >
                      <Icon name="power" size={15} />
                      <span className="power-btn-text">
                        {running ? (lang === 'es' ? 'Apagar' : 'Off') : (lang === 'es' ? 'Encender' : 'On')}
                      </span>
                    </button>
                  </div>
                  <div className="speed-buttons">
                    {[25, 50, 75, 100].map((s) => (
                      <button
                        type="button"
                        key={s}
                        className={`speed-btn ${running && speed === s ? 'selected' : ''}`}
                        onClick={() => changeSpeed(s)}
                      >
                        {s}%
                      </button>
                    ))}
                  </div>
                </div>
              </section>
              {deviceSection}
              {activitySection}
              <section className="panel quick-stats">
                <div className="stat-card">
                  <span className="stat-icon">
                    <Icon name="wind" size={20} />
                  </span>
                  <div>
                    <small>{lang === 'es' ? 'Caudal de aire' : 'Airflow rate'}</small>
                    <strong>{running ? `${Math.round(speed * 3.4)} m³/h` : '0 m³/h'}</strong>
                  </div>
                </div>
                <div className="stat-card">
                  <span className="stat-icon blue">
                    <Icon name="clock" size={20} />
                  </span>
                  <div>
                    <small>{lang === 'es' ? 'Tiempo de actividad' : 'Uptime'}</small>
                    <strong>99.8%</strong>
                  </div>
                </div>
                <div className="stat-card">
                  <span className="stat-icon mint">
                    <Icon name="shield" size={20} />
                  </span>
                  <div>
                    <small>{lang === 'es' ? 'Estado del sistema' : 'System status'}</small>
                    <strong>{lang === 'es' ? 'Protegido' : 'Protected'}</strong>
                  </div>
                </div>
              </section>
            </div>
          )}
          {page === 'Devices' && (
            <div className="devices-full">
              {deviceSection}
            </div>
          )}
          {page === 'History' && (
            <div className="history-layout">
              <section className="panel history-chart">
                <div className="section-heading">
                  <div>
                    <h2>{t.gasHistory}</h2>
                  </div>
                  <select
                    aria-label="History period"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  >
                    <option>{t.h24}</option>
                    <option>{t.d7}</option>
                    <option>{t.d30}</option>
                  </select>
                </div>
                <AirChart period={period} warning={warning} />
                <button className="button secondary" onClick={exportData}>
                  <Icon name="download" size={16} />
                  {t.exportCsv}
                </button>
              </section>
              {activitySection}
            </div>
          )}
          {page === 'Automations' && (
            <div className="settings-grid">
              <section className="panel settings-panel">
                <span className="large-setting-icon">
                  <Icon name="shield" size={27} />
                </span>
                <h2>{t.safetyFirst}</h2>
                <p>{t.safetyDesc(danger)}</p>
                <SettingToggle
                  title={t.autoSafetyVent}
                  description={t.autoSafetyDesc}
                  checked={autoSafety}
                  onChange={() => {
                    if (hazard) return notify(t.endSafetyTestAlert)
                    setAutoSafety(!autoSafety)
                  }}
                />
                <button
                  className="button secondary"
                  onClick={() => {
                    setSimulated(!simulated)
                    if (!simulated)
                      addEvent(t.simulatedAlertDetected, t.safetyTestStarted)
                  }}
                >
                  {' '}
                  {simulated ? t.endSafetyTest : t.runSafetyTest}
                  <Icon name="arrow" size={16} />
                </button>
                <small className="setting-note">
                  {t.simulatedNote}
                </small>
              </section>
              <section className="panel settings-panel">
                <span className="large-setting-icon blue">
                  <Icon name="clock" size={27} />
                </span>
                <h2>{t.quieterEvening}</h2>
                <p>{t.quieterDesc}</p>
                <SettingToggle
                  title={t.quietMode}
                  description={
                    nightMode
                      ? t.quietModeDesc1
                      : t.quietModeDesc2
                  }
                  checked={nightMode}
                  onChange={() => {
                    if (hazard) return notify(t.quietAlertWarning)
                    setNightMode(!nightMode)
                    changeSpeed(nightMode ? 45 : 25)
                  }}
                />
                <div className="note-box">
                  <Icon name="wind" />
                  <p>
                    {nightMode
                      ? t.quietModeOn
                      : t.quietModeOff}
                  </p>
                </div>
              </section>
            </div>
          )}
          {page === 'Settings' && (
            <div className="settings-grid">
              <section className="panel settings-panel">
                <h2>{t.gasThresholds}</h2>
                <p>{t.gasThresholdsDesc}</p>
                <label className="setting-range">
                  {t.cautionThreshold} <strong>{warning} ppm</strong>
                  <input
                    type="range"
                    min="50"
                    max={danger - 50}
                    step="10"
                    value={warning}
                    onChange={(e) => setWarning(+e.target.value)}
                    style={{ '--range-value': `${(warning / danger) * 100}%` } as CSSProperties}
                  />
                </label>
                <label className="setting-range">
                  {t.dangerThreshold} <strong>{danger} ppm</strong>
                  <input
                    type="range"
                    min={warning + 50}
                    max="1000"
                    step="10"
                    value={danger}
                    onChange={(e) => setDanger(+e.target.value)}
                    style={{ '--range-value': `${danger / 10}%` } as CSSProperties}
                  />
                </label>
                <div className="note-box">
                  <Icon name="shield" />
                  <p>{t.thresholdsNote}</p>
                </div>
              </section>
              <section className="panel settings-panel">
                <h2>{t.systemPreferences}</h2>
                <SettingToggle
                  title={t.inAppNotifications}
                  description={t.inAppNotificationsDesc}
                  checked={alerts}
                  onChange={() => setAlerts(!alerts)}
                />
                <div className="calibration" style={{ marginTop: '16px', marginBottom: '16px' }}>
                  <strong>{t.appLanguage}</strong>
                  <p>{t.appLanguageDesc}</p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      className="button secondary"
                      style={{
                        background: lang === 'es' ? 'var(--mint, #a2e5ba)' : undefined,
                        color: lang === 'es' ? '#193523' : undefined,
                        flex: 1
                      }}
                      onClick={() => {
                        setLang('es')
                        localStorage.setItem('gvent-language', 'es')
                      }}
                    >
                      {t.spanish}
                    </button>
                    <button
                      className="button secondary"
                      style={{
                        background: lang === 'en' ? 'var(--mint, #a2e5ba)' : undefined,
                        color: lang === 'en' ? '#193523' : undefined,
                        flex: 1
                      }}
                      onClick={() => {
                        setLang('en')
                        localStorage.setItem('gvent-language', 'en')
                      }}
                    >
                      {t.english}
                    </button>
                  </div>
                </div>
                <div className="calibration">
                  <strong>{t.sensorCalibration}</strong>
                  <p>{t.sensorCalibrationDesc}</p>
                  <button
                    disabled={calibrating}
                    className="button secondary"
                    onClick={() => {
                      setCalibrating(true)
                      setTimeout(() => {
                        setCalibrating(false)
                        addEvent(lang === 'es' ? 'Sensor de demo calibrado' : 'Demo sensor calibrated', lang === 'es' ? 'Calibración completada con éxito' : 'Calibration completed successfully')
                        notify(t.calibrationReady)
                      }, 2500)
                    }}
                  >
                    {calibrating ? t.calibratingSensor : t.recalibrateSensor}
                  </button>
                </div>
                <small className="setting-note">{t.firebaseNote}</small>
              </section>
            </div>
          )}
          <footer className="page-footer">
            <span>Gvent</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <span>
            <Icon name="check" size={17} />
          </span>
          {toast}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={closeRef}
              className="icon-button modal-close"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <Icon name="close" />
            </button>
            <span className="modal-symbol">
              <Icon
                name={
                  modal === 'Add device' ? 'plus' : modal === 'Help & support' ? 'help' : 'devices'
                }
                size={26}
              />
            </span>
            {/* 🔧 Título del modal traducido dinámicamente */}
            <h2 id="dialog-title">{getModalTitle(modal)}</h2>
            {modal === 'Add device' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!deviceName.trim()) return
                  if (!addDevice(deviceName.trim())) return
                  addEvent(lang === 'es' ? 'Dispositivo de demo agregado' : 'Demo device added', deviceName.trim())
                  setDeviceName('')
                  setModal(null)
                  notify(lang === 'es' ? 'Dispositivo de demo agregado a tu espacio de trabajo.' : 'Demo device added to your workspace.')
                }}
              >
                <p>
                  {lang === 'es' ? 'Agrega un sensor simulado para explorar el espacio de trabajo. El emparejamiento de dispositivos físicos no está conectado en esta demo.' : 'Add a simulated sensor to explore the workspace. Physical device pairing is not connected in this demo.'}
                </p>
                <label className="form-label">
                  {lang === 'es' ? 'Nombre del dispositivo' : 'Device name'}
                  <input
                    autoComplete="off"
                    placeholder={lang === 'es' ? 'ej. Sensor de gas del pasillo' : 'e.g. Hallway gas sensor'}
                    required
                    maxLength={40}
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                  />
                </label>
                <button className="button primary" type="submit">
                  <Icon name="plus" size={17} />
                  {t.addDevice}
                </button>
              </form>
            ) : modal === 'Help & support' ? (
              <>
                <p>
                  {lang === 'es' ? 'Gvent te permite monitorear niveles de gas, ajustar la ventilación y probar automatizaciones de seguridad.' : 'Gvent lets you monitor gas levels, adjust ventilation, and test safety automations.'}
                </p>
                <div className="help-content">
                  <h3>{lang === 'es' ? '¿Cómo funciona el modo automático?' : 'How does automatic mode work?'}</h3>
                  <p>
                    {lang === 'es' ? 'El modo automático mantiene el ventilador al 45%. Durante una alerta de peligro simulada, la automatización de seguridad lo ajusta al 100%.' : 'Auto mode keeps the fan at 45%. During a simulated danger alert, safety automation sets it to 100%.'}
                  </p>
                  <h3>{lang === 'es' ? '¿Están mis dispositivos conectados?' : 'Are my devices connected?'}</h3>
                  <p>
                    {lang === 'es' ? 'No. Esta es una demo interactiva con lecturas simuladas. No confíes en ella para la detección real de fugas de gas.' : 'No. This is an interactive demo with simulated readings. Do not rely on it for real gas-leak detection.'}
                  </p>
                </div>
                <button
                  className="button primary"
                  onClick={() => {
                    setModal(null)
                    setPage('Automations')
                  }}
                >
                  {lang === 'es' ? 'Explorar automatizaciones' : 'Explore automations'}
                  <Icon name="arrow" size={16} />
                </button>
              </>
            ) : modal === 'Your home' || modal === 'Demo workspace' ? (
              <div className="user-profile-modal">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <span className="avatar" style={{ width: '48px', height: '48px', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {displayName.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <strong style={{ fontSize: '18px', display: 'block' }}>{displayName}</strong>
                    <small style={{ color: '#88a393' }}>{t.homeAdmin}</small>
                  </div>
                </div>
                <div className="calibration" style={{ marginBottom: '24px' }}>
                  <strong style={{ display: 'block', marginBottom: '8px' }}>{t.appLanguage}</strong>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="button secondary"
                      style={{
                        background: lang === 'es' ? 'var(--mint, #a2e5ba)' : undefined,
                        color: lang === 'es' ? '#193523' : undefined,
                        flex: 1
                      }}
                      onClick={() => {
                        setLang('es')
                        localStorage.setItem('gvent-language', 'es')
                      }}
                    >
                      {t.spanish}
                    </button>
                    <button
                      className="button secondary"
                      style={{
                        background: lang === 'en' ? 'var(--mint, #a2e5ba)' : undefined,
                        color: lang === 'en' ? '#193523' : undefined,
                        flex: 1
                      }}
                      onClick={() => {
                        setLang('en')
                        localStorage.setItem('gvent-language', 'en')
                      }}
                    >
                      {t.english}
                    </button>
                  </div>
                </div>
                <button className="button secondary" style={{ width: '100%', justifyContent: 'center' }} disabled={signingOut} onClick={signOut}>
                  <Icon name="logout" size={16} />
                  {signingOut ? t.loggingOut : t.logout}
                </button>
              </div>
            ) : (
              <>
                {/* 🔧 modal ahora contiene el nombre en inglés (clave estable) */}
                <p>
                  {lang === 'es'
                    ? `Dispositivo de demo conectado en ${getRoomLabel(room)}.`
                    : `Connected demo device in ${getRoomLabel(room)}.`}
                </p>
                <div className="detail-list">
                  <div>
                    <span>{t.status}</span>
                    <strong className="green-text">{getDeviceStatus('Online')}</strong>
                  </div>
                  <div>
                    <span>{lang === 'es' ? 'Red' : 'Network'}</span>
                    <strong>Home_Network</strong>
                  </div>
                  <div>
                    <span>{lang === 'es' ? 'Intensidad de señal' : 'Signal strength'}</span>
                    <strong>−58 dBm</strong>
                  </div>
                  <div>
                    <span>{lang === 'es' ? 'Firmware' : 'Firmware'}</span>
                    <strong>v2.4.0 · {lang === 'es' ? 'Actualizado' : 'Up to date'}</strong>
                  </div>
                  <div>
                    <span>{t.reading}</span>
                    <strong>
                      {modal === 'Gas sensor'
                        ? `${gas} ppm`
                        : modal === 'Ventilation fan'
                          ? `${running ? speed : 0}% ${lang === 'es' ? 'velocidad' : 'speed'}`
                          : modal === 'Climate sensor'
                            ? '24.6 °C'
                            : '32 ppm'}
                    </strong>
                  </div>
                </div>
                <button
                  className="button secondary"
                  onClick={() => {
                    setModal(null)
                    notify(lang === 'es' ? 'Conexión del dispositivo de demo comprobada. El dispositivo está en línea.' : 'Demo device connection checked. Device is online.')
                  }}
                >
                  <Icon name="wifi" size={16} />
                  {lang === 'es' ? 'Comprobar conexión' : 'Check connection'}
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function SettingToggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="setting-toggle">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={title}
        className={`toggle ${checked ? 'on' : ''}`}
        onClick={onChange}
      >
        <span />
      </button>
    </div>
  )
}

function AirChart({ period, warning }: { period: string; warning: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const values =
    period === '24 hours' || period === '24 horas'
      ? [
          28, 31, 27, 29, 24, 26, 34, 33, 40, 34, 38, 29, 34, 26, 24, 34, 36, 128, 76, 46, 52, 47,
          35, 48, 45, 49, 37, 39, 47, 51, 33, 30, 35, 28, 42, 40, 45, 34, 36, 31, 39, 35, 42, 36,
          38, 42, 39, 42,
        ]
      : period === '7 days' || period === '7 días'
        ? [
            35, 42, 48, 35, 25, 75, 104, 49, 37, 44, 35, 41, 28, 61, 81, 51, 43, 32, 40, 62, 90, 54,
            48, 39, 43, 37, 45, 31, 48, 40, 45, 36, 42,
          ]
        : [
            42, 85, 65, 35, 48, 32, 27, 42, 93, 49, 37, 31, 29, 75, 45, 41, 38, 53, 70, 43, 35, 27,
            49, 35, 51, 42, 32, 45, 39, 42,
          ]
  const max = Math.max(300, warning + 50)
  const y = (v: number) => 168 - (v / max) * 148
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 690},${y(v)}`).join(' ')
  const labels =
    period === '24 hours' || period === '24 horas'
      ? ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59']
      : period === '7 days' || period === '7 días'
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : ['Jun 1', 'Jun 5', 'Jun 10', 'Jun 15', 'Jun 20', 'Jun 25', 'Jun 30']
  return (
    <div className="chart-wrap">
      <div className="y-labels">
        {[max, (max * 2) / 3, max / 3, 0].map((v) => (
          <span key={v}>{Math.round(v)}</span>
        ))}
      </div>
      <div className="plot-area" onMouseLeave={() => setHover(null)}>
        <svg
          className="trend-chart"
          viewBox="0 0 690 185"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Demonstration gas readings over ${period}.`}
          onMouseMove={(e) => {
            const box = e.currentTarget.getBoundingClientRect()
            setHover(
              Math.max(
                0,
                Math.min(
                  values.length - 1,
                  Math.round(((e.clientX - box.left) / box.width) * (values.length - 1)),
                ),
              ),
            )
          }}
        >
          <defs>
            <linearGradient id={`area-${period.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#83d8ac" stopOpacity=".23" />
              <stop offset="1" stopColor="#83d8ac" stopOpacity=".005" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((i) => (
            <line
              key={i}
              x1="0"
              x2="690"
              y1={20 + i * 49.3}
              y2={20 + i * 49.3}
              stroke="#293130"
              strokeDasharray="3 5"
            />
          ))}
          <line
            x1="0"
            x2="690"
            y1={y(warning)}
            y2={y(warning)}
            stroke="#a88d57"
            strokeOpacity=".7"
            strokeDasharray="5 5"
          />
          <polygon points={`0,180 ${pts} 690,180`} fill={`url(#area-${period.replace(/\s+/g, '')})`} />
          <polyline
            className="chart-line"
            points={pts}
            fill="none"
            stroke="#88dcad"
            strokeWidth="2.2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {hover !== null && (
            <>
              <line
                x1={(hover / (values.length - 1)) * 690}
                x2={(hover / (values.length - 1)) * 690}
                y1="10"
                y2="180"
                stroke="#b2c3b9"
                strokeDasharray="3 4"
              />
              <circle
                cx={(hover / (values.length - 1)) * 690}
                cy={y(values[hover])}
                r="4"
                fill="#a0edbf"
              />
            </>
          )}
        </svg>
        <span className="threshold-tag" style={{ top: `${(y(warning) / 185) * 100}%` }}>
          Caution · {warning} ppm
        </span>
        {hover !== null && (
          <span
            className="chart-tooltip"
            style={{ left: `${Math.min(84, Math.max(8, (hover / (values.length - 1)) * 100))}%` }}
          >
            {values[hover]} ppm
          </span>
        )}
        <div className="x-labels">
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App