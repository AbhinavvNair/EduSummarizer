# 📘 EduSummariser

EduSummariser is a **custom-built Language Model developed from scratch using PyTorch**, trained on educational content and deployed as a **web-based LLM-style application**.  
The project focuses on understanding the **core working of Large Language Models**—from tokenization and self-attention to training, inference, and real-world deployment—while operating under limited computational resources.

---

## 🚀 Features

- Custom **decoder-only Transformer (GPT-style)** architecture
- Educational **text summarization and explanation**
- **SentencePiece (BPE)** tokenizer for efficient token handling
- End-to-end **training and inference pipeline**
- **FastAPI backend** for model serving
- **Gradio / Streamlit frontend** for interactive usage
- Fully **Dockerized** application
- **Cloud deployment** using modern ML platforms

---

## 🎯 Project Motivation

Most existing summarization tools either:
- Use **rule-based techniques** (low quality), or
- Depend on **closed-source pretrained APIs** (limited learning value)

EduSummariser was built to:
- Understand LLMs **from first principles**
- Avoid black-box dependencies
- Be deployable in **low-resource environments**
- Demonstrate a complete **ML + DevOps workflow**

---

## 🧠 Objectives

### Primary Objectives
- Build a **Mini LLM from scratch**
- Train it on educational datasets
- Deploy it as a usable **web application**

### Secondary Objectives
- Learn tokenizer design
- Understand Transformer internals
- Practice ML deployment and DevOps

### Out of Scope
- Billion-parameter models  
- Multimodal learning  
- Production-scale optimization  

---

## 🏗️ System Architecture


---

## 🛠️ Development Phases

| Phase | Description |
|------|------------|
| Phase 0 | Environment Setup |
| Phase 1 | Dataset Collection & Cleaning |
| Phase 2 | Tokenizer Design |
| Phase 3 | Model Architecture |
| Phase 4 | Training Pipeline |
| Phase 5 | Inference Logic |
| Phase 6 | Backend API |
| Phase 7 | Frontend UI |
| Phase 8 | Dockerization |
| Phase 9 | Cloud Deployment |

---

## 🧩 Model Architecture

- Decoder-only Transformer
- Token Embeddings
- Positional Embeddings
- Multi-Head Self Attention
- Feed Forward Neural Networks
- Residual Connections
- Layer Normalization
- Linear Output Projection

This architecture was chosen for **simplicity, clarity, and efficiency**.

---

## 📚 Dataset

### Data Sources
- Wikipedia (educational topics)
- NCERT summaries
- Lecture notes
- Open educational blogs

### Preprocessing
- Removal of HTML tags and noise
- Text normalization
- Sentence cleanup
- Single merged training corpus

**Output File:**  


---

## 🔤 Tokenizer

- Implemented using **SentencePiece (BPE)**
- Efficient handling of rare and unknown words
- Industry-standard tokenizer for LLMs

**Files Generated:**


---

## 🏋️ Training Pipeline

- Framework: PyTorch
- Training Objective: Next-token prediction
- Loss Function: Cross Entropy Loss
- Optimizer: AdamW
- Training Environment: Google Colab / Kaggle GPU
- Model Storage: HuggingFace Hub

---

## 🌐 Backend API

The backend is built using **FastAPI**.

### API Endpoints


---

## ☁️ Cloud Deployment

- Frontend: HuggingFace Spaces
- Backend: Render / Railway
- Model Hosting: HuggingFace Hub

This makes the application **hardware-independent and publicly accessible**.

---

## 🔄 Backup Plan (Plan B)

- Tool Used: LlamaIndex
- Purpose:
  - Fallback solution
  - Performance comparison
  - Project reliability assurance

---

## 🧰 Tech Stack

### Programming
- Python
- PyTorch

### NLP
- SentencePiece

### Backend
- FastAPI
- Uvicorn

### Frontend
- Gradio / Streamlit

### DevOps
- Git
- GitHub
- Docker

### Cloud
- Google Colab
- HuggingFace Hub
- HuggingFace Spaces
- Render / Railway

---

## 🧪 Testing

- Manual prompt testing
- Output validation
- API testing using Postman / curl
- UI testing via browser

---

## ⚠️ Limitations

- Small model size
- Limited long-context understanding
- Possible hallucinations
- No multimodal support

These limitations are acceptable for an **academic and learning-focused project**.

---

## 🔮 Future Enhancements

- Larger and deeper models
- Retrieval-Augmented Generation (RAG)
- Flashcard generation
- Multilingual support
- Voice-based interaction
- Domain-specific fine-tuning

---

## 📌 Project Summary

**EduSummariser is a small custom Language Model built from scratch using PyTorch, trained on educational text, and deployed as an LLM-style web application using modern cloud and DevOps tools.**

---

## 🤝 Contributing

Contributions are welcome.  
Feel free to open issues or submit pull requests.

---

## ⭐ Support

If you find this project helpful, consider giving it a ⭐ on GitHub.

