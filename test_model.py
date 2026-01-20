import torch
from model import EduLLM

# 1. Initialize Model
# We use 5000 because that's the vocab size we set in Phase 2
model = EduLLM(vocab_size=5000) 

print("🧠 Model initialized successfully!")

# 2. Count Parameters
# A "parameter" is a number the model learns. 
# GPT-4 has 1.7 Trillion. We aim for ~3 Million.
params = sum(p.numel() for p in model.parameters())
print(f"📊 Total Parameters: {params/1e6:.2f} Million")

# 3. Run a Dummy Forward Pass
# Create a fake input: Batch size 1, sequence length 4 tokens
dummy_input = torch.tensor([[100, 52, 99, 1000]], dtype=torch.long)

try:
    logits, loss = model(dummy_input)
    print("✅ Forward pass successful! (Input processed)")
    print(f"   Output Shape: {logits.shape} (Expected: 1*4, 5000)")
except Exception as e:
    print(f"❌ Forward pass failed: {e}")

# 4. Run a Generation Test
print("🎲 Testing text generation...")
try:
    # Ask it to generate 5 new tokens
    generated = model.generate(dummy_input, max_new_tokens=5)
    print(f"   Generated Sequence: {generated.tolist()}")
    print("✅ Generation function works!")
except Exception as e:
    print(f"❌ Generation failed: {e}")