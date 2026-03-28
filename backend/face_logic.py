import face_recognition
import numpy as np
import base64
import io
from PIL import Image
import json

def get_face_encoding(image_bytes):
    """
    Extracts 128-D face encoding from image bytes.
    Returns list of floats or None if no face found.
    """
    try:
        image = face_recognition.load_image_file(io.BytesIO(image_bytes))
        encodings = face_recognition.face_encodings(image)
        if len(encodings) > 0:
            return encodings[0].tolist()
        return None
    except Exception as e:
        print(f"Error extracting encoding: {e}")
        return None

def compare_faces(known_encodings, unknown_encoding, tolerance=0.6):
    """
    Compares an unknown encoding against a list of known encodings.
    """
    if not known_encodings or unknown_encoding is None:
        return False
    
    matches = face_recognition.compare_faces(known_encodings, np.array(unknown_encoding), tolerance=tolerance)
    return any(matches)

def decode_base64_image(base64_string):
    """
    Decodes base64 string to bytes.
    """
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    return base64.b64decode(base64_string)

def get_face_position(image_bytes):
    """
    Estimates head pose (front, left, right, up) and distance using landmarks.
    Returns a dictionary with position, raw metrics, and distance status.
    """
    try:
        # Load image once
        img_io = io.BytesIO(image_bytes)
        image = face_recognition.load_image_file(img_io)
        
        # Get face locations to calculate size/distance
        face_locations = face_recognition.face_locations(image)
        if not face_locations:
            return {"position": "no_face", "ratio_lr": 1.0, "dist_y": 0, "distance": "none"}
            
        # Use the first face found
        top, right, bottom, left = face_locations[0]
        face_height = bottom - top
        img_height = image.shape[0]
        
        # Estimate distance status
        # Ideal face height is 40-60% of image height
        height_ratio = face_height / img_height
        distance_status = "ok"
        if height_ratio < 0.35: distance_status = "too_far"
        elif height_ratio > 0.65: distance_status = "too_close"

        face_landmarks_list = face_recognition.face_landmarks(image, face_locations=[face_locations[0]])
        if not face_landmarks_list:
            return {"position": "no_face", "ratio_lr": 1.0, "dist_y": 0, "distance": distance_status}
            
        landmarks = face_landmarks_list[0]
        
        # Points for eyes and nose
        left_eye = np.mean(landmarks['left_eye'], axis=0)
        right_eye = np.mean(landmarks['right_eye'], axis=0)
        nose_tip = landmarks['nose_tip'][2] # Tip of the nose
        
        # Horizontal ratio (Left-Right)
        dist_left = np.linalg.norm(nose_tip - left_eye)
        dist_right = np.linalg.norm(nose_tip - right_eye)
        ratio_lr = float(dist_left / dist_right) if dist_right != 0 else 1.0
        
        # Vertical ratio (Up-Down)
        eye_y = float((left_eye[1] + right_eye[1]) / 2)
        nose_y = float(nose_tip[1])
        dist_y = float(nose_y - eye_y)

        # Extract landmarks for visualization
        # We'll send a subset for the "vectors" drawing
        viz_landmarks = {
            "left_eye": landmarks["left_eye"],
            "right_eye": landmarks["right_eye"],
            "left_pupil": [np.mean(landmarks["left_eye"], axis=0).tolist()],
            "right_pupil": [np.mean(landmarks["right_eye"], axis=0).tolist()],
            "nose": landmarks["nose_bridge"] + landmarks["nose_tip"],
            "jaw": landmarks["chin"]
        }
        
        # Thresholds (Tuned by convention) - Swapped for mirrored webcam
        position = "front"
        if ratio_lr < 0.8: position = "left"   
        elif ratio_lr > 1.25: position = "right" 
        elif dist_y < 42: position = "up" # Relaxed to 42 based on live debug findings
        
        # Debug log for precision issues
        print(f"Pose Debug: ratio_lr={ratio_lr:.2f}, dist_y={dist_y:.2f}, pos={position}")

        return {
            "position": position,
            "ratio_lr": ratio_lr,
            "dist_y": dist_y,
            "distance": distance_status,
            "box": {"top": top, "right": right, "bottom": bottom, "left": left},
            "landmarks": viz_landmarks
        }
        
    except Exception as e:
        print(f"Error estimating position: {e}")
        return {"position": "unknown", "ratio_lr": 1.0, "dist_y": 0, "distance": "unknown"}
