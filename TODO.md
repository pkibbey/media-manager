-- Process each image for keyword analysis
-- Process each image for sentiment analysis
-- Process each image for perceived quality
-- Process each image for content safety

-- Enabled images to be marked for deletion

-- remove legacy fallbacks

-- when scanning folders, we should give an initial count as we find folders - more UI feedback

-- consider migrating away from processing_states into seperate state tables

-- Est. time remaining should be stored to a total time variable, and that can be used to know the total remaining time, based on the previous times. Only need to store a number of files counted, and a total time taken - no need to store each individual time if we are only going to be summing them.

-- fix reset media items - this should only clear the exif data, not clear the items as it does now

-- check that all the descrutive admin actions only remove the content they are supposed to

-- remove all rpc functions, except for counting stats