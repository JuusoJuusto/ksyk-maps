/**
 * Rule-based Plagiarism and AI Detection Checker
 * Analyzes text for patterns that may indicate AI generation or plagiarism
 */

export interface PlagiarismResult {
  score: number; // 0-100, higher = more likely AI/plagiarized
  confidence: 'low' | 'medium' | 'high';
  flags: string[];
  details: {
    sentenceComplexity: number;
    vocabularyLevel: number;
    repetitionScore: number;
    structureScore: number;
    grammarPerfection: number;
  };
  recommendation: string;
}

/**
 * Analyze text for AI generation patterns
 */
export function analyzePlagiarism(text: string): PlagiarismResult {
  if (!text || text.trim().length < 50) {
    return {
      score: 0,
      confidence: 'low',
      flags: ['Teksti on liian lyhyt analysoitavaksi'],
      details: {
        sentenceComplexity: 0,
        vocabularyLevel: 0,
        repetitionScore: 0,
        structureScore: 0,
        grammarPerfection: 0
      },
      recommendation: 'Teksti on liian lyhyt luotettavaan analyysiin.'
    };
  }

  const flags: string[] = [];
  let totalScore = 0;

  // 1. Analyze sentence complexity
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = text.split(/\s+/).length / sentences.length;
  const sentenceComplexity = Math.min(100, (avgSentenceLength / 25) * 100);
  
  if (avgSentenceLength > 25) {
    flags.push('Erittäin pitkät lauseet (keskimäärin ' + Math.round(avgSentenceLength) + ' sanaa)');
    totalScore += 15;
  } else if (avgSentenceLength > 20) {
    flags.push('Pitkät lauseet voivat viitata AI-generointiin');
    totalScore += 10;
  }

  // 2. Vocabulary level analysis
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const uniqueWords = new Set(words);
  const vocabularyDiversity = (uniqueWords.size / words.length) * 100;
  const vocabularyLevel = Math.min(100, vocabularyDiversity * 1.5);

  if (vocabularyDiversity > 0.7) {
    flags.push('Erittäin monipuolinen sanasto (voi olla AI)');
    totalScore += 15;
  }

  // Check for advanced/unusual words
  const advancedWords = [
    'kuitenkin', 'lisäksi', 'toisaalta', 'näin ollen', 'siten', 
    'merkittävä', 'olennainen', 'huomattava', 'erityisesti', 'nimenomaan'
  ];
  const advancedWordCount = words.filter(w => advancedWords.includes(w)).length;
  if (advancedWordCount > words.length * 0.05) {
    flags.push('Paljon akateemisia sidesanoja');
    totalScore += 10;
  }

  // 3. Repetition analysis
  const wordFrequency = new Map<string, number>();
  words.forEach(word => {
    if (word.length > 3) { // Ignore short words
      wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
    }
  });

  const repetitions = Array.from(wordFrequency.values()).filter(count => count > 3).length;
  const repetitionScore = Math.min(100, (repetitions / uniqueWords.size) * 200);

  if (repetitions < 2 && words.length > 100) {
    flags.push('Hyvin vähän toistoa (epätavallista ihmiselle)');
    totalScore += 10;
  }

  // 4. Structure analysis
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const avgParagraphLength = sentences.length / Math.max(1, paragraphs.length);
  const structureScore = Math.min(100, (avgParagraphLength / 5) * 100);

  if (avgParagraphLength > 5 && avgParagraphLength < 8) {
    flags.push('Tasainen kappalerakenne (tyypillistä AI:lle)');
    totalScore += 15;
  }

  // Check for perfect paragraph structure
  const paragraphLengths = paragraphs.map(p => p.split(/[.!?]+/).length);
  const lengthVariation = Math.max(...paragraphLengths) - Math.min(...paragraphLengths);
  if (lengthVariation < 2 && paragraphs.length > 2) {
    flags.push('Kappaleet ovat liian tasaisia');
    totalScore += 10;
  }

  // 5. Grammar perfection check
  // Check for common human errors that AI rarely makes
  const hasTypos = /\b(teh|hte|jaa|oon|ollu)\b/i.test(text);
  const hasInformalLanguage = /\b(joo|nii|emt|lol|xd)\b/i.test(text);
  const hasInconsistentCapitalization = /[a-zäö][A-ZÄÖÅ]/.test(text);
  
  let grammarPerfection = 100;
  if (hasTypos) grammarPerfection -= 30;
  if (hasInformalLanguage) grammarPerfection -= 20;
  if (hasInconsistentCapitalization) grammarPerfection -= 20;

  if (grammarPerfection > 90 && words.length > 100) {
    flags.push('Täydellinen kielioppi (epätavallista oppilaalle)');
    totalScore += 20;
  }

  // 6. Check for AI-typical phrases
  const aiPhrases = [
    'on tärkeää huomata',
    'toisaalta on syytä',
    'yhteenvetona voidaan todeta',
    'lopuksi voidaan sanoa',
    'kaiken kaikkiaan',
    'näin ollen voidaan päätellä'
  ];
  
  const aiPhraseCount = aiPhrases.filter(phrase => 
    text.toLowerCase().includes(phrase)
  ).length;
  
  if (aiPhraseCount > 2) {
    flags.push(`${aiPhraseCount} AI-tyypillistä fraasia havaittu`);
    totalScore += aiPhraseCount * 10;
  }

  // 7. Check for unnatural flow
  const hasListStructure = /\n\s*[-•*]\s+/g.test(text) || /\n\s*\d+\.\s+/g.test(text);
  if (hasListStructure && paragraphs.length > 3) {
    flags.push('Listamainen rakenne (tyypillistä AI:lle)');
    totalScore += 10;
  }

  // Calculate final score (0-100)
  const finalScore = Math.min(100, totalScore);

  // Determine confidence level
  let confidence: 'low' | 'medium' | 'high';
  if (finalScore < 30) {
    confidence = 'low';
  } else if (finalScore < 60) {
    confidence = 'medium';
  } else {
    confidence = 'high';
  }

  // Generate recommendation
  let recommendation: string;
  if (finalScore < 30) {
    recommendation = 'Teksti vaikuttaa todennäköisesti oppilaan omalta työltä. Ei huolestuttavia merkkejä.';
  } else if (finalScore < 50) {
    recommendation = 'Joitakin AI-tyypillisiä piirteitä havaittu. Suositellaan keskustelua oppilaan kanssa.';
  } else if (finalScore < 70) {
    recommendation = 'Useita AI-tyypillisiä piirteitä. Vahva suositus keskustella oppilaan kanssa ja pyytää selitystä.';
  } else {
    recommendation = 'Teksti sisältää paljon AI-tyypillisiä piirteitä. Suositellaan tarkempaa tarkastelua ja keskustelua oppilaan kanssa.';
  }

  return {
    score: Math.round(finalScore),
    confidence,
    flags,
    details: {
      sentenceComplexity: Math.round(sentenceComplexity),
      vocabularyLevel: Math.round(vocabularyLevel),
      repetitionScore: Math.round(repetitionScore),
      structureScore: Math.round(structureScore),
      grammarPerfection: Math.round(grammarPerfection)
    },
    recommendation
  };
}

/**
 * Get color class based on plagiarism score
 */
export function getScoreColor(score: number): string {
  if (score < 30) return 'text-green-600';
  if (score < 50) return 'text-yellow-600';
  if (score < 70) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Get background color class based on plagiarism score
 */
export function getScoreBgColor(score: number): string {
  if (score < 30) return 'bg-green-50 border-green-200';
  if (score < 50) return 'bg-yellow-50 border-yellow-200';
  if (score < 70) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
}

/**
 * Get confidence badge color
 */
export function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case 'low': return 'bg-gray-100 text-gray-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    case 'high': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}
