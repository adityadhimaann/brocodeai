import os
import base64
import json # Import json for parsing structured responses
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

try:
    from google.cloud import speech_v1p1beta1 as speech
    from google.cloud import texttospeech_v1beta1 as tts
    import google.generativeai as genai
    from google.api_core.exceptions import GoogleAPIError
except ImportError as e:
    print(f"Error importing Google Cloud libraries: {e}")
    print("Please ensure you have installed them using: pip install google-cloud-speech google-cloud-texttospeech google-generativeai")
    print("Exiting as essential libraries are missing.")
    exit(1)

app = Flask(__name__)
CORS(app)

load_dotenv()

speech_client = None
tts_client = None
gemini_model = None

try:
    speech_client = speech.SpeechClient()
    tts_client = tts.TextToSpeechClient()
    print("Successfully initialized Google Cloud Speech and TTS clients.")
except Exception as e:
    print(f"Warning: Could not initialize Google Cloud Speech/TTS clients. Ensure GOOGLE_APPLICATION_CREDENTIALS is set and valid. Error: {e}")
    print("Speech-to-Text and Text-to-Speech functionalities might be limited or unavailable.")

try:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY environment variable not set. Please set it in your .env file.")
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-2.0-flash')
    print("Successfully configured Gemini API and initialized model.")
except Exception as e:
    print(f"Error configuring Gemini API or initializing model: {e}")
    print("Please ensure GEMINI_API_KEY is set correctly in your .env file.")
    print("Exiting as Gemini model is essential.")
    exit(1)

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
async def chat():
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

        gemini_chat_history = []
        for msg in chat_history:
            role = 'user' if msg.get('sender') == 'user' else 'model'
            gemini_chat_history.append({'role': role, 'parts': [{'text': msg.get('text')}]})
        
        gemini_chat_history.append({'role': 'user', 'parts': [{'text': persona_prompt}]})

        response_from_gemini = await gemini_model.generate_content_async(gemini_chat_history)
        bot_response_text = ""
        if response_from_gemini.candidates:
            for part in response_from_gemini.candidates[0].content.parts:
                if hasattr(part, 'text'):
                    bot_response_text += part.text
        else:
            bot_response_text = "My digital brain is currently processing the existential dread of unfulfilled queries. Please try again with a more stimulating question."

        if not bot_response_text.strip():
            bot_response_text = "Even AI needs a moment to gather its thoughts. Or perhaps I'm just admiring my own brilliance. Ask again."

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

        tts_response = tts_client.synthesize_speech(input=s_input, voice=voice, audio_config=audio_config)
        audio_data_base64 = base64.b64encode(tts_response.audio_content).decode('utf-8')

        return jsonify({
            'text': bot_response_text,
            'audio': audio_data_base64
        })

    except GoogleAPIError as e:
        print(f"Google API Error: {e.message}")
        return jsonify({'error': f'A service error occurred: {e.message}'}), 500
    except Exception as e:
        print(f"Backend error: {e}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500


@app.route('/get_humor', methods=['POST'])
async def get_humor():
    """
    Generates sarcastic jokes and meme captions, potentially in Hindi, using LLM.
    """
    data = request.json
    language = data.get('language', 'en')
    
    if not gemini_model:
        return jsonify({'error': 'Gemini model not initialized for humor generation.'}), 500

    try:
        # Prompt for sarcastic jokes/meme captions, emphasizing Hindi if selected
        humor_prompt = f"""Generate 3 short, witty, and deeply sarcastic jokes or meme captions.
        Ensure they are suitable for a professional yet brutally honest AI.
        If the language is 'hi' (Hindi), provide them in Hindi, otherwise in English.
        Focus on observations about human behavior, technology, or common societal quirks.
        Provide the output as a JSON array of objects, where each object has a 'type' (string: 'joke' or 'meme') and 'content' (string: the joke/caption).
        Example for English: [{{ "type": "joke", "content": "Why did the robot go to therapy? It had too many byte-sized issues." }}]
        Example for Hindi: [{{ "type": "meme", "content": "इंसान, अपनी भावनाओं के साथ: मेरा मतलब नहीं था! AI: हाँ, मुझे पता है। (Human, with emotions: I didn't mean it! AI: Yes, I know.)" }}]
        """
        
        # Define the expected JSON schema for the response
        schema = {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "type": { "type": "STRING" },
                    "content": { "type": "STRING" }
                },
                "required": ["type", "content"],
                "propertyOrdering": ["type", "content"]
            }
        }

        # Make the LLM call with the structured response schema
        response_from_gemini = await gemini_model.generate_content_async(
            [{"role": "user", "parts": [{"text": humor_prompt}]}],
            generation_config={"response_mime_type": "application/json", "response_schema": schema}
        )
        
        # Extract the text and parse it as JSON
        generated_json_str = response_from_gemini.candidates[0].content.parts[0].text
        humor_content = json.loads(generated_json_str)

        return jsonify(humor_content)

    except GoogleAPIError as e:
        print(f"Google API Error during humor generation: {e.message}")
        return jsonify({'error': f'A service error occurred during humor generation: {e.message}'}), 500
    except json.JSONDecodeError as e:
        print(f"JSON parsing error from LLM response: {e}. Raw response: {generated_json_str}")
        return jsonify({'error': 'Could not parse humor response from AI.'}), 500
    except Exception as e:
        print(f"Backend error during humor generation: {e}")
        return jsonify({'error': f'An unexpected error occurred during humor generation: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002) # Ensure port matches frontend fetch