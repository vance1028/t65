import { useState, useMemo } from 'react'
import type { Job, CPMResult } from '../types'
import {
  getCrashOptions,
  analyzeCrashImpact,
  getOptimalCrashingPlan,
} from '../algorithms/crashAnalysis'

interface Props {
  jobs: Job[]
  cpmResult: CPMResult
}

export function CrashAnalysisPanel({ jobs, cpmResult }: Props) {
  const [targetDays, setTargetDays] = useState(
    Math.max(1, Math.floor(cpmResult.totalDuration * 0.9))
  )
  const [manualCrashes, setManualCrashes] = useState<Map<string, number>>(
    new Map()
  )
  const [useOptimal, setUseOptimal] = useState(true)

  const crashOptions = useMemo(
    () => getCrashOptions(jobs, cpmResult),
    [jobs, cpmResult]
  )

  const analysis = useMemo(() => {
    if (useOptimal) {
      const { analysis } = getOptimalCrashingPlan(jobs, targetDays)
      return analysis
    } else {
      return analyzeCrashImpact(jobs, manualCrashes)
    }
  }, [jobs, targetDays, manualCrashes, useOptimal])

  const handleManualCrash = (jobId: string, days: number) => {
    const newMap = new Map(manualCrashes)
    const opt = crashOptions.find((o) => o.jobId === jobId)
    const maxDays = opt ? opt.currentDuration - opt.minDuration : 0
    newMap.set(jobId, Math.max(0, Math.min(maxDays, days)))
    setManualCrashes(newMap)
  }

  if (cpmResult.error) {
    return (
      <div className="panel">
        <div className="alert alert-error">{cpmResult.error}</div>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="panel-title">赶工推演（工期压缩）</div>

      <div className="tabs">
        <button
          className={`tab ${useOptimal ? 'active' : ''}`}
          onClick={() => setUseOptimal(true)}
        >
          智能优化
        </button>
        <button
          className={`tab ${!useOptimal ? 'active' : ''}`}
          onClick={() => setUseOptimal(false)}
        >
          手动调整
        </button>
      </div>

      {useOptimal ? (
        <div>
          <div className="form-group">
            <label>目标工期（天）</label>
            <input
              type="number"
              min={1}
              max={cpmResult.totalDuration}
              value={targetDays}
              onChange={(e) =>
                setTargetDays(Math.max(1, parseInt(e.target.value) || 1))
              }
            />
            <div className="hint">
              当前总工期 {cpmResult.totalDuration} 天，目标设置越小压缩越多
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '16px' }}>
          <div className="form-group">
            <label>手动调整各作业压缩天数</label>
            <div className="hint">
              仅列出可压缩的作业（设置了最短工期和赶工成本）
            </div>
          </div>
          {crashOptions.filter((o) => o.currentDuration > o.minDuration).length ===
          0 ? (
            <div className="empty-state" style={{ padding: '20px' }}>
              没有可压缩的作业。请在作业编辑中设置「最短工期」和「赶工成本」。
            </div>
          ) : (
            <div
              style={{
                maxHeight: '280px',
                overflowY: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            >
              {crashOptions
                .filter((o) => o.currentDuration > o.minDuration)
                .map((opt) => {
                  const job = jobs.find((j) => j.id === opt.jobId)
                  const maxCompress = opt.currentDuration - opt.minDuration
                  const current = manualCrashes.get(opt.jobId) || 0
                  return (
                    <div
                      key={opt.jobId}
                      className="crash-input-row"
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      <label style={{ minWidth: '180px' }}>
                        {opt.isOnCriticalPath && (
                          <span
                            className="tag tag-danger"
                            style={{ marginRight: '6px' }}
                          >
                            关键
                          </span>
                        )}
                        [{opt.jobId}] {job?.name}
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={maxCompress}
                        value={current}
                        onChange={(e) =>
                          handleManualCrash(opt.jobId, parseInt(e.target.value))
                        }
                        style={{ flex: 1 }}
                      />
                      <input
                        type="number"
                        min={0}
                        max={maxCompress}
                        value={current}
                        onChange={(e) =>
                          handleManualCrash(opt.jobId, parseInt(e.target.value) || 0)
                        }
                        style={{ width: '60px' }}
                      />
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        /{maxCompress}d，¥{opt.crashCostPerDay.toLocaleString()}/d
                      </span>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      <div className="info-grid" style={{ marginTop: '20px' }}>
        <div className="info-card">
          <div className="info-card-label">原总工期</div>
          <div className="info-card-value">
            {cpmResult.totalDuration}
            <small>天</small>
          </div>
        </div>
        <div className="info-card success">
          <div className="info-card-label">压缩后工期</div>
          <div className="info-card-value">
            {analysis.newTotalDuration}
            <small>天</small>
          </div>
        </div>
        <div className="info-card warning">
          <div className="info-card-label">已压缩</div>
          <div className="info-card-value">
            {analysis.compressedDays}
            <small>天</small>
          </div>
        </div>
        <div className="info-card danger">
          <div className="info-card-label">赶工总成本</div>
          <div className="info-card-value">
            ¥{analysis.totalCost.toLocaleString()}
          </div>
        </div>
      </div>

      {analysis.criticalPathShifted && (
        <div className="alert alert-warning" style={{ marginTop: '16px' }}>
          ⚠️ 关键路径已发生转移！压缩后新的关键路径如下，请关注。
        </div>
      )}

      {analysis.compressedJobs.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div className="panel-title" style={{ fontSize: '14px' }}>
            压缩明细
          </div>
          <table>
            <thead>
              <tr>
                <th>作业ID</th>
                <th>作业名称</th>
                <th>压缩天数</th>
                <th>成本</th>
              </tr>
            </thead>
            <tbody>
              {analysis.compressedJobs.map((cj) => {
                const job = jobs.find((j) => j.id === cj.jobId)
                return (
                  <tr key={cj.jobId}>
                    <td>{cj.jobId}</td>
                    <td>{job?.name}</td>
                    <td>{cj.compressedBy}天</td>
                    <td>¥{cj.cost.toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {analysis.newCriticalPaths.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div className="panel-title" style={{ fontSize: '14px' }}>
            压缩后关键路径
          </div>
          {analysis.newCriticalPaths.map((path, idx) => (
            <div
              key={idx}
              className="critical-path-list"
              style={{ marginBottom: '6px' }}
            >
              {path.map((id, i) => {
                const job = jobs.find((j) => j.id === id)
                return (
                  <span key={id}>
                    <span className="critical-path-node">{job?.name || id}</span>
                    {i < path.length - 1 && (
                      <span className="critical-path-arrow"> → </span>
                    )}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
