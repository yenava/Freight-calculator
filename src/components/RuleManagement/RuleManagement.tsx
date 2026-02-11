import { useState, useMemo } from 'react';
import { useRules } from '../../context/RuleContext';
import { RuleEditor } from '../RuleEditor/RuleEditor';
import type { FreightRule } from '../../lib/types';

export function RuleManagement() {
  const { rules, loading, addRule, updateRule, deleteRule } = useRules();
  const [showEditor, setShowEditor] = useState(false);
  const [editingRule, setEditingRule] = useState<FreightRule | undefined>();
  const [searchKeyword, setSearchKeyword] = useState('');

  const filteredRules = useMemo(() => {
    if (!searchKeyword.trim()) return rules;
    const keyword = searchKeyword.trim().toLowerCase();
    return rules.filter(rule => rule.name.toLowerCase().includes(keyword));
  }, [rules, searchKeyword]);

  const handleCreate = () => {
    setEditingRule(undefined);
    setShowEditor(true);
  };

  const handleEdit = (rule: FreightRule) => {
    setEditingRule(rule);
    setShowEditor(true);
  };

  const handleSave = async (rule: FreightRule) => {
    try {
      if (editingRule) {
        await updateRule(rule);
      } else {
        await addRule(rule);
      }
      setShowEditor(false);
      setEditingRule(undefined);
    } catch (err) {
      console.error('保存规则失败:', err);
      alert('保存规则失败，请重试');
    }
  };

  const handleDelete = async (ruleId: string, ruleName: string) => {
    if (confirm(`确定要删除规则 "${ruleName}" 吗？此操作不可恢复。`)) {
      try {
        await deleteRule(ruleId);
      } catch (err) {
        console.error('删除规则失败:', err);
        alert('删除规则失败，请重试');
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">结算规则管理</h1>
        <p className="page-description">管理运费计算规则，支持首重续重和面单费率两种计费模式</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">规则列表</h3>
          <div className="card-header-actions">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="搜索规则名称..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
              />
              {searchKeyword && (
                <button
                  className="search-clear"
                  onClick={() => setSearchKeyword('')}
                  title="清除搜索"
                >
                  ✕
                </button>
              )}
            </div>
            <button className="btn btn-primary" onClick={handleCreate}>
              <span>➕</span> 新建规则
            </button>
          </div>
        </div>

        {rules.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h4 className="empty-state-title">暂无结算规则</h4>
            <p className="empty-state-description">创建您的第一个运费结算规则，开始管理客户运费</p>
            <button className="btn btn-primary btn-lg" onClick={handleCreate}>
              创建规则
            </button>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h4 className="empty-state-title">未找到匹配的规则</h4>
            <p className="empty-state-description">没有找到名称包含 "{searchKeyword}" 的规则，请尝试其他关键词</p>
            <button className="btn btn-secondary" onClick={() => setSearchKeyword('')}>
              清除搜索
            </button>
          </div>
        ) : (
          <div className="rule-list">
            {filteredRules.map(rule => (
              <div key={rule.id} className="rule-item">
                <div className="rule-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h4 className="rule-name">{rule.name}</h4>
                    <span className={`rule-badge ${rule.type}`}>
                      {rule.type === 'mode1' ? '首重+续重' : '面单+费率'}
                    </span>
                  </div>
                  {rule.description && (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0' }}>
                      {rule.description}
                    </p>
                  )}
                  <div className="rule-meta">
                    <span>创建于：{formatDate(rule.createdAt)}</span>
                    <span>更新于：{formatDate(rule.updatedAt)}</span>
                  </div>
                </div>
                <div className="rule-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(rule)}>
                    编辑
                  </button>
                  <button 
                    className="btn btn-danger btn-sm" 
                    onClick={() => handleDelete(rule.id, rule.name)}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showEditor && (
        <RuleEditor
          rule={editingRule}
          onSave={handleSave}
          onCancel={() => {
            setShowEditor(false);
            setEditingRule(undefined);
          }}
        />
      )}
    </div>
  );
}
