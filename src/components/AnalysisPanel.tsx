import type { CPMResult } from '../types'

interface Props {
  cpmResult: CPMResult
}

export function AnalysisPanel({ cpmResult }: Props) {
  if (cpmResult.error) {
    return (
      <div className="panel">
        <div className="alert alert-error">{cpmResult.error}</div>
      </div>
    )
  }

  const jobsArray = Array.from(cpmResult.jobs.values())
  const criticalCount = jobsArray.filter((j) => j.isCritical).length
  const avgFloat =
    jobsArray.length > 0
      ? (jobsArray.reduce((sum, j) => sum + j.totalFloat, 0) / jobsArray.length).toFixed(1)
      : '0'

  return (
    <div className="panel">
      <div className="panel-title">
        工期分析结果
        <span className="badge">{jobsArray.length} 项作业</span>
      </div>

      <div className="info-grid" style={{ marginBottom: '20px' }}>
        <div className="info-card danger">
          <div className="info-card-label">总工期</div>
          <div className="info-card-value">
            {cpmResult.totalDuration}
            <small>天</small>
          </div>
        </div>
        <div className="info-card">
          <div className="info-card-label">作业总数</div>
          <div className="info-card-value">{jobsArray.length}</div>
        </div>
        <div className="info-card warning">
          <div className="info-card-label">关键作业数</div>
          <div className="info-card-value">{criticalCount}</div>
        </div>
        <div className="info-card success">
          <div className="info-card-label">平均总时差</div>
          <div className="info-card-value">
            {avgFloat}
            <small>天</small>
          </div>
        </div>
      </div>

      <div className="panel-title" style={{ fontSize: '15px', marginTop: '0' }}>
        关键路径
        <span className="badge">{cpmResult.criticalPaths.length} 条</span>
      </div>

      {cpmResult.criticalPaths.length === 0 ? (
        <div className="empty-state" style={{ padding: '20px' }}>
          未找到关键路径
        </div>
      ) : (
        <div style={{ marginBottom: '20px' }}>
          {cpmResult.criticalPaths.map((path, idx) => {
            const pathDuration = path.reduce((sum, id) => {
              const job = cpmResult.jobs.get(id)
              return sum + (job?.duration || 0)
            }, 0)
            return (
              <div
                key={idx}
                style={{
                  marginBottom: '8px',
                  padding: '10px 14px',
                  background: '#fef2f2',
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                }}
              >
                <div style={{ marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#991b1b' }}>
                  路径 #{idx + 1}（{pathDuration} 天）
                </div>
                <div className="critical-path-list">
                  {path.map((id, i) => {
                    const job = cpmResult.jobs.get(id)
                    return (
                      <span key={id}>
                        <span className="critical-path-node">
                          {job?.name || id}
                        </span>
                        {i < path.length - 1 && <span className="critical-path-arrow"> → </span>}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="panel-title" style={{ fontSize: '15px', marginTop: '0' }}>
        作业时间参数表
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>作业名称</th>
              <th>工期</th>
              <th>最早开始</th>
              <th>最早完成</th>
              <th>最晚开始</th>
              <th>最晚完成</th>
              <th>总时差</th>
              <th>自由时差</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {jobsArray.map((j) => (
              <tr key={j.id}>
                <td className={j.isCritical ? 'critical' : ''}>{j.id}</td>
                <td className={j.isCritical ? 'critical' : ''}>{j.name}</td>
                <td>{j.duration}d</td>
                <td>第{j.earliestStart}天</td>
                <td>第{j.earliestFinish}天</td>
                <td>第{j.latestStart}天</td>
                <td>第{j.latestFinish}天</td>
                <td>
                  <span
                    className={`tag ${
                      j.totalFloat === 0 ? 'tag-danger' : j.totalFloat <= 2 ? 'tag-warning' : 'tag-success'
                    }`}
                  >
                    {j.totalFloat}d
                  </span>
                </td>
                <td>
                  <span className="tag tag-gray">{j.freeFloat}d</span>
                </td>
                <td>
                  {j.isCritical ? (
                    <span className="tag tag-danger">关键</span>
                  ) : j.totalFloat <= 2 ? (
                    <span className="tag tag-warning">较紧</span>
                  ) : (
                    <span className="tag tag-success">宽松</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
