import os
from datasets import load_dataset
from tqdm import tqdm

OUTPUT_FILE = os.path.join("data", "dataset.txt")

def prepare_tinystories():
    print("📥 Downloading TinyStories dataset...")
    dataset = load_dataset("roneneldan/TinyStories", split="train")
    
    print(f"✅ Processing {len(dataset)} stories...")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        # We process the first 1.5 Million stories
        for i, item in tqdm(enumerate(dataset), total=1500000):
            if i >= 1500000: break
            f.write(item['text'].strip() + "\n<|endoftext|>\n")

if __name__ == "__main__":
    # calling the function to prepare the dataset
    prepare_tinystories()