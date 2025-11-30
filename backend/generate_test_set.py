import json
import random
import os
from app.core.rag import get_vectorstore, get_llm
from dotenv import load_dotenv

load_dotenv()

def generate_test_set(num_samples=5):
    print(f"Generating {num_samples} synthetic QA pairs...")
    
    try:
        vectorstore = get_vectorstore()
        collection = vectorstore._collection
        
        # Get all documents
        data = collection.get()
        documents = data['documents']
        metadatas = data['metadatas']
        
        if not documents:
            print("No documents found in vector store. Upload some PDFs first.")
            return

        # Sample random chunks
        indices = list(range(len(documents)))
        if len(indices) > num_samples:
            indices = random.sample(indices, num_samples)
            
        test_set = []
        llm = get_llm()
        
        for idx in indices:
            chunk_text = documents[idx]
            # Handle metadata being None or missing source
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
                # Parse response
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
                    print(f"Generated pair for {source}")
            except Exception as e:
                print(f"Error generating pair: {e}")

        with open("test_set.json", "w") as f:
            json.dump(test_set, f, indent=2)
        
        print(f"Saved {len(test_set)} QA pairs to test_set.json")
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    generate_test_set()
