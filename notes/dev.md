Make sure to clean up related data when deleting content - deleting media should also deleted thumbnails, and exif data, and analysis data for example

https://github.com/MikeKovarik/exifr claims to be super fast at reading exif data


Eventually, add all the jobs automatically once the images are scanned, and prevent the user having to manually add the jobs

we should be able to use the queue to track processing and not the slow database

Handle online and offline files

Now that we moved the batch processing to bullmq, we need to check the database updates when if we want to overwrite the data or not

Add estimated time remaining and count of items per second

Remember to split the advanced analysis into standard and advanced processing

