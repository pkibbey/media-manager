What I have so far, is an application that loads files, detects their file types, extracts exif information from all the non-ignored file types, then extracts 224x224 thumbnails from every image type, then uses those thumbnails to run a low-cost tensorflow object detection.

From here, there is further advanced analysis that can be done, which currently leverages a local LLM to process the thumbnail and return an accurate description of the image.

Where we go from here is interesting, becuase we are working with a set of 250,000 files. The problem starts to split:

1) Some of the files that we have may be duplicates, have incorrect exif dates, some of the files may be technically useless (like blurry photos or redundant shots where other similar takes are better) and could be discarded.

2) To process every image in full, to extract all the useful information about the image, could be incredibly computationally expensive and therefore take too much time. I'd like to figure out a way, based on any current information that we have captured about the image, to know whether it is worth processing it for further information (which can be fed back into this loop). There are so many options of ways to process these images - face detection, sentiment analysis, etc.

3) I would like to be able to detect nude or suggestive content on these images too, so that I can automatically hide them from the display.

What would your recommendation be to approach this next stage in the apps development?