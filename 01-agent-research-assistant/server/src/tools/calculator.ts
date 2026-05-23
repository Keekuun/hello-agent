import { Tool } from '../agent/types';

interface CalculatorInput {
  expression: string;
}

export class CalculatorTool implements Tool {
  name = 'calculator';
  description = '执行数学计算，支持加减乘除、幂运算等';

  parameters = {
    type: 'object' as const,
    properties: {
      expression: {
        type: 'string',
        description: '数学表达式，如 "2 + 3 * 4" 或 "2^10"',
      },
    },
    required: ['expression'],
  };

  async execute(input: unknown): Promise<unknown> {
    const { expression } = input as CalculatorInput;

    console.log(`🧮 计算: ${expression}`);

    try {
      const result = this.safeEvaluate(expression);

      return {
        success: true,
        expression,
        result,
      };
    } catch {
      return {
        success: false,
        error: '无效的数学表达式',
        expression,
      };
    }
  }

  private safeEvaluate(expression: string): number {
    if (!/^[\d\s+\-*/().^]+$/.test(expression)) {
      throw new Error('Invalid characters in expression');
    }

    const sanitized = expression.replace(/\^/g, '**');
    return new Function(`return ${sanitized}`)() as number;
  }
}
