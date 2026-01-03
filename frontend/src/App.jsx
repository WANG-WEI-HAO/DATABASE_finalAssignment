import { useState, useEffect } from 'react'
import './App.css'

const API_BASE = 'http://127.0.0.1:8000/api'

function App() {
  const [status, setStatus] = useState(null)
  const [quote, setQuote] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  // Search State
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResult, setSearchResult] = useState(null)
  const [isSearching, setIsSearching] = useState(false)

  const [logs, setLogs] = useState([])

  // Simulation Snapshot (10 Targeted Stocks)
  const [marketSnapshot, setMarketSnapshot] = useState([])

  const fetchData = async () => {
    try {
      // Fetch System Status
      const statusRes = await fetch(`${API_BASE}/status`)
      const statusData = await statusRes.json()
      setStatus(statusData)

      // Fetch Transactions
      const txRes = await fetch(`${API_BASE}/transactions`)
      const txData = await txRes.json()

      setQuote({ transactions: txData.data })

      // Fetch Logs
      const logsRes = await fetch(`${API_BASE}/logs`)
      const logsData = await logsRes.json()
      setLogs(logsData)

      // Fetch Market Snapshot (New)
      const snapshotRes = await fetch(`${API_BASE}/market/snapshot`)
      const snapshotData = await snapshotRes.json()
      setMarketSnapshot(snapshotData)

      setLastUpdated(new Date())
    } catch (error) {
      console.error("Fetch error:", error)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery) return

    setIsSearching(true)
    try {
      const res = await fetch(`${API_BASE}/search?q=${searchQuery}`)
      const data = await res.json()
      setSearchResult(data)
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (date) => {
    return date.toLocaleTimeString('zh-TW')
  }

  // Simple SVG Chart Generator
  const renderChart = (history) => {
    if (!history || history.length < 2) return null
    const min = Math.min(...history)
    const max = Math.max(...history)
    const range = max - min || 1
    const width = 300
    const height = 100

    const points = history.map((p, i) => {
      const x = (i / (history.length - 1)) * width
      const y = height - ((p - min) / range) * height
      return `${x},${y}`
    }).join(' ')

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00f2fe" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M0,${height} L0,${height} ${points} L${width},${height} Z`} fill="url(#chartGradient)" />
        <polyline points={points} fill="none" stroke="#00f2fe" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    )
  }

  return (
    <div className="container">
      <header className="header">
        <div className="mode-indicator">
          <div className="indicator-dot"></div>
          目前模式: 市場模擬系統 (Simulation Mode)
        </div>

        <h1 className="title">TW-Stock-Quant</h1>
        <div className="subtitle">Real-time Quantitative Trading System Core</div>

        <form onSubmit={handleSearch} className="search-bar">
          <input
            type="text"
            placeholder="輸入股票代碼 (Ex: 2330)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" disabled={isSearching}>
            {isSearching ? '...' : '搜尋'}
          </button>
        </form>
      </header>

      {/* Search Result Section - The "Double Database" Visualization */}
      {searchResult && (
        <div className="search-overlay">
          <div className="search-modal">
            <div className="modal-header">
              <h2>股票分析: {searchResult.symbol}</h2>
              <button onClick={() => setSearchResult(null)} className="close-btn">×</button>
            </div>

            <div className="db-integration-badges">
              <span className="badge-db source-a">即時行情資料庫 (Live DB)</span>
              <span className="connector">+</span>
              <span className="badge-db source-b">交易記錄資料庫 (Tx DB)</span>
            </div>

            <div className="search-grid">
              {/* Left: Market Data (Source 1) */}
              <div className="search-card market-card">
                <h3>即時市場數據</h3>
                <div className="price-huge">
                  {searchResult.market_data.closePrice} <small>TWD</small>
                </div>
                <div className="chart-container">
                  {renderChart(searchResult.market_data.history)}
                </div>
              </div>

              {/* Right: Transactions (Source 2) */}
              <div className="search-card tx-card">
                <h3>歷史交易記錄</h3>
                <div className="tx-list">
                  {searchResult.transactions.length > 0 ? (
                    searchResult.transactions.map(t => (
                      <div key={t.id} className="mini-tx-row">
                        <span className={`pill ${t.action}`}>{t.action}</span>
                        <span>{t.price}</span>
                        <span className="date">{t.date.split(' ')[0]}</span>
                      </div>
                    ))
                  ) : (
                    <div className="no-data">資料庫中無此股票交易記錄</div>
                  )}
                </div>
              </div>

              {/* System Log Console (Flow Visualization) */}
              <div className="console-log">
                <div className="console-header">System Trace Log (SQL/Redis Flow)</div>
                {searchResult.trace_log ? (
                  searchResult.trace_log.map((log, idx) => {
                    let colorClass = "";
                    if (log.includes("Redis")) colorClass = "red";
                    if (log.includes("SQL")) colorClass = "blue";
                    if (log.includes("Sim")) colorClass = "yellow";
                    if (log.includes("✅")) colorClass = "green";

                    return (
                      <div key={idx} className={`log-entry ${colorClass}`}>
                        <span style={{ opacity: 0.5 }}>{idx + 1}.</span> {log}
                      </div>
                    )
                  })
                ) : (
                  <div className="log-entry">No trace data available.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {/* System Status Card */}
        <div className="card" style={{ gridColumn: "span 2" }}>
          <div className="card-header">System Health</div>
          {status ? (
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">Redis Cache</span>
                <span className="status-value">{status.redis.status}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Database</span>
                <span className="status-value">{status.mysql.status}</span>
              </div>

              {/* Firebase Status (Simulated) */}
              <div className="status-item">
                <span className="status-label">Firebase (Push)</span>
                <span className="status-value">Online (Simulated) 🟠</span>
              </div>

              <div className="status-item">
                <span className="status-label">Data Source</span>
                <span className="status-value">{status.broker}</span>
              </div>
            </div>
          ) : (
            <div className="loading">Connecting to backend...</div>
          )}
        </div>

        {/* Simulation Market Snapshot - Specific 10 Stocks */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <span>Simulation Market Snapshot (10 Stocks)</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '1rem'
          }}>
            {marketSnapshot.length > 0 ? (
              marketSnapshot.map(s => (
                <div key={s.symbol} style={{
                  background: 'rgba(255,255,255,0.05)',
                  padding: '0.8rem',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '0.8rem', color: '#8b949e' }}>{s.symbol}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '1rem', margin: '0.2rem 0' }}>
                    {s.closePrice.toFixed(1)}
                  </div>
                  <div style={{
                    color: s.change >= 0 ? '#ff7b72' : '#7ee787', // Taiwan Color: Red=Up, Green=Down
                    fontSize: '0.8rem'
                  }}>
                    {s.change >= 0 ? '▲' : '▼'} {Math.abs(s.change).toFixed(2)}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#8b949e', marginTop: '4px' }}>
                    {s.name.split(' ')[0]}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: 'span 5', textAlign: 'center', padding: '1rem' }}>
                Loading snapshot...
              </div>
            )}
          </div>
        </div>

        {/* Redis Monitor Block */}
        <div className="card" style={{ gridRow: "span 2", borderColor: '#ff7b72' }}>
          <div className="card-header" style={{ color: '#ff7b72' }}>
            <span>Redis Cache Activity (In-Memory)</span>
            <span className="pulse-dot" style={{ background: '#ff7b72', boxShadow: '0 0 8px #ff7b72' }}></span>
          </div>

          <div style={{ marginBottom: '0.5rem', color: '#ff7b72', fontSize: '0.8rem', fontWeight: 'bold' }}>
            WRITE RATE: {status?.redis?.ops || 0} ops/sec
          </div>

          <div className="monitor-container" style={{
            height: '270px',
            overflowY: 'auto',
            background: '#0d1117',
            borderRadius: '8px',
            padding: '1rem',
            fontFamily: 'monospace',
            fontSize: '0.85rem'
          }}>
            {logs.filter(l => l.type === 'redis').length > 0 ? (
              logs.filter(l => l.type === 'redis').map((log, i) => (
                <div key={i} style={{ marginBottom: '0.5rem', display: 'flex', gap: '8px', borderBottom: '1px solid #30363d', paddingBottom: '4px' }}>
                  <span style={{ color: '#8b949e' }}>[{log.time}]</span>
                  <span style={{ color: '#ff7b72' }}>{log.msg}</span>
                </div>
              ))
            ) : (
              <div style={{ color: '#8b949e', textAlign: 'center', marginTop: '2rem' }}>
                Waiting for cache activity...
              </div>
            )}
          </div>
        </div>

        {/* SQL Monitor Block */}
        <div className="card" style={{ gridRow: "span 2", borderColor: '#79c0ff' }}>
          <div className="card-header" style={{ color: '#79c0ff' }}>
            <span>SQL Database Activity (Persistent)</span>
            <span className="pulse-dot" style={{ background: '#79c0ff', boxShadow: '0 0 8px #79c0ff' }}></span>
          </div>

          <div style={{ marginBottom: '0.5rem', color: '#79c0ff', fontSize: '0.8rem', fontWeight: 'bold' }}>
            INSERT RATE: {status?.mysql?.ops || 0} ops/sec
          </div>

          <div className="monitor-container" style={{
            height: '270px',
            overflowY: 'auto',
            background: '#0d1117',
            borderRadius: '8px',
            padding: '1rem',
            fontFamily: 'monospace',
            fontSize: '0.85rem'
          }}>
            {logs.filter(l => l.type === 'sql').length > 0 ? (
              logs.filter(l => l.type === 'sql').map((log, i) => (
                <div key={i} style={{ marginBottom: '0.5rem', display: 'flex', gap: '8px', borderBottom: '1px solid #30363d', paddingBottom: '4px' }}>
                  <span style={{ color: '#8b949e' }}>[{log.time}]</span>
                  <span style={{ color: '#79c0ff' }}>{log.msg}</span>
                </div>
              ))
            ) : (
              <div style={{ color: '#8b949e', textAlign: 'center', marginTop: '2rem' }}>
                Waiting for DB transactions...
              </div>
            )}
          </div>
        </div>

        {/* Database Transactions Card */}
        <div className="card" style={{ gridColumn: "span 2" }}>
          <div className="card-header">
            <span>Database Operations (Simulated)</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>Live Sync</span>
          </div>

          <div className="table-container">
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Time</th>
                  <th>Symbol</th>
                  <th>Side</th>
                  <th>Price</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {quote?.transactions?.map((tx) => (
                  <tr key={tx.id} className="fade-in-row">
                    <td>#{tx.id}</td>
                    <td>{tx.time}</td>
                    <td>{tx.symbol}</td>
                    <td>
                      <span className={`badge ${tx.action === 'BUY' ? 'buy' : 'sell'}`}>
                        {tx.action}
                      </span>
                    </td>
                    <td>{tx.price.toFixed(1)}</td>
                    <td>{tx.quantity}</td>
                  </tr>
                ))}
                {!quote?.transactions?.length && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '1rem', color: '#8b949e' }}>Waiting for data...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
