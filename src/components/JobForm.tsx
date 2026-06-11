import { useState } from 'react'
import type { Job, ResourceRequirement } from '../types'

interface Props {
  jobs: Job[]
  onJobsChange: (jobs: Job[]) => void
}

export function JobForm({ jobs, onJobsChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Job>>({
    id: '',
    name: '',
    duration: 1,
    dependencies: [],
    resources: [],
    earliestStart: 0,
    crashDuration: undefined,
    crashCostPerDay: undefined,
  })
  const [depInput, setDepInput] = useState('')
  const [resType, setResType] = useState('')
  const [resQty, setResQty] = useState(1)

  const startNew = () => {
    setEditingId(null)
    setFormData({
      id: `J${String(jobs.length + 1).padStart(3, '0')}`,
      name: '',
      duration: 1,
      dependencies: [],
      resources: [],
      earliestStart: 0,
      crashDuration: undefined,
      crashCostPerDay: undefined,
    })
    setDepInput('')
    setResType('')
    setResQty(1)
  }

  const startEdit = (job: Job) => {
    setEditingId(job.id)
    setFormData({ ...job })
    setDepInput(job.dependencies.join(', '))
    setResType('')
    setResQty(1)
  }

  const handleSubmit = () => {
    if (!formData.id || !formData.name || formData.duration === undefined) return

    const deps = depInput
      .split(/[,，\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    const job: Job = {
      id: formData.id.trim(),
      name: formData.name.trim(),
      duration: Math.max(1, formData.duration),
      dependencies: deps,
      resources: formData.resources || [],
      earliestStart: formData.earliestStart || 0,
      crashDuration:
        formData.crashDuration !== undefined && formData.crashDuration > 0
          ? Math.min(formData.crashDuration, formData.duration)
          : undefined,
      crashCostPerDay:
        formData.crashCostPerDay !== undefined && formData.crashCostPerDay > 0
          ? formData.crashCostPerDay
          : undefined,
    }

    if (editingId) {
      const idx = jobs.findIndex((j) => j.id === editingId)
      if (idx >= 0) {
        const newJobs = [...jobs]
        newJobs[idx] = job
        onJobsChange(newJobs)
      }
    } else {
      if (jobs.some((j) => j.id === job.id)) {
        alert(`作业ID ${job.id} 已存在`)
        return
      }
      onJobsChange([...jobs, job])
    }
    startNew()
  }

  const deleteJob = (id: string) => {
    if (!confirm(`确定要删除作业 ${id} 吗？`)) return
    const newJobs = jobs.filter((j) => j.id !== id)
    onJobsChange(
      newJobs.map((j) => ({
        ...j,
        dependencies: j.dependencies.filter((d) => d !== id),
      }))
    )
    if (editingId === id) startNew()
  }

  const addResource = () => {
    if (!resType.trim() || resQty < 1) return
    const existing = formData.resources || []
    setFormData({
      ...formData,
      resources: [...existing.filter((r) => r.resourceType !== resType.trim()), { resourceType: resType.trim(), quantity: resQty }],
    })
    setResType('')
    setResQty(1)
  }

  const removeResource = (type: string) => {
    setFormData({
      ...formData,
      resources: (formData.resources || []).filter((r) => r.resourceType !== type),
    })
  }

  return (
    <div>
      <div className="toolbar">
        <button className="btn btn-primary btn-sm" onClick={startNew}>
          + 新增作业
        </button>
      </div>

      <div className="panel" style={{ padding: '16px', background: '#f9fafb' }}>
        <div className="panel-title" style={{ marginBottom: '12px', fontSize: '15px' }}>
          {editingId ? `编辑作业: ${editingId}` : '新增作业'}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>作业ID</label>
            <input
              type="text"
              value={formData.id || ''}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="如 J001"
            />
          </div>
          <div className="form-group">
            <label>工期（天）</label>
            <input
              type="number"
              min={1}
              value={formData.duration || 1}
              onChange={(e) =>
                setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })
              }
            />
          </div>
        </div>

        <div className="form-group">
          <label>作业名称</label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="如 反应堆顶盖拆除"
          />
        </div>

        <div className="form-group">
          <label>前置依赖（多个用逗号分隔）</label>
          <input
            type="text"
            value={depInput}
            onChange={(e) => setDepInput(e.target.value)}
            placeholder="如 J001, J002"
          />
          <div className="hint">填写前置作业的ID，留空表示无依赖</div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>最早开始时间（天）</label>
            <input
              type="number"
              min={0}
              value={formData.earliestStart || 0}
              onChange={(e) =>
                setFormData({ ...formData, earliestStart: parseInt(e.target.value) || 0 })
              }
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>最短工期（天）</label>
            <input
              type="number"
              min={1}
              value={formData.crashDuration || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  crashDuration: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              placeholder="赶工后的最短工期"
            />
          </div>
          <div className="form-group">
            <label>赶工成本（元/天）</label>
            <input
              type="number"
              min={0}
              value={formData.crashCostPerDay || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  crashCostPerDay: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              placeholder="每压缩1天的成本"
            />
          </div>
        </div>

        <div className="form-group">
          <label>资源/工种需求</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              value={resType}
              onChange={(e) => setResType(e.target.value)}
              placeholder="如 焊工班组"
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min={1}
              value={resQty}
              onChange={(e) => setResQty(parseInt(e.target.value) || 1)}
              style={{ width: '80px' }}
            />
            <button className="btn btn-secondary btn-sm" onClick={addResource}>
              添加
            </button>
          </div>
          {(formData.resources || []).length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(formData.resources || []).map((r) => (
                <span
                  key={r.resourceType}
                  className="tag tag-info"
                  style={{ cursor: 'pointer' }}
                  onClick={() => removeResource(r.resourceType)}
                  title="点击删除"
                >
                  {r.resourceType} ×{r.quantity} ×
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button className="btn btn-primary" onClick={handleSubmit}>
            {editingId ? '保存修改' : '添加作业'}
          </button>
          {editingId && (
            <button className="btn btn-secondary" onClick={startNew}>
              取消
            </button>
          )}
        </div>
      </div>

      <div className="panel-title" style={{ marginTop: '20px' }}>
        作业清单 <span className="badge">{jobs.length} 项</span>
      </div>

      {jobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">暂无作业数据</div>
          <div>请添加上方表单添加作业，或加载示例数据</div>
        </div>
      ) : (
        <div className="job-list">
          {jobs.map((job) => (
            <div key={job.id} className="job-item">
              <div className="job-item-main">
                <div className="job-item-name">
                  [{job.id}] {job.name}
                </div>
                <div className="job-item-meta">
                  工期: {job.duration}天
                  {job.dependencies.length > 0 && ` | 前置: ${job.dependencies.join(', ')}`}
                  {job.resources.length > 0 &&
                    ` | 资源: ${job.resources
                      .map((r: ResourceRequirement) => `${r.resourceType}×${r.quantity}`)
                      .join(', ')}`}
                </div>
              </div>
              <div className="job-item-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => startEdit(job)}>
                  编辑
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteJob(job.id)}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
