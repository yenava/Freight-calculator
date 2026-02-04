import type { 
  FreightRule, 
  Mode1Rule, 
  Mode2Rule, 
  Order, 
  CalculationResult, 
  BatchResult,
  Province,
  WeightTier
} from './types';

/**
 * 重量向上取整（不足1kg按1kg计）
 */
function ceilWeight(weight: number): number {
  return Math.ceil(weight);
}

/**
 * 根据阶梯价获取首重费用
 */
function getStepPrice(weight: number, tiers: WeightTier[], province: Province): number | null {
  // 按 maxWeight 升序排列
  const sortedTiers = [...tiers].sort((a, b) => a.maxWeight - b.maxWeight);
  
  for (const tier of sortedTiers) {
    if (weight <= tier.maxWeight) {
      return tier.prices[province] ?? null;
    }
  }
  
  // 超过所有阶梯，使用最后一个阶梯的价格
  if (sortedTiers.length > 0) {
    const lastTier = sortedTiers[sortedTiers.length - 1];
    return lastTier.prices[province] ?? null;
  }
  
  return null;
}

/**
 * 计算模式一运费：首重+续重模式
 * 
 * 计费逻辑：
 * 1. 当原始重量 <= 首重阈值时：
 *    - 如果启用阶梯价：使用原始重量匹配阶梯价格
 *    - 如果使用一口价：使用首重价格
 * 2. 当原始重量 > 首重阈值时：
 *    - 使用超重首重价格(1kg) + ceil(总重量-1) * 续重单价
 *    - 例：4.1kg = 超重首重(2.8) + ceil(3.1)*续重(0.8) = 2.8 + 4*0.8 = 6
 */
function calculateMode1(rule: Mode1Rule, order: Order): CalculationResult {
  const { destination, weight: originalWeight, waybillNo } = order;
  
  // 获取区域加价
  const areaCharge = rule.areaCharges[destination] ?? 0;
  
  // 检查省份配置
  let baseFee: number;
  let continuedFee: number = 0;
  
  // 计费重量：用于显示
  let billingWeight: number;
  
  if (originalWeight <= rule.firstWeightThreshold) {
    // 小于等于首重阈值，使用首重价格（阶梯价或一口价）
    billingWeight = originalWeight;
    
    if (rule.useStepPricing && rule.weightTiers && rule.weightTiers.length > 0) {
      // 阶梯价 - 使用原始重量匹配阶梯
      const stepPrice = getStepPrice(originalWeight, rule.weightTiers, destination);
      if (stepPrice === null) {
        return {
          waybillNo,
          destination,
          weight: billingWeight,
          originalWeight,
          price: 0,
          breakdown: { baseFee: 0, continuedFee: 0, areaCharge: 0 },
          error: `省份 ${destination} 未配置阶梯价格`
        };
      }
      baseFee = stepPrice;
    } else {
      // 一口价
      const firstPrice = rule.firstWeightPrices[destination];
      if (firstPrice === undefined) {
        return {
          waybillNo,
          destination,
          weight: billingWeight,
          originalWeight,
          price: 0,
          breakdown: { baseFee: 0, continuedFee: 0, areaCharge: 0 },
          error: `省份 ${destination} 未配置首重价格`
        };
      }
      baseFee = firstPrice;
    }
  } else {
    // 大于首重阈值，使用超重计费模式：
    // 超重首重(1kg)价格 + ceil(总重量-1) * 续重单价
    
    // 获取超重首重价格
    const overweightFirstPrice = rule.overweightFirstPrices?.[destination];
    if (overweightFirstPrice === undefined) {
      return {
        waybillNo,
        destination,
        weight: originalWeight,
        originalWeight,
        price: 0,
        breakdown: { baseFee: 0, continuedFee: 0, areaCharge: 0 },
        error: `省份 ${destination} 未配置超重首重价格`
      };
    }
    
    // 获取续重价格
    const continuedPrice = rule.continuedWeightPrices[destination];
    if (continuedPrice === undefined) {
      return {
        waybillNo,
        destination,
        weight: originalWeight,
        originalWeight,
        price: 0,
        breakdown: { baseFee: 0, continuedFee: 0, areaCharge: 0 },
        error: `省份 ${destination} 未配置续重价格`
      };
    }
    
    // 计算：首重1kg + ceil(总重-1) * 续重单价
    baseFee = overweightFirstPrice;
    const continuedWeight = Math.ceil(originalWeight - 1);
    continuedFee = continuedWeight * continuedPrice;
    billingWeight = 1 + continuedWeight; // 计费重量 = 首重1kg + 续重kg
  }
  
  const totalPrice = baseFee + continuedFee + areaCharge;
  return {
    waybillNo,
    destination,
    weight: billingWeight,
    originalWeight,
    price: totalPrice,
    breakdown: {
      baseFee,
      continuedFee,
      areaCharge
    }
  };
}

/**
 * 计算模式二运费：固定面单价+重量费率
 */
function calculateMode2(rule: Mode2Rule, order: Order): CalculationResult {
  const { destination, weight: originalWeight, waybillNo } = order;
  const weight = ceilWeight(originalWeight);
  
  const fixedPrice = rule.fixedPrices[destination];
  const weightRate = rule.weightRates[destination];
  const areaCharge = rule.areaCharges[destination] ?? 0;
  
  if (fixedPrice === undefined) {
    return {
      waybillNo,
      destination,
      weight,
      originalWeight,
      price: 0,
      breakdown: { baseFee: 0, continuedFee: 0, areaCharge: 0 },
      error: `省份 ${destination} 未配置面单价格`
    };
  }
  
  if (weightRate === undefined) {
    return {
      waybillNo,
      destination,
      weight,
      originalWeight,
      price: 0,
      breakdown: { baseFee: 0, continuedFee: 0, areaCharge: 0 },
      error: `省份 ${destination} 未配置重量费率`
    };
  }
  
  const baseFee = fixedPrice;
  const weightFee = weight * weightRate;
  const totalPrice = baseFee + weightFee + areaCharge;
  
  return {
    waybillNo,
    destination,
    weight,
    originalWeight,
    price: totalPrice,
    breakdown: {
      baseFee,
      continuedFee: weightFee,
      areaCharge
    }
  };
}

/**
 * 计算单个订单运费
 */
export function calculateFreight(rule: FreightRule, order: Order): CalculationResult {
  if (rule.type === 'mode1') {
    return calculateMode1(rule, order);
  } else {
    return calculateMode2(rule, order);
  }
}

/**
 * 批量计算运费
 */
export function calculateBatch(rule: FreightRule, orders: Order[]): BatchResult {
  const results = orders.map(order => calculateFreight(rule, order));
  
  const successResults = results.filter(r => !r.error);
  const errorResults = results.filter(r => r.error);
  
  return {
    ruleName: rule.name,
    totalOrders: orders.length,
    successCount: successResults.length,
    errorCount: errorResults.length,
    totalPrice: successResults.reduce((sum, r) => sum + r.price, 0),
    results
  };
}

/**
 * 格式化价格（保留2位小数）
 */
export function formatPrice(price: number): string {
  return price.toFixed(2);
}
