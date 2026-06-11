import type {
  Job,
  CPMResult,
  CrashOption,
  CrashAnalysisResult,
} from '../types'
import { computeCPM } from './cpm'

export function getCrashOptions(
  jobs: Job[],
  cpmResult: CPMResult
): CrashOption[] {
  if (cpmResult.error) return []

  const options: CrashOption[] = []
  const criticalJobIds = new Set<string>()
  for (const path of cpmResult.criticalPaths) {
    for (const id of path) criticalJobIds.add(id)
  }

  for (const job of jobs) {
    const minDuration = job.crashDuration ?? job.duration
    const costPerDay = job.crashCostPerDay ?? 0
    const canCrash = minDuration < job.duration && costPerDay > 0
    if (canCrash || criticalJobIds.has(job.id)) {
      options.push({
        jobId: job.id,
        currentDuration: job.duration,
        minDuration: Math.min(minDuration, job.duration),
        crashCostPerDay: costPerDay,
        isOnCriticalPath: criticalJobIds.has(job.id),
      })
    }
  }

  return options.sort((a, b) => {
    if (a.isOnCriticalPath !== b.isOnCriticalPath)
      return a.isOnCriticalPath ? -1 : 1
    return a.crashCostPerDay - b.crashCostPerDay
  })
}

export function analyzeCrashImpact(
  originalJobs: Job[],
  crashDecisions: Map<string, number>
): CrashAnalysisResult {
  const modifiedJobs: Job[] = originalJobs.map((j) => {
    const compressed = crashDecisions.get(j.id) || 0
    const newDuration = Math.max(
      j.crashDuration ?? j.duration,
      j.duration - compressed
    )
    return { ...j, duration: newDuration }
  })

  const originalCPM = computeCPM(originalJobs)
  const newCPM = computeCPM(modifiedJobs)

  if (newCPM.error || originalCPM.error) {
    return {
      compressedDays: 0,
      totalCost: 0,
      newTotalDuration: originalCPM.totalDuration,
      compressedJobs: [],
      newCriticalPaths: originalCPM.criticalPaths,
      criticalPathShifted: false,
    }
  }

  let totalCost = 0
  const compressedJobs: { jobId: string; compressedBy: number; cost: number }[] = []

  for (const [jobId, days] of crashDecisions) {
    if (days > 0) {
      const job = originalJobs.find((j) => j.id === jobId)
      if (job) {
        const actualCompressed = Math.min(
          days,
          job.duration - (job.crashDuration ?? job.duration)
        )
        const cost = actualCompressed * (job.crashCostPerDay ?? 0)
        totalCost += cost
        compressedJobs.push({
          jobId,
          compressedBy: actualCompressed,
          cost,
        })
      }
    }
  }

  const originalPathSet = new Set(
    originalCPM.criticalPaths.map((p) => p.join('|'))
  )
  const newPathSet = new Set(newCPM.criticalPaths.map((p) => p.join('|')))
  let shifted = originalPathSet.size !== newPathSet.size
  if (!shifted) {
    for (const p of originalPathSet) {
      if (!newPathSet.has(p)) {
        shifted = true
        break
      }
    }
  }

  return {
    compressedDays: originalCPM.totalDuration - newCPM.totalDuration,
    totalCost,
    newTotalDuration: newCPM.totalDuration,
    compressedJobs,
    newCriticalPaths: newCPM.criticalPaths,
    criticalPathShifted: shifted,
  }
}

export function getOptimalCrashingPlan(
  originalJobs: Job[],
  targetDays: number
): {
  crashPlan: Map<string, number>
  analysis: CrashAnalysisResult
} {
  const crashPlan = new Map<string, number>()
  let currentJobs = [...originalJobs]
  let currentCPM = computeCPM(currentJobs)

  if (currentCPM.error || targetDays >= currentCPM.totalDuration) {
    return {
      crashPlan,
      analysis: analyzeCrashImpact(originalJobs, crashPlan),
    }
  }

  const jobCrashState = new Map<string, number>()
  originalJobs.forEach((j) => jobCrashState.set(j.id, 0))

  let iterations = 0
  const maxIterations = originalJobs.length * 10

  while (
    currentCPM.totalDuration > targetDays &&
    iterations < maxIterations
  ) {
    iterations++

    const criticalJobIds = new Set<string>()
    for (const path of currentCPM.criticalPaths) {
      for (const id of path) criticalJobIds.add(id)
    }

    let bestJobId: string | null = null
    let bestCostPerDay = Infinity
    let bestCanCompress = 0

    for (const jobId of criticalJobIds) {
      const job = originalJobs.find((j) => j.id === jobId)
      if (!job) continue
      const alreadyCompressed = jobCrashState.get(jobId) || 0
      const maxPossible = job.duration - (job.crashDuration ?? job.duration)
      const remaining = maxPossible - alreadyCompressed
      if (remaining <= 0) continue
      const costPerDay = job.crashCostPerDay ?? 0
      if (costPerDay < bestCostPerDay) {
        bestCostPerDay = costPerDay
        bestJobId = jobId
        bestCanCompress = remaining
      }
    }

    if (!bestJobId || bestCostPerDay === Infinity) break

    const compressDays = Math.min(
      bestCanCompress,
      currentCPM.totalDuration - targetDays
    )

    jobCrashState.set(bestJobId, (jobCrashState.get(bestJobId) || 0) + compressDays)
    crashPlan.set(bestJobId, jobCrashState.get(bestJobId) || 0)

    currentJobs = originalJobs.map((j) => {
      const compressed = jobCrashState.get(j.id) || 0
      return {
        ...j,
        duration: Math.max(j.crashDuration ?? j.duration, j.duration - compressed),
      }
    })

    currentCPM = computeCPM(currentJobs)
    if (currentCPM.error) break
  }

  return {
    crashPlan,
    analysis: analyzeCrashImpact(originalJobs, crashPlan),
  }
}
