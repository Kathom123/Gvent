'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Fan, Icon } from './Visuals'

function LockIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="5" y="10" width="14" height="11" rx="3" />
      <path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" />
    </svg>
  )
}

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/app-auth/session', { cache: 'no-store', signal: controller.signal })
      .then((response) => {
        if (response.ok) window.location.replace('/dashboard')
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setError('')
    setPending(true)
    try {
      const response = await fetch('/api/app-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-GasVent-Request': '1' },
        body: JSON.stringify({ username, password }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'No se pudo iniciar sesión. Inténtalo de nuevo.')
        setPassword('')
        setPending(false)
        requestAnimationFrame(() => passwordRef.current?.focus())
        return
      }
      setPassword('')
      window.location.replace('/dashboard')
    } catch {
      setError('No hay conexión con el servidor. Comprueba tu conexión e inténtalo de nuevo.')
      setPending(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#111514] text-[#e8ece9] selection:bg-[#a2e5ba] selection:text-[#193523]">
      <div className="mx-auto grid min-h-dvh max-w-[1680px] lg:grid-cols-[1.06fr_1fr]">
        <section
          className="relative hidden min-h-dvh flex-col overflow-hidden border-r border-[#303b31] bg-[radial-gradient(ellipse_at_35%_45%,#2d4331_0%,#1a251c_48%,#171d18_100%)] px-12 py-11 lg:flex xl:px-20"
          aria-label="Gvent"
        >
          <div className="relative z-10 flex items-center gap-3 font-['Manrope'] text-[28px] font-extrabold tracking-[-1.4px]">
            <span className="grid size-10 place-items-center rounded-xl bg-[#a2e5ba] text-[#193523]">
              <Icon name="wind" size={27} />
            </span>
            Gvent
          </div>
          <div className="relative z-10 my-auto py-16">
            <h1 className="font-['Manrope'] text-[clamp(38px,3.8vw,58px)] font-medium leading-[1.19] tracking-[-2.5px]">
              Control del aire
              <br />
              <span className="text-[#b0e9bf]">y ventilación</span>
            </h1>
            <div
              className="relative my-12 flex h-[235px] items-center justify-center"
              aria-hidden="true"
            >
              <div className="absolute size-[280px] rounded-full border border-[#a2e5ba]/[.07]" />
              <div className="absolute size-[224px] rounded-full border border-dashed border-[#a2e5ba]/15" />
              <div className="absolute size-[168px] rounded-full border border-[#a2e5ba]/20 bg-[#a2e5ba]/[.035] shadow-[0_0_80px_#a2e5ba0a]" />
              <div className="relative grid size-[110px] place-items-center rounded-full border border-[#7caa85]/30 bg-[#2b4130] text-[#b0e9bf] shadow-[0_10px_60px_#00000025]">
                <Fan running />
              </div>
              <div className="absolute left-3 top-8 grid size-10 place-items-center rounded-xl border border-[#475d49] bg-[#243529] text-[#a2dcb4] shadow-xl xl:left-10">
                <Icon name="shield" size={21} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 border-t border-[#39473a] pt-6">
              {[
                { icon: 'chart' as const, label: 'Monitoreo' },
                { icon: 'wind' as const, label: 'Ventilación' },
                { icon: 'bolt' as const, label: 'Automatización' },
              ].map((item) => (
                <div key={item.label} className="text-[#8fa994]">
                  <Icon name={item.icon} size={18} />
                  <span className="mt-3 block text-[9px]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="relative flex min-h-dvh flex-col px-6 py-8 sm:px-12 lg:px-14 lg:py-11 xl:px-20">
          <div className="flex items-center justify-between lg:justify-end">
            <div className="flex items-center gap-2 font-['Manrope'] text-xl font-extrabold tracking-[-1px] lg:hidden">
              <span className="grid size-8 place-items-center rounded-[10px] bg-[#a2e5ba] text-[#193523]">
                <Icon name="wind" size={23} />
              </span>
              Gvent
            </div>
          </div>
          <div className="mx-auto my-auto w-full max-w-[380px] animate-[appear_.5s_ease_both] py-14 sm:py-20">
            <span className="mb-7 grid size-12 place-items-center rounded-[14px] border border-[#3d5141] bg-[#27382b] text-[#acdfba]">
              <LockIcon size={23} />
            </span>
            <h2 className="font-['Manrope'] text-[31px] font-medium leading-tight tracking-[-1.2px] sm:text-[35px]">
              Iniciar sesión
            </h2>
            <form
              className="mt-9"
              onSubmit={submit}
              aria-label="Iniciar sesión"
              aria-busy={pending}
            >
              <label
                htmlFor="login-username"
                className="mb-2.5 block text-[11px] font-medium text-[#bdcdc0]"
              >
                Nombre de usuario
              </label>
              <div className="relative mb-6">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#6c8373]">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
                  </svg>
                </span>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  required
                  maxLength={80}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value)
                    if (error) setError('')
                  }}
                  placeholder="Escribe tu usuario"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                  disabled={pending}
                  className="h-[49px] w-full rounded-[9px] border border-[#344037] bg-[#191f1b] pr-4 pl-11 text-[12px] text-[#edf5ef] outline-none transition-colors placeholder:text-[#56675c] focus:border-[#8dc69c] focus:ring-3 focus:ring-[#a2e5ba]/[.06] disabled:opacity-60"
                />
              </div>
              <div className="mb-2.5 flex items-center justify-between">
                <label htmlFor="login-password" className="text-[11px] font-medium text-[#bdcdc0]">
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#6c8373]">
                  <LockIcon size={17} />
                </span>
                <input
                  ref={passwordRef}
                  id="login-password"
                  name="password"
                  type="password"
                  required
                  maxLength={256}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (error) setError('')
                  }}
                  placeholder="Escribe tu contraseña"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                  disabled={pending}
                  className="h-[49px] w-full rounded-[9px] border border-[#344037] bg-[#191f1b] pr-4 pl-11 text-[12px] text-white caret-white outline-none transition-colors placeholder:text-[#56675c] focus:border-[#8dc69c] focus:ring-3 focus:ring-[#a2e5ba]/[.06] disabled:opacity-60 [-webkit-text-security:disc]"
                />
              </div>
              <div className="min-h-14 py-3">
                {error ? (
                  <p
                    id="login-error"
                    role="alert"
                    className="flex items-start gap-2 text-[10px] leading-5 text-[#efb4a5]"
                  >
                    <span className="mt-0.5 shrink-0">
                      <Icon name="bell" size={13} />
                    </span>
                    {error}
                  </p>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={pending}
                className="flex h-[48px] w-full items-center justify-center gap-2.5 rounded-[9px] border border-[#b1edc4] bg-[#a2e5ba] text-[12px] font-semibold text-[#1b3523] shadow-[0_3px_12px_#a2e5ba08] transition hover:bg-[#b9f0cc] active:translate-y-px disabled:cursor-wait disabled:opacity-70"
              >
                {pending ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-[#254d32]/25 border-t-[#254d32]" />
                    Verificando…
                  </>
                ) : (
                  <>
                    Iniciar sesión
                    <Icon name="arrow" size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}
