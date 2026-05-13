from database import SessionLocal, PropertyMetadata, Transaction as DbTransaction, init_db
import os

def seed():
    init_db()
    db = SessionLocal()
    
    # Clear ALL existing metadata to ensure only the 7 official properties exist
    db.query(PropertyMetadata).delete()
    db.query(DbTransaction).delete() # Also clear old transactions to start fresh
    
    properties = [
        {
            "id": 0,
            "name": "Manhattan Luxury Suite",
            "location": "New York, USA",
            "image": "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
            "description": "High-end luxury suite in the heart of Manhattan with stunning city views."
        },
        {
            "id": 1,
            "name": "London Bridge Flat",
            "location": "London, UK",
            "image": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80",
            "description": "Modern flat located near London Bridge, offering excellent connectivity."
        },
        {
            "id": 2,
            "name": "Dubai Marina Penthouse",
            "location": "Dubai, UAE",
            "image": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80",
            "description": "Exclusive penthouse in Dubai Marina with panoramic waterfront views."
        },
        {
            "id": 3,
            "name": "Sydney Coastal Retreat",
            "location": "Sydney, Australia",
            "image": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80",
            "description": "Beautiful coastal property with direct beach access in Sydney."
        },
        {
            "id": 4,
            "name": "Tokyo Sky Tower",
            "location": "Tokyo, Japan",
            "image": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80",
            "description": "Ultra-modern apartment in a high-rise tower overlooking Tokyo skyline."
        },
        {
            "id": 5,
            "name": "Berlin Logistics Center",
            "location": "Berlin, Germany",
            "image": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
            "description": "Prime industrial logistics center in Berlin's commercial hub."
        },
        {
            "id": 6,
            "name": "Singapore Global Mall",
            "location": "Singapore",
            "image": "https://images.unsplash.com/photo-1519642918616-2397157a29d7?auto=format&fit=crop&w=800&q=80",
            "description": "Modern retail space in a premium Singapore shopping destination."
        }
    ]
    
    for p in properties:
        db.add(PropertyMetadata(
            id=p["id"],
            name=p["name"],
            location=p["location"],
            image=p["image"],
            description=p["description"],
            isSimulated=False
        ) )
    
    db.commit()
    db.close()
    print("Database seeded with 7 properties successfully!")

if __name__ == "__main__":
    seed()
