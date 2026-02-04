// 省份类型
export const PROVINCES = [
  '北京', '天津', '河北', '山西', '内蒙古',
  '辽宁', '吉林', '黑龙江', '上海', '江苏',
  '浙江', '安徽', '福建', '江西', '山东',
  '河南', '湖北', '湖南', '广东', '广西',
  '海南', '重庆', '四川', '贵州', '云南',
  '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆'
] as const;

export type Province = typeof PROVINCES[number];

// 省份价格映射
export type ProvincePriceMap = Partial<Record<Province, number>>;

// 首重阶梯价格
export interface WeightTier {
  maxWeight: number;  // 该阶梯最大重量
  prices: ProvincePriceMap;  // 各省价格
}

// 模式一规则：首重+续重模式
export interface Mode1Rule {
  id: string;
  type: 'mode1';
  name: string;
  description?: string;
  firstWeightThreshold: number;  // 首重阈值(kg)，如3kg
  // 首重价格（支持阶梯价或一口价）- 用于重量<=阈值时
  useStepPricing: boolean;  // 是否使用阶梯价
  firstWeightPrices: ProvincePriceMap;  // 一口价：各省首重价格
  weightTiers?: WeightTier[];  // 阶梯价配置
  // 超重配置（重量>阈值时使用）
  overweightFirstPrices: ProvincePriceMap;  // 超重时首重1kg价格
  continuedWeightPrices: ProvincePriceMap;  // 各省续重单价(每kg)
  // 区域加价
  areaCharges: ProvincePriceMap;
  createdAt: number;
  updatedAt: number;
}

// 模式二规则：固定面单价+重量费率
export interface Mode2Rule {
  id: string;
  type: 'mode2';
  name: string;
  description?: string;
  fixedPrices: ProvincePriceMap;  // 固定面单价
  weightRates: ProvincePriceMap;  // 重量费率(每kg)
  areaCharges: ProvincePriceMap;  // 区域加价
  createdAt: number;
  updatedAt: number;
}

// 通用规则类型
export type FreightRule = Mode1Rule | Mode2Rule;

// 订单数据
export interface Order {
  waybillNo: string;     // 运单号
  destination: Province; // 目的地省份
  weight: number;        // 重量(kg)
}

// 计算结果
export interface CalculationResult {
  waybillNo: string;
  destination: Province;
  weight: number;
  originalWeight: number;  // 原始重量
  price: number;          // 计算后的价格
  breakdown: {
    baseFee: number;      // 基础费用（首重/面单费）
    continuedFee: number; // 续重费用
    areaCharge: number;   // 区域加价
  };
  error?: string;         // 错误信息
}

// 批量计算结果
export interface BatchResult {
  ruleName: string;
  totalOrders: number;
  successCount: number;
  errorCount: number;
  totalPrice: number;
  results: CalculationResult[];
}
