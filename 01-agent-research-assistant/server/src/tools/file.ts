import fs from 'fs/promises';
import path from 'path';
import { Tool } from '../agent/types';

interface FileInput {
  operation: 'read' | 'write';
  filepath: string;
  content?: string;
}

export class FileTool implements Tool {
  name = 'file_operations';
  description = '读取和写入文件，用于保存研究结果和笔记';

  parameters = {
    type: 'object' as const,
    properties: {
      operation: {
        type: 'string',
        description: '操作类型: read 或 write',
        enum: ['read', 'write'],
      },
      filepath: {
        type: 'string',
        description: '文件路径（相对于 data 目录）',
      },
      content: {
        type: 'string',
        description: '写入的内容（仅 write 操作需要）',
      },
    },
    required: ['operation', 'filepath'],
  };

  async execute(input: unknown): Promise<unknown> {
    const { operation, filepath, content } = input as FileInput;
    const safePath = this.sanitizePath(filepath);

    try {
      if (operation === 'read') {
        const data = await fs.readFile(safePath, 'utf-8');
        return {
          success: true,
          content: data,
        };
      }

      if (operation === 'write') {
        if (!content) {
          throw new Error('Content is required for write operation');
        }

        await fs.mkdir(path.dirname(safePath), { recursive: true });
        await fs.writeFile(safePath, content, 'utf-8');

        return {
          success: true,
          message: 'File written successfully',
          filepath: safePath,
        };
      }

      return {
        success: false,
        error: `Unknown operation: ${operation}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
      };
    }
  }

  private sanitizePath(filepath: string): string {
    const baseDir = path.resolve(process.cwd(), 'data');
    const resolved = path.resolve(baseDir, filepath);

    if (!resolved.startsWith(baseDir)) {
      throw new Error('Access denied: Path outside allowed directory');
    }

    return resolved;
  }
}
