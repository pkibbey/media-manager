import { ExifTool } from 'exiftool-vendored';

// Create a single shared instance to be reused across the application
const exiftool = new ExifTool();

export { exiftool };

// Cleanup function to properly close exiftool when the application is shutting down
export async function closeExifTool() {
  await exiftool.end();
}
