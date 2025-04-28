import RandomImageSlideshow from '@/components/media/random-image-slideshow';
import { getRandomImages } from './actions/random-media/get-random-images';

export default async function Home() {
  // Fetch random media for slideshow - get 5 random images
  const { error, data: randomImages } = await getRandomImages(5);

  return (
    <div className="container mx-auto py-12">
      <div className="relative mx-auto max-w-5xl space-y-8">
        {/* Random image slideshow */}
        {error && (
          <div className="text-red-500">
            Error fetching random images: {error.message}
          </div>
        )}
        {!error && randomImages && (
          <RandomImageSlideshow images={randomImages} interval={6000} />
        )}
      </div>
    </div>
  );
}
