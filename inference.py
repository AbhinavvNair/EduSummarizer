import torch
import sentencepiece as spm
import os
import sys
from model import EduLLM

# --- CONFIGURATION ---
# Force CPU since we are on a laptop
device = 'cpu'
model_path = os.path.join("data", "edullm_model.pt")
tokenizer_path = os.path.join("data", "tokenizer.model")

def main():
    # 1. LOAD TOKENIZER
    print(f"🔍 Loading tokenizer from {tokenizer_path}...")
    if not os.path.exists(tokenizer_path):
        print("❌ Error: 'tokenizer.model' not found in data folder.")
        return

    sp = spm.SentencePieceProcessor()
    sp.load(tokenizer_path)
    vocab_size = sp.get_piece_size()
    print(f"   Vocabulary Size: {vocab_size}")

    # 2. LOAD MODEL
    print(f"🧠 Loading model from {model_path}...")
    if not os.path.exists(model_path):
        print("❌ Error: 'edullm_model.pt' not found in data folder.")
        return

    try:
        # Initialize the empty architecture
        model = EduLLM(vocab_size)
        
        # Load the trained weights
        # map_location='cpu' is CRITICAL because the model was saved on a GPU
        checkpoint = torch.load(model_path, map_location=torch.device('cpu'))
        model.load_state_dict(checkpoint)
        
        # Set to evaluation mode (turns off training-specific randomness)
        model.to(device)
        model.eval()
        print("✅ Model loaded successfully!")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return

    # 3. CHAT LOOP
    print("\n" + "="*50)
    print("💬 EduSummariser AI is ready!")
    print("   Tip: Start a sentence, and the AI will finish it.")
    print("   Type 'quit' or 'exit' to stop.")
    print("="*50 + "\n")

    while True:
        try:
            user_input = input("You: ")
            if user_input.lower() in ['quit', 'exit']:
                print("👋 Goodbye!")
                break
            
            if not user_input.strip():
                continue

            print("AI: Thinking...", end="\r")

            # Encode input
            input_ids = sp.encode_as_ids(user_input)
            # Add batch dimension (1, length)
            input_tensor = torch.tensor([input_ids], dtype=torch.long).to(device)
            
            # Generate response
            with torch.no_grad():
                # We ask for 100 new tokens
                output_ids = model.generate(input_tensor, max_new_tokens=100)
            
            # Decode output
            full_response = sp.decode_ids(output_ids[0].tolist())
            
            # Remove the user's prompt from the output to show just the new text
            # (Simple logic: if the response starts with the prompt, slice it off)
            new_text = full_response
            if full_response.startswith(user_input):
                new_text = full_response[len(user_input):]

            print(f"AI: ...{new_text}")
            print("-" * 20)

        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error during generation: {e}")

if __name__ == "__main__":
    main()