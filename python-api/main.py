from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import os
import io
import logging
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
import math
import struct
import uvicorn

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Simple TTS API", description="API for Text-to-Speech simulation")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define models directory
MODELS_DIR = os.environ.get("MODELS_DIR", os.path.join(os.path.dirname(__file__), "models"))
os.makedirs(MODELS_DIR, exist_ok=True)

# Store loaded models in memory
loaded_models = {}

class TTSRequest(BaseModel):
    text: str
    model_name: str
    voice_settings: Optional[dict] = None

class ModelInfo(BaseModel):
    name: str
    description: Optional[str] = None
    file_type: str
    is_available: bool

# Helper function to generate a simple WAV file
def generate_sine_wave(frequency, duration, sample_rate=22050):
    """Generate a simple sine wave as a WAV file."""
    # Generate time points
    num_samples = int(duration * sample_rate)
    samples = []
    
    # Generate sine wave
    for i in range(num_samples):
        t = i / sample_rate
        value = int(32767.0 * math.sin(2.0 * math.pi * frequency * t))
        samples.append(struct.pack('<h', value))
    
    # Combine all samples
    samples_data = b''.join(samples)
    
    # Create WAV header
    riff_chunk_size = 36 + len(samples_data)
    fmt_chunk_size = 16
    
    header = struct.pack('<4sI4s4sIHHIIHH4sI',
        b'RIFF',
        riff_chunk_size,
        b'WAVE',
        b'fmt ',
        fmt_chunk_size,
        1,                # Format tag: PCM
        1,                # Channels: Mono
        sample_rate,      # Samples per second
        sample_rate * 2,  # Bytes per second
        2,                # Block align
        16,               # Bits per sample
        b'data',
        len(samples_data)
    )
    
    # Return full WAV data
    return header + samples_data

# API endpoints
@app.get("/")
async def root():
    return {"message": "Simple TTS API is running"}

@app.get("/models", response_model=List[ModelInfo])
async def list_models():
    """List all available TTS models"""
    models = []
    
    # Scan the models directory for files or folders
    if os.path.exists(MODELS_DIR):
        for item in os.listdir(MODELS_DIR):
            item_path = os.path.join(MODELS_DIR, item)
            
            # If it's a file with .pth or .pt extension
            if os.path.isfile(item_path) and (item.endswith(".pth") or item.endswith(".pt")):
                models.append(ModelInfo(
                    name=item,
                    description=f"PyTorch model: {item}",
                    file_type="pytorch",
                    is_available=True
                ))
            # If it's a directory, check for model files inside
            elif os.path.isdir(item_path):
                # Look for .pth or .pt files in the directory
                found_model = False
                for subitem in os.listdir(item_path):
                    if subitem.endswith(".pth") or subitem.endswith(".pt"):
                        found_model = True
                        model_name = f"{item}/{subitem}"
                        models.append(ModelInfo(
                            name=model_name,
                            description=f"PyTorch model in folder: {model_name}",
                            file_type="pytorch",
                            is_available=True
                        ))
                
                # If no specific model file found, add the directory itself
                if not found_model and any(os.path.isfile(os.path.join(item_path, f)) for f in os.listdir(item_path)):
                    models.append(ModelInfo(
                        name=item,
                        description=f"Model folder: {item}",
                        file_type="folder",
                        is_available=True
                    ))
    
    # If no models found, add a default simulated model
    if not models:
        models.append(ModelInfo(
            name="simulated_model.pth",
            description="Simulated TTS model (no real models found)",
            file_type="simulated",
            is_available=True
        ))
    
    return models

@app.post("/upload-model")
async def upload_model(model_file: UploadFile = File(...)):
    """Upload a new TTS model file"""
    try:
        # Ensure the file has a valid extension
        if not (model_file.filename.endswith(".pth") or model_file.filename.endswith(".pt")):
            raise HTTPException(status_code=400, detail="Only .pth or .pt files are accepted")
        
        file_path = os.path.join(MODELS_DIR, model_file.filename)
        
        # Write the uploaded file
        with open(file_path, "wb") as f:
            content = await model_file.read()
            f.write(content)
        
        logger.info(f"Model uploaded to {file_path}")
        
        return {"message": f"Model {model_file.filename} uploaded successfully", "file_path": file_path}
    
    except Exception as e:
        logger.error(f"Error uploading model: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/text-to-speech")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech (simulated for now)"""
    try:
        # Check if model exists (just for the interface, not actually using it)
        model_path = os.path.join(MODELS_DIR, request.model_name)
        if not (os.path.exists(model_path) or request.model_name == "simulated_model.pth"):
            raise HTTPException(status_code=404, detail=f"Model {request.model_name} not found")
        
        # Log the request
        logger.info(f"Processing TTS request for text: '{request.text[:50]}...' with model: {request.model_name}")
        
        # Generate a simple audio response (sine wave)
        # Vary the frequency based on the hash of the text to make different texts sound different
        frequency = 440  # A4 note
        text_hash = sum(ord(c) for c in request.text) % 400
        frequency += text_hash  # Range from 440 to 840 Hz
        
        # Duration based on text length (longer text = longer audio)
        duration = min(len(request.text) * 0.1, 10.0)  # Max 10 seconds
        
        # Generate the WAV data
        wav_data = generate_sine_wave(frequency, duration)
        
        # Create a BytesIO object for the WAV data
        output = io.BytesIO(wav_data)
        
        # Return audio file
        return StreamingResponse(
            output,
            media_type="audio/wav",
            headers={"Content-Disposition": f"attachment; filename=speech.wav"}
        )
    
    except Exception as e:
        logger.error(f"Error in text-to-speech: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Run the FastAPI server
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
