-- Create performance_metrics table
CREATE TABLE performance_metrics (
    id BIGSERIAL PRIMARY KEY,
    method TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    duration DOUBLE PRECISION NOT NULL,
    success BOOLEAN NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_path TEXT
);