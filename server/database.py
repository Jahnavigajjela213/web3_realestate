from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Please configure PostgreSQL in your .env file.")

# PostgreSQL engine with optimized connection pooling
engine = create_engine(
    DATABASE_URL, 
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class PropertyMetadata(Base):
    __tablename__ = "properties_metadata"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    location = Column(String)
    image = Column(Text)
    description = Column(Text)
    symbol = Column(String, nullable=True)
    sharePriceEth = Column(String, default="0.01")
    totalShares = Column(Integer, default=100)
    sharesSold = Column(Integer, default=0)
    totalRentDistributed = Column(String, default="0")
    isSimulated = Column(Boolean, default=False)

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(String, primary_key=True, index=True)
    propertyId = Column(Integer)
    propertyName = Column(String)
    sharesToBuy = Column(Integer, default=0)
    amountEth = Column(String, default="0")
    buyerWallet = Column(String)
    buyerName = Column(String, default="Anonymous")
    txHash = Column(String, nullable=True)
    isMock = Column(Boolean, default=False)
    type = Column(String, default="buy")
    tenantName = Column(String, nullable=True)
    rentAmount = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
