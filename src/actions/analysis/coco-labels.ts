import fs from 'node:fs/promises';

async function loadCocoLabels(
  annotationFilePath: string,
): Promise<{ [key: number]: string }> {
  try {
    const data = await fs.readFile(annotationFilePath, 'utf8');
    const annotation = JSON.parse(data);
    const categories = annotation.categories;

    const labelMap: { [key: number]: string } = {};
    categories.forEach((category: any) => {
      labelMap[category.id] = category.name;
    });

    return labelMap;
  } catch (error) {
    console.error('Error loading COCO labels:', error);
    return {};
  }
}

export default loadCocoLabels;
