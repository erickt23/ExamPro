-- Add isHighestScore field to submissions table
ALTER TABLE submissions ADD COLUMN is_highest_score BOOLEAN NOT NULL DEFAULT false;

-- Create index for performance on highest score queries
CREATE INDEX idx_submissions_highest_score ON submissions(exam_id, student_id, is_highest_score) WHERE is_highest_score = true;

-- Update existing submissions to mark the highest score for each student-exam combination
WITH highest_scores AS (
  SELECT 
    exam_id,
    student_id,
    MAX(CAST(total_score AS DECIMAL)) as max_score
  FROM submissions 
  WHERE status = 'graded' AND total_score IS NOT NULL
  GROUP BY exam_id, student_id
),
submissions_to_update AS (
  SELECT DISTINCT ON (s.exam_id, s.student_id) 
    s.id
  FROM submissions s
  INNER JOIN highest_scores hs ON 
    s.exam_id = hs.exam_id AND 
    s.student_id = hs.student_id AND 
    CAST(s.total_score AS DECIMAL) = hs.max_score
  WHERE s.status = 'graded'
  ORDER BY s.exam_id, s.student_id, s.submitted_at DESC
)
UPDATE submissions 
SET is_highest_score = true 
WHERE id IN (SELECT id FROM submissions_to_update);