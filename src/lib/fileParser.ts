import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { Order, CalculationResult, Province } from './types';
import { PROVINCES as PROVINCE_LIST } from './types';

interface RawOrderRow {
  [key: string]: string;
}

// 常见的列名映射
const WAYBILL_COLUMNS = ['运单号', '单号', '订单号', 'waybill', 'order_no', 'waybillNo'];
const DESTINATION_COLUMNS = ['目的地', '省份', '收货省份', '省', 'destination', 'province'];
const WEIGHT_COLUMNS = ['重量', '重量(kg)', '重量（kg）', 'weight', '包裹重量'];

/**
 * 查找匹配的列名
 */
function findColumn(headers: string[], candidates: string[]): string | null {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  for (const candidate of candidates) {
    const index = lowerHeaders.indexOf(candidate.toLowerCase());
    if (index !== -1) {
      return headers[index];
    }
  }
  return null;
}

/**
 * 标准化省份名称
 */
function normalizeProvince(input: string): Province | null {
  const trimmed = input.trim();
  
  // 直接匹配
  if (PROVINCE_LIST.includes(trimmed as Province)) {
    return trimmed as Province;
  }
  
  // 尝试移除"省"、"市"、"自治区"等后缀
  const cleaned = trimmed
    .replace(/省$/, '')
    .replace(/市$/, '')
    .replace(/自治区$/, '')
    .replace(/壮族$/, '')
    .replace(/回族$/, '')
    .replace(/维吾尔$/, '');
  
  if (PROVINCE_LIST.includes(cleaned as Province)) {
    return cleaned as Province;
  }
  
  // 模糊匹配
  for (const province of PROVINCE_LIST) {
    if (province.includes(cleaned) || cleaned.includes(province)) {
      return province;
    }
  }
  
  return null;
}

/**
 * 解析CSV文件
 */
export function parseCSV(file: File): Promise<Order[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawOrderRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const headers = results.meta.fields || [];
          const waybillCol = findColumn(headers, WAYBILL_COLUMNS);
          const destCol = findColumn(headers, DESTINATION_COLUMNS);
          const weightCol = findColumn(headers, WEIGHT_COLUMNS);
          
          if (!waybillCol) {
            throw new Error('未找到运单号列，请确保包含以下列名之一：' + WAYBILL_COLUMNS.join('、'));
          }
          if (!destCol) {
            throw new Error('未找到目的地列，请确保包含以下列名之一：' + DESTINATION_COLUMNS.join('、'));
          }
          if (!weightCol) {
            throw new Error('未找到重量列，请确保包含以下列名之一：' + WEIGHT_COLUMNS.join('、'));
          }
          
          const orders: Order[] = results.data.map((row, index) => {
            const waybillNo = row[waybillCol]?.trim() || `unknown_${index}`;
            const rawProvince = row[destCol]?.trim() || '';
            const rawWeight = row[weightCol]?.trim() || '0';
            
            const destination = normalizeProvince(rawProvince);
            const weight = parseFloat(rawWeight) || 0;
            
            if (!destination) {
              throw new Error(`第 ${index + 2} 行：无法识别省份 "${rawProvince}"`);
            }
            
            if (weight <= 0) {
              throw new Error(`第 ${index + 2} 行：重量无效 "${rawWeight}"`);
            }
            
            return { waybillNo, destination, weight };
          });
          
          resolve(orders);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`CSV解析失败：${error.message}`));
      }
    });
  });
}

/**
 * 解析Excel文件
 */
export function parseExcel(file: File): Promise<Order[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<RawOrderRow>(sheet);
        
        if (jsonData.length === 0) {
          throw new Error('Excel文件为空');
        }
        
        const headers = Object.keys(jsonData[0]);
        const waybillCol = findColumn(headers, WAYBILL_COLUMNS);
        const destCol = findColumn(headers, DESTINATION_COLUMNS);
        const weightCol = findColumn(headers, WEIGHT_COLUMNS);
        
        if (!waybillCol) {
          throw new Error('未找到运单号列，请确保包含以下列名之一：' + WAYBILL_COLUMNS.join('、'));
        }
        if (!destCol) {
          throw new Error('未找到目的地列，请确保包含以下列名之一：' + DESTINATION_COLUMNS.join('、'));
        }
        if (!weightCol) {
          throw new Error('未找到重量列，请确保包含以下列名之一：' + WEIGHT_COLUMNS.join('、'));
        }
        
        const orders: Order[] = jsonData.map((row, index) => {
          const waybillNo = String(row[waybillCol] ?? '').trim() || `unknown_${index}`;
          const rawProvince = String(row[destCol] ?? '').trim();
          const rawWeight = String(row[weightCol] ?? '0').trim();
          
          const destination = normalizeProvince(rawProvince);
          const weight = parseFloat(rawWeight) || 0;
          
          if (!destination) {
            throw new Error(`第 ${index + 2} 行：无法识别省份 "${rawProvince}"`);
          }
          
          if (weight <= 0) {
            throw new Error(`第 ${index + 2} 行：重量无效 "${rawWeight}"`);
          }
          
          return { waybillNo, destination, weight };
        });
        
        resolve(orders);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 解析订单文件（自动识别格式）
 */
export async function parseOrderFile(file: File): Promise<Order[]> {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.csv')) {
    return parseCSV(file);
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return parseExcel(file);
  } else {
    throw new Error('不支持的文件格式，请上传 CSV 或 Excel 文件');
  }
}

/**
 * 导出计算结果为Excel
 */
export function exportResults(results: CalculationResult[], fileName: string = '运费计算结果'): void {
  const data = results.map(r => ({
    '运单号': r.waybillNo,
    '目的地': r.destination,
    '原始重量(kg)': r.originalWeight,
    '计费重量(kg)': r.weight,
    '基础费用': r.breakdown.baseFee,
    '续重/重量费用': r.breakdown.continuedFee,
    '区域加价': r.breakdown.areaCharge,
    '总价': r.price,
    '备注': r.error || ''
  }));
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '运费计算结果');
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(blob, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
