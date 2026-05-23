import { Tool } from '../agent/types';
import { SearchTool } from './search';
import { WikipediaTool } from './wikipedia';
import { CalculatorTool } from './calculator';
import { FileTool } from './file';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor(extraTools: Tool[] = []) {
    this.register(new SearchTool());
    this.register(new WikipediaTool());
    this.register(new CalculatorTool());
    this.register(new FileTool());
    extraTools.forEach((tool) => this.register(tool));
  }

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  getDescription(): string {
    return this.getAll()
      .map((tool) => `- ${tool.name}: ${tool.description}`)
      .join('\n');
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}
