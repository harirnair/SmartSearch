import random
import json
from app.core.rag import get_vectorstore, get_llm, query_documents, generate_answer

async def generate_test_set(filenames: list[str] = None, num_samples: int = 5):
    """
    Generates a synthetic test set of QA pairs.
    """
    vectorstore = get_vectorstore()
    collection = vectorstore._collection
    
    # Get all documents
    data = collection.get()
    documents = data['documents']
    metadatas = data['metadatas']
    
    if not documents:
        return {"error": "No documents found"}

    # Filter by filenames if provided
    valid_indices = []
    for i, meta in enumerate(metadatas):
        if not filenames or (meta and meta.get('source') in filenames):
            valid_indices.append(i)
            
    if not valid_indices:
        return {"error": "No documents found matching the selected files"}

    # Sample random chunks
    # Allow duplicates if we need more samples than chunks (bootstrap)
    if len(valid_indices) >= num_samples:
        indices = random.sample(valid_indices, num_samples)
    else:
        # If requested more than available, just take all or repeat
        indices = [random.choice(valid_indices) for _ in range(num_samples)]
        
    test_set = []
    llm = get_llm()
    
    print(f"Generating {len(indices)} QA pairs...")
    
    for idx in indices:
        chunk_text = documents[idx]
        meta = metadatas[idx] if metadatas and idx < len(metadatas) else {}
        source = meta.get('source', 'unknown') if meta else 'unknown'
        
        prompt = f"""You are a teacher preparing an exam. 
Given the following text chunk from a document ({source}), generate a specific factoid question and its correct answer.
The question should be answerable ONLY using the information in the text.

Text:
{chunk_text}

Output format:
Question: [Your question]
Answer: [Your answer]
"""
        try:
            response = llm.invoke(prompt).content
            lines = response.split('\n')
            q = ""
            a = ""
            for line in lines:
                if "Question:" in line:
                    q = line.split("Question:")[1].strip()
                elif "Answer:" in line:
                    a = line.split("Answer:")[1].strip()
            
            if q and a:
                test_set.append({
                    "question": q,
                    "true_answer": a,
                    "source_chunk": chunk_text,
                    "source_file": source
                })
        except Exception as e:
            print(f"Error generating pair: {e}")

    return {"test_set": test_set}

async def evaluate_single_question(question: str, true_answer: str, filenames: list[str] = None):
    """
    Evaluates a single question against the RAG system.
    """
    llm = get_llm()
    
    # Run RAG
    retrieved_docs = query_documents(question, filenames)
    generated_answer = generate_answer(question, retrieved_docs)
    
    # Judge
    eval_prompt = f"""You are a fair judge evaluating a RAG system.
Compare the Generated Answer to the True Answer.
Score the Generated Answer from 1 to 5 based on accuracy and completeness.

Question: {question}
True Answer: {true_answer}
Generated Answer: {generated_answer}

Output format:
Score: [1-5]
Reasoning: [Explanation]
"""
    try:
        eval_response = llm.invoke(eval_prompt).content
        score = 0
        for line in eval_response.split('\n'):
            if "Score:" in line:
                try:
                    parts = line.split("Score:")[1].strip().split('/')
                    score = int(parts[0].strip())
                except:
                    pass
        
        return {
            "question": question,
            "true_answer": true_answer,
            "generated_answer": generated_answer,
            "score": score,
            "feedback": eval_response,
            "relevant_chunks": [doc.page_content for doc in retrieved_docs]
        }
        
    except Exception as e:
        return {"error": str(e)}
