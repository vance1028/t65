import type { Job, CycleDetectionResult } from '../types'

export function detectCycles(jobs: Job[]): CycleDetectionResult {
  const jobMap = new Map<string, Job>()
  jobs.forEach((j) => jobMap.set(j.id, j))

  const WHITE = 0
  const GRAY = 1
  const BLACK = 2
  const color = new Map<string, number>()
  const parent = new Map<string, string | null>()

  jobs.forEach((j) => {
    color.set(j.id, WHITE)
    parent.set(j.id, null)
  })

  let cyclePath: string[] | null = null

  function dfs(nodeId: string): boolean {
    color.set(nodeId, GRAY)

    const job = jobMap.get(nodeId)
    if (!job) return false

    for (const depId of job.dependencies) {
      if (!jobMap.has(depId)) continue

      const depColor = color.get(depId)
      if (depColor === GRAY) {
        cyclePath = [depId, nodeId]
        let cur: string | null = nodeId
        while (cur !== null && cur !== depId) {
          cur = parent.get(cur) ?? null
          if (cur !== null) cyclePath.unshift(cur)
        }
        return true
      }
      if (depColor === WHITE) {
        parent.set(depId, nodeId)
        if (dfs(depId)) return true
      }
    }

    color.set(nodeId, BLACK)
    return false
  }

  for (const job of jobs) {
    if (color.get(job.id) === WHITE) {
      if (dfs(job.id)) {
        return { hasCycle: true, cycle: cyclePath ?? undefined }
      }
    }
  }

  return { hasCycle: false }
}
