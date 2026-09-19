import { useEffect, useMemo, useState } from 'react'
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
import './index.css'

const STORAGE_KEY = 'job-tracker-jobs-v1'

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', description: 'Roles to review' },
  { id: 'applied', title: 'Applied', description: 'Applications submitted' },
  { id: 'interviews', title: 'Interviews', description: 'Conversations in progress' },
  { id: 'offers', title: 'Offers', description: 'Positive outcomes' },
]

const initialJobs = [
  { id: '1', title: 'Senior Frontend Developer', company: 'Acme Corp', date: '2025-03-01', column: 'backlog', url: '' },
  { id: '2', title: 'Full Stack Engineer', company: 'TechStart Inc', date: '2025-03-05', column: 'applied', url: '' },
  { id: '3', title: 'React Developer', company: 'Design Co', date: '2025-03-07', column: 'interviews', url: '' },
]

function formatDate(value) {
  if (!value) return 'No date'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function AuthScreen() {
  const [mode, setMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async event => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const result = mode === 'sign-in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (result.error) {
      setMessage(result.error.message)
    } else if (mode === 'sign-up') {
      setMessage('Account created. Check your email if confirmation is enabled.')
    }
    setBusy(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-zinc-950">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-7 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-slate-900 p-2.5 text-white dark:bg-white dark:text-zinc-900"><Briefcase className="h-5 w-5" /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Career workspace</p>
            <h1 className="text-2xl font-bold">Job Tracker</h1>
          </div>
        </div>
        <h2 className="text-xl font-semibold">{mode === 'sign-in' ? 'Welcome back' : 'Create your account'}</h2>
        <p className="mt-1 text-sm text-zinc-500">Sign in to keep your applications backed up across devices.</p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          <input type="email" placeholder="Email address" value={email} onChange={event => setEmail(event.target.value)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 outline-none focus:border-slate-500 dark:border-zinc-700 dark:bg-zinc-800" required />
          <input type="password" placeholder="Password" minLength="6" value={password} onChange={event => setPassword(event.target.value)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 outline-none focus:border-slate-500 dark:border-zinc-700 dark:bg-zinc-800" required />
          {message && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">{message}</p>}
          <button type="submit" disabled={busy} className="rounded-lg bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-200 dark:text-zinc-900">{busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button type="button" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setMessage('') }} className="mt-4 w-full text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
          {mode === 'sign-in' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  )
}

function JobCard({ job, onMove, onDelete }) {
  return (
    <article className="group flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Briefcase className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{job.title}</h3>
          <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">{job.company}</p>
        </div>
        <button type="button" onClick={() => onDelete(job.id)} aria-label={`Delete ${job.title}`} className="rounded-md p-1.5 text-zinc-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-red-950/40"><Trash2 className="h-4 w-4" /></button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">{formatDate(job.date)}</span>
        {job.url && <a href={job.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">Open listing <ExternalLink className="h-3.5 w-3.5" /></a>}
      </div>
      <label className="sr-only" htmlFor={`move-${job.id}`}>Move job</label>
      <select id={`move-${job.id}`} value={job.column} onChange={event => onMove(job.id, event.target.value)} className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs font-medium text-zinc-700 outline-none transition focus:border-slate-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        {COLUMNS.map(column => <option key={column.id} value={column.id}>{column.title}</option>)}
      </select>
    </article>
  )
}

function AddJobModal({ columnId, columnTitle, onClose, onAdd }) {
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [url, setUrl] = useState('')

  const handleSubmit = event => {
    event.preventDefault()
    if (!title.trim() || !company.trim()) return
    onAdd({ title: title.trim(), company: company.trim(), date, url: url.trim(), column: columnId })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900" onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">New opportunity</p><h3 className="mt-1 text-xl font-semibold">Add to {columnTitle}</h3></div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <input type="text" placeholder="Job title" value={title} onChange={event => setTitle(event.target.value)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 outline-none focus:border-slate-500 dark:border-zinc-700 dark:bg-zinc-800" autoFocus required />
          <input type="text" placeholder="Company name" value={company} onChange={event => setCompany(event.target.value)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 outline-none focus:border-slate-500 dark:border-zinc-700 dark:bg-zinc-800" required />
          <input type="date" value={date} onChange={event => setDate(event.target.value)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 outline-none focus:border-slate-500 dark:border-zinc-700 dark:bg-zinc-800" />
          <input type="url" placeholder="Job listing URL (optional)" value={url} onChange={event => setUrl(event.target.value)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 outline-none focus:border-slate-500 dark:border-zinc-700 dark:bg-zinc-800" />
          <div className="mt-2 flex gap-3"><button type="button" onClick={onClose} className="flex-1 rounded-lg border border-zinc-300 py-2.5 text-sm font-medium dark:border-zinc-700">Cancel</button><button type="submit" className="flex-1 rounded-lg bg-slate-800 py-2.5 text-sm font-semibold text-white dark:bg-slate-200 dark:text-zinc-900">Add job</button></div>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!supabaseConfigured)
  const [jobs, setJobs] = useState(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : initialJobs
    } catch {
      return initialJobs
    }
  })
  const [cloudReady, setCloudReady] = useState(!supabaseConfigured)
  const [cloudError, setCloudError] = useState('')
  const [addModal, setAddModal] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!supabaseConfigured) return undefined
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session)
        setAuthReady(true)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
    })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!supabaseConfigured || !session?.user) return
    let mounted = true
    const loadJobs = async () => {
      setCloudReady(false)
      setCloudError('')
      const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: true })
      if (error) {
        if (mounted) setCloudError('Cloud backup is not ready yet. Run supabase/schema.sql in your project.')
        setCloudReady(true)
        return
      }
      if (data?.length) {
        if (mounted) setJobs(data.map(job => ({ id: job.id, title: job.title, company: job.company, date: job.date || '', column: job.column, url: job.url || '' })))
      } else {
        const saved = window.localStorage.getItem(STORAGE_KEY)
        const localJobs = saved ? JSON.parse(saved) : initialJobs
        const rows = localJobs.map(job => ({ ...job, user_id: session.user.id }))
        const { error: migrationError } = await supabase.from('jobs').upsert(rows)
        if (migrationError && mounted) setCloudError(migrationError.message)
        if (mounted) setJobs(localJobs)
      }
      if (mounted) setCloudReady(true)
    }
    loadJobs()
    return () => { mounted = false }
  }, [session])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs))
    if (!supabaseConfigured || !session?.user || !cloudReady) return
    const rows = jobs.map(job => ({ ...job, user_id: session.user.id, updated_at: new Date().toISOString() }))
    supabase.from('jobs').upsert(rows).then(({ error }) => { if (error) setCloudError(error.message) })
  }, [jobs, session, cloudReady])

  const addJob = payload => setJobs(previous => [...previous, { ...payload, id: crypto.randomUUID() }])
  const deleteJob = id => {
    setJobs(previous => previous.filter(job => job.id !== id))
    if (supabaseConfigured && session?.user) supabase.from('jobs').delete().eq('id', id).eq('user_id', session.user.id)
  }
  const moveJob = (id, column) => setJobs(previous => previous.map(job => job.id === id ? { ...job, column } : job))
  const filteredJobs = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return jobs
    return jobs.filter(job => `${job.title} ${job.company}`.toLowerCase().includes(normalized))
  }, [jobs, query])
  const counts = COLUMNS.map(column => ({ ...column, count: jobs.filter(job => job.column === column.id).length }))

  if (supabaseConfigured && !authReady) return <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-200">Loading…</main>
  if (supabaseConfigured && !session) return <AuthScreen />

  return (
    <div className="min-h-screen bg-slate-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-slate-900 p-2.5 text-white dark:bg-white dark:text-zinc-900"><Briefcase className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Career workspace</p><h1 className="text-xl font-bold tracking-tight">Job Tracker</h1></div></div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 sm:flex dark:bg-emerald-950/40 dark:text-emerald-300">{supabaseConfigured && session ? <Cloud className="h-4 w-4" /> : <CircleCheckBig className="h-4 w-4" />}{supabaseConfigured && session ? 'Cloud backup on' : 'Saved in this browser'}</div>
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">{jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}</div>
            {session && <button type="button" onClick={() => supabase.auth.signOut()} aria-label="Sign out" className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"><LogOut className="h-4 w-4" /></button>}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-sm font-medium text-slate-500">{session ? `Signed in as ${session.user.email}` : 'Local demo mode'}</p><h2 className="mt-1 text-3xl font-bold tracking-tight">Keep every opportunity moving.</h2></div><label className="relative flex w-full md:w-80"><span className="sr-only">Search jobs</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400" /><input type="search" placeholder="Search jobs or companies" value={query} onChange={event => setQuery(event.target.value)} className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-500 dark:border-zinc-700 dark:bg-zinc-900" /></label></section>
        {cloudError && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">{cloudError}</div>}
        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{counts.map(column => <div key={column.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><p className="text-sm font-medium text-zinc-500">{column.title}</p><p className="mt-1 text-2xl font-bold">{column.count}</p></div>)}</section>
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{COLUMNS.map(column => <div key={column.id} className="flex min-h-80 flex-col rounded-2xl border border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-900/60"><div className="border-b border-zinc-200 px-4 py-4 dark:border-zinc-800"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">{column.title}</h3><p className="mt-1 text-xs text-zinc-500">{column.description}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">{counts.find(item => item.id === column.id)?.count}</span></div></div><div className="flex flex-1 flex-col gap-3 p-4">{filteredJobs.filter(job => job.column === column.id).map(job => <JobCard key={job.id} job={job} onMove={moveJob} onDelete={deleteJob} />)}<button type="button" onClick={() => setAddModal({ columnId: column.id, columnTitle: column.title })} className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 py-3 text-sm font-semibold text-zinc-600 transition hover:border-slate-500 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"><Plus className="h-4 w-4" /> Add job</button></div></div>)}</section>
        {filteredJobs.length === 0 && <div className="mt-6 rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">No jobs match your search.</div>}
      </main>
      {addModal && <AddJobModal columnId={addModal.columnId} columnTitle={addModal.columnTitle} onClose={() => setAddModal(null)} onAdd={addJob} />}
    </div>
  )
}
