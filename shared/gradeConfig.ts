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
  // Extra credit information
  assignmentExtraCredits?: number;
  examExtraCredits?: number;
  totalExtraCredits?: number;
};

// Helper function to calculate final grade
export function calculateFinalGrade(
  assignmentScore: number,
  assignmentMaxScore: number,
  examScore: number,
  examMaxScore: number,
  assignmentCoeff?: number,
  examCoeff?: number,
  assignmentExtraCredits?: number,
  examExtraCredits?: number
): number {
  // Include extra credits in scores
  const totalAssignmentScore = assignmentScore + (assignmentExtraCredits || 0);
  const totalExamScore = examScore + (examExtraCredits || 0);
  
  const assignmentPercentage = assignmentMaxScore > 0 ? (totalAssignmentScore / assignmentMaxScore) * 100 : 0;
  const examPercentage = examMaxScore > 0 ? (totalExamScore / examMaxScore) * 100 : 0;
  
  // Use provided coefficients or fall back to defaults
  const aCoeff = assignmentCoeff ?? GRADE_CALCULATION_CONFIG.ASSIGNMENT_COEFFICIENT;
  const eCoeff = examCoeff ?? GRADE_CALCULATION_CONFIG.EXAM_COEFFICIENT;
  
  const finalGrade = (
    assignmentPercentage * aCoeff +
    examPercentage * eCoeff
  );
  
  return Math.round(finalGrade * 100) / 100; // Round to 2 decimal places
}

// Enhanced version that returns detailed calculation result with extra credits
export function calculateDetailedGrade(
  assignmentScore: number,
  assignmentMaxScore: number,
  examScore: number,
  examMaxScore: number,
  assignmentCoeff?: number,
  examCoeff?: number,
  assignmentExtraCredits?: number,
  examExtraCredits?: number
): {
  assignmentPercentage: number;
  examPercentage: number;
  finalGrade: number;
  totalAssignmentScore: number;
  totalExamScore: number;
  totalExtraCredits: number;
} {
  const totalAssignmentScore = assignmentScore + (assignmentExtraCredits || 0);
  const totalExamScore = examScore + (examExtraCredits || 0);
  const totalExtraCredits = (assignmentExtraCredits || 0) + (examExtraCredits || 0);
  
  const assignmentPercentage = assignmentMaxScore > 0 ? (totalAssignmentScore / assignmentMaxScore) * 100 : 0;
  const examPercentage = examMaxScore > 0 ? (totalExamScore / examMaxScore) * 100 : 0;
  
  // Use provided coefficients or fall back to defaults
  const aCoeff = assignmentCoeff ?? GRADE_CALCULATION_CONFIG.ASSIGNMENT_COEFFICIENT;
  const eCoeff = examCoeff ?? GRADE_CALCULATION_CONFIG.EXAM_COEFFICIENT;
  
  const finalGrade = (
    assignmentPercentage * aCoeff +
    examPercentage * eCoeff
  );
  
  return {
    assignmentPercentage: Math.round(assignmentPercentage * 100) / 100,
    examPercentage: Math.round(examPercentage * 100) / 100,
    finalGrade: Math.round(finalGrade * 100) / 100,
    totalAssignmentScore,
    totalExamScore,
    totalExtraCredits
  };
}