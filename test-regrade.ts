import { regradeAllZeroScoreSubmissions } from "./server/regradeExams";

async function testRegrade() {
  console.log('Starting test re-grading...');
  try {
    await regradeAllZeroScoreSubmissions();
    console.log('Re-grading completed successfully!');
  } catch (error) {
    console.error('Re-grading failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testRegrade();
}