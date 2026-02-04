import React, { useState, useCallback, useRef } from 'react';
import { useRules } from '../../context/RuleContext';
import { parseOrderFile, exportResults } from '../../lib/fileParser';
import { calculateBatch } from '../../lib/calculator';
import type { Order, BatchResult } from '../../lib/types';

export function BatchCalculator() {
  const { rules } = useRules();
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setError('');
    setLoading(true);
    setResult(null);
    
    try {
      const parsedOrders = await parseOrderFile(file);
      setOrders(parsedOrders);
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件解析失败');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleCalculate = useCallback(() => {
    if (!selectedRuleId) {
      setError('请选择结算规则');
      return;
    }
    
    const rule = rules.find(r => r.id === selectedRuleId);
    if (!rule) {
      setError('规则不存在');
      return;
    }

    const batchResult = calculateBatch(rule, orders);
    setResult(batchResult);
  }, [selectedRuleId, rules, orders]);

  const handleExport = useCallback(() => {
    if (result) {
      exportResults(result.results, `运费结算_${result.ruleName}`);
    }
  }, [result]);

  const handleClear = useCallback(() => {
    setOrders([]);
    setResult(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">批量运费结算</h1>
        <p className="page-description">导入订单数据，批量计算运费并导出结果</p>
      </div>

      {/* 规则选择 */}
      <div className="card">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">选择结算规则</label>
          <select 
            className="form-select"
            value={selectedRuleId}
            onChange={e => setSelectedRuleId(e.target.value)}
          >
            <option value="">-- 请选择规则 --</option>
            {rules.map(rule => (
              <option key={rule.id} value={rule.id}>
                {rule.name} ({rule.type === 'mode1' ? '首重+续重' : '面单+费率'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 文件上传 */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">导入订单</h3>
          {orders.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={handleClear}>
              清除数据
            </button>
          )}
        </div>

        {orders.length === 0 ? (
          <div 
            className={`file-upload ${dragOver ? 'dragover' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="file-upload-icon">📁</div>
            <p className="file-upload-text">
              {loading ? '正在解析文件...' : '点击或拖拽文件到此处上传'}
            </p>
            <p className="file-upload-hint">
              支持 CSV、Excel (.xlsx/.xls) 格式，需包含运单号、目的地、重量列
            </p>
            <input 
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleInputChange}
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon primary">📦</div>
                <div className="stat-content">
                  <h4>{orders.length}</h4>
                  <p>订单数量</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon success">⚖️</div>
                <div className="stat-content">
                  <h4>{orders.reduce((sum, o) => sum + o.weight, 0).toFixed(2)}</h4>
                  <p>总重量 (kg)</p>
                </div>
              </div>
            </div>

            <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>序号</th>
                    <th>运单号</th>
                    <th>目的地</th>
                    <th>重量 (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 100).map((order, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{order.waybillNo}</td>
                      <td>{order.destination}</td>
                      <td>{order.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length > 100 && (
                <p style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)' }}>
                  仅显示前 100 条，共 {orders.length} 条记录
                </p>
              )}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button 
                className="btn btn-primary btn-lg"
                onClick={handleCalculate}
                disabled={!selectedRuleId}
              >
                🧮 开始计算
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ 
            marginTop: '16px', 
            padding: '12px 16px', 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid var(--error-500)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--error-500)'
          }}>
            {error}
          </div>
        )}
      </div>

      {/* 计算结果 */}
      {result && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">计算结果</h3>
            <button className="btn btn-success" onClick={handleExport}>
              📥 导出 Excel
            </button>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon primary">📊</div>
              <div className="stat-content">
                <h4>{result.totalOrders}</h4>
                <p>总订单数</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon success">✅</div>
              <div className="stat-content">
                <h4>{result.successCount}</h4>
                <p>成功计算</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon error">❌</div>
              <div className="stat-content">
                <h4>{result.errorCount}</h4>
                <p>计算失败</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon warning">💰</div>
              <div className="stat-content">
                <h4>¥{result.totalPrice.toFixed(2)}</h4>
                <p>总运费</p>
              </div>
            </div>
          </div>

          <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>运单号</th>
                  <th>目的地</th>
                  <th>原始重量</th>
                  <th>计费重量</th>
                  <th>基础费用</th>
                  <th>续重/重量费</th>
                  <th>区域加价</th>
                  <th>总价</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r, index) => (
                  <tr key={index} style={r.error ? { background: 'rgba(239, 68, 68, 0.1)' } : {}}>
                    <td>{r.waybillNo}</td>
                    <td>{r.destination}</td>
                    <td>{r.originalWeight}</td>
                    <td>{r.weight}</td>
                    <td>¥{r.breakdown.baseFee.toFixed(2)}</td>
                    <td>¥{r.breakdown.continuedFee.toFixed(2)}</td>
                    <td>¥{r.breakdown.areaCharge.toFixed(2)}</td>
                    <td style={{ fontWeight: 600 }}>¥{r.price.toFixed(2)}</td>
                    <td style={{ color: 'var(--error-500)' }}>{r.error || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
