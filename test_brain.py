import torch
import sentencepiece as spm
from model import EduLLM

# --- CONFIG ---
# Must match the "Medium Brain" settings we used in Colab
vocab_size = 0 # Will be set by tokenizer
n_embd = 384
n_head = 6
n_layer = 6
device = 'cpu' # Force CPU for local laptop use

print("🔌 connecting to local brain...")

try:
    # 1. Load Tokenizer
    sp = spm.SentencePieceProcessor()
    sp.load("data/tokenizer.model")
    vocab_size = sp.get_piece_size()
    print(f"✅ Tokenizer loaded (Vocab: {vocab_size})")

    # 2. Initialize the Empty Brain Structure
    model = EduLLM(vocab_size, n_embd, n_head, n_layer)
    
    # 3. Load the Trained Weights (The Transplant)
    # map_location='cpu' is CRITICAL here to convert GPU weights to CPU
    checkpoint = torch.load("data/edullm_model.pt", map_location=torch.device('cpu'))
    model.load_state_dict(checkpoint)
    model.to(device)
    model.eval()
    print("✅ Model weights loaded successfully!")

    # 4. Generate a Test Story
    print("\n📝 Generating a story starting with 'Once upon a time'...\n")
    print("-" * 40)
    
    start_text = "Once upon a time"
    # Convert text to numbers
    idx = torch.tensor([sp.encode_as_ids(start_text)], dtype=torch.long).to(device)
    
    # Let the brain think (Generate 100 new tokens)
    with torch.no_grad():
        output = model.generate(idx, max_new_tokens=100)
        
    # Decode numbers back to text
    print(sp.decode(output[0].tolist()))
    print("-" * 40)
    print("\n🎉 IT WORKS! Your AI is alive.")

except Exception as e:
    print(f"\n❌ CRITICAL ERROR: {e}")
    print("Check if model.py matches the training config (384/6/6).")