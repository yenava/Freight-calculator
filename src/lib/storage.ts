import type { FreightRule } from './types';

// 根据环境选择 API 基础路径
// Electron 模式：使用 file:// 协议加载页面时，需要直接访问后端服务
// 开发模式：使用 Vite 代理 (/api -> localhost:3001)
const isElectron = window.location.protocol === 'file:' || 
                   (window as unknown as { electronAPI?: unknown }).electronAPI !== undefined;
const API_BASE = isElectron ? 'http://localhost:3001/api' : '/api';

/**
 * 从后端获取所有规则
 */
export async function getRules(): Promise<FreightRule[]> {
  try {
    const response = await fetch(`${API_BASE}/rules`);
    if (!response.ok) {
      throw new Error('获取规则失败');
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to load rules from server:', error);
    // 降级到 localStorage
    return getLocalRules();
  }
}

/**
 * 添加规则
 */
export async function addRule(rule: FreightRule): Promise<FreightRule[]> {
  try {
    const response = await fetch(`${API_BASE}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    if (!response.ok) {
      throw new Error('添加规则失败');
    }
    const data = await response.json();
    return data.rules;
  } catch (error) {
    console.error('Failed to add rule to server:', error);
    // 降级到 localStorage
    return addLocalRule(rule);
  }
}

/**
 * 更新规则
 */
export async function updateRule(rule: FreightRule): Promise<FreightRule[]> {
  try {
    const response = await fetch(`${API_BASE}/rules/${rule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    if (!response.ok) {
      throw new Error('更新规则失败');
    }
    const data = await response.json();
    return data.rules;
  } catch (error) {
    console.error('Failed to update rule on server:', error);
    // 降级到 localStorage
    return updateLocalRule(rule);
  }
}

/**
 * 删除规则
 */
export async function deleteRule(ruleId: string): Promise<FreightRule[]> {
  try {
    const response = await fetch(`${API_BASE}/rules/${ruleId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('删除规则失败');
    }
    const data = await response.json();
    return data.rules;
  } catch (error) {
    console.error('Failed to delete rule from server:', error);
    // 降级到 localStorage
    return deleteLocalRule(ruleId);
  }
}

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============ localStorage 降级方案 ============

const STORAGE_KEY = 'freight-calculator-rules';

function getLocalRules(): FreightRule[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveLocalRules(rules: FreightRule[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

function addLocalRule(rule: FreightRule): FreightRule[] {
  const rules = getLocalRules();
  rules.push(rule);
  saveLocalRules(rules);
  return rules;
}

function updateLocalRule(rule: FreightRule): FreightRule[] {
  const rules = getLocalRules();
  const index = rules.findIndex(r => r.id === rule.id);
  if (index !== -1) {
    rules[index] = rule;
    saveLocalRules(rules);
  }
  return rules;
}

function deleteLocalRule(ruleId: string): FreightRule[] {
  const rules = getLocalRules();
  const filtered = rules.filter(r => r.id !== ruleId);
  saveLocalRules(filtered);
  return filtered;
}
