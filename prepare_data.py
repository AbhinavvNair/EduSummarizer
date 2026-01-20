import os
from datasets import load_dataset
from tqdm import tqdm

# --- CONFIGURATION ---
DATA_DIR = "data"
OUTPUT_FILE = os.path.join(DATA_DIR, "dataset.txt")

def download_and_save():
    # Ensure directory exists
    os.makedirs(DATA_DIR, exist_ok=True)

    print("🚀 Downloading WikiText-2 (High-Quality Educational Data)...")
    
    # Load the dataset from Hugging Face
    # 'wikitext-2-raw-v1' is the raw version (good for character-level/BPE work)
    # split='train' gets the training portion
    dataset = load_dataset("wikitext", "wikitext-2-raw-v1", split="train")

    print(f"✅ Download complete. Processing {len(dataset)} items...")

    # Save to a single text file
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for item in tqdm(dataset):
            text = item['text']
            # Basic cleanup: WikiText is already clean, but has some artifacts
            if len(text.strip()) > 0:
                f.write(text)

    # Check size
    size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    print(f"\n🎉 SUCCESS! New 'Pro' Dataset saved to: {OUTPUT_FILE}")
    print(f"📊 New Dataset Size: {size_mb:.2f} MB")
    print("   (Note: This is DENSE text. It contains way more info than the scraped HTML.)")

if __name__ == "__main__":
    download_and_save()