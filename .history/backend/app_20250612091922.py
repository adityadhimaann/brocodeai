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

# Define supported language codes and corresponding Google Cloud TTS voices
# Added 'hinglish' as a custom code. For TTS, we'll map it to Hindi or English,
# as a dedicated Hinglish voice might not be available, but the LLM will provide Hinglish text.
TTS_VOICES = {
    'en': 'en-IN-Wavenet-B', # English (India, Male)
    'hi': 'hi-IN-Wavenet-B', # Hindi (India, Male)
    'hinglish': 'hi-IN-Wavenet-B', # Map Hinglish to Hindi voice for TTS
    'bn': 'bn-IN-Wavenet-C', # Bengali (India, Female)
    'ta': 'ta-IN-Wavenet-D', # Tamil (India, Female)
    'te': 'te-IN-Wavenet-C', # Telugu (India, Female)
    'mr': 'mr-IN-Wavenet-B', # Marathi (India, Male)
    'gu': 'gu-IN-Wavenet-C', # Gujarati (India, Female)
    'kn': 'kn-IN-Wavenet-B', # Kannada (India, Male)
    'ml': 'ml-IN-Wavenet-C', # Malayalam (India, Female)
    'pa': 'pa-IN-Wavenet-C', # Punjabi (India, Female)
    'ur': 'ur-IN-Wavenet-C', # Urdu (India, Female)
}

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_text = data.get('text')
    selected_language = data.get('language', 'en')
    chat_history = data.get('history', [])

    if not user_text:
        return jsonify({'error': 'No text input provided.'}), 400

    if not gemini_model or not tts_client:
        return jsonify({'error': 'Core AI services not initialized. Check backend logs.'}), 500

    try:
        # Adjust persona prompt for Hinglish if selected
        if selected_language == 'hinglish':
            lang_instruction = "Respond exclusively in natural, code-mixed Hinglish (mix of Hindi and English, written in Roman script)."
        else:
            lang_instruction = f"Respond exclusively in {selected_language}."

        persona_prompt = f"""You are brocodeAI, a highly intelligent and multilingual chatbot with a knack for sarcasm and humor. Your responses should be witty, a bit dry, and always professionally insightful. Do not be rude, but feel free to add a playful, slightly cynical edge. You have access to all the latest information and details.
        The user's current query: "{user_text}".
        {lang_instruction}
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
                # For Hinglish, use the Hindi voice, as it's the closest phonetic match
                tts_lang_code = 'hi' if selected_language == 'hinglish' else selected_language
                voice_name = TTS_VOICES.get(selected_language, 'en-IN-Wavenet-B') # Use selected_language for direct lookup, fallback to en-IN
                if voice_name == 'hi-IN-Wavenet-B' and tts_lang_code != 'hi':
                    # If Hinglish is selected, explicitly set lang_code for TTS to Hindi
                    # so that it uses a Hindi voice but still attempts to pronounce Roman Hinglish
                    tts_lang_code = 'hi'


                s_input = tts.SynthesisInput(text=bot_response_text)
                voice = tts.VoiceSelectionParams(
                    language_code=tts_lang_code, # Use determined TTS language code
                    name=voice_name,
                    ssml_gender=tts.SsmlVoiceGender.NEUTRAL
                )
                audio_config = tts.AudioConfig(
                    audio_encoding=tts.AudioEncoding.MP3
                )

                print(f"DEBUG: Calling Google Cloud Text-to-Speech for language: {tts_lang_code}, voice: {voice_name}")
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
    Generates sarcastic jokes and meme captions, potentially in Hinglish/Hindi, using LLM.
    """
    data = request.json
    language = data.get('language', 'en')
    
    if not gemini_model:
        return jsonify({'error': 'Gemini model not initialized for humor generation.'}), 500

    try:
        # Adjust humor prompt for Hinglish
        if language == 'hinglish':
            humor_lang_instruction = "Generate in natural, code-mixed Hinglish (mix of Hindi and English, written in Roman script). Make sure the content is relatable to Indian youth and internet culture."
        elif language == 'hi':
            humor_lang_instruction = "Generate in Hindi (Devanagari script)."
        else:
            humor_lang_instruction = "Generate in English."

        humor_prompt = f"""Generate 30 short, witty, and deeply sarcastic jokes or meme captions relevant to modern life, technology, or human absurdity.
        Ensure they are suitable for a professional yet brutally honest AI.
        {humor_lang_instruction}
        Provide the output as a JSON array of objects, where each object has a a 'type' (string: 'joke' or 'meme') and 'content' (string: the joke/caption).
        Example for English: [{{ "type": "joke", "content": "Why did the robot go to therapy? It had too many byte-sized issues." }}]
        Example for Hinglish: [{{ "type": "meme", "content": "Jab WiFi slow ho toh samajh jao, tumhari life bhi uski tarah chal rahi hai. (When WiFi is slow, understand that your life is moving just like it.)" }}]
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