import { useState, useMemo } from 'react';
import { useRules } from '../../context/RuleContext';
import { calculateFreight, formatPrice } from '../../lib/calculator';
import { PROVINCES } from '../../lib/types';
import type { Province } from '../../lib/types';

export function QuickQuery() {
  const { rules } = useRules();
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [destination, setDestination] = useState<Province | ''>('');
  const [weight, setWeight] = useState('');

  const selectedRule = useMemo(() => {
    return rules.find(r => r.id === selectedRuleId);
  }, [rules, selectedRuleId]);

  const handleCalculate = () => {
    // 由于使用 liveResult 实时计算，这个函数可以为空
  };

  // 实时计算
  const liveResult = useMemo(() => {
    if (!selectedRule || !destination || !weight) {
      return null;
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      return null;
    }

    return calculateFreight(selectedRule, {
      waybillNo: 'QUERY',
      destination,
      weight: weightNum
    });
  }, [selectedRule, destination, weight]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">快速查询</h1>
        <p className="page-description">输入目的地和重量，快速预览运费价格</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* 查询表单 */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">查询条件</h3>
          </div>

          <div className="form-group">
            <label className="form-label">结算规则</label>
            <select 
              className="form-select"
              value={selectedRuleId}
              onChange={e => {
                setSelectedRuleId(e.target.value);
              }}
            >
              <option value="">-- 请选择规则 --</option>
              {rules.map(rule => (
                <option key={rule.id} value={rule.id}>
                  {rule.name} ({rule.type === 'mode1' ? '首重+续重' : '面单+费率'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">目的地省份</label>
            <select 
              className="form-select"
              value={destination}
              onChange={e => {
                setDestination(e.target.value as Province);
              }}
            >
              <option value="">-- 请选择省份 --</option>
              {PROVINCES.map(province => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">重量 (kg)</label>
            <input 
              type="number"
              className="form-input"
              placeholder="输入包裹重量"
              value={weight}
              onChange={e => {
                setWeight(e.target.value);
              }}
              min={0}
              step={0.01}
            />
          </div>

          <button 
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={handleCalculate}
            disabled={!selectedRuleId || !destination || !weight}
          >
            🔍 查询价格
          </button>
        </div>

        {/* 实时结果 */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">价格预览</h3>
          </div>

          {!selectedRuleId ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon">📝</div>
              <p className="empty-state-description">请先选择结算规则</p>
            </div>
          ) : !destination || !weight ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon">🔍</div>
              <p className="empty-state-description">请填写目的地和重量</p>
            </div>
          ) : liveResult?.error ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon">⚠️</div>
              <p className="empty-state-description" style={{ color: 'var(--error-500)' }}>
                {liveResult.error}
              </p>
            </div>
          ) : liveResult ? (
            <div>
              <div className="query-result">
                <p className="query-result-label">预估运费</p>
                <p className="query-result-value">
                  ¥{formatPrice(liveResult.price)}
                </p>
              </div>

              <div className="price-breakdown">
                <div className="price-row">
                  <span className="price-label">原始重量</span>
                  <span className="price-value">{liveResult.originalWeight} kg</span>
                </div>
                <div className="price-row">
                  <span className="price-label">计费重量</span>
                  <span className="price-value">{liveResult.weight} kg</span>
                </div>
                <div className="price-row">
                  <span className="price-label">
                    {selectedRule?.type === 'mode1' ? '首重费用' : '面单费用'}
                  </span>
                  <span className="price-value">¥{formatPrice(liveResult.breakdown.baseFee)}</span>
                </div>
                <div className="price-row">
                  <span className="price-label">
                    {selectedRule?.type === 'mode1' ? '续重费用' : '重量费用'}
                  </span>
                  <span className="price-value">¥{formatPrice(liveResult.breakdown.continuedFee)}</span>
                </div>
                <div className="price-row">
                  <span className="price-label">区域加价</span>
                  <span className="price-value">¥{formatPrice(liveResult.breakdown.areaCharge)}</span>
                </div>
                <div className="price-row total">
                  <span className="price-label">合计</span>
                  <span className="price-value">¥{formatPrice(liveResult.price)}</span>
                </div>
              </div>

              {selectedRule && (
                <div style={{ 
                  marginTop: '20px', 
                  padding: '12px 16px', 
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  color: 'var(--text-muted)'
                }}>
                  <strong>计费规则：</strong>{selectedRule.name}
                  {selectedRule.type === 'mode1' && (
                    <span>（首重阈值：{selectedRule.firstWeightThreshold}kg）</span>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* 规则说明 */}
      {selectedRule && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">当前规则详情</h3>
            <span className={`rule-badge ${selectedRule.type}`}>
              {selectedRule.type === 'mode1' ? '首重+续重模式' : '面单+费率模式'}
            </span>
          </div>

          {selectedRule.description && (
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {selectedRule.description}
            </p>
          )}

          {selectedRule.type === 'mode1' ? (
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              <p><strong>计费方式：</strong></p>
              <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                <li>当包裹重量 ≤ {selectedRule.firstWeightThreshold}kg 时，按首重价格计费</li>
                <li>当包裹重量 &gt; {selectedRule.firstWeightThreshold}kg 时，超出部分按续重单价计算</li>
                <li>续重不足 1kg 时向上取整</li>
                <li>最终价格 = 首重费用 + 续重费用 + 区域加价</li>
              </ul>
            </div>
          ) : (
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              <p><strong>计费方式：</strong></p>
              <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                <li>固定面单费 + 重量 × 费率 + 区域加价</li>
                <li>重量不足 1kg 时向上取整</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
