export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;
      await delay(delayMs * Math.pow(2, attempt));
    }
  }
  throw new Error('Max retries exceeded');
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const sanitizeText = (text: string): string => {
  return text.trim().replace(/\s+/g, ' ');
};

export const chunkText = (text: string, maxLength = 1000): string[] => {
  const chunks: string[] = [];
  let currentChunk = '';

  const words = text.split(' ');
  for (const word of words) {
    if (currentChunk.length + word.length + 1 > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = word;
      }
    } else {
      currentChunk += (currentChunk ? ' ' : '') + word;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

export const calculateSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

