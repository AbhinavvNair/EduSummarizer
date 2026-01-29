import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from contextlib import asynccontextmanager
from openai import OpenAI  # We still use this as Groq is OpenAI-compatible
from dotenv import load_dotenv

load_dotenv()

# Using your specific variable name
API_KEY = os.getenv("GROQ_API_KEY") 

model_context = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🔌 Initializing NeuroNotes Pro...")
    if not API_KEY:
        print("❌ ERROR: 'GROQ_API_KEY' not found in .env!")
    else:
        try:
            # POINTING TO GROQ ENDPOINT
            client = OpenAI(
                api_key=API_KEY,
                base_url="https://api.groq.com/openai/v1", 
            )
            model_context['client'] = client
            print("🚀 Groq AI Client successfully initialized!")
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

class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 1000
    temperature: float = 0.7

@app.get("/")
async def read_index():
    return FileResponse('index.html')

@app.post("/generate")
async def generate_text(request: GenerateRequest):
    client = model_context.get('client')
    if not client:
        raise HTTPException(status_code=503, detail="AI Client not initialized.")

    try:
        print(f"📡 Sending request to Groq: {request.prompt[:50]}...")
        
        # CHANGED MODEL TO A VALID GROQ MODEL
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile", 
            messages=[
                {
                    "role": "system", 
                    "content": "You are NeuroNotes Pro. Summarize educational content with clean Markdown, bold key terms, and LaTeX ($$)."
                },
                {"role": "user", "content": request.prompt}
            ],
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )
        
        return {"response": completion.choices[0].message.content}

    except Exception as e:
        print(f"❌ Groq API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Groq API Error: {str(e)}")

app.mount("/", StaticFiles(directory="./"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)