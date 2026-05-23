import fetch from 'node-fetch';
import { Tool } from '../agent/types';

interface WikipediaInput {
  query: string;
  language?: string;
}

export class WikipediaTool implements Tool {
  name = 'wikipedia';
  description = '查询维基百科获取详细的百科知识和背景信息';

  parameters = {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: '要查询的主题或词条',
      },
      language: {
        type: 'string',
        description: '语言代码（en, zh, ja 等）',
        default: 'zh',
      },
    },
    required: ['query'],
  };

  async execute(input: unknown): Promise<unknown> {
    const { query, language = 'zh' } = input as WikipediaInput;

    console.log(`📖 查询维基百科: ${query}`);

    try {
      const searchResponse = await fetch(
        `https://${language}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`
      );

      const searchData = (await searchResponse.json()) as {
        query?: { search?: Array<{ title: string }> };
      };

      if (!searchData.query?.search?.length) {
        return {
          success: false,
          error: '未找到相关条目',
          query,
        };
      }

      const pageTitle = searchData.query.search[0].title;
      const contentResponse = await fetch(
        `https://${language}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*`
      );

      const contentData = (await contentResponse.json()) as {
        query: { pages: Record<string, { extract?: string }> };
      };
      const pages = contentData.query.pages;
      const page = Object.values(pages)[0];

      return {
        success: true,
        title: pageTitle,
        summary: page.extract?.substring(0, 1000),
        url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('维基百科查询失败:', message);
      return {
        success: false,
        error: message,
        query,
      };
    }
  }
}
