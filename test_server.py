#!/usr/bin/env python3
"""
Simple test script to verify the Smart Interviewer backend is working
"""

import requests
import json

def test_server():
    """Test the backend server endpoints"""
    base_url = "http://localhost:5000"
    
    print("🧪 Testing Smart Interviewer Backend Server")
    print("=" * 50)
    
    # Test 1: Health check
    print("1. Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Health check passed: {data['status']}")
            print(f"   📊 AI Provider: {data['ai_provider']}")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Health check error: {e}")
        return False
    
    # Test 2: Providers endpoint
    print("\n2. Testing providers endpoint...")
    try:
        response = requests.get(f"{base_url}/api/providers", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Providers endpoint working")
            print(f"   📋 Available providers: {len(data.get('providers', []))}")
        else:
            print(f"   ❌ Providers endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Providers endpoint error: {e}")
    
    # Test 3: Suggest questions (with fallback data)
    print("\n3. Testing question suggestion...")
    try:
        test_data = {
            "context": "Software Engineer interview",
            "type": "technical",
            "count": 3,
            "previous_questions": [],
            "candidate_info": {"role": "Software Engineer", "experience_level": "mid"}
        }
        
        response = requests.post(
            f"{base_url}/api/suggest-questions",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                questions = data.get('questions', [])
                print(f"   ✅ Question generation working")
                print(f"   📝 Generated {len(questions)} questions")
                if questions:
                    print(f"   💡 Sample question: {questions[0].get('question', 'N/A')[:50]}...")
            else:
                print(f"   ⚠️  Question generation returned error: {data.get('error')}")
        else:
            print(f"   ❌ Question generation failed: {response.status_code}")
            print(f"   📄 Response: {response.text}")
    except Exception as e:
        print(f"   ❌ Question generation error: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 Test completed! Check the results above.")
    return True

if __name__ == "__main__":
    test_server()
