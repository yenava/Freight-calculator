/**
 * 生产环境后端服务
 * 用于 Electron 打包版本
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3001;

// 获取数据目录（从环境变量或默认路径）
const USER_DATA_PATH = process.env.USER_DATA_PATH || path.join(__dirname, 'data');
const DATA_DIR = path.join(USER_DATA_PATH, 'freight-data');
const RULES_FILE = path.join(DATA_DIR, 'rules.json');

// 确保数据目录存在
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(RULES_FILE)) {
    fs.writeFileSync(RULES_FILE, '[]', 'utf8');
  }
}

// 读取规则
function readRules() {
  ensureDataDir();
  try {
    const data = fs.readFileSync(RULES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('读取规则失败:', err);
    return [];
  }
}

// 写入规则
function writeRules(rules) {
  ensureDataDir();
  fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2), 'utf8');
}

// 解析请求体
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// 发送 JSON 响应
function sendJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// 创建服务器
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS 预检请求
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  try {
    // GET /api/rules - 获取所有规则
    if (pathname === '/api/rules' && method === 'GET') {
      const rules = readRules();
      sendJSON(res, rules);
      return;
    }

    // POST /api/rules - 添加规则
    if (pathname === '/api/rules' && method === 'POST') {
      const body = await parseBody(req);
      const rules = readRules();
      rules.push(body);
      writeRules(rules);
      sendJSON(res, rules, 201);
      return;
    }

    // PUT /api/rules/:id - 更新规则
    const putMatch = pathname.match(/^\/api\/rules\/(.+)$/);
    if (putMatch && method === 'PUT') {
      const ruleId = putMatch[1];
      const body = await parseBody(req);
      let rules = readRules();
      const index = rules.findIndex(r => r.id === ruleId);
      if (index !== -1) {
        rules[index] = body;
        writeRules(rules);
        sendJSON(res, rules);
      } else {
        sendJSON(res, { error: '规则不存在' }, 404);
      }
      return;
    }

    // DELETE /api/rules/:id - 删除规则
    const deleteMatch = pathname.match(/^\/api\/rules\/(.+)$/);
    if (deleteMatch && method === 'DELETE') {
      const ruleId = deleteMatch[1];
      let rules = readRules();
      rules = rules.filter(r => r.id !== ruleId);
      writeRules(rules);
      sendJSON(res, rules);
      return;
    }

    // 404
    sendJSON(res, { error: 'Not Found' }, 404);

  } catch (err) {
    console.error('服务器错误:', err);
    sendJSON(res, { error: err.message }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`📦 运费结算后端服务已启动: http://localhost:${PORT}`);
  console.log(`📁 数据文件位置: ${RULES_FILE}`);
});
