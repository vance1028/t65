import type { Job, CPMResult, CPMResultJob } from '../types'
import { detectCycles } from './cycleDetection'

function topologicalSort(jobs: Job[]): string[] | null {
  const jobMap = new Map<string, Job>()
  jobs.forEach((j) => jobMap.set(j.id, j))

  const inDegree = new Map<string, number>()
  jobs.forEach((j) => {
    inDegree.set(j.id, 0)
  })

  jobs.forEach((j) => {
    for (const depId of j.dependencies) {
      if (jobMap.has(depId)) {
        inDegree.set(j.id, (inDegree.get(j.id) || 0) + 1)
      }
    }
  })

  const successors = new Map<string, string[]>()
  jobs.forEach((j) => {
    successors.set(j.id, [])
  })
  jobs.forEach((j) => {
    for (const depId of j.dependencies) {
      if (jobMap.has(depId)) {
        successors.get(depId)!.push(j.id)
      }
    }
  })

  const queue: string[] = []
  jobs.forEach((j) => {
    if (inDegree.get(j.id) === 0) {
      queue.push(j.id)
    }
  })

  const result: string[] = []
  while (queue.length > 0) {
    const node = queue.shift()!
    result.push(node)
    for (const succ of successors.get(node) || []) {
      inDegree.set(succ, (inDegree.get(succ) || 0) - 1)
      if (inDegree.get(succ) === 0) {
        queue.push(succ)
      }
    }
  }

  if (result.length !== jobs.length) {
    return null
  }
  return result
}

export function computeCPM(jobs: Job[]): CPMResult {
  const cycleResult = detectCycles(jobs)
  if (cycleResult.hasCycle) {
    return {
      jobs: new Map(),
      totalDuration: 0,
      criticalPaths: [],
      error: `检测到循环依赖: ${cycleResult.cycle?.join(' → ') || '未知路径'}`,
    }
  }

  const invalidDeps: string[] = []
  const jobMap = new Map<string, Job>()
  jobs.forEach((j) => {
    if (jobMap.has(j.id)) {
      invalidDeps.push(`重复的作业ID: ${j.id}`)
    }
    jobMap.set(j.id, j)
  })

  for (const job of jobs) {
    for (const depId of job.dependencies) {
      if (!jobMap.has(depId)) {
        invalidDeps.push(`作业 "${job.name}" 引用了不存在的前置作业: ${depId}`)
      }
    }
  }

  if (invalidDeps.length > 0) {
    return {
      jobs: new Map(),
      totalDuration: 0,
      criticalPaths: [],
      error: invalidDeps.join('; '),
    }
  }

  const topoOrder = topologicalSort(jobs)
  if (!topoOrder) {
    return {
      jobs: new Map(),
      totalDuration: 0,
      criticalPaths: [],
      error: '无法进行拓扑排序，可能存在循环依赖',
    }
  }

  const successors = new Map<string, string[]>()
  jobs.forEach((j) => {
    successors.set(j.id, [])
  })
  jobs.forEach((j) => {
    for (const depId of j.dependencies) {
      successors.get(depId)!.push(j.id)
    }
  })

  const resultJobs = new Map<string, CPMResultJob>()

  for (const jobId of topoOrder) {
    const job = jobMap.get(jobId)!
    let earliestStart = job.earliestStart || 0

    for (const depId of job.dependencies) {
      const depResult = resultJobs.get(depId)!
      if (depResult.earliestFinish > earliestStart) {
        earliestStart = depResult.earliestFinish
      }
    }

    const earliestFinish = earliestStart + job.duration

    resultJobs.set(jobId, {
      id: job.id,
      name: job.name,
      duration: job.duration,
      earliestStart,
      earliestFinish,
      latestStart: 0,
      latestFinish: 0,
      totalFloat: 0,
      freeFloat: 0,
      isCritical: false,
      dependencies: [...job.dependencies],
      successors: successors.get(jobId) || [],
      resources: job.resources,
    })
  }

  let totalDuration = 0
  for (const rj of resultJobs.values()) {
    if (rj.earliestFinish > totalDuration) {
      totalDuration = rj.earliestFinish
    }
  }

  const reverseTopo = [...topoOrder].reverse()

  for (const jobId of reverseTopo) {
    const rj = resultJobs.get(jobId)!
    let latestFinish = totalDuration

    for (const succId of rj.successors) {
      const succResult = resultJobs.get(succId)!
      if (succResult.latestStart < latestFinish) {
        latestFinish = succResult.latestStart
      }
    }

    const latestStart = latestFinish - rj.duration
    rj.latestStart = latestStart
    rj.latestFinish = latestFinish
    rj.totalFloat = latestStart - rj.earliestStart
  }

  for (const jobId of topoOrder) {
    const rj = resultJobs.get(jobId)!
    if (rj.successors.length === 0) {
      rj.freeFloat = totalDuration - rj.earliestFinish
    } else {
      let minSuccES = Infinity
      for (const succId of rj.successors) {
        const succResult = resultJobs.get(succId)!
        if (succResult.earliestStart < minSuccES) {
          minSuccES = succResult.earliestStart
        }
      }
      rj.freeFloat = minSuccES - rj.earliestFinish
    }
    rj.isCritical = Math.abs(rj.totalFloat) < 0.0001
  }

  const criticalPaths = findAllCriticalPaths(resultJobs, totalDuration)

  return {
    jobs: resultJobs,
    totalDuration,
    criticalPaths,
  }
}

function findAllCriticalPaths(
  resultJobs: Map<string, CPMResultJob>,
  totalDuration: number
): string[][] {
  const startNodes: string[] = []
  const endNodes: string[] = []

  for (const rj of resultJobs.values()) {
    if (rj.isCritical && rj.earliestStart === 0) {
      startNodes.push(rj.id)
    }
    if (rj.isCritical && Math.abs(rj.earliestFinish - totalDuration) < 0.0001) {
      endNodes.push(rj.id)
    }
  }

  const paths: string[][] = []

  function dfs(current: string, path: string[], visited: Set<string>) {
    const rj = resultJobs.get(current)!
    if (endNodes.includes(current)) {
      paths.push([...path])
      return
    }
    for (const succ of rj.successors) {
      const succRj = resultJobs.get(succ)
      if (
        succRj?.isCritical &&
        !visited.has(succ) &&
        Math.abs(succRj.earliestStart - rj.earliestFinish) < 0.0001
      ) {
        visited.add(succ)
        path.push(succ)
        dfs(succ, path, visited)
        path.pop()
        visited.delete(succ)
      }
    }
  }

  for (const start of startNodes) {
    const visited = new Set<string>()
    visited.add(start)
    dfs(start, [start], visited)
  }

  if (paths.length === 0) {
    for (const rj of resultJobs.values()) {
      if (rj.isCritical) {
        paths.push([rj.id])
      }
    }
  }

  return paths
}
