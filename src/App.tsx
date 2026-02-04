import { useState } from 'react';
import { RuleProvider } from './context/RuleContext';
import { RuleManagement } from './components/RuleManagement/RuleManagement';
import { BatchCalculator } from './components/BatchCalculator/BatchCalculator';
import { QuickQuery } from './components/QuickQuery/QuickQuery';
import './index.css';

type Page = 'rules' | 'batch' | 'quick';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('rules');

  return (
    <RuleProvider>
      <div className="app">
        {/* 侧边栏 */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <div className="sidebar-logo-icon">📦</div>
              <span className="sidebar-logo-text">运费结算</span>
            </div>
          </div>
          
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${currentPage === 'rules' ? 'active' : ''}`}
              onClick={() => setCurrentPage('rules')}
            >
              <span className="nav-icon">📋</span>
              <span className="nav-text">规则管理</span>
            </button>
            
            <button 
              className={`nav-item ${currentPage === 'batch' ? 'active' : ''}`}
              onClick={() => setCurrentPage('batch')}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-text">批量结算</span>
            </button>
            
            <button 
              className={`nav-item ${currentPage === 'quick' ? 'active' : ''}`}
              onClick={() => setCurrentPage('quick')}
            >
              <span className="nav-icon">🔍</span>
              <span className="nav-text">快速查询</span>
            </button>
          </nav>

          <div style={{ 
            padding: '16px', 
            borderTop: '1px solid var(--border-color)',
            marginTop: 'auto'
          }}>
            <div style={{ 
              fontSize: '12px', 
              color: 'var(--text-muted)',
              textAlign: 'center' 
            }}>
              运费结算工具 v1.0
            </div>
          </div>
        </aside>

        {/* 主内容区 */}
        <main className="main-content">
          {currentPage === 'rules' && <RuleManagement />}
          {currentPage === 'batch' && <BatchCalculator />}
          {currentPage === 'quick' && <QuickQuery />}
        </main>
      </div>
    </RuleProvider>
  );
}

export default App;
