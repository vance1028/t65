import type { CPMResult, CPMResultJob } from '../types'

interface Props {
  cpmResult: CPMResult
  dayWidth?: number
}

export function GanttChart({ cpmResult, dayWidth = 40 }: Props) {
  if (cpmResult.error) {
    return (
      <div className="panel">
        <div className="alert alert-error">{cpmResult.error}</div>
      </div>
    )
  }

  const jobsArray = Array.from(cpmResult.jobs.values()).sort(
    (a, b) => a.earliestStart - b.earliestStart || b.duration - a.duration
  )

  if (jobsArray.length === 0) {
    return (
      <div className="panel">
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">暂无数据</div>
          <div>请先添加作业数据</div>
        </div>
      </div>
    )
  }

  const totalDays = cpmResult.totalDuration
  const chartWidth = totalDays * dayWidth
  const labelWidth = 320

  const isWeekend = (day: number) => {
    const startDay = 0
    return (startDay + day) % 7 === 5 || (startDay + day) % 7 === 6
  }

  const showFloat = (rj: CPMResultJob) => rj.totalFloat > 0.5

  return (
    <div className="panel">
      <div className="panel-title">
        甘特图
        <span className="badge">总工期 {totalDays} 天</span>
      </div>

      <div className="legend">
        <div className="legend-item">
          <div className="legend-color" style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}></div>
          关键路径作业
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: 'linear-gradient(135deg, #3b82f6, #60a5fa)' }}></div>
          普通作业
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#fef3c7' }}></div>
          周末
        </div>
      </div>

      <div className="gantt-container" style={{ marginTop: '16px' }}>
        <div className="gantt-chart" style={{ minWidth: labelWidth + chartWidth }}>
          <div className="gantt-header">
            <div
              className="gantt-header-label"
              style={{ width: labelWidth, minWidth: labelWidth }}
            >
              作业名称
            </div>
            <div
              className="gantt-header-days"
              style={{ width: chartWidth, minWidth: chartWidth }}
            >
              {Array.from({ length: totalDays }, (_, i) => (
                <div
                  key={i}
                  className={`gantt-day-header ${isWeekend(i) ? 'weekend' : ''}`}
                  style={{ width: dayWidth }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          <div className="gantt-body">
            <div
              className="gantt-labels"
              style={{ width: labelWidth, minWidth: labelWidth }}
            >
              {jobsArray.map((rj) => (
                <div
                  key={rj.id}
                  className={`gantt-row-label ${rj.isCritical ? 'critical' : ''}`}
                  title={`${rj.name}\n工期: ${rj.duration}天\n最早开始: 第${rj.earliestStart}天\n最晚开始: 第${rj.latestStart}天\n总时差: ${rj.totalFloat}天\n自由时差: ${rj.freeFloat}天`}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    [{rj.id}] {rj.name}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="gantt-timeline"
              style={{ width: chartWidth, minWidth: chartWidth }}
            >
              {jobsArray.map((rj, rowIdx) => (
                <div
                  key={rj.id}
                  className={`gantt-row ${rj.isCritical ? 'critical' : ''}`}
                  style={{ height: 40 }}
                >
                  {Array.from({ length: totalDays }, (_, i) =>
                    isWeekend(i) ? (
                      <div
                        key={`w-${i}`}
                        style={{
                          position: 'absolute',
                          left: i * dayWidth,
                          top: 0,
                          bottom: 0,
                          width: dayWidth,
                          background: '#fef9c3',
                          opacity: 0.4,
                        }}
                      />
                    ) : null
                  )}

                  {showFloat(rj) && (
                    <div
                      style={{
                        position: 'absolute',
                        left: (rj.earliestStart + rj.duration) * dayWidth,
                        top: 7,
                        width: rj.totalFloat * dayWidth,
                        height: 26,
                        background: 'repeating-linear-gradient(45deg, #e5e7eb, #e5e7eb 4px, #f3f4f6 4px, #f3f4f6 8px)',
                        borderRadius: 4,
                        border: '1px dashed #9ca3af',
                      }}
                      title={`总时差: ${rj.totalFloat}天`}
                    />
                  )}

                  <div
                    className={`gantt-bar ${rj.isCritical ? 'critical' : 'normal'}`}
                    style={{
                      left: rj.earliestStart * dayWidth,
                      width: Math.max(rj.duration * dayWidth - 2, dayWidth - 2),
                    }}
                    title={`${rj.name}\n工期: ${rj.duration}天\n最早开始: 第${rj.earliestStart}天\n最早完成: 第${rj.earliestFinish}天\n最晚开始: 第${rj.latestStart}天\n最晚完成: 第${rj.latestFinish}天\n总时差: ${rj.totalFloat}天\n自由时差: ${rj.freeFloat}天${
                      rj.isCritical ? '\n⭐ 关键路径作业' : ''
                    }`}
                  >
                    {rj.duration * dayWidth > 40 && (
                      <span className="gantt-bar-label">{rj.duration}d</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
