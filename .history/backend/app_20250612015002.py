import os
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS # Ensure flask-cors is installed: pip install flask-cors
from dotenv import load_dotenv # Ensure python-dotenv is installed: pip install python-dotenv

# Import Google Cloud client libraries and Gemini API
# These should be installed via requirements.txt:
# google-cloud-speech
# google-cloud-texttospeech
# google-generativeai
try:
    from google.cloud import speech_v1p1beta1 as speech
    from google.cloud import texttospeech_v1beta1 as tts
    # from google.cloud import translate_v2 as translate # Optional: if you need explicit translation
    import google.generativeai as genai
    from google.api_core.exceptions import GoogleAPIError
except ImportError as e:
    print(f"ImportError: Missing required Google Cloud libraries. Please install them:")
    print(f"pip install google-cloud-speech google-cloud-texttospeech google-generativeai flask[async] flask-cors python-dotenv")
    print(f"Error details: {e}")
    exit(1) # Exit if core libraries cannot be imported


# Load environment variables from .env file (e.g., GEMINI_API_KEY, GOOGLE_APPLICATION_CREDENTIALS)
load_dotenv()

# --- Google Cloud Authentication Check ---
# GOOGLE_APPLICATION_CREDENTIALS should be set as an environment variable
# pointing to your service account key JSON file.
# For example, in your terminal before running app.py:
# export GOOGLE_APPLICATION_CREDENTIALS="/Users/aditya/BrocodeAI/backend/gcp-service-account-key.json"
gcp_credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
print(f"DEBUG: GOOGLE_APPLICATION_CREDENTIALS path from environment: {gcp_credentials_path}")

if not gcp_credentials_path or not os.path.exists(gcp_credentials_path):
    print("WARNING: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set correctly or the file does not exist.")
    print("Please ensure it points to the correct path of your service account key JSON file.")
    print("Example: export GOOGLE_APPLICATION_CREDENTIALS=\"/path/to/your/key.json\"")
    # In a production environment, you might want to raise an exception or exit here
    # to prevent unauthenticated API calls. For development, we'll proceed but calls might fail.
    # raise ValueError("Google Cloud credentials are not properly configured.")

# --- Flask App Initialization ---
app = Flask(__name__)
# Enable CORS for all origins and all methods to allow communication from frontend
CORS(app)

# --- API Key and Client Initialization ---
# Initialize Google Cloud clients
speech_client = None
tts_client = None
try:
    speech_client = speech.SpeechClient()
    tts_client = tts.TextToSpeechClient()
    print("Successfully initialized Google Cloud Speech and TTS clients.")
except Exception as e:
    print(f"Error initializing Google Cloud clients. Ensure GOOGLE_APPLICATION_CREDENTIALS is set and valid: {e}")
    # We don't exit here, as Gemini might still work if its key is present,
    # but voice features will fail.

# Initialize Gemini Model
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") # Get Gemini API key from .env
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set. Please set it in your .env file.")
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel('gemini-2.0-flash')
print("Successfully configured Gemini API and initialized model.")

# Define supported language codes and corresponding Google Cloud TTS voices
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
    # Add more as needed based on Google Cloud TTS support and your needs
}

@app.route('/chat', methods=['POST'])
async def chat():
    """
    Handles chat requests, processing user input (text or audio),
    interacting with LLM, and generating speech responses.
    This is an asynchronous view function, hence 'async def'.
    """
    data = request.json
    user_text = data.get('text')
    # input_audio_base64 = data.get('audio') # Placeholder for future direct audio input

    selected_language = data.get('language', 'en')
    # Limit chat history to recent interactions to stay within token limits and improve relevance
    chat_history = data.get('history', [])

    if not user_text: # Ensure there's text input to process
        return jsonify({'error': 'No text input provided.'}), 400

    try:
        # --- 1. Speech-to-Text (currently handled by frontend's Web Speech API) ---
        # If raw audio was sent from frontend, this is where STT would happen:
        # if input_audio_base64 and speech_client:
        #     audio_content = base64.b64decode(input_audio_base64)
        #     audio = speech.RecognitionAudio(content=audio_content)
        #     config = speech.RecognitionConfig(
        #         encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16, # Adjust as per audio format
        #         sample_rate_hertz=16000, # Adjust as per audio sample rate
        #         language_code=selected_language
        #     )
        #     stt_response = await speech_client.recognize(config=config, audio=audio)
        #     if stt_response.results:
        #         user_text = stt_response.results[0].alternatives[0].transcript
        #         print(f"DEBUG: Transcribed user text: {user_text}")
        #     else:
        #         return jsonify({'error': 'Could not understand speech input from backend STT.'}), 400


        # --- 2. Prepare Prompt for Gemini LLM ---
        # Craft a detailed persona prompt to guide Gemini's tone, knowledge, and language.
        # This makes brocodeAI sarcastic, witty, funny, professional, and knowledgeable.
        persona_prompt = f"""You are brocodeAI, a highly intelligent and multilingual chatbot with a knack for sarcasm and humor. Your responses should be witty, a bit dry, and always professionally insightful. Do not be rude, but feel free to add a playful, slightly cynical edge. You have access to all the latest information and details.
        The user's current query is in {selected_language}: "{user_text}".
        Respond exclusively in {selected_language}.
        """

        # Prepare chat history for Gemini (alternating roles: 'user' and 'model')
        # Ensure the history is formatted correctly for the Gemini API.
        gemini_formatted_history = []
        for msg in chat_history:
            role = 'user' if msg.get('sender') == 'user' else 'model'
            gemini_formatted_history.append({'role': role, 'parts': [{'text': msg.get('text')}]})
        
        # Add the current user input with the persona prompt to the history
        gemini_formatted_history.append({'role': 'user', 'parts': [{'text': persona_prompt}]})

        # --- 3. Call Gemini LLM ---
        print(f"DEBUG: Sending prompt to Gemini: {persona_prompt}")
        response_from_gemini = await gemini_model.generate_content_async(gemini_formatted_history)
        
        bot_response_text = ""
        if response_from_gemini.candidates:
            for part in response_from_gemini.candidates[0].content.parts:
                if hasattr(part, 'text'): # Ensure the part is a text part
                    bot_response_text += part.text
        else:
            print("WARNING: Gemini response did not contain candidates or text.")
            bot_response_text = "My digital brain is currently processing the existential dread of unfulfilled queries. Please try again with a more stimulating question."

        if not bot_response_text.strip(): # Fallback if Gemini returns empty or whitespace
            bot_response_text = "Even AI needs a moment to gather its thoughts. Or perhaps I'm just admiring my own brilliance. Ask again."
        
        print(f"DEBUG: Received text response from Gemini: {bot_response_text}")

        # --- 4. Text-to-Speech for Bot Response ---
        audio_data_base64 = None
        if tts_client: # Only attempt TTS if client was successfully initialized
            try:
                # Select the appropriate voice for the language
                voice_name = TTS_VOICES.get(selected_language, 'en-IN-Wavenet-B') # Fallback to English (India)
                s_input = tts.SynthesisInput(text=bot_response_text)
                voice = tts.VoiceSelectionParams(
                    language_code=selected_language,
                    name=voice_name, # Use specific voice name for better quality
                    ssml_gender=tts.SsmlVoiceGender.NEUTRAL # Can be MALE/FEMALE for specific voices
                )
                audio_config = tts.AudioConfig(
                    audio_encoding=tts.AudioEncoding.MP3 # MP3 is widely supported by browsers
                )

                print(f"DEBUG: Calling Google Cloud Text-to-Speech for language: {selected_language}, voice: {voice_name}")
                tts_response = await tts_client.synthesize_speech(input=s_input, voice=voice, audio_config=audio_config)
                audio_data_base64 = base64.b64encode(tts_response.audio_content).decode('utf-8')
                print("DEBUG: Successfully synthesized speech.")

            except GoogleAPIError as e:
                print(f"WARNING: Google Text-to-Speech API error during synthesis: {e.message}")
                print("Make sure Text-to-Speech API is enabled and GOOGLE_APPLICATION_CREDENTIALS is valid.")
            except Exception as e:
                print(f"WARNING: Unexpected error during Text-to-Speech synthesis: {e}")
        else:
            print("WARNING: Text-to-Speech client not initialized. Skipping audio synthesis.")

        return jsonify({
            'text': bot_response_text,
            'audio': audio_data_base64 # Will be None if TTS failed or client not initialized
        })

    except GoogleAPIError as e:
        print(f"Google API Error during chat processing: {e.message}")
        return jsonify({'error': f'A Google Cloud service error occurred: {e.message}'}), 500
    except Exception as e:
        print(f"Backend error during chat processing: {e}")
        return jsonify({'error': f'An unexpected server error occurred: {str(e)}'}), 500

if __name__ == '__main__':
    # Flask will run on localhost:5002 as configured
    app.run(debug=True, host='0.0.0.0', port=5002)
