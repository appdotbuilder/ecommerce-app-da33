import { describe, expect, it } from 'bun:test';
import { calculateShipping } from '../handlers/calculate_shipping';
import { type CalculateShippingInput } from '../schema';

describe('calculateShipping', () => {
  it('should calculate shipping for local addresses with light weight', async () => {
    const input: CalculateShippingInput = {
      destination_address: '123 Main St, Local City, CA 90210',
      total_weight: 2.5
    };

    const result = await calculateShipping(input);
    
    expect(result.options).toBeDefined();
    expect(result.options.length).toBeGreaterThan(0);
    
    // Should have Standard, Express, and Overnight options
    expect(result.options.length).toBe(3);
    
    // Verify all methods are present
    const methods = result.options.map(opt => opt.method);
    expect(methods).toContain('Standard');
    expect(methods).toContain('Express');
    expect(methods).toContain('Overnight');
    
    // Verify costs are reasonable for local delivery with light weight
    const standardOption = result.options.find(opt => opt.method === 'Standard');
    expect(standardOption).toBeDefined();
    expect(standardOption!.cost).toBeGreaterThan(5);
    expect(standardOption!.cost).toBeLessThan(15);
    expect(standardOption!.estimatedDays).toBeGreaterThanOrEqual(1);
  });

  it('should calculate shipping for regional addresses', async () => {
    const input: CalculateShippingInput = {
      destination_address: '456 Regional Ave, Same State, CA 90211',
      total_weight: 5.0
    };

    const result = await calculateShipping(input);
    
    expect(result.options.length).toBe(3);
    
    // Regional should be more expensive than local
    const standardOption = result.options.find(opt => opt.method === 'Standard');
    expect(standardOption!.cost).toBeGreaterThan(8); // Higher than local
    expect(standardOption!.estimatedDays).toBeGreaterThanOrEqual(1);
  });

  it('should calculate shipping for national addresses', async () => {
    const input: CalculateShippingInput = {
      destination_address: '789 National Blvd, New York, NY 10001',
      total_weight: 8.0
    };

    const result = await calculateShipping(input);
    
    expect(result.options.length).toBe(3);
    
    // National should be more expensive than regional
    const standardOption = result.options.find(opt => opt.method === 'Standard');
    expect(standardOption!.cost).toBeGreaterThan(15); // Higher than regional
    expect(standardOption!.estimatedDays).toBeGreaterThanOrEqual(3);
  });

  it('should calculate shipping for international addresses', async () => {
    const input: CalculateShippingInput = {
      destination_address: '123 International St, Toronto, Canada',
      total_weight: 3.0
    };

    const result = await calculateShipping(input);
    
    expect(result.options.length).toBe(3);
    
    // International should be most expensive
    const standardOption = result.options.find(opt => opt.method === 'Standard');
    expect(standardOption!.cost).toBeGreaterThan(20); // Much higher for international
    expect(standardOption!.estimatedDays).toBeGreaterThanOrEqual(4);
  });

  it('should handle heavy packages by filtering options', async () => {
    const input: CalculateShippingInput = {
      destination_address: '123 Main St, Local City, CA 90210',
      total_weight: 25.0 // Heavy package
    };

    const result = await calculateShipping(input);
    
    // Should have Standard (max 50) and Express (max 30) options
    // Only Overnight (max 20) should be filtered out
    expect(result.options.length).toBe(2);
    
    const methods = result.options.map(opt => opt.method);
    expect(methods).toContain('Standard');
    expect(methods).toContain('Express');
    expect(methods).not.toContain('Overnight');
    
    // Cost should be significantly higher due to weight (base 5.99 * 2.5 weight multiplier)
    const standardOption = result.options.find(opt => opt.method === 'Standard');
    expect(standardOption!.cost).toBeGreaterThan(12); // Should be around 14.98
  });

  it('should provide freight option for extremely heavy packages', async () => {
    const input: CalculateShippingInput = {
      destination_address: '123 Main St, Local City, CA 90210',
      total_weight: 60.0 // Exceeds all method limits
    };

    const result = await calculateShipping(input);
    
    // Should only have Freight option
    expect(result.options.length).toBe(1);
    expect(result.options[0].method).toBe('Freight');
    expect(result.options[0].cost).toBeGreaterThan(100); // Should be expensive
    expect(result.options[0].estimatedDays).toBeGreaterThan(2);
  });

  it('should sort options by cost ascending', async () => {
    const input: CalculateShippingInput = {
      destination_address: '123 Main St, Local City, CA 90210',
      total_weight: 1.0
    };

    const result = await calculateShipping(input);
    
    expect(result.options.length).toBe(3);
    
    // Verify sorted by cost (Standard < Express < Overnight)
    for (let i = 1; i < result.options.length; i++) {
      expect(result.options[i].cost).toBeGreaterThanOrEqual(result.options[i - 1].cost);
    }
  });

  it('should apply weight multipliers correctly', async () => {
    const lightInput: CalculateShippingInput = {
      destination_address: '123 Main St, Local City, CA 90210',
      total_weight: 0.5 // Very light
    };
    
    const heavyInput: CalculateShippingInput = {
      destination_address: '123 Main St, Local City, CA 90210',
      total_weight: 15.0 // Heavy
    };

    const lightResult = await calculateShipping(lightInput);
    const heavyResult = await calculateShipping(heavyInput);
    
    const lightStandard = lightResult.options.find(opt => opt.method === 'Standard');
    const heavyStandard = heavyResult.options.find(opt => opt.method === 'Standard');
    
    // Heavy package should cost significantly more
    expect(heavyStandard!.cost).toBeGreaterThan(lightStandard!.cost * 1.5);
  });

  it('should handle different zone types correctly', async () => {
    const zones = [
      { address: '123 Local St, Local City, CA', expectedZone: 'local' },
      { address: '123 Regional Ave, Same State, CA', expectedZone: 'regional' },
      { address: '123 Main St, New York, NY', expectedZone: 'national' },
      { address: '123 International St, Toronto, Canada', expectedZone: 'international' }
    ];

    const results = await Promise.all(
      zones.map(zone => calculateShipping({
        destination_address: zone.address,
        total_weight: 2.0
      }))
    );

    // Verify costs increase with zone distance
    const costs = results.map(result => 
      result.options.find(opt => opt.method === 'Standard')!.cost
    );
    
    expect(costs[0]).toBeLessThan(costs[1]); // local < regional
    expect(costs[1]).toBeLessThan(costs[2]); // regional < national
    expect(costs[2]).toBeLessThan(costs[3]); // national < international
  });

  it('should enforce minimum delivery time of 1 day', async () => {
    const input: CalculateShippingInput = {
      destination_address: '123 Local St, Local City, CA',
      total_weight: 0.5
    };

    const result = await calculateShipping(input);
    
    // All options should have at least 1 day delivery
    result.options.forEach(option => {
      expect(option.estimatedDays).toBeGreaterThanOrEqual(1);
    });
  });

  it('should round costs to 2 decimal places', async () => {
    const input: CalculateShippingInput = {
      destination_address: '123 Test St, Test City, CA',
      total_weight: 3.7 // Odd weight to create decimal costs
    };

    const result = await calculateShipping(input);
    
    result.options.forEach(option => {
      // Check that cost has at most 2 decimal places
      const decimalPlaces = (option.cost.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });

  it('should throw error for empty destination address', async () => {
    const input: CalculateShippingInput = {
      destination_address: '',
      total_weight: 5.0
    };

    expect(calculateShipping(input)).rejects.toThrow(/destination address cannot be empty/i);
  });

  it('should throw error for whitespace-only destination address', async () => {
    const input: CalculateShippingInput = {
      destination_address: '   ',
      total_weight: 5.0
    };

    expect(calculateShipping(input)).rejects.toThrow(/destination address cannot be empty/i);
  });

  it('should throw error for zero weight', async () => {
    const input: CalculateShippingInput = {
      destination_address: '123 Main St, Test City, CA',
      total_weight: 0
    };

    expect(calculateShipping(input)).rejects.toThrow(/total weight must be greater than 0/i);
  });

  it('should throw error for negative weight', async () => {
    const input: CalculateShippingInput = {
      destination_address: '123 Main St, Test City, CA',
      total_weight: -5.0
    };

    expect(calculateShipping(input)).rejects.toThrow(/total weight must be greater than 0/i);
  });
});