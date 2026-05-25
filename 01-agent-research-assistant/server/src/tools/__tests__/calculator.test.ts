import { describe, it, expect } from 'vitest';
import { CalculatorTool } from '../calculator';

describe('CalculatorTool', () => {
  const calculator = new CalculatorTool();

  it('evaluates basic arithmetic', async () => {
    const result = await calculator.execute({ expression: '2 + 3 * 4' }) as {
      success: boolean;
      result: number;
    };

    expect(result.success).toBe(true);
    expect(result.result).toBe(14);
  });

  it('supports power operator', async () => {
    const result = await calculator.execute({ expression: '2^10' }) as {
      success: boolean;
      result: number;
    };

    expect(result.success).toBe(true);
    expect(result.result).toBe(1024);
  });

  it('rejects invalid expressions', async () => {
    const result = await calculator.execute({ expression: 'process.exit(1)' }) as {
      success: boolean;
      error: string;
    };

    expect(result.success).toBe(false);
    expect(result.error).toBe('无效的数学表达式');
  });
});
