from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import torch
import sentencepiece as spm
from model import EduLLM
import os

# --- CONFIGURATION ---
vocab_size = 0 
n_embd = 384
n_head = 6
n_layer = 6
device = 'cpu' # Force CPU for laptop use

app = FastAPI()

# 1. Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- LOAD MODEL ---
print("🔌 Loading Brain...")
try:
    sp = spm.SentencePieceProcessor()
    sp.load("data/tokenizer.model")
    vocab_size = sp.get_piece_size()
    
    model = EduLLM(vocab_size, n_embd, n_head, n_layer)
    checkpoint = torch.load("data/edullm_model.pt", map_location=torch.device('cpu'))
    model.load_state_dict(checkpoint)
    model.to(device)
    model.eval()
    print("✅ Brain Loaded Successfully!")
    print("🚀 EduLLM is Ready to Serve!")
except Exception as e:
    print(f"❌ CRITICAL ERROR: {e}")
    print("Please ensure the model files are in the 'data' directory.")

# --- API REQUEST MODEL ---
class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 100
    temperature: float = 0.7

# --- API ENDPOINT ---
@app.post("/generate")
async def generate_text(request: GenerateRequest):
    try:
        idx = torch.tensor([sp.encode_as_ids(request.prompt)], dtype=torch.long).to(device)
        with torch.no_grad():
            output = model.generate(idx, max_new_tokens=request.max_tokens, temperature=request.temperature)
        generated_text = sp.decode(output[0].tolist())
        return {"response": generated_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- SERVE FRONTEND FILES (The Fix) ---

# 1. Serve the Homepage
@app.get("/")
async def read_index():
    return FileResponse('index.html')

# 2. Serve the CSS (Fixes the ugly look)
@app.get("/styles.css")
async def read_css():
    return FileResponse('styles.css')

# 3. Serve the JS (Fixes the buttons)
@app.get("/script.js")
async def read_js():
    return FileResponse('script.js')