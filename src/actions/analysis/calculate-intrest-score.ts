export async function calculateInterestScore(results: any): Promise<number> {
  let score = 0;

  if (results.objects) {
    // Add one point for each object detected
    // and cap the score at 30 points for objects
    // This is a simple heuristic to give more weight to the number of objects
    // detected, but not too much weight
    score += Math.min(results.objects.length * 1, 30);
  }

  const interestingObjects = [
    { term: 'person', points: 25 },
    { term: 'face', points: 20 },
    { term: 'cat', points: 15 },
    { term: 'beach', points: 10 },
    { term: 'mountain', points: 10 },
    { term: 'sunset', points: 10 },
  ];

  for (const obj of results.objects || []) {
    for (const interesting of interestingObjects) {
      if (
        obj.label.toLowerCase().includes(interesting.term) &&
        obj.score > 0.6
      ) {
        score += interesting.points;
        break;
      }
    }
  }

  return Math.min(score, 100);
}
