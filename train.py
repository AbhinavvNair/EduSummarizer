import torch
import torch.nn as nn
from torch.nn import functional as F
import sentencepiece as spm
import os
import time
from model import EduLLM

# --- HYPERPARAMETERS (Settings for Colab T4 GPU) ---
batch_size = 64        # Process 64 chunks at once
block_size = 256       # Context length (Model memory)
max_iters = 5000       # Train for 5000 steps
eval_interval = 500    # Check progress every 500 steps
learning_rate = 3e-4   # Speed of learning
device = 'cuda' if torch.cuda.is_available() else 'cpu' 

print(f"⚙️  Using device: {device}")

# --- STEP 1: LOAD DATA & TOKENIZER ---
print("📂 Loading data...")
if not os.path.exists(os.path.join("data", "dataset.txt")):
    print("❌ Error: data/dataset.txt not found.")
    exit()

with open(os.path.join("data", "dataset.txt"), 'r', encoding='utf-8') as f:
    text = f.read()

# Load Tokenizer
sp = spm.SentencePieceProcessor()
sp.load(os.path.join("data", "tokenizer.model"))
vocab_size = sp.get_piece_size()

print("🔢 Encoding data...")
data = torch.tensor(sp.encode_as_ids(text), dtype=torch.long)
n = int(0.9 * len(data)) # 90% train, 10% validation
train_data = data[:n]
val_data = data[n:]

print(f"✅ Data loaded. Total tokens: {len(data)}")

# --- STEP 2: BATCHING FUNCTION ---
def get_batch(split):
    data = train_data if split == 'train' else val_data
    ix = torch.randint(len(data) - block_size, (batch_size,))
    x = torch.stack([data[i:i+block_size] for i in ix])
    y = torch.stack([data[i+1:i+block_size+1] for i in ix])
    return x.to(device), y.to(device)

# --- STEP 3: INITIALIZE MODEL ---
print("🧠 Initializing model...")
model = EduLLM(vocab_size)
model = model.to(device)
optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)

@torch.no_grad()
def estimate_loss():
    out = {}
    model.eval()
    for split in ['train', 'val']:
        losses = torch.zeros(100)
        for k in range(100):
            X, Y = get_batch(split)
            logits, loss = model(X, Y)
            losses[k] = loss.item()
        out[split] = losses.mean()
    model.train()
    return out

# --- STEP 4: TRAINING LOOP ---
print("🚀 Starting training...")
start_time = time.time()

for iter in range(max_iters):
    if iter % eval_interval == 0 or iter == max_iters - 1:
        losses = estimate_loss()
        print(f"step {iter}: train loss {losses['train']:.4f}, val loss {losses['val']:.4f}")

    xb, yb = get_batch('train')
    logits, loss = model(xb, yb)
    optimizer.zero_grad(set_to_none=True)
    loss.backward()
    optimizer.step()

end_time = time.time()
print(f"✅ Training finished in {end_time - start_time:.2f} seconds.")

# --- STEP 5: SAVE THE MODEL ---
save_path = os.path.join("data", "edullm_model.pt")
torch.save(model.state_dict(), save_path)
print(f"💾 Model saved to {save_path}")