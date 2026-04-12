from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict
import base64
import io
from PIL import Image
import numpy as np
from deepface import DeepFace

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EmotionRequest(BaseModel):
    image: str


def clamp(value: float) -> int:
    return max(0, min(100, int(round(value))))


def decode_image(data_url: str) -> np.ndarray:
    if "," not in data_url:
        raise ValueError("Invalid data URL")
    _, encoded = data_url.split(",", 1)
    binary = base64.b64decode(encoded)
    image = Image.open(io.BytesIO(binary)).convert("RGB")
    return np.array(image)


def to_label(emotions: Dict[str, float]) -> str:
    if not emotions:
        return "Neutral"
    top = max(emotions.items(), key=lambda item: item[1])[0]
    mapping = {
        "happy": "Happy",
        "neutral": "Neutral",
        "surprise": "Surprised",
        "fear": "Nervous",
        "angry": "Stressed",
        "disgust": "Confused",
        "sad": "Confused",
    }
    return mapping.get(top, "Neutral")


@app.get("/api/emotion/health")
def emotion_health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/api/emotion/analyze")
def analyze_emotion(payload: EmotionRequest) -> Dict[str, Any]:
    try:
        frame = decode_image(payload.image)
        result = DeepFace.analyze(
            img_path=frame,
            actions=["emotion"],
            enforce_detection=False,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if isinstance(result, list):
        result = result[0] if result else {}

    emotions = result.get("emotion", {}) if isinstance(result, dict) else {}

    happy = float(emotions.get("happy", 0))
    neutral = float(emotions.get("neutral", 0))
    surprise = float(emotions.get("surprise", 0))
    fear = float(emotions.get("fear", 0))
    sad = float(emotions.get("sad", 0))
    angry = float(emotions.get("angry", 0))

    confidence = clamp(neutral * 0.6 + happy * 0.4 - fear * 0.2)
    stress = clamp(fear + sad + angry)
    engagement = clamp(surprise + happy + neutral)
    smile = clamp(happy)
    eye_contact = clamp(neutral)
    attention = clamp(engagement * 0.6 + neutral * 0.4)
    nervousness = clamp(fear * 0.7 + surprise * 0.3)

    return {
        "label": to_label(emotions),
        "confidence": confidence,
        "stress": stress,
        "engagement": engagement,
        "smile": smile,
        "eyeContact": eye_contact,
        "attention": attention,
        "nervousness": nervousness,
    }
