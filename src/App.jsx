import { useState } from 'react'
import { Briefcase, Plus } from 'lucide-react'
import './index.css'

const COLUMNS = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'applied', title: 'Applied' },
  { id: 'interviews', title: 'Interviews' },
  { id: 'offers', title: 'Offers' },
]

const initialJobs = [
  { id: '1', title: 'Senior Frontend Developer', company: 'Acme Corp', date: '2025-03-01', column: 'backlog' },
  { id: '2', title: 'Full Stack Engineer', company: 'TechStart Inc', date: '2025-03-05', column: 'applied' },
  { id: '3', title: 'React Developer', company: 'Design Co', date: '2025-03-07', column: 'interviews' },
]

function JobCard({ job }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex items-start gap-2">
        <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{job.title}</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{job.company}</p>
        </div>
      </div>
      <span className="inline-flex w-fit items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
        {new Date(job.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </span>
    </div>
  )
}

function AddJobModal({ columnId, columnTitle, onClose, onAdd }) {
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim() || !company.trim()) return
    onAdd({ title: title.trim(), company: company.trim(), date, column: columnId })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-800" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Add job to {columnTitle}</h3>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <input
            type="text"
            placeholder="Job title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-500 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-400"
            autoFocus
          />
          <input
            type="text"
            placeholder="Company name"
            value={company}
            onChange={e => setCompany(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-500 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-400"
          />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-300 bg-white py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-slate-600 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-500 dark:hover:bg-slate-600"
            >
              Add Job
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  const [jobs, setJobs] = useState(initialJobs)
  const [addModal, setAddModal] = useState(null)

  const addJob = (payload) => {
    setJobs(prev => [...prev, {
      id: crypto.randomUUID(),
      title: payload.title,
      company: payload.company,
      date: payload.date,
      column: payload.column,
    }])
  }

  const totalJobs = jobs.length

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Job Tracker</h1>
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Briefcase className="h-4 w-4" />
            <span>Total Jobs: {totalJobs}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map(col => (
            <div
              key={col.id}
              className="flex flex-col rounded-xl border border-zinc-200 bg-slate-50/80 dark:border-zinc-700 dark:bg-zinc-800/50"
            >
              <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{col.title}</h2>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                {jobs.filter(j => j.column === col.id).map(job => (
                  <JobCard key={job.id} job={job} />
                ))}
                <button
                  onClick={() => setAddModal({ columnId: col.id, columnTitle: col.title })}
                  className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                >
                  <Plus className="h-4 w-4" />
                  Add Job
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {addModal && (
        <AddJobModal
          columnId={addModal.columnId}
          columnTitle={addModal.columnTitle}
          onClose={() => setAddModal(null)}
          onAdd={addJob}
        />
      )}
    </div>
  )
}
