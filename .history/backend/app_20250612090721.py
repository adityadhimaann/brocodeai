import os
import base64
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

try:
    from google.cloud import speech_v1p1beta1 as speech
    from google.cloud import texttospeech_v1beta1 as tts
    import google.generativeai as genai
    from google.api_core.exceptions import GoogleAPIError
except ImportError as e:
    print(f"ImportError: Missing required Google Cloud libraries. Please install them:")
    print(f"pip install google-cloud-speech google-cloud-texttospeech google-generativeai flask flask-cors python-dotenv")
    print(f"Error details: {e}")
    exit(1)


load_dotenv()

gcp_credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
print(f"DEBUG: GOOGLE_APPLICATION_CREDENTIALS path from environment: {gcp_credentials_path}")

if not gcp_credentials_path or not os.path.exists(gcp_credentials_path):
    print("WARNING: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set correctly or the file does not exist.")
    print("Please ensure it points to the correct path of your service account key JSON file.")
    print("Example: export GOOGLE_APPLICATION_CREDENTIALS=\"/path/to/your/key.json\"")


app = Flask(__name__)
CORS(app)

speech_client = None
tts_client = None
try:
    speech_client = speech.SpeechClient()
    tts_client = tts.TextToSpeechClient()
    print("Successfully initialized Google Cloud Speech and TTS clients.")
except Exception as e:
    print(f"Error initializing Google Cloud clients. Ensure GOOGLE_APPLICATION_CREDENTIALS is set and valid: {e}")


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set. Please set it in your .env file.")
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel('gemini-2.0-flash')
print("Successfully configured Gemini API and initialized model.")

TTS_VOICES = {
    'en': 'en-IN-Wavenet-B',
    'hi': 'hi-IN-Wavenet-B',
    'bn': 'bn-IN-Wavenet-C',
    'ta': 'ta-IN-Wavenet-D',
    'te': 'te-IN-Wavenet-C',
    'mr': 'mr-IN-Wavenet-B',
    'gu': 'gu-IN-Wavenet-C',
    'kn': 'kn-IN-Wavenet-B',
    'ml': 'ml-IN-Wavenet-C',
    'pa': 'pa-IN-Wavenet-C',
    'ur': 'ur-IN-Wavenet-C',
}

@app.route('/chat', methods=['POST'])
def chat():
    """
    Handles chat requests, processing user input, interacting with LLM,
    and generating speech responses. This is a synchronous view function.
    """
    data = request.json
    user_text = data.get('text')
    selected_language = data.get('language', 'en')
    chat_history = data.get('history', [])

    if not user_text:
        return jsonify({'error': 'No text input provided.'}), 400

    if not gemini_model or not tts_client:
        return jsonify({'error': 'Core AI services not initialized. Check backend logs.'}), 500

    try:
        persona_prompt = f"""You are brocodeAI, a highly intelligent and multilingual chatbot with a knack for sarcasm and humor. Your responses should be witty, a bit dry, and always professionally insightful. Do not be rude, but feel free to add a playful, slightly cynical edge. You have access to all the latest information and details.
        The user's current query is in {selected_language}: "{user_text}".
        Respond exclusively in {selected_language}.
        """

        gemini_formatted_history = []
        for msg in chat_history:
            role = 'user' if msg.get('sender') == 'user' else 'model'
            gemini_formatted_history.append({'role': role, 'parts': [{'text': msg.get('text')}]})
        
        gemini_formatted_history.append({'role': 'user', 'parts': [{'text': persona_prompt}]})

        print(f"DEBUG: Sending prompt to Gemini: {persona_prompt}")
        response_from_gemini = gemini_model.generate_content(gemini_formatted_history)
        
        bot_response_text = ""
        if response_from_gemini.candidates:
            for part in response_from_gemini.candidates[0].content.parts:
                if hasattr(part, 'text'):
                    bot_response_text += part.text
        else:
            print("WARNING: Gemini response did not contain candidates or text.")
            bot_response_text = "My digital brain is currently processing the existential dread of unfulfilled queries. Please try again with a more stimulating question."

        if not bot_response_text.strip():
            bot_response_text = "Even AI needs a moment to gather its thoughts. Or perhaps I'm just admiring my own brilliance. Ask again."
        
        print(f"DEBUG: Received text response from Gemini: {bot_response_text}")

        audio_data_base64 = None
        if tts_client:
            try:
                voice_name = TTS_VOICES.get(selected_language, 'en-IN-Wavenet-B')
                s_input = tts.SynthesisInput(text=bot_response_text)
                voice = tts.VoiceSelectionParams(
                    language_code=selected_language,
                    name=voice_name,
                    ssml_gender=tts.SsmlVoiceGender.NEUTRAL
                )
                audio_config = tts.AudioConfig(
                    audio_encoding=tts.AudioEncoding.MP3
                )

                print(f"DEBUG: Calling Google Cloud Text-to-Speech for language: {selected_language}, voice: {voice_name}")
                tts_response = tts_client.synthesize_speech(input=s_input, voice=voice, audio_config=audio_config)
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
            'audio': audio_data_base64
        })

    except GoogleAPIError as e:
        print(f"Google API Error during chat processing: {e.message}")
        return jsonify({'error': f'A Google Cloud service error occurred: {e.message}'}), 500
    except Exception as e:
        print(f"Backend error during chat processing: {e}")
        return jsonify({'error': f'An unexpected server error occurred: {str(e)}'}), 500


@app.route('/get_humor', methods=['POST'])
def get_humor():
    """
    Generates sarcastic jokes and meme captions, potentially in Hindi, using LLM.
    This is a synchronous view function.
    """
    data = request.json
    language = data.get('language', 'en')
    
    if not gemini_model:
        return jsonify({'error': 'Gemini model not initialized for humor generation.'}), 500

    try:
        humor_prompt = f"""Generate 3 short, witty, and deeply sarcastic jokes or meme captions relevant to modern life or technology.
        Ensure they are suitable for a professional yet brutally honest AI.
        If the language is 'hi' (Hindi), provide them in Hindi. For other languages, provide in English.
        Provide the output as a JSON array of objects, where each object has a 'type' (string: 'joke' or 'meme') and 'content' (string: the joke/caption).
        Example for English: [{{ "type": "joke", "content": "Why did the robot go to therapy? It had too many byte-sized issues." }}]
        Example for Hindi: [{{ "type": "meme", "content": "इंसान, अपनी भावनाओं के साथ: मेरा मतलब नहीं था! AI: हाँ, मुझे पता है। (Human, with emotions: I didn't mean it! AI: Yes, I know.)" }}]
        """
        
        schema = {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "type": { "type": "STRING" },
                    "content": { "type": "STRING" }
                },
                "required": ["type", "content"]
                # Removed 'propertyOrdering' field here
            }
        }

        response_from_gemini = gemini_model.generate_content(
            [{"role": "user", "parts": [{"text": humor_prompt}]}],
            generation_config={"response_mime_type": "application/json", "response_schema": schema}
        )
        
        generated_json_str = response_from_gemini.candidates[0].content.parts[0].text
        humor_content = json.loads(generated_json_str)

        return jsonify(humor_content)

    except GoogleAPIError as e:
        print(f"Google API Error during humor generation: {e.message}")
        return jsonify({'error': f'A service error occurred during humor generation: {e.message}'}), 500
    except json.JSONDecodeError as e:
        print(f"JSON parsing error from LLM response: {e}. Raw response: {generated_json_str}")
        return jsonify({'error': 'Could not parse humor response from AI. Please check LLM output format.'}), 500
    except Exception as e:
        print(f"Backend error during humor generation: {e}")
        return jsonify({'error': f'An unexpected server error occurred during humor generation: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)