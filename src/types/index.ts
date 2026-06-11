export interface ResourceRequirement {
  resourceType: string
  quantity: number
}

export interface Job {
  id: string
  name: string
  duration: number
  dependencies: string[]
  resources: ResourceRequirement[]
  earliestStart?: number
  crashDuration?: number
  crashCostPerDay?: number
}

export interface CPMResultJob {
  id: string
  name: string
  duration: number
  earliestStart: number
  earliestFinish: number
  latestStart: number
  latestFinish: number
  totalFloat: number
  freeFloat: number
  isCritical: boolean
  dependencies: string[]
  successors: string[]
  resources: ResourceRequirement[]
}

export interface CPMResult {
  jobs: Map<string, CPMResultJob>
  totalDuration: number
  criticalPaths: string[][]
  error?: string
}

export interface CycleDetectionResult {
  hasCycle: boolean
  cycle?: string[]
}

export interface ResourceConflict {
  resourceType: string
  day: number
  required: number
  available: number
  jobs: string[]
}

export interface ResourceLoadResult {
  conflicts: ResourceConflict[]
  dailyLoad: Map<string, Map<number, { required: number; jobs: string[] }>>
  resourceTypes: string[]
}

export interface CrashOption {
  jobId: string
  currentDuration: number
  minDuration: number
  crashCostPerDay: number
  isOnCriticalPath: boolean
}

export interface CrashAnalysisResult {
  compressedDays: number
  totalCost: number
  newTotalDuration: number
  compressedJobs: { jobId: string; compressedBy: number; cost: number }[]
  newCriticalPaths: string[][]
  criticalPathShifted: boolean
}
