from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from contextlib import asynccontextmanager
import torch
import sentencepiece as spm
import os

# Ensure model.py is in the same folder as main.py
from model import EduLLM 

# --- CONFIGURATION ---
N_EMBD = 384
N_HEAD = 6
N_LAYER = 6
MODEL_PATH = "data/edullm_model.pt"
TOKENIZER_PATH = "data/tokenizer.model"

# Detect Device
if torch.backends.mps.is_available():
    DEVICE = 'mps'
elif torch.cuda.is_available():
    DEVICE = 'cuda'
else:
    DEVICE = 'cpu'

print(f"🖥️  Running on device: {DEVICE}")

model_context = {}

# --- LIFESPAN MANAGER ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🔌 Loading EduSummarizer Brain...")
    try:
        # 1. Load Tokenizer
        sp = spm.SentencePieceProcessor()
        if not os.path.exists(TOKENIZER_PATH):
            print(f"⚠️ Warning: Tokenizer not found at {TOKENIZER_PATH}")
        else:
            sp.load(TOKENIZER_PATH)
        
        vocab_size = sp.get_piece_size() if os.path.exists(TOKENIZER_PATH) else 5000 
        
        # 2. Load Model
        model = EduLLM(vocab_size, N_EMBD, N_HEAD, N_LAYER)
        if os.path.exists(MODEL_PATH):
            # map_location handles CPU/GPU/MPS cross-loading
            checkpoint = torch.load(MODEL_PATH, map_location=torch.device(DEVICE))
            model.load_state_dict(checkpoint)
            print("✅ Weights loaded.")
        
        model.to(DEVICE)
        model.eval()
        
        model_context['model'] = model
        model_context['sp'] = sp
        print("🚀 EduSummarizer is Ready!")
        
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {e}")
        
    yield
    model_context.clear()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SERVE FRONTEND ---
# Since your index.html/script.js are in the root, we serve them directly
@app.get("/")
async def read_index():
    return FileResponse('index.html')

# This serves styles.css and script.js from your root directory
app.mount("/static", StaticFiles(directory="./"), name="static")

# --- DATA MODELS ---
class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 150
    temperature: float = 0.7

# --- AI ENDPOINT ---
@app.post("/generate")
async def generate_text(request: GenerateRequest):
    model = model_context.get('model')
    sp = model_context.get('sp')

    if not model:
        raise HTTPException(status_code=503, detail="Model not loaded.")

    try:
        # 1. Format the prompt for a decoder-only model
        full_prompt = f"Text: {request.prompt}\nSummary:"
        
        # 2. Tokenize
        idx = torch.tensor([sp.encode_as_ids(full_prompt)], dtype=torch.long).to(DEVICE)
        
        # 3. Generate
        with torch.no_grad():
            output = model.generate(
                idx, 
                max_new_tokens=request.max_tokens, 
                temperature=request.temperature
            )
            
        # 4. Decode
        full_text = sp.decode(output[0].tolist())
        
        # 5. Extract only the summary (the part after our prompt)
        if "Summary:" in full_text:
            summary = full_text.split("Summary:")[-1].strip()
        else:
            summary = full_text[len(full_prompt):].strip()

        return {"response": summary}

    except Exception as e:
        print(f"Generation Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)