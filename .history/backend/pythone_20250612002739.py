import os
from google.cloud import speech_v1p1beta1 as speech
from google.cloud import texttospeech_v1beta1 as tts
from google.api_core.exceptions import GoogleAPIError

def test_gcp_clients():
    try:
        print("Attempting to initialize SpeechClient...")
        speech_client = speech.SpeechClient()
        print("SpeechClient initialized successfully!")

        print("Attempting to initialize TextToSpeechClient...")
        tts_client = tts.TextToSpeechClient()
        print("TextToSpeechClient initialized successfully!")

        print("\nGoogle Cloud authentication appears to be set up correctly.")
    except GoogleAPIError as e:
        print(f"\nERROR: Failed to initialize Google Cloud clients. A Google API error occurred: {e.message}")
        print("Please check your GOOGLE_APPLICATION_CREDENTIALS path and ensure APIs are enabled.")
    except Exception as e:
        print(f"\nERROR: An unexpected error occurred: {e}")
        print("Please ensure GOOGLE_APPLICATION_CREDENTIALS is set and the JSON file is valid.")

if __name__ == '__main__':
    # Print the value of the environment variable (for debugging)
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if credentials_path:
        print(f"GOOGLE_APPLICATION_CREDENTIALS is set to: {credentials_path}")
        if not os.path.exists(credentials_path):
            print(f"WARNING: The file at {credentials_path} does not exist.")
    else:
        print("GOOGLE_APPLICATION_CREDENTIALS environment variable is NOT set.")
        print("Please set it before running this script.")
        exit()

    test_gcp_clients()