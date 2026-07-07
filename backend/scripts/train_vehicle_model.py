
import pandas as pd
import cv2
import os
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from keras.models import Sequential
from keras.layers import Input, Conv2D, MaxPooling2D, Flatten, Dense, Dropout
from keras.utils import to_categorical
from keras.preprocessing.image import img_to_array
from keras.callbacks import EarlyStopping

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DATASET_DIR = os.path.join(BACKEND_DIR, 'data', 'vehicles')
MODEL_DIR = os.path.join(BACKEND_DIR, 'ml_models')
MODEL_PATH = os.path.join(MODEL_DIR, 'vehicle_model.h5')
ENCODER_PATH = os.path.join(MODEL_DIR, 'label_encoder.pkl')

def generate_synthetic_data():
    """Generate a small synthetic image dataset for testing/mock training if not present."""
    print("No dataset found. Generating synthetic training images...")
    os.makedirs(DATASET_DIR, exist_ok=True)
    classes = ["sedan", "suv", "truck"]
    for cls in classes:
        class_path = os.path.join(DATASET_DIR, cls)
        os.makedirs(class_path, exist_ok=True)
        for i in range(25):  # 25 images per class
            # Create a random image of size 128x128x3
            img = np.random.randint(0, 255, (128, 128, 3), dtype=np.uint8)
            # Add some shapes and text
            cv2.circle(img, (64, 64), 30, (0, 255, 0), -1)
            cv2.putText(img, cls, (20, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            img_path = os.path.join(class_path, f"synth_{i}.jpg")
            cv2.imwrite(img_path, img)
    print("Synthetic dataset generated successfully.")

def load_dataset():
    """Load images from folders. Generates synthetic data if dataset doesn't exist."""
    if not os.path.exists(DATASET_DIR) or len(os.listdir(DATASET_DIR)) == 0:
        generate_synthetic_data()

    print("Loading dataset...")
    images = []
    labels = []
    
    for class_name in os.listdir(DATASET_DIR):
        class_dir = os.path.join(DATASET_DIR, class_name)
        if os.path.isdir(class_dir):
            print(f"Loading class: {class_name}")
            for filename in os.listdir(class_dir):
                if filename.endswith(('.jpg', '.png', '.jpeg')):
                    img_path = os.path.join(class_dir, filename)
                    img = cv2.imread(img_path)
                    if img is not None:
                        img = cv2.resize(img, (128, 128))
                        img = img_to_array(img)
                        images.append(img)
                        labels.append(class_name)
    
    return np.array(images), labels

def build_model(input_shape, num_classes):
    """Build a simple CNN model."""
    model = Sequential([
        Input(shape=input_shape),
        Conv2D(32, (3, 3), activation='relu'),
        MaxPooling2D((2, 2)),
        Conv2D(64, (3, 3), activation='relu'),
        MaxPooling2D((2, 2)),
        Conv2D(128, (3, 3), activation='relu'),
        MaxPooling2D((2, 2)),
        Flatten(),
        Dense(512, activation='relu'),
        Dropout(0.5),
        Dense(num_classes, activation='softmax')
    ])
    
    model.compile(optimizer='adam', 
                  loss='categorical_crossentropy', 
                  metrics=['accuracy'])
    return model

def main():
    # Load data
    images, labels = load_dataset()
    
    if len(images) == 0:
        print("No images found. Please check dataset path.")
        return
        
    print(f"Loaded {len(images)} images.")
    
    # Preprocess
    X = np.array(images, dtype='float32') / 255.0
    le = LabelEncoder()
    y = le.fit_transform(labels)
    y = to_categorical(y)
    
    print(f"Classes: {list(le.classes_)}")
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Build model
    input_shape = X_train.shape[1:]
    num_classes = len(le.classes_)
    model = build_model(input_shape, num_classes)
    
    # Train
    print("Training model...")
    early_stopping = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
    history = model.fit(X_train, y_train, 
                        epochs=50, 
                        batch_size=32, 
                        validation_split=0.1,
                        callbacks=[early_stopping])
    
    # Evaluate
    loss, accuracy = model.evaluate(X_test, y_test, verbose=0)
    print(f"Test Accuracy: {accuracy:.4f}")
    
    # Ensure model directory exists
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    # Save model
    model.save(MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")
    
    # Save label encoder
    import pickle
    with open(ENCODER_PATH, 'wb') as f:
        pickle.dump(le, f)
    print(f"Label encoder saved to {ENCODER_PATH}")


if __name__ == "__main__":
    main()
