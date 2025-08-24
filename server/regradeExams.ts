import { DatabaseStorage } from "./storage";

const storage = new DatabaseStorage();

// Comprehensive re-grading function for all question types
async function regradeSubmission(submissionId: number): Promise<{ totalScore: number; maxScore: number }> {
  const submission = await storage.getSubmissionById(submissionId);
  if (!submission) {
    throw new Error(`Submission ${submissionId} not found`);
  }

  const answers = await storage.getAnswers(submissionId);
  let totalScore = 0;
  let maxScore = 0;

  console.log(`Re-grading submission ${submissionId} with ${answers.length} answers`);

  for (const answer of answers) {
    const question = await storage.getQuestionById(answer.questionId);
    if (!question) continue;

    let score = 0;
    maxScore += question.points;

    // Skip subjective questions as they need manual grading
    if (question.questionType === 'essay' || question.questionType === 'short_answer' || question.questionType === 'fill_blank') {
      score = parseFloat(answer.score?.toString() || '0');
      console.log(`Subjective/manual question ${question.id} (${question.questionType}): keeping existing score ${score}/${question.points}`);
    } else {
      // Auto-grade objective questions
      if (question.questionType === 'multiple_choice' && 
          answer.selectedOption === question.correctAnswer) {
        score = question.points;
      }

      // Auto-grade matching questions with enhanced answer key support
      else if (question.questionType === 'matching') {
        try {
          const correctAnswer = typeof question.correctAnswer === 'string' 
            ? JSON.parse(question.correctAnswer) 
            : question.correctAnswer;
          const studentAnswer = typeof answer.answerText === 'string'
            ? JSON.parse(answer.answerText || '{}')
            : answer.answerText || {};
          
          let correctMatches = 0;
          let totalMatches = 0;
          
          console.log(`Regrading matching question ${question.id}:`, {
            correctAnswer: JSON.stringify(correctAnswer),
            studentAnswer: JSON.stringify(studentAnswer)
          });
          
          // Handle array of pairs format: [{left: "A", right: "B"}, ...]
          if (Array.isArray(correctAnswer)) {
            totalMatches = correctAnswer.length;
            
            // Check student's answers: format is {0: "selected_option", 1: "another_option", ...}
            // where index corresponds to the left item position in the array
            correctAnswer.forEach((pair: any, index: number) => {
              const studentSelection = studentAnswer[index];
              if (studentSelection && pair.right && studentSelection === pair.right) {
                correctMatches++;
              }
            });
          }
          // Handle object with key-value pairs format: {"A": "B", ...}
          else if (typeof correctAnswer === 'object' && correctAnswer !== null) {
            const correctPairs = Object.entries(correctAnswer);
            totalMatches = correctPairs.length;
            
            correctPairs.forEach(([leftItem, rightItem], index) => {
              const studentSelection = studentAnswer[index];
              if (studentSelection && studentSelection === rightItem) {
                correctMatches++;
              }
            });
          }
          
          // Partial credit for matching - each correct pair gets proportional credit
          score = totalMatches > 0 ? (correctMatches / totalMatches) * question.points : 0;
          console.log(`Matching question ${question.id}: ${correctMatches}/${totalMatches} correct pairs, score: ${score}/${question.points}`);
        } catch (error) {
          console.error(`Error grading matching question ${question.id}:`, error);
          score = 0;
        }
      }
      // Auto-grade drag-and-drop questions with enhanced zone-based scoring
      else if (question.questionType === 'drag_drop') {
        try {
          const correctAnswer = typeof question.correctAnswer === 'string' 
            ? JSON.parse(question.correctAnswer) 
            : question.correctAnswer;
          const studentAnswer = typeof answer.answerText === 'string'
            ? JSON.parse(answer.answerText || '{}')
            : answer.answerText || {};
          
          let correctPlacements = 0;
          let totalItems = 0;
          
          console.log(`Grading drag-drop question ${question.id}:`, {
            correctAnswer: JSON.stringify(correctAnswer),
            studentAnswer: JSON.stringify(studentAnswer)
          });
          
          // Build mapping from item to correct zone
          const itemToZoneMapping: { [item: string]: string } = {};
          
          if (correctAnswer && correctAnswer.zones) {
            correctAnswer.zones.forEach((zone: any) => {
              if (zone.zone && Array.isArray(zone.items)) {
                zone.items.forEach((item: string) => {
                  if (item && item.trim()) {
                    itemToZoneMapping[item] = zone.zone;
                    totalItems++;
                  }
                });
              }
            });
          }
          
          // Check student's placements against correct mapping
          if (studentAnswer && typeof studentAnswer === 'object') {
            // Handle different student answer formats
            if (studentAnswer.zones && Array.isArray(studentAnswer.zones)) {
              // Format: { zones: [{ zone: "Land", items: ["Lion"] }] }
              studentAnswer.zones.forEach((studentZone: any) => {
                if (studentZone.zone && Array.isArray(studentZone.items)) {
                  studentZone.items.forEach((item: string) => {
                    if (itemToZoneMapping[item] === studentZone.zone) {
                      correctPlacements++;
                    }
                  });
                }
              });
            } else {
              // Handle object mapping format: { "Lion": "Land", "Shark": "Water" }
              Object.entries(studentAnswer).forEach(([item, zone]) => {
                if (itemToZoneMapping[item] === zone) {
                  correctPlacements++;
                }
              });
            }
          }
          
          // Partial credit for drag-and-drop - each correctly placed item gets proportional credit
          score = totalItems > 0 ? (correctPlacements / totalItems) * question.points : 0;
          console.log(`Drag-drop question ${question.id}: ${correctPlacements}/${totalItems} items correctly placed, score: ${score}/${question.points}`);
        } catch (error) {
          console.error(`Error grading drag-drop question ${question.id}:`, error);
          score = 0;
        }
      }
      // Auto-grade ranking questions
      else if (question.questionType === 'ranking') {
        try {
          const correctOrder = Array.isArray(question.correctAnswer) 
            ? question.correctAnswer 
            : JSON.parse(question.correctAnswer || '[]');
          const studentOrder = Array.isArray(answer.answerText)
            ? answer.answerText
            : JSON.parse(answer.answerText || '[]');
          
          let correctPositions = 0;
          const totalItems = correctOrder.length;
          
          for (let i = 0; i < totalItems; i++) {
            if (studentOrder[i] === correctOrder[i]) {
              correctPositions++;
            }
          }
          
          // Partial credit for ranking
          score = totalItems > 0 ? (correctPositions / totalItems) * question.points : 0;
          console.log(`Ranking question ${question.id}: ${correctPositions}/${totalItems} correct, score: ${score}/${question.points}`);
        } catch (error) {
          console.error(`Error grading ranking question ${question.id}:`, error);
          score = 0;
        }
      }

      // Update the answer with the new score
      await storage.updateAnswer(answer.id, {
        score: score.toString(),
        maxScore: question.points.toString(),
      });
    }

    totalScore += score;
  }

  // Update the submission with the new total score
  await storage.updateSubmission(submissionId, {
    totalScore: totalScore.toString(),
    maxScore: maxScore.toString(),
    status: 'graded'
  });

  console.log(`Re-graded submission ${submissionId}: ${totalScore}/${maxScore}`);
  return { totalScore, maxScore };
}

// Re-grade all submissions that have 0 scores but should be auto-gradable
export async function regradeAllZeroScoreSubmissions(): Promise<void> {
  console.log('Starting comprehensive re-grading of zero-score submissions...');
  
  // Get all graded submissions with zero scores
  const allSubmissions = await storage.getSubmissions();
  const zeroScoreSubmissions = allSubmissions.filter(sub => 
    sub.status === 'graded' && parseFloat(sub.totalScore?.toString() || '0') === 0
  );

  console.log(`Found ${zeroScoreSubmissions.length} submissions with zero scores to re-grade`);

  for (const submission of zeroScoreSubmissions) {
    try {
      await regradeSubmission(submission.id);
    } catch (error) {
      console.error(`Failed to re-grade submission ${submission.id}:`, error);
    }
  }

  // Update highest score tracking for all exams
  console.log('Updating highest score tracking...');
  const examIds = Array.from(new Set(allSubmissions.map(sub => sub.examId)));
  
  for (const examId of examIds) {
    const examSubmissions = allSubmissions.filter(sub => sub.examId === examId);
    const students = Array.from(new Set(examSubmissions.map(sub => sub.studentId)));
    
    for (const studentId of students) {
      const studentSubmissions = examSubmissions.filter(sub => sub.studentId === studentId && sub.status === 'graded');
      
      if (studentSubmissions.length > 0) {
        // Reset all highest score flags
        for (const sub of studentSubmissions) {
          await storage.updateSubmission(sub.id, { isHighestScore: false });
        }
        
        // Find and mark the highest scoring submission
        const highestSub = studentSubmissions.reduce((highest, current) => {
          const currentScore = parseFloat(current.totalScore?.toString() || '0');
          const highestScore = parseFloat(highest.totalScore?.toString() || '0');
          return currentScore > highestScore ? current : highest;
        });
        
        await storage.updateSubmission(highestSub.id, { isHighestScore: true });
        console.log(`Updated highest score for student ${studentId} exam ${examId}: submission ${highestSub.id}`);
      }
    }
  }

  console.log('Re-grading completed successfully!');
}

// Auto-grade homework submission function
export async function gradeHomeworkSubmission(submissionId: number): Promise<{ totalScore: number; maxScore: number }> {
  const submission = await storage.getHomeworkSubmissionById(submissionId);
  if (!submission) {
    throw new Error(`Homework submission ${submissionId} not found`);
  }

  const answers = await storage.getHomeworkAnswers(submissionId);
  let totalScore = 0;
  let maxScore = 0;
  let hasSubjectiveQuestions = false;

  console.log(`Auto-grading homework submission ${submissionId} with ${answers.length} answers`);

  for (const answer of answers) {
    const question = await storage.getQuestionById(answer.questionId);
    if (!question) continue;

    let score = 0;
    maxScore += question.points;

    // Skip subjective questions as they need manual grading
    if (question.questionType === 'essay' || question.questionType === 'short_answer' || question.questionType === 'fill_blank') {
      score = parseFloat(answer.score?.toString() || '0');
      hasSubjectiveQuestions = true;
      console.log(`Subjective question ${question.id} (${question.questionType}): keeping score ${score}/${question.points} for manual grading`);
    } else {
      // Auto-grade objective questions
      if (question.questionType === 'multiple_choice' && 
          answer.selectedOption === question.correctAnswer) {
        score = question.points;
        console.log(`Multiple choice question ${question.id}: correct answer, score: ${score}/${question.points}`);
      }
      else if (question.questionType === 'multiple_choice') {
        score = 0;
        console.log(`Multiple choice question ${question.id}: incorrect answer, score: ${score}/${question.points}`);
      }

      // Auto-grade matching questions with enhanced answer key support
      else if (question.questionType === 'matching') {
        try {
          const correctAnswer = typeof question.correctAnswer === 'string' 
            ? JSON.parse(question.correctAnswer) 
            : question.correctAnswer;
          const studentAnswer = typeof answer.answerText === 'string'
            ? JSON.parse(answer.answerText || '{}')
            : answer.answerText || {};
          
          let correctMatches = 0;
          let totalMatches = 0;
          
          console.log(`Grading matching question ${question.id}:`, {
            correctAnswer: JSON.stringify(correctAnswer),
            studentAnswer: JSON.stringify(studentAnswer)
          });
          
          // Handle array of pairs format: [{left: "A", right: "B"}, ...]
          if (Array.isArray(correctAnswer)) {
            totalMatches = correctAnswer.length;
            
            // Check student's answers: format is {0: "selected_option", 1: "another_option", ...}
            // where index corresponds to the left item position in the array
            correctAnswer.forEach((pair: any, index: number) => {
              const studentSelection = studentAnswer[index];
              if (studentSelection && pair.right && studentSelection === pair.right) {
                correctMatches++;
              }
            });
          }
          // Handle object with key-value pairs format: {"A": "B", ...}
          else if (typeof correctAnswer === 'object' && correctAnswer !== null) {
            const correctPairs = Object.entries(correctAnswer);
            totalMatches = correctPairs.length;
            
            correctPairs.forEach(([leftItem, rightItem], index) => {
              const studentSelection = studentAnswer[index];
              if (studentSelection && studentSelection === rightItem) {
                correctMatches++;
              }
            });
          }
          
          // Partial credit for matching - each correct pair gets proportional credit
          score = totalMatches > 0 ? (correctMatches / totalMatches) * question.points : 0;
          console.log(`Matching question ${question.id}: ${correctMatches}/${totalMatches} correct pairs, score: ${score}/${question.points}`);
        } catch (error) {
          console.error(`Error grading matching question ${question.id}:`, error);
          score = 0;
        }
      }
      // Auto-grade drag-and-drop questions with enhanced zone-based scoring
      else if (question.questionType === 'drag_drop') {
        try {
          const correctAnswer = typeof question.correctAnswer === 'string' 
            ? JSON.parse(question.correctAnswer) 
            : question.correctAnswer;
          const studentAnswer = typeof answer.answerText === 'string'
            ? JSON.parse(answer.answerText || '{}')
            : answer.answerText || {};
          
          let correctPlacements = 0;
          let totalItems = 0;
          
          console.log(`Grading drag-drop question ${question.id}:`, {
            correctAnswer: JSON.stringify(correctAnswer),
            studentAnswer: JSON.stringify(studentAnswer)
          });
          
          // Build mapping from item to correct zone
          const itemToZoneMapping: { [item: string]: string } = {};
          
          if (correctAnswer && correctAnswer.zones) {
            correctAnswer.zones.forEach((zone: any) => {
              if (zone.zone && Array.isArray(zone.items)) {
                zone.items.forEach((item: string) => {
                  if (item && item.trim()) {
                    itemToZoneMapping[item] = zone.zone;
                    totalItems++;
                  }
                });
              }
            });
          }
          
          // Check student's placements against correct mapping
          if (studentAnswer && typeof studentAnswer === 'object') {
            // Handle different student answer formats
            if (studentAnswer.zones && Array.isArray(studentAnswer.zones)) {
              // Format: { zones: [{ zone: "Land", items: ["Lion"] }] }
              studentAnswer.zones.forEach((studentZone: any) => {
                if (studentZone.zone && Array.isArray(studentZone.items)) {
                  studentZone.items.forEach((item: string) => {
                    if (itemToZoneMapping[item] === studentZone.zone) {
                      correctPlacements++;
                    }
                  });
                }
              });
            } else {
              // Handle object mapping format: { "Lion": "Land", "Shark": "Water" }
              Object.entries(studentAnswer).forEach(([item, zone]) => {
                if (itemToZoneMapping[item] === zone) {
                  correctPlacements++;
                }
              });
            }
          }
          
          // Partial credit for drag-and-drop - each correctly placed item gets proportional credit
          score = totalItems > 0 ? (correctPlacements / totalItems) * question.points : 0;
          console.log(`Drag-drop question ${question.id}: ${correctPlacements}/${totalItems} items correctly placed, score: ${score}/${question.points}`);
        } catch (error) {
          console.error(`Error grading drag-drop question ${question.id}:`, error);
          score = 0;
        }
      }
      // Auto-grade ranking questions
      else if (question.questionType === 'ranking') {
        try {
          const correctOrder = Array.isArray(question.correctAnswer) 
            ? question.correctAnswer 
            : JSON.parse(question.correctAnswer || '[]');
          const studentOrder = Array.isArray(answer.answerText)
            ? answer.answerText
            : JSON.parse(answer.answerText || '[]');
          
          let correctPositions = 0;
          const totalItems = correctOrder.length;
          
          for (let i = 0; i < totalItems; i++) {
            if (studentOrder[i] === correctOrder[i]) {
              correctPositions++;
            }
          }
          
          // Partial credit for ranking
          score = totalItems > 0 ? (correctPositions / totalItems) * question.points : 0;
          console.log(`Ranking question ${question.id}: ${correctPositions}/${totalItems} correct, score: ${score}/${question.points}`);
        } catch (error) {
          console.error(`Error grading ranking question ${question.id}:`, error);
          score = 0;
        }
      }

      // Update the answer with the new score
      await storage.updateHomeworkAnswer(answer.id, {
        score: score.toString(),
        maxScore: question.points.toString(),
      });
    }

    totalScore += score;
  }

  // Determine status: if has subjective questions that aren't graded, mark as pending
  const status = hasSubjectiveQuestions ? 'pending' : 'graded';

  // Update homework submission with total score and status
  await storage.updateHomeworkSubmission(submissionId, {
    totalScore: totalScore.toString(),
    maxScore: maxScore.toString(),
    status: status
  });

  console.log(`Auto-graded homework submission ${submissionId}: ${totalScore}/${maxScore}, status: ${status}`);
  return { totalScore, maxScore };
}

export { regradeSubmission };