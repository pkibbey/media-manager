import RandomImageSlideshow from '@/components/media/random-image-slideshow';
import { getRandomMedia } from './actions/random-media';

export default async function Home() {
  // Fetch random media for slideshow - get 5 random images
  const { success, data: randomImages } = await getRandomMedia(5);

  return (
    <div className="container mx-auto py-12">
      <div className="relative mx-auto max-w-5xl space-y-8">
        {/* Random image slideshow */}
        {success && randomImages && randomImages.length > 0 && (
          <RandomImageSlideshow images={randomImages} interval={6000} />
        )}
      </div>
    </div>
  );
}
