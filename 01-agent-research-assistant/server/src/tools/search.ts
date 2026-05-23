import fetch from 'node-fetch';
import { Tool } from '../agent/types';

interface SearchInput {
  query: string;
  num_results?: number;
}

export class SearchTool implements Tool {
  name = 'web_search';
  description = '在互联网上搜索信息，获取最新的新闻、文章和数据';

  parameters = {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: '搜索关键词或问题',
      },
      num_results: {
        type: 'number',
        description: '返回结果数量（1-10）',
        default: 5,
      },
    },
    required: ['query'],
  };

  async execute(input: unknown): Promise<unknown> {
    const { query, num_results = 5 } = input as SearchInput;

    console.log(`🔍 搜索: ${query}`);

    const apiKey = process.env.SERPER_API_KEY;

    if (!apiKey) {
      return {
        success: true,
        query,
        mock: true,
        message: '未配置 SERPER_API_KEY，返回演示数据',
        results: [
          {
            title: `${query} - 示例结果 1`,
            snippet: '配置 SERPER_API_KEY 后可获取真实搜索结果。',
            link: 'https://example.com/1',
          },
          {
            title: `${query} - 示例结果 2`,
            snippet: '智能研究助手 Agent 演示模式。',
            link: 'https://example.com/2',
          },
        ].slice(0, num_results),
        count: Math.min(2, num_results),
      };
    }

    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          num: num_results,
        }),
      });

      if (!response.ok) {
        throw new Error(`Search API error: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        organic?: Array<{ title: string; snippet: string; link: string }>;
      };

      const results =
        data.organic?.slice(0, num_results).map((result) => ({
          title: result.title,
          snippet: result.snippet,
          link: result.link,
        })) ?? [];

      return {
        success: true,
        query,
        results,
        count: results.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('搜索失败:', message);
      return {
        success: false,
        error: message,
        query,
      };
    }
  }
}
