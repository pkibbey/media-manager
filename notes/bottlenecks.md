Bottlenecks

I'm trying to do lots of things to a lot of files.

Sometimes the things that I am doing are computationally heavy.

Sometimes the heaviest thing is writing to the database.

Sometimes it's disk i/o.

Some of the things that are done to files can be done independantly of others.

Some of the things are dependant on having other things done first.

How would I design a system using NodeJS so that I can test and optimize each thing that I want to do to the files, without adversely affecting other parts of the system?