import { AgentConfig, ReActStep } from './types';
import { ToolRegistry } from '../tools';

export class ReActEngine {
  private config: AgentConfig;
  private tools: ToolRegistry;
  private maxIterations: number;

  constructor(config: AgentConfig) {
    this.config = config;
    this.tools = new ToolRegistry(config.tools);
    this.maxIterations = config.maxIterations ?? 10;
  }

  async run(
    task: string,
    onProgress?: (step: ReActStep) => void
  ): Promise<string> {
    const steps: ReActStep[] = [];

    for (let i = 0; i < this.maxIterations; i++) {
      console.log(`\n--- 迭代 ${i + 1}/${this.maxIterations} ---`);

      const step = await this.generateStep(task, steps);
      steps.push(step);

      console.log(`💭 思考: ${step.thought}`);

      if (onProgress) {
        onProgress(step);
      }

      if (step.finalAnswer) {
        console.log(`✅ 最终答案: ${step.finalAnswer}`);
        return step.finalAnswer;
      }

      if (step.action) {
        console.log(
          `🔧 行动: ${step.action.tool}(${JSON.stringify(step.action.input)})`
        );

        const observation = await this.executeAction(step.action);
        step.observation = observation;

        console.log(
          `👁️ 观察: ${this.truncate(JSON.stringify(observation), 200)}`
        );

        if (onProgress) {
          onProgress(step);
        }
      }
    }

    return '抱歉，我无法在合理的步骤内完成这个任务。';
  }

  private async generateStep(
    task: string,
    previousSteps: ReActStep[]
  ): Promise<ReActStep> {
    const prompt = this.buildPrompt(task, previousSteps);
    const response = await this.config.llm.generate(prompt, {
      temperature: this.config.temperature ?? 0.7,
    });

    return this.parseResponse(response);
  }

  private buildPrompt(task: string, previousSteps: ReActStep[]): string {
    const toolsDescription = this.tools.getDescription();

    const history = previousSteps
      .map((step, i) => {
        let text = `Step ${i + 1}:\nThought: ${step.thought}\n`;

        if (step.action) {
          text += `Action: ${step.action.tool}[${JSON.stringify(step.action.input)}]\n`;
        }

        if (step.observation !== undefined) {
          text += `Observation: ${JSON.stringify(step.observation)}\n`;
        }

        if (step.finalAnswer) {
          text += `Final Answer: ${step.finalAnswer}\n`;
        }

        return text;
      })
      .join('\n');

    return `你是一个智能研究助手。你可以使用以下工具来完成研究任务：

可用工具：
${toolsDescription}

【重要】你必须严格按照以下格式输出，每次只输出一步：

格式1 - 使用工具：
Thought: 分析当前情况，决定下一步
Action: 工具名[{"query": "搜索内容"}]

格式2 - 给出最终答案：
Thought: 我已经收集到足够信息
Final Answer: 你的最终答案

注意：
- Action 后面的工具名必须是上面列出的可用工具之一
- 工具参数必须是有效的 JSON 格式
- 搜索工具的参数格式为 {"query": "搜索关键词"}

${history ? `已完成的步骤:\n${history}\n` : ''}
研究任务: ${task}

Thought:`.trim();
  }

  parseResponse(response: string): ReActStep {
    // 提取 Thought
    const thoughtMatch = response.match(
      /Thought:\s*(.+?)(?=Action:|Final Answer:|$)/s
    );
    const thought = thoughtMatch ? thoughtMatch[1].trim() : response.trim();

    // 检查 Final Answer
    const finalAnswerMatch = response.match(/Final Answer:\s*(.+)/s);
    if (finalAnswerMatch) {
      return {
        thought,
        finalAnswer: finalAnswerMatch[1].trim(),
      };
    }

    // 尝试多种 Action 格式
    // 格式1: Action: toolName[{...}]
    let actionMatch = response.match(/Action:\s*(\w+)\[([\s\S]+?)\]/s);
    
    // 格式2: Action: toolName({...}) 或 Action: toolName({..  ..})
    if (!actionMatch) {
      actionMatch = response.match(/Action:\s*(\w+)\(([\s\S]+?)\)/s);
    }
    
    // 格式3: Action: toolName: {...}
    if (!actionMatch) {
      actionMatch = response.match(/Action:\s*(\w+):\s*([\s\S]+?)(?=Observation:|$)/s);
    }
    
    // 格式4: Action: toolName input (空格分隔)
    if (!actionMatch) {
      actionMatch = response.match(/Action:\s*(\w+)\s+([\s\S]+?)(?=Observation:|$)/s);
    }

    if (actionMatch) {
      const toolName = actionMatch[1].trim();
      let inputStr = actionMatch[2].trim();
      
      // 尝试解析 JSON
      let toolInput: any;
      try {
        toolInput = JSON.parse(inputStr);
      } catch {
        // 如果不是 JSON，尝试提取 key-value
        const queryMatch = inputStr.match(/["']?query["']?\s*[:=]\s*["']([^"']+)["']/i) 
          || inputStr.match(/["']?input["']?\s*[:=]\s*["']([^"']+)["']/i)
          || inputStr.match(/["']?text["']?\s*[:=]\s*["']([^"']+)["']/i);
        
        if (queryMatch) {
          toolInput = { query: queryMatch[1] };
        } else {
          // 默认作为 query 参数
          toolInput = { query: inputStr.replace(/^["']|["']$/g, '') };
        }
      }

      return {
        thought,
        action: {
          tool: toolName,
          input: toolInput,
        },
      };
    }

    // 如果都没有匹配到，尝试从整个响应中提取有用信息
    // 可能 DeepSeek 返回了中文格式
    const cnActionMatch = response.match(/行动[：:]\s*(\w+)[\s\[({]+([\s\S]+?)[\s\])}]/);
    if (cnActionMatch) {
      const toolName = cnActionMatch[1].trim();
      let inputStr = cnActionMatch[2].trim();
      let toolInput: any;
      try {
        toolInput = JSON.parse(inputStr);
      } catch {
        toolInput = { query: inputStr };
      }
      return {
        thought,
        action: { tool: toolName, input: toolInput },
      };
    }

    // 最后兜底：如果响应包含工具名，尝试构造 action
    const toolNames = this.tools.getToolNames();
    for (const name of toolNames) {
      if (response.toLowerCase().includes(name.toLowerCase())) {
        const queryMatch = response.match(/["']([^"']{5,})["']/);
        if (queryMatch) {
          return {
            thought,
            action: { tool: name, input: { query: queryMatch[1] } },
          };
        }
      }
    }

    throw new Error('Invalid response format: missing Action or Final Answer');
  }

  private async executeAction(action: {
    tool: string;
    input: unknown;
  }): Promise<unknown> {
    const tool = this.tools.get(action.tool);

    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${action.tool}`,
      };
    }

    try {
      return await tool.execute(action.input);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
      };
    }
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  }
}
