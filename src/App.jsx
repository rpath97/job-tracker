import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  Briefcase,
  CircleCheckBig,
  Cloud,
  ExternalLink,
  LogOut,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { supabase, supabaseConfigured } from './lib/supabase'
import { createJobStore } from './lib/jobStore'
import './index.css'

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', description: 'Roles to review' },
  { id: 'applied', title: 'Applied', description: 'Applications submitted' },
  { id: 'interviews', title: 'Interviews', description: 'Conversations in progress' },
  { id: 'offers', title: 'Offers', description: 'Positive outcomes' },
]

function formatDate(value) {
  if (!value) return 'No date'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function Brand() {
  return (
    <div className="flex items-center gap-4">
      <div className="brand-mark rounded-2xl p-3 text-white"><Briefcase className="h-6 w-6" /></div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-300">Career workspace</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">Job Tracker</h1>
      </div>
    </div>
  )
}

function AuthScreen({ onDemo, authError }) {
  const [mode, setMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async event => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      const result = mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
      if (result.error) {
        setMessage(result.error.message)
      } else if (mode === 'sign-up') {
        setMessage('Account created. Check your email if confirmation is enabled.')
      }
    } catch {
      setMessage('Could not reach the sign-in service. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="app-shell flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <section className="glass-card w-full max-w-xl rounded-[30px] p-7 sm:p-10">
        <Brand />
        <div className="mt-10">
          <h2 className="text-3xl font-bold tracking-tight text-white">{mode === 'sign-in' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="mt-2 text-base text-slate-300">Sign in to keep your applications backed up across devices.</p>
        </div>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
          <input type="email" aria-label="Email address" autoComplete="email" placeholder="Email address" value={email} onChange={event => setEmail(event.target.value)} className="auth-input rounded-2xl px-4 py-4" required />
          <input type="password" aria-label="Password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} placeholder="Password" minLength="6" value={password} onChange={event => setPassword(event.target.value)} className="auth-input rounded-2xl px-4 py-4" required />
          {(message || authError) && <p role="status" className="rounded-xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{message || authError}</p>}
          <button type="submit" disabled={busy} className="primary-btn rounded-2xl py-4 text-base font-bold disabled:opacity-60">{busy ? 'Please wait\u2026' : mode === 'sign-in' ? 'Sign in' : 'Create account'}</button>
        </form>

        <button type="button" disabled={busy} onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setMessage('') }} className="mt-5 w-full text-sm font-semibold text-slate-300 transition hover:text-blue-300">
          {mode === 'sign-in' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
        </button>

        <div className="my-5 flex items-center gap-4 text-xs text-slate-500"><span className="h-px flex-1 bg-white/10" /><span>or</span><span className="h-px flex-1 bg-white/10" /></div>

        <button type="button" disabled={busy} onClick={onDemo} className="secondary-btn w-full rounded-2xl py-3.5 text-sm font-bold">
          Continue as demo
        </button>
      </section>

      <section className="relative z-10 mt-8 grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="feature-chip rounded-2xl p-4 text-center"><Cloud className="mx-auto h-5 w-5 text-cyan-300" /><p className="mt-2 font-semibold text-white">Cloud backup</p><p className="mt-1 text-xs text-slate-400">Access your data anywhere</p></div>
        <div className="feature-chip rounded-2xl p-4 text-center"><CircleCheckBig className="mx-auto h-5 w-5 text-violet-300" /><p className="mt-2 font-semibold text-white">Stay organised</p><p className="mt-1 text-xs text-slate-400">Track every opportunity</p></div>
        <div className="feature-chip rounded-2xl p-4 text-center"><Briefcase className="mx-auto h-5 w-5 text-amber-300" /><p className="mt-2 font-semibold text-white">Secure & private</p><p className="mt-1 text-xs text-slate-400">Your data is protected</p></div>
      </section>
    </main>
  )
}

function JobCard({ job, onMove, onDelete, disabled }) {
  return (
    <article className="job-card group flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="soft-badge mt-0.5 rounded-xl p-2"><Briefcase className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-white">{job.title}</h3>
          <p className="truncate text-sm text-slate-400">{job.company}</p>
        </div>
        <button type="button" disabled={disabled} onClick={() => onDelete(job.id)} aria-label={`Delete ${job.title}`} className="rounded-lg p-1.5 text-slate-500 opacity-0 transition hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100 focus:opacity-100"><Trash2 className="h-4 w-4" /></button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="soft-badge rounded-lg px-2.5 py-1 text-xs font-semibold">{formatDate(job.date)}</span>
        {job.url && <a href={job.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-blue-300">Open listing <ExternalLink className="h-3.5 w-3.5" /></a>}
      </div>
      <label className="sr-only" htmlFor={`move-${job.id}`}>Move job</label>
      <select id={`move-${job.id}`} disabled={disabled} value={job.column} onChange={event => onMove(job.id, event.target.value)} className="job-select rounded-xl px-3 py-2.5 text-xs font-semibold">
        {COLUMNS.map(column => <option key={column.id} value={column.id} className="bg-slate-900">{column.title}</option>)}
      </select>
    </article>
  )
}

function AddJobModal({ columnId, columnTitle, onClose, onAdd, error }) {
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async event => {
    event.preventDefault()
    if (saving || !title.trim() || !company.trim()) return
    setSaving(true)
    try {
      const saved = await onAdd({ title: title.trim(), company: company.trim(), date, url: url.trim(), column: columnId })
      if (saved) onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onClick={saving ? undefined : onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="add-job-title" className="modal-card w-full max-w-md rounded-3xl p-6" onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">New opportunity</p><h3 id="add-job-title" className="mt-1 text-2xl font-bold text-white">Add to {columnTitle}</h3></div>
          <button type="button" disabled={saving} onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input type="text" aria-label="Job title" placeholder="Job title" value={title} onChange={event => setTitle(event.target.value)} className="modal-input rounded-xl px-3 py-3" autoFocus required />
          <input type="text" aria-label="Company name" placeholder="Company name" value={company} onChange={event => setCompany(event.target.value)} className="modal-input rounded-xl px-3 py-3" required />
          <input type="date" aria-label="Application date" value={date} onChange={event => setDate(event.target.value)} className="modal-input rounded-xl px-3 py-3" />
          <input type="url" aria-label="Job listing URL" placeholder="Job listing URL (optional)" value={url} onChange={event => setUrl(event.target.value)} className="modal-input rounded-xl px-3 py-3" />
          {error && <p role="alert" className="text-sm text-amber-100">{error}</p>}
          <div className="mt-2 flex gap-3"><button type="button" disabled={saving} onClick={onClose} className="secondary-btn flex-1 rounded-xl py-3 text-sm font-semibold">Cancel</button><button type="submit" disabled={saving} className="primary-btn flex-1 rounded-xl py-3 text-sm font-bold">{saving ? 'Saving...' : 'Add job'}</button></div>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  const [store] = useState(() => createJobStore({ client: supabase }))
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  useEffect(() => store.start(), [store])

  if (!state.authReady) return <main className="app-shell flex min-h-screen items-center justify-center text-slate-200">{'Loading\u2026'}</main>
  if (!state.session && !state.demoMode) return <AuthScreen onDemo={store.enterDemo} authError={state.error} />
  if (state.session && !state.cloudReady && !state.error) return <main className="app-shell flex min-h-screen items-center justify-center text-slate-200">Loading your jobs...</main>
  return <Dashboard key={state.scope} state={state} store={store} />
}

function Dashboard({ state, store }) {
  const { session, jobs, cloudReady, busy, error: cloudError } = state
  const [addModal, setAddModal] = useState(null)
  const [query, setQuery] = useState('')
  const canEdit = cloudReady && !busy
  const filteredJobs = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return jobs
    return jobs.filter(job => `${job.title} ${job.company}`.toLowerCase().includes(normalized))
  }, [jobs, query])
  const counts = COLUMNS.map(column => ({ ...column, count: jobs.filter(job => job.column === column.id).length }))

  return (
    <div className="app-shell min-h-screen text-white">
      <header className="dashboard-header">
        <div className="dashboard-header-inner mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Brand />
          <div className="flex items-center gap-3">
            <div className="success-badge hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold sm:flex">{supabaseConfigured && session ? <Cloud className="h-4 w-4" /> : <CircleCheckBig className="h-4 w-4" />}{supabaseConfigured && session ? (busy ? 'Saving...' : cloudError || !cloudReady ? 'Cloud needs attention' : 'Cloud backup on') : (cloudError ? 'Local storage unavailable' : 'Saved in this browser')}</div>
            <div className="soft-badge rounded-xl px-3 py-2 text-sm font-semibold">{jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}</div>
            {session && <button type="button" onClick={store.signOut} aria-label="Sign out" className="secondary-btn rounded-xl p-2.5"><LogOut className="h-4 w-4" /></button>}
          </div>
        </div>
      </header>

      <main className="dashboard-main relative z-10 mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="dashboard-hero mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-blue-300">{session ? `Signed in as ${session.user.email}` : 'Local demo mode'}</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Keep every opportunity moving.</h2>
          </div>
          <label className="relative flex w-full md:w-96"><span className="sr-only">Search jobs</span><Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" /><input type="search" placeholder="Search jobs or companies" value={query} onChange={event => setQuery(event.target.value)} className="search-input w-full rounded-2xl py-3 pl-10 pr-3 text-sm" /></label>
        </section>

        {cloudError && <div role="alert" className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{cloudError}{session && !cloudReady && <button type="button" onClick={store.retry} className="ml-3 font-semibold underline">Retry loading jobs</button>}</div>}

        <section className="metrics-grid mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {counts.map(column => <div key={column.id} className="metric-card rounded-2xl p-5"><p className="text-sm font-medium text-slate-400">{column.title}</p><p className="mt-2 text-3xl font-extrabold text-white">{column.count}</p></div>)}
        </section>

        <section className="kanban-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map(column => (
            <div key={column.id} className="kanban-column flex min-h-0 flex-col rounded-3xl">
              <div className="border-b border-white/10 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div><h3 className="font-bold text-white">{column.title}</h3><p className="mt-1 text-xs text-slate-400">{column.description}</p></div>
                  <span className="soft-badge rounded-full px-2.5 py-1 text-xs font-bold">{counts.find(item => item.id === column.id)?.count}</span>
                </div>
              </div>
              <div className="kanban-body flex min-h-0 flex-1 flex-col gap-3 p-4">
                {filteredJobs.filter(job => job.column === column.id).map(job => <JobCard key={job.id} job={job} onMove={store.moveJob} onDelete={store.deleteJob} disabled={!canEdit} />)}
                <button type="button" disabled={!canEdit} onClick={() => setAddModal({ columnId: column.id, columnTitle: column.title })} className="add-job-btn mt-auto flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold"><Plus className="h-4 w-4" /> Add job</button>
              </div>
            </div>
          ))}
        </section>

        {filteredJobs.length === 0 && cloudReady && <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center text-sm text-slate-400">{query ? 'No jobs match your search.' : 'No jobs yet. Add your first opportunity.'}</div>}
      </main>

      {addModal && <AddJobModal columnId={addModal.columnId} columnTitle={addModal.columnTitle} onClose={() => setAddModal(null)} onAdd={store.addJob} error={cloudError} />}
    </div>
  )
}
