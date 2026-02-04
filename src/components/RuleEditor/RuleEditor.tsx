import React, { useState, useCallback } from 'react';
import type { Province, Mode1Rule, Mode2Rule, FreightRule, ProvincePriceMap, WeightTier } from '../../lib/types';
import { PROVINCES } from '../../lib/types';
import { generateId } from '../../lib/storage';

interface RuleEditorProps {
  rule?: FreightRule;
  onSave: (rule: FreightRule) => void;
  onCancel: () => void;
}

type RuleType = 'mode1' | 'mode2';

const emptyProvincePrices = (): ProvincePriceMap => {
  const prices: ProvincePriceMap = {};
  PROVINCES.forEach(p => { prices[p] = 0; });
  return prices;
};

// 默认阶梯配置
const defaultWeightTiers: WeightTier[] = [
  { maxWeight: 0.5, prices: emptyProvincePrices() },
  { maxWeight: 1, prices: emptyProvincePrices() },
  { maxWeight: 2, prices: emptyProvincePrices() },
  { maxWeight: 3, prices: emptyProvincePrices() },
];

export function RuleEditor({ rule, onSave, onCancel }: RuleEditorProps) {
  const [ruleType, setRuleType] = useState<RuleType>(rule?.type || 'mode1');
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  
  // 模式一配置
  const [firstWeightThreshold, setFirstWeightThreshold] = useState(
    rule?.type === 'mode1' ? rule.firstWeightThreshold : 3
  );
  const [useStepPricing, setUseStepPricing] = useState(
    rule?.type === 'mode1' ? rule.useStepPricing : true
  );
  const [firstWeightPrices, setFirstWeightPrices] = useState<ProvincePriceMap>(
    rule?.type === 'mode1' ? { ...emptyProvincePrices(), ...rule.firstWeightPrices } : emptyProvincePrices()
  );
  const [weightTiers, setWeightTiers] = useState<WeightTier[]>(
    rule?.type === 'mode1' && rule.weightTiers && rule.weightTiers.length > 0 
      ? rule.weightTiers 
      : defaultWeightTiers
  );
  const [overweightFirstPrices, setOverweightFirstPrices] = useState<ProvincePriceMap>(
    rule?.type === 'mode1' && rule.overweightFirstPrices 
      ? { ...emptyProvincePrices(), ...rule.overweightFirstPrices } 
      : emptyProvincePrices()
  );
  const [continuedWeightPrices, setContinuedWeightPrices] = useState<ProvincePriceMap>(
    rule?.type === 'mode1' ? { ...emptyProvincePrices(), ...rule.continuedWeightPrices } : emptyProvincePrices()
  );
  
  // 模式二配置
  const [fixedPrices, setFixedPrices] = useState<ProvincePriceMap>(
    rule?.type === 'mode2' ? { ...emptyProvincePrices(), ...rule.fixedPrices } : emptyProvincePrices()
  );
  const [weightRates, setWeightRates] = useState<ProvincePriceMap>(
    rule?.type === 'mode2' ? { ...emptyProvincePrices(), ...rule.weightRates } : emptyProvincePrices()
  );
  
  // 通用：区域加价
  const [areaCharges, setAreaCharges] = useState<ProvincePriceMap>(
    rule ? { ...emptyProvincePrices(), ...rule.areaCharges } : emptyProvincePrices()
  );
  
  const [activeTab, setActiveTab] = useState<'basic' | 'prices' | 'area'>('basic');
  const [activeTierIndex, setActiveTierIndex] = useState(0);

  const handlePriceChange = useCallback((
    setter: React.Dispatch<React.SetStateAction<ProvincePriceMap>>,
    province: Province,
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;
    setter(prev => ({ ...prev, [province]: numValue }));
  }, []);

  const handleBatchSet = useCallback((
    setter: React.Dispatch<React.SetStateAction<ProvincePriceMap>>,
    value: number
  ) => {
    const newPrices: ProvincePriceMap = {};
    PROVINCES.forEach(p => { newPrices[p] = value; });
    setter(newPrices);
  }, []);

  // 阶梯价格处理
  const handleTierPriceChange = useCallback((tierIndex: number, province: Province, value: string) => {
    const numValue = parseFloat(value) || 0;
    setWeightTiers(prev => {
      const newTiers = [...prev];
      newTiers[tierIndex] = {
        ...newTiers[tierIndex],
        prices: { ...newTiers[tierIndex].prices, [province]: numValue }
      };
      return newTiers;
    });
  }, []);

  const handleTierBatchSet = useCallback((tierIndex: number, value: number) => {
    setWeightTiers(prev => {
      const newTiers = [...prev];
      const newPrices: ProvincePriceMap = {};
      PROVINCES.forEach(p => { newPrices[p] = value; });
      newTiers[tierIndex] = { ...newTiers[tierIndex], prices: newPrices };
      return newTiers;
    });
  }, []);

  const handleTierWeightChange = useCallback((tierIndex: number, value: number) => {
    setWeightTiers(prev => {
      const newTiers = [...prev];
      newTiers[tierIndex] = { ...newTiers[tierIndex], maxWeight: value };
      return newTiers;
    });
  }, []);

  const addTier = useCallback(() => {
    setWeightTiers(prev => {
      const lastWeight = prev.length > 0 ? prev[prev.length - 1].maxWeight : 0;
      return [...prev, { maxWeight: lastWeight + 1, prices: emptyProvincePrices() }];
    });
  }, []);

  const removeTier = useCallback((index: number) => {
    if (weightTiers.length <= 1) return;
    setWeightTiers(prev => prev.filter((_, i) => i !== index));
    if (activeTierIndex >= weightTiers.length - 1) {
      setActiveTierIndex(Math.max(0, weightTiers.length - 2));
    }
  }, [weightTiers.length, activeTierIndex]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('请输入规则名称');
      return;
    }

    const now = Date.now();
    const baseData = {
      id: rule?.id || generateId(),
      name: name.trim(),
      description: description.trim(),
      areaCharges,
      createdAt: rule?.createdAt || now,
      updatedAt: now,
    };

    if (ruleType === 'mode1') {
      // 对阶梯按重量排序
      const sortedTiers = [...weightTiers].sort((a, b) => a.maxWeight - b.maxWeight);
      
      const mode1Rule: Mode1Rule = {
        ...baseData,
        type: 'mode1',
        firstWeightThreshold,
        useStepPricing,
        firstWeightPrices,
        weightTiers: useStepPricing ? sortedTiers : undefined,
        overweightFirstPrices,
        continuedWeightPrices,
      };
      onSave(mode1Rule);
    } else {
      const mode2Rule: Mode2Rule = {
        ...baseData,
        type: 'mode2',
        fixedPrices,
        weightRates,
      };
      onSave(mode2Rule);
    }
  };

  // 渲染省份价格表格
  const renderProvinceTable = (
    prices: ProvincePriceMap,
    onChange: (province: Province, value: string) => void,
    onBatchSet: (value: number) => void
  ) => (
    <div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
        <input 
          type="number" 
          className="form-input" 
          style={{ width: '100px' }}
          placeholder="批量设置"
          onBlur={e => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) onBatchSet(val);
            e.target.value = '';
          }}
        />
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>输入后点击其他区域批量设置</span>
      </div>
      <div className="province-table">
        {PROVINCES.map(province => (
          <div key={province} className="province-input-group">
            <span className="province-label">{province}</span>
            <input 
              type="number"
              className="province-input"
              value={prices[province] || ''}
              onChange={e => onChange(province, e.target.value)}
              min={0}
              step={0.01}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px' }}>
        <div className="modal-header">
          <h3 className="modal-title">{rule ? '编辑规则' : '新建规则'}</h3>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'basic' ? 'active' : ''}`}
              onClick={() => setActiveTab('basic')}
            >
              基本信息
            </button>
            <button 
              className={`tab ${activeTab === 'prices' ? 'active' : ''}`}
              onClick={() => setActiveTab('prices')}
            >
              价格配置
            </button>
            <button 
              className={`tab ${activeTab === 'area' ? 'active' : ''}`}
              onClick={() => setActiveTab('area')}
            >
              区域加价
            </button>
          </div>

          {activeTab === 'basic' && (
            <div>
              <div className="form-group">
                <label className="form-label">计费模式</label>
                <select 
                  className="form-select"
                  value={ruleType}
                  onChange={e => setRuleType(e.target.value as RuleType)}
                  disabled={!!rule}
                >
                  <option value="mode1">模式一：首重+续重（阶梯价）</option>
                  <option value="mode2">模式二：面单价+重量费率</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">规则名称 *</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="例如：合作快递A标准价"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">规则说明</label>
                <textarea 
                  className="form-textarea"
                  placeholder="可选，添加规则的说明信息"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {ruleType === 'mode1' && (
                <>
                  <div className="form-group">
                    <label className="form-label">首重阈值 (kg)</label>
                    <input 
                      type="number"
                      className="form-input"
                      placeholder="3"
                      value={firstWeightThreshold}
                      onChange={e => setFirstWeightThreshold(parseFloat(e.target.value) || 1)}
                      min={0}
                      step={0.1}
                    />
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      重量 ≤ 此阈值时使用首重价格（阶梯价），超过时加续重费用
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input 
                        type="checkbox"
                        checked={useStepPricing}
                        onChange={e => setUseStepPricing(e.target.checked)}
                        style={{ width: '18px', height: '18px' }}
                      />
                      启用首重阶梯价
                    </label>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      启用后可按重量区间设置不同价格，如：≤0.5kg、0.5-1kg、1-2kg、2-3kg
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'prices' && (
            <div>
              {ruleType === 'mode1' ? (
                <>
                  {/* 首重价格配置 */}
                  {useStepPricing ? (
                    <div className="card" style={{ marginBottom: '20px' }}>
                      <div className="card-header">
                        <h4 className="card-title">首重阶梯价格 (元)</h4>
                        <button className="btn btn-sm btn-secondary" onClick={addTier}>
                          ➕ 添加阶梯
                        </button>
                      </div>
                      
                      {/* 阶梯标签页 */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        {weightTiers.map((tier, index) => (
                          <div 
                            key={index}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              background: activeTierIndex === index ? 'var(--primary-600)' : 'var(--bg-tertiary)',
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onClick={() => setActiveTierIndex(index)}
                          >
                            <span>≤ {tier.maxWeight}kg</span>
                            {weightTiers.length > 1 && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeTier(index); }}
                                style={{ 
                                  background: 'transparent', 
                                  border: 'none', 
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  padding: '0 4px'
                                }}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* 当前阶梯配置 */}
                      {weightTiers[activeTierIndex] && (
                        <div>
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
                            <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                              阶梯上限重量 (kg):
                            </label>
                            <input 
                              type="number"
                              className="form-input"
                              style={{ width: '100px' }}
                              value={weightTiers[activeTierIndex].maxWeight}
                              onChange={e => handleTierWeightChange(activeTierIndex, parseFloat(e.target.value) || 0)}
                              min={0}
                              step={0.1}
                            />
                          </div>
                          
                          {renderProvinceTable(
                            weightTiers[activeTierIndex].prices,
                            (province, value) => handleTierPriceChange(activeTierIndex, province, value),
                            (value) => handleTierBatchSet(activeTierIndex, value)
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="card" style={{ marginBottom: '20px' }}>
                      <div className="card-header">
                        <h4 className="card-title">首重价格 (元)</h4>
                      </div>
                      {renderProvinceTable(
                        firstWeightPrices,
                        (province, value) => handlePriceChange(setFirstWeightPrices, province, value),
                        (value) => handleBatchSet(setFirstWeightPrices, value)
                      )}
                    </div>
                  )}

                  {/* 超重首重价格配置 */}
                  <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="card-header">
                      <h4 className="card-title">超重首重价格 (元)</h4>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      当重量超过 {firstWeightThreshold}kg 时，使用此首重价格（固定1kg）
                    </p>
                    {renderProvinceTable(
                      overweightFirstPrices,
                      (province, value) => handlePriceChange(setOverweightFirstPrices, province, value),
                      (value) => handleBatchSet(setOverweightFirstPrices, value)
                    )}
                  </div>

                  {/* 续重价格配置 */}
                  <div className="card">
                    <div className="card-header">
                      <h4 className="card-title">续重单价 (元/kg)</h4>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      超重时，超过首重1kg的部分按此价格计算。<br/>
                      例：4.1kg = 超重首重×1 + 续重单价×ceil(4.1-1) = 超重首重 + 续重×4
                    </p>
                    {renderProvinceTable(
                      continuedWeightPrices,
                      (province, value) => handlePriceChange(setContinuedWeightPrices, province, value),
                      (value) => handleBatchSet(setContinuedWeightPrices, value)
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="card-header">
                      <h4 className="card-title">固定面单价 (元)</h4>
                    </div>
                    {renderProvinceTable(
                      fixedPrices,
                      (province, value) => handlePriceChange(setFixedPrices, province, value),
                      (value) => handleBatchSet(setFixedPrices, value)
                    )}
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h4 className="card-title">重量费率 (元/kg)</h4>
                    </div>
                    {renderProvinceTable(
                      weightRates,
                      (province, value) => handlePriceChange(setWeightRates, province, value),
                      (value) => handleBatchSet(setWeightRates, value)
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'area' && (
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">区域加价 (元)</h4>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                偏远地区或特殊区域可设置额外加价
              </p>
              {renderProvinceTable(
                areaCharges,
                (province, value) => handlePriceChange(setAreaCharges, province, value),
                (value) => handleBatchSet(setAreaCharges, value)
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>取消</button>
          <button className="btn btn-primary" onClick={handleSave}>保存规则</button>
        </div>
      </div>
    </div>
  );
}
