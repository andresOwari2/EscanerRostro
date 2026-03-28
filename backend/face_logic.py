import cv2
import numpy as np
import base64
import io
import os
import sys

# Setup logging for face logic
import logging
logger = logging.getLogger(__name__)

# Paths to models
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
YUNET_PATH = os.path.join(MODELS_DIR, "yunet.onnx")
SFACE_PATH = os.path.join(MODELS_DIR, "sface.onnx")

# Initialize models globally
_detector = None
_recognizer = None

def _get_models():
    global _detector, _recognizer
    if _detector is None or _recognizer is None:
        if not os.path.exists(YUNET_PATH) or not os.path.exists(SFACE_PATH):
            logger.error(f"Models not found at {MODELS_DIR}. Please ensure yunet.onnx and sface.onnx are present.")
            raise FileNotFoundError("OpenCV Face models not found.")
        
        # YuNet for Detection
        # Instance size will be set dynamically during detection
        _detector = cv2.FaceDetectorYN.create(YUNET_PATH, "", (320, 320))
        
        # SFace for Recognition
        _recognizer = cv2.FaceRecognizerSF.create(SFACE_PATH, "")
        logger.info("OpenCV Face Models loaded successfully.")
    
    return _detector, _recognizer

def get_face_encoding(image_bytes):
    """
    Extracts 128-D face encoding using OpenCV SFace.
    Returns list of floats or None if no face found.
    """
    try:
        detector, recognizer = _get_models()
        
        # Decode image from bytes
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return None
            
        h, w, _ = img.shape
        detector.setInputSize((w, h))
        
        # Detect faces
        _, faces = detector.detect(img)
        
        if faces is not None and len(faces) > 0:
            # Use the most confident face
            face = faces[0]
            # Align and crop face
            aligned_face = recognizer.alignCrop(img, face)
            # Extract features (128-D vector)
            feature = recognizer.feature(aligned_face)
            return feature[0].tolist()
            
        return None
    except Exception as e:
        logger.error(f"Error extracting encoding with OpenCV: {e}")
        return None

def compare_faces(known_encodings, unknown_encoding, tolerance=0.363):
    """
    Compares using Cosine Similarity. 
    In SFace + FR_COSINE, higher is more similar.
    Threshold ~0.363 is recommended for SFace.
    """
    if not known_encodings or unknown_encoding is None:
        return False
    
    try:
        _, recognizer = _get_models()
        unknown_feat = np.array([unknown_encoding], dtype=np.float32)
        
        for known_enc in known_encodings:
            known_feat = np.array([known_enc], dtype=np.float32)
            # match returns a cosine similarity score
            score = recognizer.match(known_feat, unknown_feat, cv2.FR_COSINE)
            if score >= tolerance:
                return True
        return False
    except Exception as e:
        logger.error(f"Error in compare_faces: {e}")
        return False

def decode_base64_image(base64_string):
    """
    Decodes base64 string to bytes.
    """
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    return base64.b64decode(base64_string)

def get_face_position(image_bytes):
    """
    Estimates head pose (front, left, right, up) using YuNet landmarks.
    YuNet landmarks: 0:LE, 1:RE, 2:Nose, 3:ML, 4:MR
    """
    try:
        detector, _ = _get_models()
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"position": "unknown"}

        h, w, _ = img.shape
        detector.setInputSize((w, h))
        _, faces = detector.detect(img)
        
        if faces is None or len(faces) == 0:
            return {"position": "no_face", "distance": "none"}

        # First face
        face = faces[0]
        bbox = face[0:4].astype(int) # [x, y, w, h]
        landmarks = face[4:14].reshape((5, 2))
        
        # Distance Estimation
        face_height = bbox[3]
        height_ratio = face_height / h
        distance_status = "ok"
        if height_ratio < 0.25: distance_status = "too_far"
        elif height_ratio > 0.55: distance_status = "too_close"

        # Points
        left_eye = landmarks[0]
        right_eye = landmarks[1]
        nose = landmarks[2]
        
        # Horizontal ratio (Left-Right)
        dist_left = np.linalg.norm(nose - left_eye)
        dist_right = np.linalg.norm(nose - right_eye)
        ratio_lr = float(dist_left / dist_right) if dist_right != 0 else 1.0
        
        # Vertical info
        eye_y = float((left_eye[1] + right_eye[1]) / 2)
        nose_y = float(nose[1])
        dist_y = float(nose_y - eye_y)

        # Pose Thresholds (Tuned for YuNet)
        position = "front"
        if ratio_lr < 0.65: position = "left"
        elif ratio_lr > 1.55: position = "right"
        elif dist_y < (face_height * 0.15): position = "up"
        
        # Viz landmarks mapping for frontend
        viz_landmarks = {
            "left_eye": [left_eye.tolist()],
            "right_eye": [right_eye.tolist()],
            "nose": [nose.tolist()],
            "jaw": [] # YuNet doesn't provide jaw
        }

        return {
            "position": position,
            "ratio_lr": ratio_lr,
            "dist_y": dist_y,
            "distance": distance_status,
            "box": {"left": int(bbox[0]), "top": int(bbox[1]), "right": int(bbox[0]+bbox[2]), "bottom": int(bbox[1]+bbox[3])},
            "landmarks": viz_landmarks
        }
        
    except Exception as e:
        logger.error(f"Error estimating position: {e}")
        return {"position": "unknown"}
