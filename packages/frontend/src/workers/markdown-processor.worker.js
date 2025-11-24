/**
 * Markdown 内容处理 Worker
 * 使用 MessageChannel 进行双向通信
 * 处理内容分析、字数统计、关键词提取等耗时操作
 */

let messagePort = null;

// 处理主线程消息
self.onmessage = function(event) {
  const { type, data, port } = event.data;

  switch (type) {
    case 'init':
      // 初始化 MessageChannel
      if (port) {
        messagePort = port;
        messagePort.onmessage = handlePortMessage;
        messagePort.onmessageerror = handlePortError;
        // 通知主线程 Worker 已就绪, port2 -> port1(workerPort)
        messagePort.postMessage({ 
          type: 'ready',
          data: { message: 'Worker initialized successfully' } 
        });
      }
      break;

    case 'analyze':
      // 分析 Markdown 内容
      if (data && data.content) {
        const analysis = analyzeContent(data.content);
        // 将分析结果发送回主线程
        self.postMessage({
          type: 'analysis',
          data: analysis
        });
      }
      break;

    case 'validate':
      // 验证内容
      if (data && data.content) {
        const validation = validateContent(data.content);
        self.postMessage({
          type: 'validation',
          data: validation
        });
      }
      break;

    default:
      console.warn('[MarkdownProcessor] Unknown message type:', type);
  }
};

// 处理 MessageChannel 端口消息
function handlePortMessage(event) {
  const { type, data } = event.data;

  switch (type) {
    case 'analyze':
      if (data && data.content) {
        const analysis = analyzeContent(data.content);
        messagePort.postMessage({
          type: 'analysis',
          data: analysis
        });
      }
      break;

    case 'validate':
      if (data && data.content) {
        const validation = validateContent(data.content);
        messagePort.postMessage({
          type: 'validation',
          data: validation
        });
      }
      break;

    case 'extractKeywords':
      if (data && data.content) {
        const keywords = extractKeywords(data.content);
        messagePort.postMessage({
          type: 'keywords',
          data: keywords
        });
      }
      break;

    default:
      console.warn('[MarkdownProcessor] Unknown port message type:', type);
  }
}

// 处理端口错误
function handlePortError(error) {
  console.error('[MarkdownProcessor] Port error:', error);
  if (messagePort) {
    messagePort.postMessage({
      type: 'error',
      data: { message: 'Port communication error' }
    });
  }
}

/**
 * 分析 Markdown 内容
 * @param {string} content - Markdown 内容
 * @returns {Object} 分析结果
 */
function analyzeContent(content) {
  if (!content || typeof content !== 'string') {
    return {
      wordCount: 0,
      charCount: 0,
      charCountNoSpaces: 0,
      paragraphCount: 0,
      headingCount: 0,
      linkCount: 0,
      imageCount: 0,
      codeBlockCount: 0,
      listCount: 0,
      readingTime: 0
    };
  }

  // 移除 Markdown 语法标记，获取纯文本
  const plainText = content
    .replace(/```[\s\S]*?```/g, '') // 代码块
    .replace(/`[^`]+`/g, '') // 行内代码
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 链接
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // 图片
    .replace(/[#*_~`[\]()]/g, '') // Markdown 标记
    .replace(/\n{3,}/g, '\n\n') // 多个换行
    .trim();

  // 字数统计（中文字符 + 英文单词）
  const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = plainText
    .replace(/[\u4e00-\u9fa5]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 0).length;
  const wordCount = chineseChars + englishWords;

  // 字符统计
  const charCount = content.length;
  const charCountNoSpaces = content.replace(/\s/g, '').length;

  // 段落数（以双换行或空行为分隔）
  const paragraphCount = content.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;

  // 标题数
  const headingCount = (content.match(/^#{1,6}\s+/gm) || []).length;

  // 链接数
  const linkCount = (content.match(/\[([^\]]+)\]\([^)]+\)/g) || []).length;

  // 图片数
  const imageCount = (content.match(/!\[([^\]]*)\]\([^)]+\)/g) || []).length;

  // 代码块数
  const codeBlockCount = (content.match(/```[\s\S]*?```/g) || []).length;

  // 列表数（有序和无序）
  const listCount = (content.match(/^[\s]*[-*+]\s+|^\s*\d+\.\s+/gm) || []).length;

  // 阅读时间估算（按每分钟 200 字计算）
  const readingTime = Math.ceil(wordCount / 200);

  return {
    wordCount,
    charCount,
    charCountNoSpaces,
    paragraphCount,
    headingCount,
    linkCount,
    imageCount,
    codeBlockCount,
    listCount,
    readingTime,
    timestamp: Date.now()
  };
}

/**
 * 验证内容
 * @param {string} content - Markdown 内容
 * @returns {Object} 验证结果
 */
function validateContent(content) {
  const errors = [];
  const warnings = [];

  if (!content || content.trim().length === 0) {
    warnings.push('内容为空');
  }

  // 检查标题层级
  const headings = content.match(/^(#{1,6})\s+(.+)$/gm) || [];
  let previousLevel = 0;
  headings.forEach((heading, index) => {
    const level = heading.match(/^#+/)[0].length;
    if (index > 0 && level > previousLevel + 1) {
      warnings.push(`标题层级跳跃：${heading.trim()}`);
    }
    previousLevel = level;
  });

  // 检查未闭合的代码块
  const codeBlockMatches = content.match(/```/g) || [];
  if (codeBlockMatches.length % 2 !== 0) {
    errors.push('存在未闭合的代码块');
  }

  // 检查链接格式
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let linkMatch;
  while ((linkMatch = linkPattern.exec(content)) !== null) {
    const url = linkMatch[2];
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/') && !url.startsWith('#') && !url.startsWith('mailto:')) {
      warnings.push(`链接格式可能不正确：${linkMatch[0]}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    timestamp: Date.now()
  };
}

/**
 * 提取关键词（简单实现）
 * @param {string} content - Markdown 内容
 * @param {number} topN - 返回前 N 个关键词
 * @returns {Array} 关键词列表
 */
function extractKeywords(content, topN = 10) {
  if (!content || typeof content !== 'string') {
    return [];
  }

  // 移除 Markdown 语法，获取纯文本
  const plainText = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/[#*_~`[\]()]/g, '')
    .toLowerCase();

  // 提取中文词汇（2-4字）
  const chineseWords = plainText.match(/[\u4e00-\u9fa5]{2,4}/g) || [];

  // 提取英文单词（3个字母以上）
  const englishWords = plainText
    .replace(/[\u4e00-\u9fa5]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3 && /^[a-z]+$/i.test(word));

  // 统计词频
  const wordFreq = {};
  
  chineseWords.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  englishWords.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  // 排序并返回前 N 个
  const sortedWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));

  return sortedWords;
}

// 错误处理
self.onerror = function(error) {
  console.error('[MarkdownProcessor] Worker error:', error);
  if (messagePort) {
    messagePort.postMessage({
      type: 'error',
      data: { message: error.message || 'Unknown error' }
    });
  }
};

