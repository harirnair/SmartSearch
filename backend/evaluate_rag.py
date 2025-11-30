import json
import os
from app.core.rag import query_documents, generate_answer, get_llm
from dotenv import load_dotenv

load_dotenv()

def evaluate_rag():
    if not os.path.exists("test_set.json"):
        print("test_set.json not found. Run generate_test_set.py first.")
        return

    with open("test_set.json", "r") as f:
        test_set = json.load(f)
        
    print(f"Evaluating {len(test_set)} questions...")
    
    llm = get_llm()
    results = []
    total_score = 0
    
    for item in test_set:
        question = item['question']
        true_answer = item['true_answer']
        
        print(f"\nQ: {question}")
        
        # 1. Run RAG
        # Note: query_documents returns Document objects
        retrieved_docs = query_documents(question)
        generated_answer = generate_answer(question, retrieved_docs)
        
        print(f"RAG Answer: {generated_answer}")
        
        # 2. Judge
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
            # Parse score (naive parsing)
            score = 0
            for line in eval_response.split('\n'):
                if "Score:" in line:
                    try:
                        # Extract number from string like "Score: 5" or "Score: 5/5"
                        parts = line.split("Score:")[1].strip().split('/')
                        score = int(parts[0].strip())
                    except:
                        pass
            
            total_score += score
            results.append({
                "question": question,
                "true_answer": true_answer,
                "generated_answer": generated_answer,
                "score": score,
                "feedback": eval_response
            })
            print(f"Score: {score}")
            
        except Exception as e:
            print(f"Error evaluating: {e}")

    avg_score = total_score / len(test_set) if test_set else 0
    print(f"\nAverage Score: {avg_score:.2f}/5")
    
    with open("evaluation_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print("Results saved to evaluation_results.json")

if __name__ == "__main__":
    evaluate_rag()
