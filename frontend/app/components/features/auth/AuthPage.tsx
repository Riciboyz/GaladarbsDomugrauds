'use client'

import { useState } from 'react'
import { useUser } from '../../contexts/UserContext'
import { useThread } from '../../contexts/ThreadContext'
import { useToast } from '../../contexts/ToastContext'
import { 
  EyeIcon, 
  EyeSlashIcon, 
  UserIcon, 
  EnvelopeIcon, 
  LockClosedIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

export default function AuthPage() {
  const { setUser } = useUser()
  const { loadThreadsFromAPI } = useThread()
  const { success, error: showError } = useToast()
  
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    displayName: '',
    bio: ''
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [devShownCode, setDevShownCode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setLoading(true)

    if (!formData.email || !formData.password) {
      setErrorMessage('E-pasts un parole ir obligāti')
      setLoading(false)
      return
    }

    if (!isLogin && (!formData.username || !formData.displayName)) {
      setErrorMessage('Lietotājvārds un redzamais vārds ir obligāti')
      setLoading(false)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setErrorMessage('Ievadi derīgu e-pasta adresi')
      setLoading(false)
      return
    }

    if (!isLogin) {
      const pwd = formData.password
      const errors: string[] = []
      if (pwd.length < 8) errors.push('vismaz 8 rakstzīmes')
      if (!/[A-Z]/.test(pwd)) errors.push('vienu lielo burtu')
      if (!/[a-z]/.test(pwd)) errors.push('vienu mazo burtu')
      if (!/[0-9]/.test(pwd)) errors.push('vienu ciparu')
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd)) {
        errors.push('vienu speciālo simbolu (piem. ! @ # $ %)')
      }
      if (errors.length) {
        setErrorMessage(`Parolē jābūt ${errors.join(', ')}.`)
        setLoading(false)
        return
      }
    } else if (formData.password.length < 6) {
      setErrorMessage('Parolei jābūt vismaz 6 rakstzīmes garai')
      setLoading(false)
      return
    }

    try {
      const endpoint = isLogin ? `/api/auth/login` : `/api/auth/register`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok && data.twoFactorRequired) {
        setTwoFactorRequired(true)
        if (data.devCode) {
          setDevShownCode(String(data.devCode))
          success('2FA (DEV)', 'Ievadi ekrānā redzamo kodu.')
        } else {
          setDevShownCode('')
          success('2FA', 'Mēs nosūtījām kodu uz tavu e‑pastu.')
        }
        return
      }

      if (response.ok) {
        setUser(data.user)
        await loadThreadsFromAPI()
        success('Laipni lūgts!', 'Tu esi veiksmīgi pieslēdzies.')
      } else {
        setErrorMessage(data.error || 'Radās kļūda')
        showError('Pieslēgšanās neizdevās', data.error || 'Radās kļūda')
      }
    } catch (error) {
      console.error('Auth error:', error)
      setErrorMessage('Tīkla kļūda. Mēģini vēlreiz.')
      showError('Tīkla kļūda', 'Pārbaudi savienojumu un mēģini vēlreiz.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')
    try {
      const resp = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: formData.email, code: twoFactorCode })
      })
      const data = await resp.json()
      if (resp.ok) {
        setUser(data.user)
        await loadThreadsFromAPI()
        setTwoFactorRequired(false)
        setTwoFactorCode('')
        success('Laipni lūgts!', 'Tu esi veiksmīgi pieslēdzies.')
      } else {
        setErrorMessage(data.error || 'Nederīgs kods')
        showError('2FA neizdevās', data.error || 'Nederīgs kods')
      }
    } catch (err) {
      setErrorMessage('Tīkla kļūda. Mēģini vēlreiz.')
      showError('Tīkla kļūda', 'Pārbaudi savienojumu un mēģini vēlreiz.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Ultra-Minimal Logo */}
          <div className="text-center mb-8">
            <div
              className="w-12 h-12 bg-accent text-accent-fg rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ width: 48, height: 48 }}
            >
              <ChatBubbleLeftRightIcon className="w-6 h-6" style={{ width: 24, height: 24 }} />
            </div>
            <h1 className="text-2xl font-bold text-ink mb-2">DomuGrauds</h1>
            <p className="text-ink-muted">Dalies ar savām domām, sazinies ar citiem</p>
          </div>

          {/* Ultra-Clean Auth Form */}
          <div className="bg-surface-2 rounded-xl shadow-lg border border-border-ui">
            <div className="p-8">
              {/* Ultra-Minimal Tabs */}
              <div className="flex mb-8 bg-surface p-1 rounded-lg">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all duration-200 ${
                    isLogin
                      ? 'bg-surface-2 text-ink shadow-sm'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Pieslēgties
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all duration-200 ${
                    !isLogin
                      ? 'bg-surface-2 text-ink shadow-sm'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Reģistrēties
                </button>
              </div>

              {/* Ultra-Clean Form */}
              {!twoFactorRequired ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">
                    E-pasta adrese
                  </label>
                  <div className="relative">
                    <EnvelopeIcon
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ink-muted/70"
                      style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16 }}
                    />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-surface-2 border border-border-ui rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-ink placeholder-ink-muted/70 text-sm"
                      placeholder="Ievadi e-pastu"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">
                    Parole
                  </label>
                  <div className="relative">
                    <LockClosedIcon
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ink-muted/70"
                      style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16 }}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-10 pr-10 py-3 bg-surface-2 border border-border-ui rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-ink placeholder-ink-muted/70 text-sm"
                      placeholder="Ievadi paroli"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ink-muted/70 hover:text-ink transition-colors duration-200"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-4 h-4" style={{ width: 16, height: 16 }} />
                      ) : (
                        <EyeIcon className="w-4 h-4" style={{ width: 16, height: 16 }} />
                      )}
                    </button>
                  </div>
                  {!isLogin && (
                    <ul className="mt-2 space-y-1 text-xs">
                      {[
                        { label: 'Vismaz 8 rakstzīmes', ok: formData.password.length >= 8 },
                        { label: 'Viens lielais burts (A-Z)', ok: /[A-Z]/.test(formData.password) },
                        { label: 'Viens mazais burts (a-z)', ok: /[a-z]/.test(formData.password) },
                        { label: 'Viens cipars (0-9)', ok: /[0-9]/.test(formData.password) },
                        { label: 'Viens speciālais simbols (! @ # $ % ...)', ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(formData.password) },
                      ].map((rule) => (
                        <li
                          key={rule.label}
                          className={`flex items-center space-x-2 ${rule.ok ? 'text-emerald-500' : 'text-ink-muted'}`}
                        >
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full ${rule.ok ? 'bg-emerald-500' : 'bg-border-ui'}`}
                          />
                          <span>{rule.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Registration Fields */}
                {!isLogin && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-2">
                        Lietotājvārds
                      </label>
                      <div className="relative">
                        <UserIcon
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ink-muted/70"
                          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16 }}
                        />
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 bg-surface-2 border border-border-ui rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-ink placeholder-ink-muted/70 text-sm"
                          placeholder="Izvēlies lietotājvārdu"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ink mb-2">
                        Redzamais vārds
                      </label>
                      <input
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                        className="w-full px-4 py-3 bg-surface-2 border border-border-ui rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-ink placeholder-ink-muted/70 text-sm"
                        placeholder="Tavs redzamais vārds"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ink mb-2">
                        Bio (neobligāti)
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        className="w-full px-4 py-3 bg-surface-2 border border-border-ui rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-ink placeholder-ink-muted/70 text-sm resize-none h-20"
                        placeholder="Pastāsti nedaudz par sevi..."
                      />
                    </div>
                  </>
                )}

                {/* Ultra-Minimal Error Message */}
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{errorMessage}</p>
                  </div>
                )}

                {/* Ultra-Clean Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent text-accent-fg py-3 px-4 rounded-lg font-medium hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {loading ? 'Lūdzu uzgaidi...' : (isLogin ? 'Pieslēgties' : 'Izveidot kontu')}
                </button>
              </form>
              ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">
                    Ievadi 6‑ciparu kodu
                  </label>
                  <input
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-ui rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-ink placeholder-ink-muted/70 text-sm"
                    placeholder="123456"
                    maxLength={6}
                    required
                  />
                  {devShownCode && (
                    <p className="mt-2 text-xs text-ink-muted">Kods (parādīts tikai dev režīmā): <span className="font-mono">{devShownCode}</span></p>
                  )}
                </div>
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{errorMessage}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent text-accent-fg py-3 px-4 rounded-lg font-medium hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {loading ? 'Lūdzu uzgaidi...' : 'Apstiprināt kodu'}
                </button>
              </form>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
