# Media Manager: Advanced Image Processing Setup with GPU Acceleration

This document outlines the steps to offload advanced image processing to a dedicated Ubuntu machine with NVIDIA GPU acceleration.

## 1. Ubuntu Server Setup

### Hardware Requirements
- Computer with an NVIDIA GPU (GTX 1080 or better)
- 16GB+ RAM recommended
- SSD storage for faster processing
- Stable network connection

### Base System Installation
1. Download Ubuntu Server 22.04 LTS from [ubuntu.com](https://ubuntu.com/download/server)
2. Create a bootable USB and install Ubuntu Server
3. During installation, select:
   - Minimal installation
   - Install OpenSSH server

###x NVIDIA Driver and CUDA Installation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required dependencies
sudo apt install -y build-essential

# Install NVIDIA driver
sudo add-apt-repository ppa:graphics-drivers/ppa
sudo apt update
sudo apt install -y nvidia-driver-535  # Use latest stable version

# Verify driver installation after reboot
sudo reboot
nvidia-smi

# Install CUDA Toolkit (latest version)
# Visit https://developer.nvidia.com/cuda-downloads to get the latest version
# Example below is for CUDA 12.x
wget https://developer.download.nvidia.com/compute/cuda/12.3.2/local_installers/cuda_12.3.2_545.23.08_linux.run
sudo sh cuda_12.3.2_545.23.08_linux.run

# Add CUDA to PATH in ~/.bashrc
echo 'export PATH=/usr/local/cuda/bin:$PATH' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc
source ~/.bashrc
```

## 2. Analysis Service Setup

### Install Node.js and Dependencies
```bash
# Install Node.js 22 (LTS)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Create project directory
mkdir -p ~/media-processor
cd ~/media-processor

# Set up Git repository
git init
git remote add origin https://github.com/yourusername/media-processor.git
```

### Install Required ML Libraries
```bash
# Initialize project
pnpm init

# Install TensorFlow with GPU support
pnpm add @tensorflow/tfjs-node-gpu

# Install other necessary packages
pnpm add express cors dotenv fluent-ffmpeg sharp axios @supabase/supabase-js
pnpm add nodemon concurrently pm2 --save-dev
```

## 3. Create Processing Server

### Create Auto-Update Script
```bash
# Create deployment script
cat > ~/media-processor/deploy.sh << 'EOL'
#!/bin/bash

cd ~/media-processor

# Pull latest changes
git pull

# Install dependencies
pnpm install

# Restart service using PM2
pm2 restart media-processor || pm2 start src/server.js --name media-processor

echo "Deployed successfully at $(date)"
EOL

# Make executable
chmod +x ~/media-processor/deploy.sh
```

### Set Up Cron Job for Auto Updates
```bash
# Add cron job to check for updates every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * ~/media-processor/deploy.sh >> ~/media-processor/deploy.log 2>&1") | crontab -
```

### Create server file
```bash
mkdir -p src
touch src/server.js .env
```

### Server Implementation
```javascript
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const os = require('os');
const cluster = require('cluster');
const numCPUs = os.cpus().length;
require('dotenv').config();

// Initialize ML models
const { initializeModels, processImage } = require('./models');

// Multi-processing setup
if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);
  console.log(`Setting up ${numCPUs} workers`);
  
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    console.log('Starting a new worker');
    cluster.fork();
  });
} else {
  const app = express();
  const PORT = process.env.PORT || 3001;

  // Middleware
  app.use(cors());
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Create Supabase client
  const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
    : null;

  // Performance tracking
  const processingStats = {
    totalProcessed: 0,
    avgProcessingTime: 0,
    lastProcessed: null,
  };

  // Health check and stats endpoint
  app.get('/health', (req, res) => {
    const memoryUsage = process.memoryUsage();
    const stats = {
      status: 'ok',
      system: {
        cpus: os.cpus().length,
        freeMemory: os.freemem() / 1024 / 1024, // MB
        totalMemory: os.totalmem() / 1024 / 1024, // MB
        loadAvg: os.loadavg(),
        uptime: os.uptime(),
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: {
          rss: memoryUsage.rss / 1024 / 1024, // MB
          heapTotal: memoryUsage.heapTotal / 1024 / 1024, // MB
          heapUsed: memoryUsage.heapUsed / 1024 / 1024, // MB
        },
      },
      gpu: process.env.GPU_INFO,
      stats: processingStats,
    };
    
    res.json(stats);
  });

  // Process image endpoint
  app.post('/process', async (req, res) => {
    try {
      const { mediaId, analysisType, imageUrl } = req.body;
      
      if (!mediaId || !analysisType || !imageUrl) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      // Record start time
      const startTime = Date.now();
      
      // Process the image based on analysis type
      const results = await processImage(imageUrl, analysisType);
      
      // Calculate processing time
      const processingTime = Date.now() - startTime;
      
      // Update stats
      processingStats.totalProcessed++;
      processingStats.avgProcessingTime = 
        (processingStats.avgProcessingTime * (processingStats.totalProcessed - 1) + processingTime) / 
        processingStats.totalProcessed;
      processingStats.lastProcessed = new Date().toISOString();
      
      // Store results in Supabase if needed
      if (req.body.storeResults && supabase) {
        await storeResults(mediaId, analysisType, results, processingTime);
      }
      
      res.json({
        success: true,
        mediaId,
        results,
        processingTime,
        workerId: process.pid
      });
    } catch (error) {
      console.error('Processing error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Store results in database
  async function storeResults(mediaId, analysisType, results, processingTime) {
    if (!supabase) return;
    
    // Implementation based on your database schema
    const { error } = await supabase.from('analysis_data').upsert({
      media_id: mediaId,
      type: analysisType,
      results,
      processing_time: processingTime,
      processed_at: new Date().toISOString()
    }, {
        onConflict: 'type', // mime_type is unique
    });
    
    if (error) throw new Error(`Database error: ${error.message}`);
  }

  // Initialize models before starting server
  initializeModels().then(() => {
    app.listen(PORT, () => {
      console.log(`Worker ${process.pid} listening on port ${PORT}`);
    });
  }).catch(err => {
    console.error(`Worker ${process.pid} failed to initialize models:`, err);
    process.exit(1);
  });
}
```

### Models Implementation
```javascript
const tf = require('@tensorflow/tfjs-node-gpu');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Model cache
const models = {};

async function initializeModels() {
  try {
    console.log('Loading models...');
    
    // Download and load face recognition model
    models.faceRecognition = await tf.loadGraphModel(
      'https://tfhub.dev/tensorflow/tfjs-model/blazeface/1/default/1/model.json'
    );
    
    // Add other models as needed
    // models.objectDetector = ...
    
    console.log('Models loaded successfully');
    
    // Get GPU info for diagnostics
    try {
      const gpuInfo = await tf.backend().getGPUInfo();
      process.env.GPU_INFO = JSON.stringify(gpuInfo);
    } catch (e) {
      console.warn('Could not get GPU info:', e);
      process.env.GPU_INFO = 'unavailable';
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing models:', error);
    throw error;
  }
}

async function processImage(imageUrl, analysisType) {
  // Download the image
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const tempFilePath = path.join(os.tmpdir(), `temp_${Date.now()}.jpg`);
  fs.writeFileSync(tempFilePath, Buffer.from(response.data));
  
  // Process based on analysis type
  try {
    switch (analysisType) {
      case 'faces':
        return await detectFaces(tempFilePath);
      case 'objects':
        return await detectObjects(tempFilePath);
      case 'colors':
        return await extractColors(tempFilePath);
      // Add other analysis types as needed
      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }
  } finally {
    // Clean up temp file
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (e) {
      console.warn('Failed to clean up temp file:', e);
    }
  }
}

async function detectFaces(imagePath) {
  try {
    // Load image
    const img = await tf.node.decodeImage(fs.readFileSync(imagePath));
    
    // Preprocess and run model
    const input = tf.expandDims(tf.cast(img, 'float32').div(255), 0);
    const result = await models.faceRecognition.predict(input);
    
    // Process results
    const faces = await result.array();
    
    // Clean up
    tf.dispose([img, input, result]);
    
    return faces;
  } catch (error) {
    console.error('Face detection error:', error);
    throw error;
  }
}

async function detectObjects(imagePath) {
  // Placeholder for object detection implementation
  return { objects: ['Placeholder implementation'] };
}

async function extractColors(imagePath) {
  // Placeholder for color extraction implementation
  return { colors: ['#FF0000', '#00FF00', '#0000FF'] };
}

module.exports = {
  initializeModels,
  processImage
};
```

### Environment Configuration
```
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
NODE_ENV=production
```

### Setup PM2 for Process Management
```bash
# Install PM2 globally
npm install -g pm2

# Start the service with PM2
pm2 start src/server.js --name media-processor

# Set PM2 to start on boot
pm2 startup
# Follow instructions output by the above command
pm2 save

# Monitor the service
pm2 monit
```

## 4. Modify Media Manager Application

### Update Server Actions

#### Create API Client
```typescript
import { createSupabase } from '@/lib/supabase';

const PROCESSING_API_URL = process.env.PROCESSING_API_URL || 'http://your-ubuntu-server:3001';

export async function callProcessingApi(endpoint: string, data: any) {
  try {
    const response = await fetch(`${PROCESSING_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${error}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Processing API error:', error);
    throw error;
  }
}

export async function processRemotely(mediaId: string, analysisType: string, storeResults: boolean = false) {
  // Get media URL from database
  const supabase = createSupabase();
  const { data: mediaData } = await supabase
    .from('media')
    .select('*, thumbnail_data(*)')
    .eq('id', mediaId)
    .single();

  const imageUrl = mediaData?.thumbnail_data?.thumbnail_url;
  if (!imageUrl) throw new Error('Image URL not found');

  // Call remote processing server
  const result = await callProcessingApi('/process', {
    mediaId,
    analysisType,
    imageUrl,
    storeResults
  });
  
  return result;
}
```

#### Update Face Processing Function
```typescript
'use server';

import { processRemotely } from '@/lib/processing-api';
import { createSupabase } from '@/lib/supabase';
import { v4 } from 'uuid';

export async function processForFaces(mediaId: string) {
  // Call remote processing server
  const { success, results, processingTime } = await processRemotely(mediaId, 'faces');
  
  // Save results to database
  const supabase = createSupabase();
  const { error: insertError } = await supabase.from('analysis_data').upsert({
    id: v4(),
    media_id: mediaId,
    faces: results,
    processing_time: processingTime,
  }, {
    onConflict: 'media_id' // unique
  });

  if (insertError) {
    throw new Error(`Failed to save analysis results: ${insertError.message}`);
  }

  return { success, faces: results, processingTime };
}
```

#### Update Other Analysis Functions Similarly
Apply the same pattern to other intensive analysis functions, such as:
- `src/actions/analysis/process-for-objects.ts`
- `src/actions/analysis/process-advanced-analysis.ts`

### Update Environment Variables
Add these to your `.env.local` file:
```
PROCESSING_API_URL=http://your-ubuntu-server:3001
```

## 5. Local Network Setup

Since you're running this on a local network only:

1. Configure the server's IP address to be static in your router settings
2. Test connectivity:
```bash
# On your main development machine
curl http://your-ubuntu-server:3001/health
```

3. (Optional) Add the server to your hosts file for easier access:
```bash
# On macOS
echo "192.168.x.x media-processing-server" | sudo tee -a /etc/hosts
```

## 6. Simple Monitoring

For basic monitoring, you can use PM2's built-in monitoring:

```bash
# On the processing server
pm2 monit
```

For more detailed monitoring but still keeping it simple:

```bash
# Install Glances for a simple monitoring dashboard
sudo apt install -y glances

# Run glances in web server mode
glances -w
```

Access Glances dashboard at `http://your-ubuntu-server:61208`

To view logs:
```bash
# View processing logs
pm2 logs media-processor
```

## 7. Testing and Verification

1. Test the processing server directly:
```bash
curl -X POST http://your-ubuntu-server:3001/process \
  -H "Content-Type: application/json" \
  -d '{"mediaId": "test", "analysisType": "faces", "imageUrl": "https://example.com/test.jpg"}'
```

2. Check server health and stats:
```bash
curl http://your-ubuntu-server:3001/health
```

3. Verify database records are being created correctly
4. Test integration with the main application

## Additional Notes

1. **Node.js Version**: Node.js 22 is recommended as it offers better performance and supports the latest ECMAScript features.

2. **Auto-Updating**: The setup includes an automatic update system using Git and cron, allowing you to push changes to your repository and have them automatically deployed.

3. **CUDA Version**: Using the latest CUDA toolkit version is generally fine as long as it's compatible with your NVIDIA driver. For production, you might want to pin to a specific version that's known to work well with your ML libraries.

4. **Multi-Processing**: The setup uses Node.js cluster module to handle multiple processes simultaneously, maximizing GPU utilization.

5. **Firewall**: For a local network test environment, the firewall configuration is optional. If you choose to enable it later, you can use:
   ```bash
   sudo ufw allow ssh
   sudo ufw allow 3001/tcp
   sudo ufw enable
   ```

This setup will significantly reduce processing times for advanced image analysis by leveraging GPU acceleration on a dedicated machine, allowing your main application to remain responsive while handling intensive processing tasks.
