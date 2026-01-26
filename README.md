# 📘 EduSummariser — Building a Mini LLM from Scratch

EduSummariser is a **custom-built Language Model developed entirely from scratch using PyTorch**, trained on educational text and deployed as a **full-stack LLM-style web application**.

Unlike API-based projects, this system focuses on understanding the **core internals of Large Language Models**—from tokenization and self-attention to training, inference, and deployment—while operating under **limited computational resources**.

This project demonstrates a complete **ML + NLP + DevOps workflow**, making it both an educational deep dive and a practical engineering system.

---

## 🚀 Key Features

- Custom **decoder-only Transformer (GPT-style)** architecture  
- Educational **text summarization and explanation**
- **SentencePiece (BPE)** tokenizer trained from scratch
- End-to-end **training and inference pipeline**
- **FastAPI backend** for model serving
- **Gradio / Streamlit frontend** for interactive usage
- Fully **Dockerized** application
- **Cloud deployment** on HuggingFace Spaces
- Designed to work in **low-resource environments**

---

## 🎯 Motivation

Most existing summarization tools either:
- Use **rule-based heuristics** (low quality), or  
- Depend on **closed-source pretrained APIs** (low learning value)

EduSummariser was built to:
- Understand LLMs **from first principles**
- Avoid black-box dependencies
- Explore how far a **small custom model** can go
- Demonstrate a complete **ML system lifecycle**
- Learn deployment and DevOps alongside modeling

---

## 🧠 Project Objectives

### Primary Objectives
- Build a **Mini LLM from scratch**
- Train it on educational datasets
- Deploy it as a usable **web-based application**

### Secondary Objectives
- Design and train a tokenizer
- Understand Transformer internals
- Practice ML deployment & MLOps workflows

### Out of Scope
- Billion-parameter models  
- Multimodal learning  
- Production-scale optimization  

---

## 🏗️ System Architecture

1. Raw educational text ingestion  
2. SentencePiece tokenizer training (BPE)  
3. Decoder-only Transformer model  
4. Next-token prediction training  
5. Inference & text generation  
6. FastAPI-based serving layer  
7. Web UI (Gradio / Streamlit)  
8. Docker + Cloud deployment  

---

## 🧩 Model Architecture

The model follows a **GPT-style decoder-only Transformer**:

- Token Embeddings  
- Positional Embeddings  
- Multi-Head Self-Attention (causal masking)  
- Feed-Forward Neural Networks  
- Residual Connections  
- Layer Normalization (Pre-LN)  
- Linear Output Projection  

This architecture was chosen for **simplicity, interpretability, and efficiency**.

---

## 🧠 Transformer Internals (Conceptual Overview)

- **Self-Attention**: Captures contextual relationships across educational text  
- **Causal Masking**: Ensures autoregressive token generation  
- **Weight Sharing**: Reduces parameter count and improves generalization  
- **Pre-LayerNorm**: Improves training stability for deeper networks  

---

## 📚 Dataset

### Data Sources
- Wikipedia (educational topics)
- NCERT summaries
- Lecture notes
- Open educational blogs

### Preprocessing Steps
- HTML and noise removal  
- Text normalization  
- Sentence cleanup  
- Single merged training corpus  

---

## 🔤 Tokenizer

- Implemented using **SentencePiece (BPE)**
- Efficient handling of rare and unknown words
- Industry-standard tokenizer design used in modern LLMs

---

## 🏋️ Training Pipeline

- Framework: **PyTorch**
- Objective: **Next-token prediction**
- Loss Function: **Cross Entropy Loss**
- Optimizer: **AdamW**
- Training Environment: Google Colab / Kaggle GPU
- Model Storage: HuggingFace Hub

---

## 📊 Evaluation

The model is evaluated using standard summarization metrics:

- **ROUGE-1**
- **ROUGE-2**
- **ROUGE-L**

Baseline comparisons include:
- Lead-3 summarization
- TF-IDF-based summarizer

These benchmarks help validate model quality despite limited scale.

---

## 🌐 Backend API

The backend is implemented using **FastAPI**.

### Features
- Model loading and inference
- REST-based summarization endpoints
- Interactive API documentation via Swagger UI

---

## ☁️ Deployment

- Frontend: **HuggingFace Spaces**
- Backend: **Render / Railway**
- Model Hosting: **HuggingFace Hub**

The application is fully cloud-hosted and hardware-independent.

---

## 🔄 Backup Plan (Plan B)

- Tool: **LlamaIndex**
- Purpose:
  - Fallback solution
  - Performance comparison
  - Reliability assurance

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


