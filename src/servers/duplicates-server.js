const express = require('express');
const app = express();
app.use(express.json());

// Calculate Hamming distance between two hex strings
function calculateHammingDistance(hash1, hash2) {
  if (hash1.length !== hash2.length) {
    return -1;
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const char1 = parseInt(hash1[i], 16);
    const char2 = parseInt(hash2[i], 16);
    const xor = char1 ^ char2;

    // Count bits set in XOR result
    let bits = xor;
    while (bits) {
      distance += bits & 1;
      bits >>= 1;
    }
  }

  return distance;
}

// Categorize similarity based on Hamming distance
function categorizeSimilarity(distance, totalBits) {
  if (distance === 0) return 'exact';

  const percentage = (distance / totalBits) * 100;

  if (percentage <= 10) return 'high';
  if (percentage <= 25) return 'medium';

  return 'medium'; 
}

// Process batches of hash comparisons
app.post('/process-duplicates', (req, res) => {
  const { mediaItems, maxHammingDistance = 10 } = req.body;
  
  // Find duplicates using hash comparison
  const duplicateGroups = new Map();
  const similarGroups = new Map();
  const processedHashes = new Set();

  // First pass: find exact matches
  for (const item of mediaItems) {
    const hash = item.visual_hash;
    if (!hash) continue;

    if (!duplicateGroups.has(hash)) {
      duplicateGroups.set(hash, []);
    }
    duplicateGroups.get(hash).push(item);
  }

  // Second pass: find similar matches
  for (let i = 0; i < mediaItems.length; i++) {
    const item1 = mediaItems[i];
    const hash1 = item1.visual_hash;
    if (!hash1) continue;

    // Skip if this hash already has exact duplicates
    if (duplicateGroups.get(hash1)?.length > 1) {
      continue;
    }

    if (processedHashes.has(hash1)) {
      continue;
    }

    const similarItems = [];

    for (let j = i + 1; j < mediaItems.length; j++) {
      const item2 = mediaItems[j];
      const hash2 = item2.visual_hash;
      if (!hash2) continue;

      // Skip if this hash already has exact duplicates
      if (duplicateGroups.get(hash2)?.length > 1) {
        continue;
      }

      if (hash1 === hash2) continue;

      const distance = calculateHammingDistance(hash1, hash2);

      if (distance >= 0 && distance <= maxHammingDistance) {
        similarItems.push({ item: item2, distance });
      }
    }

    if (similarItems.length > 0) {
      // Add the original item
      similarItems.unshift({ item: item1, distance: 0 });

      // Group by similar distance ranges
      const groupKey = `similar_${hash1}`;
      if (!similarGroups.has(groupKey)) {
        similarGroups.set(groupKey, []);
      }

      similarGroups.get(groupKey).push({
        items: similarItems.map(si => si.item),
        distance: Math.min(...similarItems.map(si => si.distance)),
      });

      // Mark all these hashes as processed
      similarItems.forEach(si => processedHashes.add(si.item.visual_hash));
    }

    processedHashes.add(hash1);
  }

  // Convert to result format
  const results = {
    exactGroups: Array.from(duplicateGroups.entries())
      .filter(([_, items]) => items.length > 1)
      .map(([hash, items]) => ({
        hash,
        items,
        similarity: 'exact',
        hammingDistance: 0,
      })),
    similarGroups: []
  };

  // Add similar groups
  for (const [_, groupList] of similarGroups) {
    for (const group of groupList) {
      if (group.items.length > 1) {
        const totalBits = group.items[0].visual_hash.length * 4; // 4 bits per hex character
        const similarity = categorizeSimilarity(group.distance, totalBits);

        results.similarGroups.push({
          hash: `similar_${group.items[0].visual_hash}`,
          items: group.items,
          similarity,
          hammingDistance: group.distance,
        });
      }
    }
  }

  res.json(results);
});

const PORT = process.env.DUPLICATES_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Duplicate detection API running on port ${PORT}`);
});