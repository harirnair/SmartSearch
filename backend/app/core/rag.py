from fastapi import UploadFile
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
import shutil
import tempfile
import os
import random
from dotenv import load_dotenv

load_dotenv()

# Initialize Vector Store (ChromaDB)
# Persist directory for the vector DB
PERSIST_DIRECTORY = "./chroma_db"

def get_valid_key(name):
    key = os.getenv(name)
    if key and not key.startswith("your_"):
        return key
    return None

def get_embeddings():
    """
    Returns the embeddings model.
    Using Local HuggingFace embeddings to avoid API quotas and costs.
    """
    # You can switch this back to OpenAI/Gemini if you have a paid plan
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def get_llm(temperature=0):
    """
    Returns the LLM based on available API keys.
    Prioritizes Groq for speed and free tier.
    """
    groq_key = get_valid_key("GROQ_API_KEY")
    openai_key = get_valid_key("OPENAI_API_KEY")
    google_key = get_valid_key("GOOGLE_API_KEY")
    
    if groq_key:
        return ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=temperature,
            max_retries=2,
            # Rate limit handling is built-in to LangChain's retry mechanism for 429s
        )
    
    if openai_key and google_key:
        # "If both are valid, use either one of them" -> Randomly pick for fun/load balancing
        use_openai = random.choice([True, False])
        if use_openai:
            return ChatOpenAI(model="gpt-3.5-turbo", temperature=temperature)
        else:
            return ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=temperature)
            
    if openai_key:
        return ChatOpenAI(model="gpt-3.5-turbo", temperature=temperature)
    elif google_key:
        return ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=temperature)
    else:
        raise ValueError("No valid API key found. Please set GROQ_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY in .env")

def get_vectorstore():
    embeddings = get_embeddings()
    vectorstore = Chroma(
        persist_directory=PERSIST_DIRECTORY,
        embedding_function=embeddings,
        collection_name="pdf_documents"
    )
    return vectorstore

async def process_pdf(file: UploadFile) -> str:
    """
    Process an uploaded PDF file: save temp, load, split, and index.
    Returns the document ID or filename.
    """
    # Save uploaded file to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name

    try:
        # Load PDF
        loader = PyPDFLoader(tmp_path)
        documents = loader.load()

        # Split text
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            add_start_index=True
        )
        splits = text_splitter.split_documents(documents)

        # Add metadata (filename) to each split
        for split in splits:
            split.metadata["source"] = file.filename

        # Index into Vector Store
        vectorstore = get_vectorstore()
        vectorstore.add_documents(documents=splits)
        
        return f"Successfully processed {len(splits)} chunks from {file.filename}"

    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def list_documents():
    """
    Returns a list of unique filenames of uploaded documents.
    """
    vectorstore = get_vectorstore()
    # Access the underlying Chroma collection to get metadata
    # This is a bit of a hack, but standard LangChain interface doesn't expose "list all unique metadata" easily
    try:
        collection = vectorstore._collection
        # Get all metadata
        result = collection.get(include=["metadatas"])
        metadatas = result.get("metadatas", [])
        
        # Extract unique sources
        filenames = set()
        for meta in metadatas:
            if meta and "source" in meta:
                filenames.add(meta["source"])
        
        return list(filenames)
    except Exception as e:
        print(f"Error listing documents: {e}")
        return []

def query_documents(query: str, file_filters: list[str] = None):
    """
    Query the vector store for relevant documents.
    Optional: filter by specific filenames.
    """
    vectorstore = get_vectorstore()
    
    search_kwargs = {"k": 5}
    if file_filters:
        # Chroma filter syntax for "OR" logic with metadata is a bit specific.
        # If filtering by multiple files: {"source": {"$in": [file1, file2]}}
        if len(file_filters) == 1:
            search_kwargs["filter"] = {"source": file_filters[0]}
        else:
            search_kwargs["filter"] = {"source": {"$in": file_filters}}
            
    # Vector Retriever Only
    retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs=search_kwargs)
    results = retriever.invoke(query)
    return results

def generate_answer(query: str, context_docs: list):
    """
    Generates an answer using the LLM based on the provided context documents.
    """
    if not context_docs:
        return "I couldn't find any relevant information in the uploaded documents to answer your question."
        
    llm = get_llm()
    
    # Prepare context
    context_text = ""
    for doc in context_docs:
        source = doc.metadata.get('source', 'Unknown')
        page = doc.metadata.get('page', '?')
        context_text += f"Source: {source} (Page {page})\nContent: {doc.page_content}\n\n"
    
    prompt = f"""You are a smart research assistant. Answer the user's question based ONLY on the provided context documents.
If the answer is not found in the context, politely state that you don't have enough information.
Cite the source filenames and page numbers in your answer where appropriate.

Context:
{context_text}

Question: {query}

Answer:"""
    
    try:
        response = llm.invoke(prompt)
        return response.content
    except Exception as e:
        print(f"Error generating answer: {e}")
        return "Sorry, I encountered an error while generating the answer."

async def generate_insights(filename: str):
    """
    Generate insights (summary, key entities) for a given document.
    """
    vectorstore = get_vectorstore()
    # Retrieve all chunks for the file (simplified for demo; in prod, might need better filtering)
    # For now, we'll just query for a general summary context or retrieve top K
    retriever = vectorstore.as_retriever(
        search_type="similarity", 
        search_kwargs={"k": 5, "filter": {"source": filename}}
    )
    
    # We'll just grab some context. In a real app, you'd want to map-reduce the whole doc.
    # For this demo, we'll take the first few chunks to generate a "preview" insight.
    docs = retriever.invoke("summary of the document")
    context = "\n\n".join([doc.page_content for doc in docs])

    docs = retriever.invoke("summary of the document")
    context = "\n\n".join([doc.page_content for doc in docs])

    llm = get_llm(temperature=0)
    
    prompt = ChatPromptTemplate.from_template(
        """
        You are an AI analyst. Analyze the following text from a document:
        
        {context}
        
        Provide the following in JSON format:
        1. "summary": A concise summary (max 3 sentences).
        2. "key_entities": A list of top 5 key entities (people, organizations, concepts).
        3. "topics": A list of top 3 main topics.
        """
    )
    
    chain = prompt | llm | JsonOutputParser()
    
    try:
        insights = chain.invoke({"context": context})
        return insights
    except Exception as e:
        return {"error": str(e)}

async def compare_documents(file1: str, file2: str):
    """
    Compare two documents and return similarities and differences.
    """
    vectorstore = get_vectorstore()
    
    # Helper to get context
    def get_file_context(filename):
        retriever = vectorstore.as_retriever(
            search_type="similarity", 
            search_kwargs={"k": 5, "filter": {"source": filename}}
        )
        docs = retriever.invoke("summary and key points")
        return "\n".join([doc.page_content for doc in docs])

    context1 = get_file_context(file1)
    context2 = get_file_context(file2)

    if not context1 or not context2:
        return {"error": "Could not retrieve content for one or both files."}

    if not context1 or not context2:
        return {"error": "Could not retrieve content for one or both files."}

    llm = get_llm(temperature=0)
    
    prompt = ChatPromptTemplate.from_template(
        """
        Compare the following two document contexts:
        
        Document 1 ({file1}):
        {context1}
        
        Document 2 ({file2}):
        {context2}
        
        Provide a comparison in JSON format with the following keys:
        1. "similarities": List of common points.
        2. "differences": List of key differences.
        3. "conclusion": A brief concluding remark on how they relate.
        """
    )
    
    chain = prompt | llm | JsonOutputParser()
    
    try:
        comparison = chain.invoke({
            "file1": file1, "context1": context1,
            "file2": file2, "context2": context2
        })
        return comparison
    except Exception as e:
        return {"error": str(e)}

