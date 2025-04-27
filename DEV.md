Add complexity, simplify, then repeat.

Keep functions small

No function should be wrapped entirely in a try catch

Remove the success state from functions as we can assume they will always return sucessful or throw an error. - WRONG! (If we swallow exceptions, it allows us to continue without failing)

The exif data object is too big, we should consider this in db optimizations when fetching *