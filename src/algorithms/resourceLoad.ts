import type {
  CPMResult,
  CPMResultJob,
  ResourceConflict,
  ResourceLoadResult,
} from '../types'

export interface ResourceAvailability {
  resourceType: string
  available: number
}

export function computeResourceLoad(
  cpmResult: CPMResult,
  availabilities: ResourceAvailability[] = []
): ResourceLoadResult {
  const dailyLoad = new Map<string, Map<number, { required: number; jobs: string[] }>>()
  const resourceTypesSet = new Set<string>()
  const availabilityMap = new Map<string, number>()
  availabilities.forEach((a) => availabilityMap.set(a.resourceType, a.available))

  if (cpmResult.error) {
    return {
      conflicts: [],
      dailyLoad,
      resourceTypes: [],
    }
  }

  for (const rj of cpmResult.jobs.values()) {
    for (const res of rj.resources) {
      resourceTypesSet.add(res.resourceType)
      if (!dailyLoad.has(res.resourceType)) {
        dailyLoad.set(res.resourceType, new Map())
      }
      const dayMap = dailyLoad.get(res.resourceType)!
      for (let day = rj.earliestStart; day < rj.earliestFinish; day++) {
        if (!dayMap.has(day)) {
          dayMap.set(day, { required: 0, jobs: [] })
        }
        const entry = dayMap.get(day)!
        entry.required += res.quantity
        entry.jobs.push(rj.name)
      }
    }
  }

  const conflicts: ResourceConflict[] = []

  for (const [resourceType, dayMap] of dailyLoad.entries()) {
    const available = availabilityMap.get(resourceType)
    if (available === undefined) continue
    for (const [day, entry] of dayMap.entries()) {
      if (entry.required > available) {
        conflicts.push({
          resourceType,
          day,
          required: entry.required,
          available,
          jobs: entry.jobs,
        })
      }
    }
  }

  conflicts.sort((a, b) => {
    if (a.resourceType !== b.resourceType)
      return a.resourceType.localeCompare(b.resourceType)
    return a.day - b.day
  })

  return {
    conflicts,
    dailyLoad,
    resourceTypes: Array.from(resourceTypesSet).sort(),
  }
}

export function getMaxResourceLoad(
  dailyLoad: Map<string, Map<number, { required: number; jobs: string[] }>>,
  resourceType: string
): number {
  const dayMap = dailyLoad.get(resourceType)
  if (!dayMap) return 0
  let max = 0
  for (const entry of dayMap.values()) {
    if (entry.required > max) max = entry.required
  }
  return max
}

export function getJobsOnDay(
  cpmResult: CPMResult,
  day: number
): CPMResultJob[] {
  const result: CPMResultJob[] = []
  for (const rj of cpmResult.jobs.values()) {
    if (rj.earliestStart <= day && day < rj.earliestFinish) {
      result.push(rj)
    }
  }
  return result
}
