export interface TextChunk {
  content: string;
  sectionLabel: string;
  page: number;
}

export function chunkText(
  text: string,
  targetChunkWords = 350,
  overlapWords = 40
): TextChunk[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: TextChunk[] = [];
  let currentWords: string[] = [];
  let currentSection = "General Overview";
  let currentPage = 1;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Detect structural section headings
    if (trimmed.length < 90 && /^(Chapter|Unit|Section|Topic|Module|\d+\.|\#+)/i.test(trimmed)) {
      currentSection = trimmed.replace(/^#+\s*/, "");
    }

    // Page indicator heuristics
    if (/page\s+\d+/i.test(trimmed)) {
      const match = trimmed.match(/page\s+(\d+)/i);
      if (match && match[1]) {
        currentPage = parseInt(match[1], 10);
      }
    }

    const words = trimmed.split(/\s+/).filter(Boolean);
    currentWords.push(...words);

    while (currentWords.length >= targetChunkWords) {
      const chunkWords = currentWords.slice(0, targetChunkWords);
      chunks.push({
        content: chunkWords.join(" "),
        sectionLabel: currentSection,
        page: currentPage,
      });
      currentWords = currentWords.slice(targetChunkWords - overlapWords);
    }
  }

  if (currentWords.length > 0) {
    chunks.push({
      content: currentWords.join(" "),
      sectionLabel: currentSection,
      page: currentPage,
    });
  }

  return chunks;
}
