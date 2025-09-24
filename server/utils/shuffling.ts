import crypto from 'crypto';

/**
 * Deterministic shuffling utilities for maintaining answer key integrity
 * while providing fair randomization per student per exam attempt
 */

export interface PermutationMapping {
  [questionId: number]: number[];
}

export interface ShuffleConfig {
  examId: number;
  studentId: string;
  attemptNumber: number;
  serverSecret?: string;
}

/**
 * Generate a deterministic seed for a specific student, exam, and attempt
 * Uses HMAC_SHA256 to ensure different but predictable ordering per student
 */
export function generateShuffleSeed(config: ShuffleConfig): string {
  const secret = config.serverSecret || process.env.SHUFFLE_SECRET || 'default-secret-change-in-production';
  const data = `${config.examId}:${config.studentId}:${config.attemptNumber}`;
  
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

/**
 * Seeded pseudo-random number generator using a hash-based approach
 * Provides deterministic but uniformly distributed random numbers
 */
export class SeededRandom {
  private seed: string;
  private counter: number = 0;

  constructor(seed: string) {
    this.seed = seed;
  }

  /**
   * Generate next random number between 0 and 1
   */
  next(): number {
    this.counter++;
    const hash = crypto
      .createHash('sha256')
      .update(this.seed + this.counter.toString())
      .digest('hex');
    
    // Convert first 8 hex characters to number between 0 and 1
    const num = parseInt(hash.substring(0, 8), 16);
    return num / 0xffffffff;
  }

  /**
   * Generate random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }
}

/**
 * Fisher-Yates shuffle algorithm with seeded randomization
 * Returns both the shuffled array and the permutation mapping
 */
export function shuffleWithPermutation<T>(
  array: T[], 
  rng: SeededRandom
): { shuffled: T[]; permutation: number[] } {
  const shuffled = [...array];
  const permutation: number[] = Array.from({ length: array.length }, (_, i) => i);
  
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i + 1);
    
    // Swap elements
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
  }
  
  return { shuffled, permutation };
}

/**
 * Map presented indices back to canonical indices using permutation
 */
export function mapPresentedToCanonical(
  presentedIndices: number[], 
  permutation: number[]
): number[] {
  return presentedIndices.map(presentedIndex => {
    return permutation[presentedIndex] ?? presentedIndex;
  });
}

/**
 * Map a single presented index back to canonical index
 */
export function mapSinglePresentedToCanonical(
  presentedIndex: number, 
  permutation: number[]
): number {
  return permutation[presentedIndex] ?? presentedIndex;
}

/**
 * Convert letter-based answer (A, B, C, D) to index (0, 1, 2, 3)
 */
export function letterToIndex(letter: string): number {
  return letter.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
}

/**
 * Convert index to letter-based answer
 */
export function indexToLetter(index: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + index);
}

/**
 * Normalize answer format to indices for consistent grading
 */
export function normalizeAnswerToIndices(answer: string | string[] | number[]): number[] {
  if (Array.isArray(answer)) {
    return answer.map(a => {
      if (typeof a === 'string') {
        return isNaN(Number(a)) ? letterToIndex(a) : Number(a);
      }
      return a;
    });
  }
  
  if (typeof answer === 'string') {
    return isNaN(Number(answer)) ? [letterToIndex(answer)] : [Number(answer)];
  }
  
  return [answer];
}

/**
 * Create permutation mappings for all questions in an exam
 */
export function createExamPermutations(
  questions: any[], 
  config: ShuffleConfig,
  randomizeOptions: boolean = false
): PermutationMapping {
  if (!randomizeOptions) {
    return {};
  }

  const seed = generateShuffleSeed(config);
  const rng = new SeededRandom(seed);
  const mappings: PermutationMapping = {};

  questions.forEach(question => {
    if (question.options && Array.isArray(question.options) && question.options.length > 1) {
      const { permutation } = shuffleWithPermutation(question.options, rng);
      mappings[question.id] = permutation;
    }
  });

  return mappings;
}

/**
 * Create inverse permutation mapping (original index → new position)
 */
export function createInversePermutation(permutation: number[]): number[] {
  const inverse = new Array(permutation.length);
  for (let i = 0; i < permutation.length; i++) {
    inverse[permutation[i]] = i;
  }
  return inverse;
}

/**
 * Remap correct answers from original indices to shuffled positions
 */
export function remapCorrectAnswers(
  correctAnswer: string | null,
  correctAnswers: string[] | null,
  inversePermutation: number[]
): { remappedCorrectAnswer: string | null; remappedCorrectAnswers: string[] | null } {
  let remappedCorrectAnswer = null;
  let remappedCorrectAnswers = null;

  // Handle single correct answer
  if (correctAnswer !== null && correctAnswer !== undefined) {
    const originalIndex = typeof correctAnswer === 'string' && isNaN(Number(correctAnswer)) 
      ? letterToIndex(correctAnswer) 
      : Number(correctAnswer);
    
    if (originalIndex >= 0 && originalIndex < inversePermutation.length) {
      const newIndex = inversePermutation[originalIndex];
      remappedCorrectAnswer = indexToLetter(newIndex);
    }
  }

  // Handle multiple correct answers
  if (correctAnswers && Array.isArray(correctAnswers)) {
    remappedCorrectAnswers = correctAnswers.map(answer => {
      const originalIndex = typeof answer === 'string' && isNaN(Number(answer))
        ? letterToIndex(answer)
        : Number(answer);
      
      if (originalIndex >= 0 && originalIndex < inversePermutation.length) {
        const newIndex = inversePermutation[originalIndex];
        return indexToLetter(newIndex);
      }
      return answer; // fallback
    });
  }

  return { remappedCorrectAnswer, remappedCorrectAnswers };
}

/**
 * Apply permutation to question options for presentation to student
 */
export function applyPermutationToQuestion(
  question: any, 
  permutation: number[]
): any {
  if (!question.options || !Array.isArray(question.options) || !permutation) {
    return question;
  }

  const shuffledOptions = permutation.map(i => question.options[i]);
  
  return {
    ...question,
    options: shuffledOptions,
    // Remove correct answer information from student view
    correctAnswer: undefined,
    correctAnswers: undefined
  };
}

/**
 * Apply permutation and remap correct answers for instructor/grading purposes
 */
export function applyPermutationWithCorrectAnswers(
  question: any,
  permutation: number[]
): any {
  if (!question.options || !Array.isArray(question.options) || !permutation) {
    return question;
  }

  const shuffledOptions = permutation.map(i => question.options[i]);
  const inversePermutation = createInversePermutation(permutation);
  
  // Remap correct answers to new shuffled positions
  const { remappedCorrectAnswer, remappedCorrectAnswers } = remapCorrectAnswers(
    question.correctAnswer,
    question.correctAnswers,
    inversePermutation
  );

  return {
    ...question,
    options: shuffledOptions,
    correctAnswer: remappedCorrectAnswer,
    correctAnswers: remappedCorrectAnswers,
    // Store original mapping for debugging
    _shuffleDebug: {
      originalPermutation: permutation,
      inversePermutation,
      originalCorrectAnswer: question.correctAnswer,
      originalCorrectAnswers: question.correctAnswers
    }
  };
}