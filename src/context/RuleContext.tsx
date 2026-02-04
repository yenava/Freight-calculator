import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { FreightRule } from '../lib/types';
import { 
  getRules as fetchRules, 
  addRule as addRuleToServer, 
  updateRule as updateRuleOnServer, 
  deleteRule as deleteRuleFromServer 
} from '../lib/storage';

interface RuleContextType {
  rules: FreightRule[];
  loading: boolean;
  error: string | null;
  addRule: (rule: FreightRule) => Promise<void>;
  updateRule: (rule: FreightRule) => Promise<void>;
  deleteRule: (ruleId: string) => Promise<void>;
  refreshRules: () => Promise<void>;
}

const RuleContext = createContext<RuleContextType | undefined>(undefined);

export function RuleProvider({ children }: { children: ReactNode }) {
  const [rules, setRules] = useState<FreightRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loadedRules = await fetchRules();
      setRules(loadedRules);
    } catch (err) {
      setError('加载规则失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRules();
  }, [refreshRules]);

  const addRule = useCallback(async (rule: FreightRule) => {
    try {
      const newRules = await addRuleToServer(rule);
      setRules(newRules);
    } catch (err) {
      console.error('添加规则失败:', err);
      throw err;
    }
  }, []);

  const updateRule = useCallback(async (rule: FreightRule) => {
    try {
      const newRules = await updateRuleOnServer(rule);
      setRules(newRules);
    } catch (err) {
      console.error('更新规则失败:', err);
      throw err;
    }
  }, []);

  const deleteRule = useCallback(async (ruleId: string) => {
    try {
      const newRules = await deleteRuleFromServer(ruleId);
      setRules(newRules);
    } catch (err) {
      console.error('删除规则失败:', err);
      throw err;
    }
  }, []);

  return (
    <RuleContext.Provider value={{ rules, loading, error, addRule, updateRule, deleteRule, refreshRules }}>
      {children}
    </RuleContext.Provider>
  );
}

export function useRules() {
  const context = useContext(RuleContext);
  if (!context) {
    throw new Error('useRules must be used within a RuleProvider');
  }
  return context;
}
