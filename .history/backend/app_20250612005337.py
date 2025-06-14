import os
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv # To load environment variables from .env file

# --- Import Google Cloud client libraries ---
# Ensure these are installed: pip install google-cloud-speech google-cloud-texttospeech google-generativeai
try:
    from google.cloud import speech_v1p1beta1 as speech
    from google.cloud import texttospeech_v1beta1 as tts
    # from google.cloud import translate_v2 as translate # Optional, if Gemini alone isn't sufficient for translation
    import google.generativeai as genai
    from google.api_core.exceptions import GoogleAPIError
    print("Successfully imported Google Cloud client libraries.")
except ImportError as e:
    print(f"Error importing Google Cloud libraries: {e}")
    print("Please ensure you have installed them using: pip install google-cloud-speech google-cloud-texttospeech google-generativeai")
    print("Exiting as essential libraries are missing.")
    exit(1) # Exit if essential libraries cannot be imported


app = Flask(__name__)
CORS(app) # Enable CORS for frontend communication

# --- API Key and Client Initialization ---
# Load environment variables from .env file
load_dotenv()

# IMPORTANT: Never hardcode API keys in your code. Use environment variables.
# For Google Cloud APIs, it's recommended to use Service Account credentials
# set via GOOGLE_APPLICATION_CREDENTIALS environment variable.
# For Gemini API, you can use a separate API key.

speech_client = None
tts_client = None
gemini_model = None

try:
    # Initialize Google Cloud Speech and TTS clients
    # Requires GOOGLE_APPLICATION_CREDENTIALS to be set.
    speech_client = speech.SpeechClient()
    tts_client = tts.TextToSpeechClient()
    print("Successfully initialized Google Cloud Speech and TTS clients.")
except Exception as e:
    print(f"Warning: Could not initialize Google Cloud Speech/TTS clients. Ensure GOOGLE_APPLICATION_CREDENTIALS is set and valid. Error: {e}")
    print("Speech-to-Text and Text-to-Speech functionalities might be limited or unavailable.")


try:
    # Initialize Gemini Model
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") # Get Gemini API key from .env
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY environment variable not set. Please set it in your .env file.")
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-2.0-flash')
    print("Successfully configured Gemini API and initialized model.")
except Exception as e:
    print(f"Error configuring Gemini API or initializing model: {e}")
    print("Please ensure GEMINI_API_KEY is set correctly in your .env file.")
    print("Exiting as Gemini model is essential.")
    exit(1) # Exit if Gemini model cannot be initialized


# Define supported language codes for Google Cloud TTS (example subset for Indian languages)
# You can find the full list at: https://cloud.google.com/text-to-speech/docs/voices
TTS_VOICES = {
    'en': 'en-IN-Wavenet-B', # English (India, Male)
    'hi': 'hi-IN-Wavenet-B', # Hindi (India, Male)
    'bn': 'bn-IN-Wavenet-C', # Bengali (India, Female)
    'ta': 'ta-IN-Wavenet-D', # Tamil (India, Female)
    'te': 'te-IN-Wavenet-C', # Telugu (India, Female)
    'mr': 'mr-IN-Wavenet-B', # Marathi (India, Male)
    'gu': 'gu-IN-Wavenet-C', # Gujarati (India, Female)
    'kn': 'kn-IN-Wavenet-B', # Kannada (India, Male)
    'ml': 'ml-IN-Wavenet-C', # Malayalam (India, Female)
    'pa': 'pa-IN-Wavenet-C', # Punjabi (India, Female)
    'ur': 'ur-IN-Wavenet-C', # Urdu (India, Female)
    # Add more as needed
}

@app.route('/chat', methods=['POST'])
async def chat():
    """
    Handles chat requests, processing user input (text or audio),
    interacting with LLM, and generating speech responses.
    """
    data = request.json
    user_text = data.get('text')
    input_audio_base64 = data.get('audio') # Not used in current frontend, but for future STT integration
    selected_language = data.get('language', 'en')
    chat_history = data.get('history', []) # To maintain conversation context

    if not user_text and not input_audio_base64:
        return jsonify({'error': 'No text or audio input provided.'}), 400

    # Ensure clients are initialized before proceeding
    if not gemini_model:
        return jsonify({'error': 'Gemini model not initialized. Check backend logs.'}), 500
    if not tts_client:
        return jsonify({'error': 'Text-to-Speech client not initialized. Check backend logs.'}), 500
    # speech_client is optional for this specific setup if frontend handles STT


    try:
        # --- 1. Speech-to-Text (Conceptual for future expansion) ---
        # If the frontend were sending recorded audio, this section would
        # use Google Cloud Speech-to-Text to transcribe it.
        # For now, the frontend uses browser's SpeechRecognition.
        # if input_audio_base64 and speech_client:
        #     audio_content = base64.b64decode(input_audio_base64)
        #     audio = speech.RecognitionAudio(content=audio_content)
        #     config = speech.RecognitionConfig(
        #         encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16, # Example, adjust based on actual audio format
        #         sample_rate_hertz=16000, # Example
        #         language_code=selected_language
        #     )
        #     stt_response = speech_client.recognize(config=config, audio=audio)
        #     if stt_response.results:
        #         user_text = stt_response.results[0].alternatives[0].transcript
        #     else:
        #         return jsonify({'error': 'Could not understand speech input.'}), 400


        # --- 2. Prepare Prompt for Gemini LLM ---
        # Craft a detailed persona prompt to guide Gemini's tone and knowledge.
        # Include instructions for sarcasm, humor, professionalism, and latest details.
        persona_prompt = f"""You are brocodeAI, a highly intelligent and multilingual chatbot with a knack for sarcasm and humor. Your responses should be witty, a bit dry, and always professionally insightful. Do not be rude, but feel free to add a playful, slightly cynical edge. You have access to all the latest information and details.
        The user's current query is in {selected_language}: "{user_text}".
        Respond exclusively in {selected_language}.
        """

        # Prepare chat history for Gemini (alternating roles: 'user' and 'model')
        # Ensure the history is formatted correctly for the Gemini API.
        gemini_chat_history = []
        for msg in chat_history:
            # The 'text' field should be explicitly a 'parts' list item
            role = 'user' if msg.get('sender') == 'user' else 'model'
            gemini_chat_history.append({'role': role, 'parts': [{'text': msg.get('text')}]})

        # Add the current user input with the persona prompt
        gemini_chat_history.append({'role': 'user', 'parts': [{'text': persona_prompt}]})

        # --- 3. Call Gemini LLM ---
        response_from_gemini = await gemini_model.generate_content_async(gemini_chat_history)
        bot_response_text = ""
        if response_from_gemini.candidates:
            for part in response_from_gemini.candidates[0].content.parts:
                if hasattr(part, 'text'): # Ensure the part is a text part
                    bot_response_text += part.text
        else:
            print("Gemini response did not contain candidates or text.")
            bot_response_text = "My digital brain is currently processing the existential dread of unfulfilled queries. Please try again with a more stimulating question."

        if not bot_response_text.strip(): # Fallback if Gemini returns empty
            bot_response_text = "Even AI needs a moment to gather its thoughts. Or perhaps I'm just admiring my own brilliance. Ask again."


        # --- 4. Text-to-Speech for Bot Response ---
        # Select the appropriate voice for the language
        voice_name = TTS_VOICES.get(selected_language, 'en-IN-Wavenet-B') # Fallback to English if language not found
        s_input = tts.SynthesisInput(text=bot_response_text)
        voice = tts.VoiceSelectionParams(
            language_code=selected_language,
            name=voice_name, # Use specific voice name
            ssml_gender=tts.SsmlVoiceGender.NEUTRAL # Can be MALE/FEMALE for specific voices
        )
        audio_config = tts.AudioConfig(
            audio_encoding=tts.AudioEncoding.MP3 # MP3 is common and supported by browsers
        )

        tts_response = tts_client.synthesize_speech(input=s_input, voice=voice, audio_config=audio_config)
        audio_data_base64 = base64.b64encode(tts_response.audio_content).decode('utf-8')

        return jsonify({
            'text': bot_response_text,
            'audio': audio_data_base64 # Send audio as base64
        })

    except GoogleAPIError as e:
        print(f"Google API Error: {e.message}")
        return jsonify({'error': f'A service error occurred: {e.message}'}), 500
    except Exception as e:
        print(f"Backend error: {e}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) # Run on port 5000
