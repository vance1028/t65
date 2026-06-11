import { useState, useMemo, useEffect } from 'react'
import type { Job } from './types'
import { computeCPM } from './algorithms/cpm'
import { detectCycles } from './algorithms/cycleDetection'
import type { ResourceAvailability } from './algorithms/resourceLoad'
import { sampleOutageJobs, sampleResourceAvailabilities } from './data/sampleData'
import { JobForm } from './components/JobForm'
import { GanttChart } from './components/GanttChart'
import { AnalysisPanel } from './components/AnalysisPanel'
import { CrashAnalysisPanel } from './components/CrashAnalysisPanel'
import { ResourceLoadPanel } from './components/ResourceLoadPanel'

type TabId = 'gantt' | 'analysis' | 'crash' | 'resource'

function App() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [availabilities, setAvailabilities] = useState<ResourceAvailability[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('gantt')
  const [showCycleTest, setShowCycleTest] = useState(false)

  useEffect(() => {
    setJobs(sampleOutageJobs)
    setAvailabilities(sampleResourceAvailabilities)
  }, [])

  const cpmResult = useMemo(() => computeCPM(jobs), [jobs])

  const cycleCheck = useMemo(() => detectCycles(jobs), [jobs])

  const loadSample = () => {
    setJobs(sampleOutageJobs)
    setAvailabilities(sampleResourceAvailabilities)
  }

  const clearAll = () => {
    if (confirm('确定要清空所有作业数据吗？')) {
      setJobs([])
      setAvailabilities([])
    }
  }

  const addCycleExample = () => {
    const cycleJobs: Job[] = [
      {
        id: 'A',
        name: '作业A（制造环）',
        duration: 2,
        dependencies: ['C'],
        resources: [],
      },
      {
        id: 'B',
        name: '作业B（制造环）',
        duration: 3,
        dependencies: ['A'],
        resources: [],
      },
      {
        id: 'C',
        name: '作业C（制造环）',
        duration: 1,
        dependencies: ['B'],
        resources: [],
      },
    ]
    setJobs([...jobs, ...cycleJobs])
    setShowCycleTest(true)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>⚛️ 核电站大修工序网络计划分析工具</h1>
        <p>
          关键路径法（CPM）计算 · 甘特图可视化 · 赶工推演 · 资源负荷检查 ·
          纯前端运行
        </p>
      </header>

      <div className="toolbar" style={{ marginBottom: '20px' }}>
        <button className="btn btn-success btn-sm" onClick={loadSample}>
          📋 加载核电站大修示例数据
        </button>
        <button className="btn btn-secondary btn-sm" onClick={addCycleExample}>
          🔄 测试循环依赖检测
        </button>
        <button className="btn btn-danger btn-sm" onClick={clearAll}>
          🗑️ 清空所有
        </button>
      </div>

      {showCycleTest && cycleCheck.hasCycle && (
        <div className="alert alert-error">
          🔴 循环依赖检测触发！检测到环路：
          <strong> {cycleCheck.cycle?.join(' → ')}</strong>
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginLeft: '12px' }}
            onClick={() => {
              setJobs(jobs.filter((j) => !['A', 'B', 'C'].includes(j.id)))
              setShowCycleTest(false)
            }}
          >
            清除测试数据
          </button>
        </div>
      )}

      {cpmResult.error && (
        <div className="alert alert-error">
          ❌ 计算错误：{cpmResult.error}
        </div>
      )}

      <div className="main-layout">
        <div>
          <div className="panel">
            <div className="panel-title">
              作业数据管理
              <span className="badge">{jobs.length} 项</span>
            </div>
            <JobForm jobs={jobs} onJobsChange={setJobs} />
          </div>
        </div>

        <div>
          <div className="panel">
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'gantt' ? 'active' : ''}`}
                onClick={() => setActiveTab('gantt')}
              >
                📊 甘特图
              </button>
              <button
                className={`tab ${activeTab === 'analysis' ? 'active' : ''}`}
                onClick={() => setActiveTab('analysis')}
              >
                📈 CPM分析
              </button>
              <button
                className={`tab ${activeTab === 'crash' ? 'active' : ''}`}
                onClick={() => setActiveTab('crash')}
              >
                ⚡ 赶工推演
              </button>
              <button
                className={`tab ${activeTab === 'resource' ? 'active' : ''}`}
                onClick={() => setActiveTab('resource')}
              >
                🔧 资源负荷
              </button>
            </div>

            {activeTab === 'gantt' && <GanttChart cpmResult={cpmResult} />}
            {activeTab === 'analysis' && <AnalysisPanel cpmResult={cpmResult} />}
            {activeTab === 'crash' && (
              <CrashAnalysisPanel jobs={jobs} cpmResult={cpmResult} />
            )}
            {activeTab === 'resource' && (
              <ResourceLoadPanel
                cpmResult={cpmResult}
                availabilities={availabilities}
                onAvailabilitiesChange={setAvailabilities}
              />
            )}
          </div>

          <div className="panel">
            <div className="panel-title">使用说明</div>
            <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.8 }}>
              <p>
                <strong>1. 添加作业：</strong>
                在左侧表单中输入作业ID、名称、工期、前置依赖ID、资源需求等信息。
              </p>
              <p>
                <strong>2. 关键路径计算：</strong>
                系统自动采用CPM算法，先正向推算最早开始/完成时间，再反向推算最晚开始/完成时间，
                总时差为零的作业构成关键路径。
              </p>
              <p>
                <strong>3. 甘特图查看：</strong>
                红色为关键路径作业，蓝色为普通作业，斜线填充区域为总时差额度。
                鼠标悬停可查看详细时间参数。
              </p>
              <p>
                <strong>4. 赶工推演：</strong>
                可设置目标工期让系统智能推荐最优压缩方案，或手动调整各作业压缩天数，
                系统会计算成本并检测关键路径是否转移。
              </p>
              <p>
                <strong>5. 资源负荷检查：</strong>
                设置各工种/设备可用数量，系统会检测时段过载冲突，提示需要错峰排程。
              </p>
              <p>
                <strong>6. 循环检测：</strong>
                若依赖关系形成环路，系统会立即报错并标出环路路径。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
