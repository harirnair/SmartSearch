from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.rag import process_pdf, query_documents, generate_insights, compare_documents, generate_answer
from app.db.database import get_db
from app.db.models import Document
from datetime import datetime

router = APIRouter()

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        message = await process_pdf(file)
        
        # Add to DB if not exists
        existing_doc = db.query(Document).filter(Document.filename == file.filename).first()
        if not existing_doc:
            new_doc = Document(filename=file.filename, upload_date=datetime.now().isoformat())
            db.add(new_doc)
            db.commit()
            db.refresh(new_doc)
            
        return {"message": message, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents")
async def get_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).all()
    return {"documents": [doc.filename for doc in docs]}

@router.get("/query")
async def query_rag(q: str, files: str = None):
    if not q:
        raise HTTPException(status_code=400, detail="Query parameter 'q' is required")
    
    # files can be a comma-separated list of filenames
    file_filters = None
    if files:
        file_filters = files.split(",")
    
    results = query_documents(q, file_filters)
    
    # Generate answer using LLM
    answer = generate_answer(q, results)
    
    # Format results for frontend
    formatted_results = [
        {
            "content": doc.page_content,
            "source": doc.metadata.get("source", "Unknown"),
            "page": doc.metadata.get("page", 0)
        }
        for doc in results
    ]
    return {"results": formatted_results, "answer": answer}

@router.get("/insights")
async def get_insights_api(filename: str):
    if not filename:
        raise HTTPException(status_code=400, detail="Filename parameter is required")
    
    insights = await generate_insights(filename)
    return insights

@router.post("/compare")
async def compare_api(file1: str, file2: str):
    if not file1 or not file2:
        raise HTTPException(status_code=400, detail="Both file1 and file2 parameters are required")
    
    comparison = await compare_documents(file1, file2)
    return comparison

@router.post("/evaluate/generate")
async def generate_test_set_api(files: list[str] = None, num_samples: int = 20):
    from app.core.evaluation import generate_test_set
    return await generate_test_set(files, num_samples)

@router.post("/evaluate/run_single")
async def evaluate_single_api(data: dict):
    from app.core.evaluation import evaluate_single_question
    # data expects: { "question": str, "true_answer": str, "files": list[str] }
    return await evaluate_single_question(
        data.get("question"), 
        data.get("true_answer"), 
        data.get("files")
    )
