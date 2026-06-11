import { useMemo } from 'react'
import type { CPMResult } from '../types'
import {
  computeResourceLoad,
  getMaxResourceLoad,
  type ResourceAvailability,
} from '../algorithms/resourceLoad'

interface Props {
  cpmResult: CPMResult
  availabilities: ResourceAvailability[]
  onAvailabilitiesChange: (a: ResourceAvailability[]) => void
  dayWidth?: number
}

export function ResourceLoadPanel({
  cpmResult,
  availabilities,
  onAvailabilitiesChange,
  dayWidth = 30,
}: Props) {
  const loadResult = useMemo(
    () => computeResourceLoad(cpmResult, availabilities),
    [cpmResult, availabilities]
  )

  if (cpmResult.error) {
    return (
      <div className="panel">
        <div className="alert alert-error">{cpmResult.error}</div>
      </div>
    )
  }

  const totalDays = cpmResult.totalDuration

  const updateAvailability = (resourceType: string, available: number) => {
    const existing = availabilities.find((a) => a.resourceType === resourceType)
    if (existing) {
      onAvailabilitiesChange(
        availabilities.map((a) =>
          a.resourceType === resourceType ? { ...a, available } : a
        )
      )
    } else {
      onAvailabilitiesChange([...availabilities, { resourceType, available }])
    }
  }

  const getAvailability = (resourceType: string) => {
    return availabilities.find((a) => a.resourceType === resourceType)?.available
  }

  return (
    <div className="panel">
      <div className="panel-title">
        资源负荷检查
        {loadResult.conflicts.length > 0 && (
          <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>
            {loadResult.conflicts.length} 个冲突
          </span>
        )}
      </div>

      <div className="form-group" style={{ marginBottom: '20px' }}>
        <label>设置各资源可用数量</label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '10px',
            marginTop: '6px',
          }}
        >
          {loadResult.resourceTypes.map((rt) => {
            const maxLoad = getMaxResourceLoad(loadResult.dailyLoad, rt)
            const avail = getAvailability(rt) ?? maxLoad
            const hasConflict =
              avail !== undefined && maxLoad > avail
            return (
              <div
                key={rt}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: hasConflict ? '#fef2f2' : '#f9fafb',
                  borderRadius: '6px',
                  border: hasConflict ? '1px solid #fecaca' : '1px solid #e5e7eb',
                }}
              >
                <span style={{ fontSize: '13px', flex: 1, minWidth: 0 }}>
                  {rt}
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>
                    峰值需求: {maxLoad}
                  </div>
                </span>
                <input
                  type="number"
                  min={0}
                  value={avail}
                  onChange={(e) =>
                    updateAvailability(rt, parseInt(e.target.value) || 0)
                  }
                  style={{ width: '60px', padding: '4px 8px' }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {loadResult.conflicts.length > 0 && (
        <div className="alert alert-error" style={{ marginBottom: '20px' }}>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>
            ⚠️ 检测到以下资源冲突（需要错峰排程）：
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.8 }}>
            {loadResult.conflicts.slice(0, 10).map((c, i) => (
              <div key={i}>
                • <strong>{c.resourceType}</strong> 在第 {c.day + 1} 天：需要{' '}
                {c.required}，可用 {c.available}（涉及：{c.jobs.join('、')}）
              </div>
            ))}
            {loadResult.conflicts.length > 10 && (
              <div>... 还有 {loadResult.conflicts.length - 10} 个冲突</div>
            )}
          </div>
        </div>
      )}

      {loadResult.conflicts.length === 0 && availabilities.length > 0 && (
        <div className="alert alert-info" style={{ marginBottom: '20px' }}>
          ✅ 在当前可用资源配置下，所有时段资源均充足，无冲突。
        </div>
      )}

      <div className="panel-title" style={{ fontSize: '14px' }}>
        资源负荷时序图
      </div>

      {loadResult.resourceTypes.length === 0 ? (
        <div className="empty-state" style={{ padding: '20px' }}>
          作业数据中未设置资源需求
        </div>
      ) : (
        <div className="resource-chart" style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 120 + totalDays * dayWidth }}>
            {loadResult.resourceTypes.map((rt) => {
              const dayMap = loadResult.dailyLoad.get(rt) || new Map()
              const maxLoad = getMaxResourceLoad(loadResult.dailyLoad, rt)
              const avail = getAvailability(rt)
              const maxDisplay = Math.max(maxLoad, avail || 1, 1)

              return (
                <div key={rt} className="resource-chart-row">
                  <div className="resource-chart-label">
                    <div>
                      <div>{rt}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>
                        峰值 {maxLoad} / 可用 {avail ?? '-'}
                      </div>
                    </div>
                  </div>
                  <div className="resource-chart-bars">
                    {Array.from({ length: totalDays }, (_, day) => {
                      const entry = dayMap.get(day)
                      if (!entry || entry.required === 0) return null
                      const barWidth =
                        (entry.required / maxDisplay) * 100
                      const isOverload =
                        avail !== undefined && entry.required > avail
                      const isWarning =
                        avail !== undefined &&
                        entry.required === avail &&
                        entry.required > 0
                      let className = 'normal'
                      if (isOverload) className = 'overload'
                      else if (isWarning) className = 'warning'

                      return (
                        <div
                          key={day}
                          className={`resource-bar ${className}`}
                          style={{
                            left: day * dayWidth,
                            width: dayWidth - 1,
                            height: '100%',
                          }}
                          title={`${rt} - 第${day + 1}天: 需求 ${entry.required}\n涉及作业: ${entry.jobs.join(', ')}`}
                        >
                          {dayWidth > 24 && entry.required > 0 && (
                            <span style={{ fontSize: '10px' }}>
                              {entry.required}
                            </span>
                          )}
                        </div>
                      )
                    })}
                    {avail !== undefined && avail > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: 0,
                          right: 0,
                          pointerEvents: 'none',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: `${(avail / maxDisplay) * 100}%`,
                            borderTop: '2px dashed #6b7280',
                            opacity: 0.6,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <div className="resource-chart-row">
              <div
                className="resource-chart-label"
                style={{ background: '#f9fafb', borderRight: '1px solid #e5e7eb' }}
              >
                日期（天）
              </div>
              <div style={{ flex: 1, position: 'relative', height: '28px' }}>
                {Array.from({ length: totalDays }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: i * dayWidth,
                      top: 6,
                      width: dayWidth,
                      textAlign: 'center',
                      fontSize: '10px',
                      color: '#6b7280',
                    }}
                  >
                    {i % 2 === 0 ? i + 1 : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="legend" style={{ marginTop: '12px' }}>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ background: '#10b981' }}
          ></div>
          资源充足
        </div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ background: '#f59e0b' }}
          ></div>
          满载运行
        </div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ background: '#ef4444' }}
          ></div>
          资源过载（冲突）
        </div>
        <div className="legend-item">
          <div
            style={{
              width: '20px',
              borderTop: '2px dashed #6b7280',
              display: 'inline-block',
            }}
          ></div>
          可用量线
        </div>
      </div>
    </div>
  )
}
