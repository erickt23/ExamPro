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
};

// Helper function to calculate final grade
export function calculateFinalGrade(
  assignmentScore: number,
  assignmentMaxScore: number,
  examScore: number,
  examMaxScore: number,
  assignmentCoeff?: number,
  examCoeff?: number
): number {
  const assignmentPercentage = assignmentMaxScore > 0 ? (assignmentScore / assignmentMaxScore) * 100 : 0;
  const examPercentage = examMaxScore > 0 ? (examScore / examMaxScore) * 100 : 0;
  
  // Use provided coefficients or fall back to defaults
  const aCoeff = assignmentCoeff ?? GRADE_CALCULATION_CONFIG.ASSIGNMENT_COEFFICIENT;
  const eCoeff = examCoeff ?? GRADE_CALCULATION_CONFIG.EXAM_COEFFICIENT;
  
  const finalGrade = (
    assignmentPercentage * aCoeff +
    examPercentage * eCoeff
  );
  
  return Math.round(finalGrade * 100) / 100; // Round to 2 decimal places
}