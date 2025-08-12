import { type CalculateShippingInput } from '../schema';

// Define shipping zones based on address patterns
const SHIPPING_ZONES = {
  local: { multiplier: 1.0, baseDays: 1 },      // Same city/state
  regional: { multiplier: 1.5, baseDays: 3 },   // Same country/region
  national: { multiplier: 2.0, baseDays: 5 },   // Different regions in country
  international: { multiplier: 3.5, baseDays: 10 } // International
};

// Base shipping methods with their characteristics
const BASE_METHODS = [
  { method: 'Standard', baseCost: 5.99, speedMultiplier: 1.0, maxWeight: 50 },
  { method: 'Express', baseCost: 12.99, speedMultiplier: 0.4, maxWeight: 30 },
  { method: 'Overnight', baseCost: 24.99, speedMultiplier: 0.2, maxWeight: 20 }
];

// Determine shipping zone based on destination address
function determineShippingZone(address: string): keyof typeof SHIPPING_ZONES {
  const lowerAddress = address.toLowerCase();
  
  // Simple heuristics for zone determination
  if (lowerAddress.includes('local') || lowerAddress.includes('same city')) {
    return 'local';
  }
  
  if (lowerAddress.includes('regional') || lowerAddress.includes('same state')) {
    return 'regional';
  }
  
  if (lowerAddress.includes('international') || 
      lowerAddress.includes('canada') || 
      lowerAddress.includes('mexico') ||
      lowerAddress.includes('europe') ||
      lowerAddress.includes('asia')) {
    return 'international';
  }
  
  // Default to national for most US addresses
  return 'national';
}

// Calculate weight-based cost adjustment
function calculateWeightMultiplier(weight: number): number {
  if (weight <= 1) return 1.0;
  if (weight <= 5) return 1.2;
  if (weight <= 10) return 1.5;
  if (weight <= 20) return 2.0;
  return 2.5; // Heavy packages
}

export async function calculateShipping(input: CalculateShippingInput): Promise<{ options: Array<{ method: string; cost: number; estimatedDays: number }> }> {
  try {
    const { destination_address, total_weight } = input;
    
    // Validate inputs
    if (!destination_address.trim()) {
      throw new Error('Destination address cannot be empty');
    }
    
    if (total_weight <= 0) {
      throw new Error('Total weight must be greater than 0');
    }
    
    // Determine shipping zone and weight multiplier
    const zone = determineShippingZone(destination_address);
    const zoneConfig = SHIPPING_ZONES[zone];
    const weightMultiplier = calculateWeightMultiplier(total_weight);
    
    // Calculate shipping options
    const options = BASE_METHODS
      .filter(method => total_weight <= method.maxWeight) // Filter by weight limits
      .map(method => {
        // Calculate cost: base cost × zone multiplier × weight multiplier
        const cost = Math.round(
          (method.baseCost * zoneConfig.multiplier * weightMultiplier) * 100
        ) / 100; // Round to 2 decimal places
        
        // Calculate estimated delivery days
        const estimatedDays = Math.ceil(
          zoneConfig.baseDays * method.speedMultiplier
        );
        
        return {
          method: method.method,
          cost,
          estimatedDays: Math.max(1, estimatedDays) // Minimum 1 day
        };
      })
      .sort((a, b) => a.cost - b.cost); // Sort by cost ascending
    
    // If no options available (weight too heavy), provide freight option
    if (options.length === 0) {
      return {
        options: [{
          method: 'Freight',
          cost: Math.round((50.0 * zoneConfig.multiplier * weightMultiplier) * 100) / 100,
          estimatedDays: zoneConfig.baseDays + 2
        }]
      };
    }
    
    return { options };
    
  } catch (error) {
    console.error('Shipping calculation failed:', error);
    throw error;
  }
}