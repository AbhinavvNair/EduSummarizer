import torch
import os
import sentencepiece as spm
from model import EduLLM

# --- HYPERPARAMETERS (The "Medium" Config) ---
batch_size = 32        # How many independent sequences will we process in parallel?
block_size = 256       # What is the maximum context length for predictions?
max_iters = 20000      # Increased for TinyStories (was 5000)
eval_interval = 1000   # How often to check loss (was 500)
learning_rate = 3e-4
device = 'cuda' if torch.cuda.is_available() else 'cpu'
eval_iters = 200
n_embd = 384           # Increased brain width (was 256)
n_head = 6             # Increased attention heads (was 4)
n_layer = 6            # Increased depth (was 4)
dropout = 0.2

# --- SEED ---
torch.manual_seed(1337)

# --- PATHS ---
DATA_PATH = os.path.join("data", "dataset.txt")
TOKENIZER_PATH = os.path.join("data", "tokenizer.model")
MODEL_SAVE_PATH = os.path.join("data", "edullm_model.pt")

print(f"🚀 Training on device: {device}")

# --- LOAD TOKENIZER ---
if not os.path.exists(TOKENIZER_PATH):
    raise FileNotFoundError(f"Tokenizer not found at {TOKENIZER_PATH}")
sp = spm.SentencePieceProcessor()
sp.load(TOKENIZER_PATH)
vocab_size = sp.get_piece_size()
print(f"✅ Tokenizer loaded. Vocab size: {vocab_size}")

# --- PREPARE DATA ---
if not os.path.exists(DATA_PATH):
    raise FileNotFoundError(f"Dataset not found at {DATA_PATH}. Run prepare_tinystories.py first!")

print("⏳ Loading dataset into memory...")
with open(DATA_PATH, 'r', encoding='utf-8') as f:
    text = f.read()

# Split into train/val
data = torch.tensor(sp.encode_as_ids(text), dtype=torch.long)
n = int(0.9 * len(data))
train_data = data[:n]
val_data = data[n:]
print(f"✅ Data loaded. Train tokens: {len(train_data)}, Val tokens: {len(val_data)}")

# --- DATA LOADER ---
def get_batch(split):
    data_source = train_data if split == 'train' else val_data
    ix = torch.randint(len(data_source) - block_size, (batch_size,))
    x = torch.stack([data_source[i:i+block_size] for i in ix])
    y = torch.stack([data_source[i+1:i+block_size+1] for i in ix])
    x, y = x.to(device), y.to(device)
    return x, y

@torch.no_grad()
def estimate_loss():
    out = {}
    model.eval()
    for split in ['train', 'val']:
        losses = torch.zeros(eval_iters)
        for k in range(eval_iters):
            X, Y = get_batch(split)
            logits, loss = model(X, Y)
            losses[k] = loss.item()
        out[split] = losses.mean()
    model.train()
    return out

# --- INITIALIZE MODEL ---
model = EduLLM(vocab_size, n_embd, n_head, n_layer, block_size, dropout)
m = model.to(device)
print(f"🧠 Model initialized with ~{sum(p.numel() for p in m.parameters())/1e6:.2f}M parameters")

# --- OPTIMIZER ---
optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)

# --- TRAINING LOOP ---
print("🔥 Starting training...")
for iter in range(max_iters):

    # Every once in a while evaluate the loss on train and val sets
    if iter % eval_interval == 0 or iter == max_iters - 1:
        losses = estimate_loss()
        print(f"step {iter}: train loss {losses['train']:.4f}, val loss {losses['val']:.4f}")
        # Save checkpoint
        torch.save(model.state_dict(), MODEL_SAVE_PATH)

    # Sample a batch of data
    xb, yb = get_batch('train')

    # Evaluate the loss
    logits, loss = model(xb, yb)
    optimizer.zero_grad(set_to_none=True)
    loss.backward()
    optimizer.step()

print(f"🎉 Training complete! Model saved to {MODEL_SAVE_PATH}")