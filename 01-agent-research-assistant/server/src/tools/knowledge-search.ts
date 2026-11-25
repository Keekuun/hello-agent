import { Tool } from '../agent/types';
import { KnowledgeBase } from '../knowledge/knowledge-base';

interface KnowledgeSearchInput {
  query: string;
  top_k?: number;
}

export class KnowledgeSearchTool implements Tool {
  name = 'knowledge_search';
  description =
    '在本地知识库中检索已上传文档的相关片段，适合回答用户文档内的问题';

  parameters = {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: '检索问题或关键词',
      },
      top_k: {
        type: 'number',
        description: '返回片段数量（1-8）',
        default: 5,
      },
    },
    required: ['query'],
  };

  constructor(private readonly dbPath: string) {}

  async execute(input: unknown): Promise<unknown> {
    const { query, top_k = 5 } = input as KnowledgeSearchInput;
    const trimmed = typeof query === 'string' ? query.trim() : '';

    if (!trimmed) {
      return {
        success: false,
        error: 'query 不能为空',
      };
    }

    const limit = Math.min(8, Math.max(1, Number(top_k) || 5));
    const knowledgeBase = new KnowledgeBase(this.dbPath);

    try {
      const results = knowledgeBase.search(trimmed, limit);
      return {
        success: true,
        query: trimmed,
        count: results.length,
        results: results.map((result) => ({
          document_id: result.documentId,
          document_title: result.documentTitle,
          chunk_index: result.chunkIndex,
          score: result.score,
          content: result.content,
        })),
        message:
          results.length === 0
            ? '知识库中未找到相关内容，可请用户先上传文档'
            : undefined,
      };
    } finally {
      knowledgeBase.close();
    }
  }
}
