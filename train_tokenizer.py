import sentencepiece as spm
import os

# --- CONFIGURATION ---
# 1. Path to your text file (created in Phase 1)
input_file = os.path.join("data", "dataset.txt")

# 2. Path where we want to save the tokenizer model
# It will create 'tokenizer.model' and 'tokenizer.vocab' inside the data folder
model_prefix = os.path.join("data", "tokenizer")

# 3. Vocabulary Size
# Since your dataset is ~1.88MB, we use 5,000 tokens.
# This prevents the model from memorizing rare nonsense words.
vocab_size = 8000 

def train_tokenizer():
    print(f"🚀 Training Tokenizer on {input_file}...")
    print(f"🎯 Vocabulary Size: {vocab_size}")

    # The SentencePiece command string
    # --input: The text file to learn from
    # --model_prefix: The output filename 
    # --vocab_size: Total number of unique tokens to learn
    # --model_type: 'bpe' (Byte Pair Encoding) - standard for LLMs
    # --character_coverage: 1.0 means include ALL characters found in the text
    # --pad_id=3: We define specific IDs for special markers
    
    # Special Tokens Guide:
    # 0 = <unk> (Unknown word)
    # 1 = <s> (Start of Sentence - BOS)
    # 2 = </s> (End of Sentence - EOS)
    # 3 = <pad> (Padding - used to make sentences same length)
    
    spm.SentencePieceTrainer.train(
        input=input_file,
        model_prefix=model_prefix,
        vocab_size=vocab_size,
        model_type='bpe',
        character_coverage=1.0,
        unk_id=0,
        bos_id=1,
        eos_id=2,
        pad_id=3
    )

    print("✅ Tokenizer training complete!")
    print(f"📂 Created files: \n  - {model_prefix}.model \n  - {model_prefix}.vocab")

if __name__ == "__main__":
    # Safety check: does the dataset actually exist?
    if not os.path.exists(input_file):
        print(f"❌ Error: Could not find {input_file}. Did you run Phase 1?")
    else:
        train_tokenizer()