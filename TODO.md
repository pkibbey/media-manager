- Figure out ways to process files that failed to process
- Make the advanced filters more useful
- Find UI performance improvements to prevent re-renders
- For any components that fetch their own data on load, move any client code into new components, keeping the fetch component being able to be an async server component and fetching data with a simple await
- process each image for keyword analysis
- process each image for sentiment analysis
- process each image for face detection
- process each image for perceived quality
- process each image for content safety

✅ Offload the processing work to a different thread, so that if a user navigates away and then back, the process is still running
✅ Add a toggle to change the image display into zoom mode, which renders the image height the same aspect ratio if it were rotated 90 degrees - this persists when a different image is selected
