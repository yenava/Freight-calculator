import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// 数据文件路径
const DATA_DIR = path.join(__dirname, 'data');
const RULES_FILE = path.join(DATA_DIR, 'rules.json');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 确保规则文件存在
if (!fs.existsSync(RULES_FILE)) {
  fs.writeFileSync(RULES_FILE, '[]', 'utf-8');
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 读取所有规则
app.get('/api/rules', (req, res) => {
  try {
    const data = fs.readFileSync(RULES_FILE, 'utf-8');
    const rules = JSON.parse(data);
    res.json(rules);
  } catch (error) {
    console.error('读取规则失败:', error);
    res.status(500).json({ error: '读取规则失败' });
  }
});

// 保存所有规则
app.put('/api/rules', (req, res) => {
  try {
    const rules = req.body;
    fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2), 'utf-8');
    res.json({ success: true, message: '规则已保存' });
  } catch (error) {
    console.error('保存规则失败:', error);
    res.status(500).json({ error: '保存规则失败' });
  }
});

// 添加规则
app.post('/api/rules', (req, res) => {
  try {
    const newRule = req.body;
    const data = fs.readFileSync(RULES_FILE, 'utf-8');
    const rules = JSON.parse(data);
    rules.push(newRule);
    fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2), 'utf-8');
    res.json({ success: true, rules });
  } catch (error) {
    console.error('添加规则失败:', error);
    res.status(500).json({ error: '添加规则失败' });
  }
});

// 更新规则
app.put('/api/rules/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updatedRule = req.body;
    const data = fs.readFileSync(RULES_FILE, 'utf-8');
    const rules = JSON.parse(data);
    const index = rules.findIndex(r => r.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: '规则不存在' });
    }
    
    rules[index] = updatedRule;
    fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2), 'utf-8');
    res.json({ success: true, rules });
  } catch (error) {
    console.error('更新规则失败:', error);
    res.status(500).json({ error: '更新规则失败' });
  }
});

// 删除规则
app.delete('/api/rules/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = fs.readFileSync(RULES_FILE, 'utf-8');
    const rules = JSON.parse(data);
    const filtered = rules.filter(r => r.id !== id);
    fs.writeFileSync(RULES_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
    res.json({ success: true, rules: filtered });
  } catch (error) {
    console.error('删除规则失败:', error);
    res.status(500).json({ error: '删除规则失败' });
  }
});

app.listen(PORT, () => {
  console.log(`📦 运费结算后端服务已启动: http://localhost:${PORT}`);
  console.log(`📁 数据文件位置: ${RULES_FILE}`);
});
