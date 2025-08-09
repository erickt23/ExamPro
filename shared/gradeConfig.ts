// Grade calculation configuration
export const GRADE_CALCULATION_CONFIG = {
  // Coefficient for assignments (homework total)
  ASSIGNMENT_COEFFICIENT: 0.4, // 40% weight for assignments
  
  // Coefficient for exams (exam total)  
  EXAM_COEFFICIENT: 0.6, // 60% weight for exams
  
  // Minimum scale (0-100 percentage or 0-4.0 GPA, etc.)
  GRADE_SCALE: {
    MIN: 0,
    MAX: 100,
  },
  
  // Optional: Letter grade mapping
  LETTER_GRADES: {
    'A+': { min: 97, max: 100 },
    'A': { min: 93, max: 96 },
    'A-': { min: 90, max: 92 },
    'B+': { min: 87, max: 89 },
    'B': { min: 83, max: 86 },
    'B-': { min: 80, max: 82 },
    'C+': { min: 77, max: 79 },
    'C': { min: 73, max: 76 },
    'C-': { min: 70, max: 72 },
    'D+': { min: 67, max: 69 },
    'D': { min: 63, max: 66 },
    'D-': { min: 60, max: 62 },
    'F': { min: 0, max: 59 },
  }
} as const;

export type GradeCalculationResult = {
  subjectId: number;
  subjectName: string;
  studentId: string;
  totalAssignmentScore: number;
  totalAssignmentMaxScore: number;
  assignmentPercentage: number;
  totalExamScore: number;
  totalExamMaxScore: number;
  examPercentage: number;
  finalGrade: number;
  letterGrade: string;
};

// Helper function to calculate letter grade
export function calculateLetterGrade(percentage: number): string {
  for (const [letter, range] of Object.entries(GRADE_CALCULATION_CONFIG.LETTER_GRADES)) {
    if (percentage >= range.min && percentage <= range.max) {
      return letter;
    }
  }
  return 'F';
}

// Helper function to calculate final grade
export function calculateFinalGrade(
  assignmentScore: number,
  assignmentMaxScore: number,
  examScore: number,
  examMaxScore: number
): number {
  const assignmentPercentage = assignmentMaxScore > 0 ? (assignmentScore / assignmentMaxScore) * 100 : 0;
  const examPercentage = examMaxScore > 0 ? (examScore / examMaxScore) * 100 : 0;
  
  const finalGrade = (
    assignmentPercentage * GRADE_CALCULATION_CONFIG.ASSIGNMENT_COEFFICIENT +
    examPercentage * GRADE_CALCULATION_CONFIG.EXAM_COEFFICIENT
  );
  
  return Math.round(finalGrade * 100) / 100; // Round to 2 decimal places
}