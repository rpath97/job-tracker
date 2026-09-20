export const DEMO_STORAGE_KEY = 'job-tracker-demo-v2'
const STAGES = new Set(['backlog', 'applied', 'interviews', 'offers'])
const SAMPLE_JOBS = [
  { title: 'Senior Frontend Developer', company: 'Acme Corp', date: '2025-03-01', column: 'backlog', url: '' },
  { title: 'Full Stack Engineer', company: 'TechStart Inc', date: '2025-03-05', column: 'applied', url: '' },
  { title: 'React Developer', company: 'Design Co', date: '2025-03-07', column: 'interviews', url: '' },
]

function jobFields(job) {
  return {
    id: job.id, title: job.title, company: job.company,
    date: job.date || '', column: job.column, url: job.url || '',
  }
}

function validateJob(payload) {
  const title = typeof payload.title === 'string' ? payload.title.trim() : ''
  const company = typeof payload.company === 'string' ? payload.company.trim() : ''
  if (!title || !company || !STAGES.has(payload.column)) {
    throw new Error('Enter a title, company and valid stage.')
  }
  const date = payload.date || ''
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) {
    throw new Error('Enter a valid date.')
  }
  const url = typeof payload.url === 'string' ? payload.url.trim() : ''
  if (url) {
    let parsed
    try { parsed = new URL(url) } catch { throw new Error('Enter a valid listing URL.') }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Use an http or https listing URL.')
  }
  return { title, company, date, column: payload.column, url }
}

/** Cloud jobs stay in memory. Only the explicitly selected demo uses browser storage. */
export function createJobStore({
  client = null,
  getStorage = () => globalThis.localStorage,
  createId = () => globalThis.crypto.randomUUID(),
  now = () => new Date().toISOString(),
} = {}) {
  let state = {
    session: null, authReady: false, demoMode: false,
    jobs: [], cloudReady: false, busy: false, error: '', scope: 0,
  }
  let generation = 0
  let lifecycle = 0
  let active = false
  let subscription = null
  const listeners = new Set()
  const publish = patch => {
    state = { ...state, ...patch }
    for (const listener of listeners) listener()
  }
  const isCurrent = version => active && version === generation
  const reset = patch => {
    generation += 1
    publish({ jobs: [], busy: false, error: '', cloudReady: false, scope: generation, ...patch })
  }

  function saveDemo(jobs) {
    try {
      const storage = getStorage()
      if (!storage) throw new Error('Storage unavailable')
      storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(jobs))
      return ''
    } catch {
      return 'Browser storage is unavailable. Demo changes will last only until this page closes.'
    }
  }

  function readDemo() {
    try {
      const raw = getStorage()?.getItem(DEMO_STORAGE_KEY)
      if (raw !== null && raw !== undefined) {
        const saved = JSON.parse(raw)
        if (!Array.isArray(saved)) throw new Error('Invalid demo data')
        const ids = new Set()
        return saved.map(job => {
          const fields = validateJob(job)
          const id = typeof job.id === 'string' && job.id && !ids.has(job.id) ? job.id : createId()
          ids.add(id)
          return { ...fields, id }
        })
      }
    } catch {
      // Unowned legacy caches are deliberately never read or imported.
    }
    return SAMPLE_JOBS.map(job => ({ ...job, id: createId() }))
  }

  function enterDemo() {
    if (!active || !state.authReady || state.session) return
    const jobs = readDemo()
    reset({ session: null, authReady: true, demoMode: true, cloudReady: true, jobs, error: saveDemo(jobs) })
  }

  async function loadJobs(userId, version) {
    if (!isCurrent(version) || state.session?.user.id !== userId) return
    try {
      const { data, error } = await client.from('jobs').select('*')
        .eq('user_id', userId).order('created_at', { ascending: true })
      if (!isCurrent(version)) return
      if (error) throw error
      if (!Array.isArray(data) || data.some(job => job.user_id !== userId)) throw new Error('Unexpected job owner')
      publish({ jobs: data.map(jobFields), cloudReady: true, error: '' })
    } catch {
      if (isCurrent(version)) publish({ jobs: [], cloudReady: false, error: 'Could not load your cloud jobs. Check your connection and retry.' })
    }
  }

  function acceptSession(session) {
    const next = session?.user?.id ? session : null
    const sameUser = state.session?.user.id === next?.user.id
    if (state.authReady && sameUser) {
      publish({ session: next })
      return
    }
    reset({ session: next, authReady: true, demoMode: false })
    if (next) {
      const version = generation
      // Leave the auth callback before making another Supabase request.
      setTimeout(() => { void loadJobs(next.user.id, version) }, 0)
    }
  }

  function start() {
    if (active) return stop
    active = true
    const run = ++lifecycle
    reset({ session: null, authReady: !client, demoMode: false })
    if (!client) {
      enterDemo()
      return stop
    }
    let events = 0
    const failAuth = () => {
      if (active && lifecycle === run && events === 0) {
        reset({ session: null, authReady: true, demoMode: false, error: 'Could not check your session. Please sign in again.' })
      }
    }
    try {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        if (!active || lifecycle !== run) return
        events += 1
        acceptSession(session)
      })
      subscription = data.subscription
      Promise.resolve(client.auth.getSession()).then(({ data: sessionData, error }) => {
        if (!active || lifecycle !== run || events > 0) return
        if (error) { failAuth(); return }
        acceptSession(sessionData.session)
      }).catch(failAuth)
    } catch {
      failAuth()
    }
    return stop
  }

  function stop() {
    active = false
    lifecycle += 1
    generation += 1
    subscription?.unsubscribe()
    subscription = null
    state = { ...state, jobs: [], session: null, authReady: false, busy: false, cloudReady: false }
  }

  async function signOut() {
    if (!active || !client || !state.session) return false
    const previousSession = state.session
    reset({ session: null, authReady: false, demoMode: false })
    const version = generation
    try {
      const { error } = await client.auth.signOut({ scope: 'local' })
      if (error) throw error
      if (isCurrent(version)) acceptSession(null)
      return true
    } catch {
      if (isCurrent(version)) {
        publish({ session: previousSession, authReady: true, error: 'Sign out failed. Please try again.' })
      }
      return false
    }
  }

  async function mutate(operation, payload) {
    if (!active || !state.authReady || !state.cloudReady || state.busy) return false
    if (!state.demoMode && !state.session) return false
    const version = generation
    const userId = state.session?.user.id
    let job
    try {
      if (operation === 'insert') {
        job = { ...validateJob(payload), id: createId() }
      } else {
        job = state.jobs.find(item => item.id === payload.id)
        if (!job) throw new Error('This job is no longer available. Reload your jobs.')
        if (operation === 'update') {
          if (!STAGES.has(payload.column)) throw new Error('Choose a valid stage.')
          job = { ...job, column: payload.column }
        }
      }
      publish({ busy: true, error: '' })
      if (!state.demoMode) {
        let query
        if (operation === 'insert') {
          query = client.from('jobs').insert({ ...job, date: job.date || null, user_id: userId })
            .select('*').single()
        } else if (operation === 'update') {
          query = client.from('jobs').update({ column: job.column, updated_at: now() })
            .eq('id', job.id).eq('user_id', userId).select('*').single()
        } else {
          query = client.from('jobs').delete().eq('id', job.id).eq('user_id', userId).select('id')
        }
        const { data, error } = await query
        if (!isCurrent(version)) return false
        if (error) throw error
        if (operation === 'delete') {
          if (!Array.isArray(data) || data.length !== 1 || data[0].id !== job.id) throw new Error('Job not deleted')
        } else {
          if (!data || data.id !== job.id || data.user_id !== userId) throw new Error('Unexpected job owner')
          job = jobFields(data)
        }
      }
      const jobs = operation === 'insert' ? [...state.jobs, job]
        : operation === 'update' ? state.jobs.map(item => item.id === job.id ? job : item)
          : state.jobs.filter(item => item.id !== job.id)
      publish({ jobs, error: state.demoMode ? saveDemo(jobs) : '' })
      return true
    } catch (error) {
      if (isCurrent(version)) publish({ error: state.busy ? 'Could not save that change. Your previous jobs are unchanged; please retry.' : error.message })
      return false
    } finally {
      if (isCurrent(version)) publish({ busy: false })
    }
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    start, enterDemo, signOut,
    retry() {
      if (!state.session || state.busy) return
      const session = state.session
      reset({ session, authReady: true, demoMode: false })
      void loadJobs(session.user.id, generation)
    },
    addJob: payload => mutate('insert', payload),
    moveJob: (id, column) => mutate('update', { id, column }),
    deleteJob: id => mutate('delete', { id }),
  }
}
