import test from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import { createJobStore, DEMO_STORAGE_KEY } from '../src/lib/jobStore.js'

const A = { user: { id: 'user-a', email: 'a@example.test' } }
const B = { user: { id: 'user-b', email: 'b@example.test' } }
const input = { title: 'Developer', company: 'Example', date: '', column: 'applied', url: '' }
const row = (id, owner, title = 'Developer') => ({ ...input, id, user_id: owner, title })
const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function storage(initial = {}) {
  const data = new Map(Object.entries(initial))
  const reads = []
  return { data, reads, getItem(key) { reads.push(key); return data.get(key) ?? null }, setItem(key, value) { data.set(key, value) } }
}
function fakeClient(session = null, records = []) {
  const callbacks = new Set()
  const calls = []
  const rows = records.map(record => ({ ...record }))
  const client = {
    session, rows, calls, inCallback: false, intercept: null, initial: null, signOutResult: null,
    emit(next, event = 'SIGNED_IN') {
      client.session = next
      client.inCallback = true
      try { for (const callback of callbacks) callback(event, next) }
      finally { client.inCallback = false }
    },
    auth: {
      getSession: () => client.initial || Promise.resolve({ data: { session: client.session }, error: null }),
      onAuthStateChange(callback) {
        callbacks.add(callback)
        return { data: { subscription: { unsubscribe: () => callbacks.delete(callback) } } }
      },
      async signOut(options) {
        client.signOutOptions = options
        if (client.signOutResult) return client.signOutResult
        client.emit(null, 'SIGNED_OUT')
        return { error: null }
      },
    },
    from(table) {
      assert.equal(client.inCallback, false, 'Database calls must not run inside the auth callback')
      assert.equal(table, 'jobs')
      const request = { operation: 'select', filters: {}, payload: null, single: false }
      const query = {
        select() { return query }, order() { return query },
        eq(key, value) { request.filters[key] = value; return query },
        insert(value) { request.operation = 'insert'; request.payload = value; return query },
        update(value) { request.operation = 'update'; request.payload = value; return query },
        delete() { request.operation = 'delete'; return query },
        single() { request.single = true; return query },
        then(resolve, reject) {
          calls.push(request)
          const result = client.intercept?.(request)
          if (result) return Promise.resolve(result).then(resolve, reject)
          const user = client.session?.user.id
          const selected = rows.filter(item => item.user_id === user &&
            Object.entries(request.filters).every(([key, value]) => item[key] === value))
          let data
          let error = null
          if (request.operation === 'insert') {
            if (request.payload.user_id !== user || rows.some(item => item.id === request.payload.id)) {
              error = new Error('Rejected insert')
            } else {
              const item = { ...request.payload }
              rows.push(item)
              data = item
            }
          } else if (request.operation === 'update') {
            if (!selected.length) error = new Error('No visible row')
            for (const item of selected) Object.assign(item, request.payload)
            data = selected[0]
          } else if (request.operation === 'delete') {
            data = selected.map(item => ({ id: item.id }))
            for (const item of selected) rows.splice(rows.indexOf(item), 1)
          } else data = selected.map(item => ({ ...item }))
          return Promise.resolve({ data, error }).then(resolve, reject)
        },
      }
      return query
    },
  }
  return client
}
async function setup(t, { session = null, records = [], cache = storage(), client = fakeClient(session, records) } = {}) {
  const store = createJobStore({ client, getStorage: () => cache })
  t.after(store.start())
  await delay(15)
  return { store, client, cache }
}

test('signed-out startup does not load jobs or touch the legacy cache', async t => {
  const cache = storage({ 'job-tracker-jobs-v1': JSON.stringify([row('1', A.user.id, 'Private')]) })
  const { store, client } = await setup(t, { cache })
  assert.equal(store.getSnapshot().authReady, true)
  assert.deepEqual(store.getSnapshot().jobs, [])
  assert.equal(client.calls.length, 0)
  assert.deepEqual(cache.reads, [])
  assert.ok(cache.data.has('job-tracker-jobs-v1'))
})

test('demo ignores unowned legacy jobs and generates unique sample IDs', async t => {
  const cache = storage({ 'job-tracker-jobs-v1': JSON.stringify([row('1', A.user.id, 'Private')]) })
  const { store, client } = await setup(t, { cache })
  store.enterDemo()
  const jobs = store.getSnapshot().jobs
  assert.equal(jobs.length, 3)
  assert.equal(new Set(jobs.map(job => job.id)).size, 3)
  assert.ok(jobs.every(job => !['1', '2', '3'].includes(job.id)))
  assert.ok(jobs.every(job => job.title !== 'Private' && !('user_id' in job)))
  assert.equal(client.calls.length, 0)
  assert.deepEqual(cache.reads, [DEMO_STORAGE_KEY])
})

test('new accounts start empty without importing either demo or legacy jobs', async t => {
  const cache = storage({ [DEMO_STORAGE_KEY]: JSON.stringify([{ ...input, id: 'demo' }]), 'job-tracker-jobs-v1': JSON.stringify([row('1', A.user.id)]) })
  const { store, client } = await setup(t, { session: B, cache })
  assert.deepEqual(store.getSnapshot().jobs, [])
  assert.equal(store.getSnapshot().cloudReady, true)
  assert.deepEqual(client.calls.map(call => call.operation), ['select'])
  assert.equal(client.calls[0].filters.user_id, B.user.id)
  assert.deepEqual(cache.reads, [])
})

test('existing cloud rows, including old IDs, load without modification', async t => {
  const records = [row('1', A.user.id, 'Existing A'), row('2', B.user.id, 'Existing B')]
  const { store, client } = await setup(t, { session: A, records })
  assert.equal(store.getSnapshot().jobs[0].id, '1')
  assert.equal(store.getSnapshot().jobs[0].title, 'Existing A')
  assert.deepEqual(client.rows, records)
  assert.deepEqual(client.calls.map(call => call.operation), ['select'])
})

test('account switching clears old records synchronously before loading the new owner', async t => {
  const { store, client } = await setup(t, { session: A, records: [row('1', A.user.id, 'A only'), row('2', B.user.id, 'B only')] })
  client.emit(B)
  assert.deepEqual(store.getSnapshot().jobs, [])
  assert.equal(store.getSnapshot().cloudReady, false)
  await delay(15)
  assert.deepEqual(store.getSnapshot().jobs.map(job => job.title), ['B only'])
})

test('sign-out events clear private jobs and never display them in demo mode', async t => {
  const { store, client, cache } = await setup(t, { session: A, records: [row('1', A.user.id, 'Private')] })
  client.emit(null, 'SIGNED_OUT')
  assert.deepEqual(store.getSnapshot().jobs, [])
  assert.equal(store.getSnapshot().demoMode, false)
  assert.equal(cache.data.size, 0)
  store.enterDemo()
  assert.ok(store.getSnapshot().jobs.every(job => job.title !== 'Private'))
})

test('late responses from a previous account cannot replace the current account', async t => {
  const wait = deferred()
  const client = fakeClient(A, [row('b', B.user.id, 'B only')])
  client.intercept = request => request.filters.user_id === A.user.id ? wait.promise : null
  const { store } = await setup(t, { client })
  client.emit(B)
  await delay(15)
  wait.resolve({ data: [row('a', A.user.id, 'A private')], error: null })
  await delay(5)
  assert.deepEqual(store.getSnapshot().jobs.map(job => job.title), ['B only'])
})

test('a delayed initial session cannot overwrite a newer auth event', async t => {
  const wait = deferred()
  const client = fakeClient(A, [row('b', B.user.id)])
  client.initial = wait.promise
  const { store } = await setup(t, { client })
  client.emit(B)
  wait.resolve({ data: { session: A }, error: null })
  await delay(15)
  assert.equal(store.getSnapshot().session.user.id, B.user.id)
  assert.equal(store.getSnapshot().jobs[0].id, 'b')
})

test('token refresh preserves jobs and does not trigger writes or repeated reads', async t => {
  const { store, client } = await setup(t, { session: A, records: [row('1', A.user.id)] })
  const jobs = store.getSnapshot().jobs
  const scope = store.getSnapshot().scope
  client.emit({ ...A, expires_at: 99999 }, 'TOKEN_REFRESHED')
  await delay(5)
  assert.equal(store.getSnapshot().jobs, jobs)
  assert.equal(store.getSnapshot().scope, scope)
  assert.equal(client.calls.length, 1)
})

test('cloud failures remain explicit and never fall back to local data', async t => {
  const client = fakeClient(A)
  client.intercept = () => ({ data: null, error: new Error('Network unavailable') })
  const { store } = await setup(t, { client })
  assert.equal(store.getSnapshot().cloudReady, false)
  assert.deepEqual(store.getSnapshot().jobs, [])
  assert.match(store.getSnapshot().error, /Could not load/)
  assert.equal(await store.addJob(input), false)
  assert.equal(client.calls.length, 1)
})

test('failed loads can be retried without importing or reseeding jobs', async t => {
  const client = fakeClient(A, [row('a', A.user.id)])
  client.intercept = () => ({ data: null, error: new Error('Offline') })
  const { store } = await setup(t, { client })
  client.intercept = null
  store.retry()
  await delay(5)
  assert.equal(store.getSnapshot().cloudReady, true)
  assert.equal(store.getSnapshot().jobs[0].id, 'a')
  assert.ok(client.calls.every(call => call.operation === 'select'))
})

test('responses containing another owner are rejected', async t => {
  const client = fakeClient(A)
  client.intercept = () => ({ data: [row('b', B.user.id)], error: null })
  const { store } = await setup(t, { client })
  assert.deepEqual(store.getSnapshot().jobs, [])
  assert.equal(store.getSnapshot().cloudReady, false)
})

test('each new account gets unique job IDs and only its own rows', async t => {
  const { store, client } = await setup(t, { session: A })
  assert.equal(await store.addJob({ ...input, title: 'A job' }), true)
  const first = store.getSnapshot().jobs[0].id
  client.emit(B)
  await delay(15)
  assert.equal(await store.addJob({ ...input, title: 'B job' }), true)
  const second = store.getSnapshot().jobs[0].id
  assert.notEqual(first, second)
  assert.equal(client.rows.length, 2)
  assert.equal(client.rows[0].user_id, A.user.id)
  assert.equal(client.rows[1].user_id, B.user.id)
  assert.ok(client.calls.every(call => call.operation !== 'upsert'))
})

test('empty dates become null and supplied owner/ID cannot override a new cloud row', async t => {
  const { store, client } = await setup(t, { session: A })
  await store.addJob({ ...input, id: '1', user_id: B.user.id })
  const request = client.calls.find(call => call.operation === 'insert')
  assert.equal(request.payload.date, null)
  assert.equal(request.payload.user_id, A.user.id)
  assert.notEqual(request.payload.id, '1')
})

test('cloud updates target one row and its authenticated owner', async t => {
  const { store, client } = await setup(t, { session: A, records: [row('1', A.user.id), row('2', B.user.id)] })
  assert.equal(await store.moveJob('1', 'interviews'), true)
  const request = client.calls.find(call => call.operation === 'update')
  assert.deepEqual(request.filters, { id: '1', user_id: A.user.id })
  assert.equal(client.rows[1].column, 'applied')
  assert.equal(store.getSnapshot().jobs[0].column, 'interviews')
})

test('cloud deletions are owner-scoped and persist an empty board without reseeding', async t => {
  const { store, client } = await setup(t, { session: A, records: [row('1', A.user.id), row('2', B.user.id)] })
  assert.equal(await store.deleteJob('1'), true)
  store.retry()
  await delay(5)
  assert.deepEqual(store.getSnapshot().jobs, [])
  assert.deepEqual(client.rows.map(item => item.id), ['2'])
  assert.deepEqual(client.calls.find(call => call.operation === 'delete').filters, { id: '1', user_id: A.user.id })
})

test('failed mutations leave the previous jobs visible and release the busy state', async t => {
  const { store, client } = await setup(t, { session: A, records: [row('1', A.user.id)] })
  client.intercept = () => ({ error: new Error('Denied'), data: null })
  assert.equal(await store.moveJob('1', 'offers'), false)
  assert.equal(store.getSnapshot().jobs[0].column, 'applied')
  assert.equal(await store.deleteJob('1'), false)
  assert.equal(store.getSnapshot().jobs.length, 1)
  assert.equal(store.getSnapshot().busy, false)
  assert.match(store.getSnapshot().error, /Could not save/)
})

test('a deletion affecting no rows is not reported as success', async t => {
  const { store, client } = await setup(t, { session: A, records: [row('1', A.user.id)] })
  client.intercept = () => ({ data: [], error: null })
  assert.equal(await store.deleteJob('1'), false)
  assert.equal(store.getSnapshot().jobs.length, 1)
})

test('late mutation results cannot leak rows or errors into a new account', async t => {
  const { store, client } = await setup(t, { session: A })
  const wait = deferred()
  client.intercept = request => request.operation === 'insert' ? wait.promise : null
  const mutation = store.addJob(input)
  await delay(1)
  client.emit(B)
  await delay(15)
  wait.resolve({ error: new Error('Old request rejected'), data: null })
  assert.equal(await mutation, false)
  assert.equal(store.getSnapshot().session.user.id, B.user.id)
  assert.deepEqual(store.getSnapshot().jobs, [])
  assert.equal(store.getSnapshot().error, '')
  assert.equal(store.getSnapshot().busy, false)
})

test('duplicate clicks cannot start concurrent writes', async t => {
  const { store, client } = await setup(t, { session: A })
  const wait = deferred()
  client.intercept = request => request.operation === 'insert' ? wait.promise : null
  const first = store.addJob(input)
  assert.equal(await store.addJob(input), false)
  await delay(1)
  assert.equal(client.calls.filter(call => call.operation === 'insert').length, 1)
  const request = client.calls.find(call => call.operation === 'insert')
  wait.resolve({ data: request.payload, error: null })
  assert.equal(await first, true)
})

test('demo CRUD persists locally without touching Supabase', async t => {
  const { store, client, cache } = await setup(t)
  store.enterDemo()
  await store.addJob(input)
  const id = store.getSnapshot().jobs.at(-1).id
  await store.moveJob(id, 'offers')
  assert.equal(JSON.parse(cache.data.get(DEMO_STORAGE_KEY)).at(-1).column, 'offers')
  for (const job of [...store.getSnapshot().jobs]) await store.deleteJob(job.id)
  store.enterDemo()
  assert.deepEqual(store.getSnapshot().jobs, [])
  assert.equal(client.calls.length, 0)
})

test('signing in from demo does not upload the demo data', async t => {
  const { store, client, cache } = await setup(t)
  store.enterDemo()
  await store.addJob(input)
  const demo = cache.data.get(DEMO_STORAGE_KEY)
  client.emit(A)
  assert.deepEqual(store.getSnapshot().jobs, [])
  await delay(15)
  assert.deepEqual(store.getSnapshot().jobs, [])
  assert.equal(cache.data.get(DEMO_STORAGE_KEY), demo)
  assert.deepEqual(client.calls.map(call => call.operation), ['select'])
})

test('sign-out clears data before the request resolves and only signs out this session', async t => {
  const { store, client } = await setup(t, { session: A, records: [row('a', A.user.id)] })
  const wait = deferred()
  client.signOutResult = wait.promise
  const result = store.signOut()
  assert.deepEqual(store.getSnapshot().jobs, [])
  assert.equal(store.getSnapshot().authReady, false)
  wait.resolve({ error: null })
  assert.equal(await result, true)
  assert.deepEqual(client.signOutOptions, { scope: 'local' })
  assert.equal(store.getSnapshot().session, null)
  assert.equal(store.getSnapshot().authReady, true)
})

test('failed sign-out allows retry without restoring private job data', async t => {
  const { store, client } = await setup(t, { session: A, records: [row('a', A.user.id)] })
  client.signOutResult = { error: new Error('Network') }
  assert.equal(await store.signOut(), false)
  assert.deepEqual(store.getSnapshot().jobs, [])
  assert.match(store.getSnapshot().error, /Sign out failed/)
  client.signOutResult = null
  assert.equal(await store.signOut(), true)
  assert.equal(store.getSnapshot().session, null)
})

test('unavailable browser storage does not break demo or cloud startup', async t => {
  const client = fakeClient(null)
  const store = createJobStore({ client, getStorage: () => { throw new Error('Blocked') } })
  t.after(store.start())
  await delay(5)
  store.enterDemo()
  assert.equal(store.getSnapshot().jobs.length, 3)
  assert.match(store.getSnapshot().error, /storage is unavailable/)
  client.emit(A)
  await delay(15)
  assert.deepEqual(store.getSnapshot().jobs, [])
  assert.equal(store.getSnapshot().error, '')
})

test('malformed demo data is replaced with independent sample data', async t => {
  const { store } = await setup(t, { cache: storage({ [DEMO_STORAGE_KEY]: '{broken' }) })
  store.enterDemo()
  assert.equal(store.getSnapshot().jobs.length, 3)
})

test('duplicate demo IDs are repaired without sharing object identity', async t => {
  const { store } = await setup(t, { cache: storage({ [DEMO_STORAGE_KEY]: JSON.stringify([{ ...input, id: 'same' }, { ...input, id: 'same' }]) }) })
  store.enterDemo()
  assert.equal(new Set(store.getSnapshot().jobs.map(job => job.id)).size, 2)
})

test('invalid stage, date and URL do not write cloud records', async t => {
  const { store, client } = await setup(t, { session: A })
  for (const bad of [{ title: '' }, { column: 'other' }, { date: '2026-02-31' }, { url: 'javascript:alert(1)' }]) {
    assert.equal(await store.addJob({ ...input, ...bad }), false)
  }
  assert.ok(client.calls.every(call => call.operation === 'select'))
})

test('stopping and restarting drops stale sessions and pending requests', async t => {
  const client = fakeClient(A, [row('b', B.user.id)])
  const wait = deferred()
  client.intercept = request => request.filters.user_id === A.user.id ? wait.promise : null
  const store = createJobStore({ client, getStorage: () => storage() })
  const stop = store.start()
  await delay(10)
  stop()
  client.session = B
  t.after(store.start())
  await delay(15)
  wait.resolve({ data: [row('a', A.user.id)], error: null })
  await delay(5)
  assert.equal(store.getSnapshot().session.user.id, B.user.id)
  assert.deepEqual(store.getSnapshot().jobs.map(job => job.id), ['b'])
})

test('session-read failure leaves no private data and permits sign-in', async t => {
  const client = fakeClient(A)
  client.initial = Promise.resolve({ data: { session: null }, error: new Error('Auth unavailable') })
  const { store } = await setup(t, { client })
  assert.equal(store.getSnapshot().authReady, true)
  assert.equal(store.getSnapshot().session, null)
  assert.deepEqual(store.getSnapshot().jobs, [])
  assert.match(store.getSnapshot().error, /check your session/)
})

test('local-only mode is functional without a Supabase client', t => {
  const store = createJobStore({ getStorage: () => storage() })
  t.after(store.start())
  assert.equal(store.getSnapshot().demoMode, true)
  assert.equal(store.getSnapshot().jobs.length, 3)
})
