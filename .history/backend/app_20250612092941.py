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
# Using gemini-1.5-flash for potentially better creative text generation for memes, though gemini-2.0-flash is also good.
# Adjust model name if needed, check your project's available models.
gemini_model = genai.GenerativeModel('gemini-1.5-flash') # Using 1.5-flash for potential creativity
print("Successfully configured Gemini API and initialized model.")

# Image generation model for memes
IMAGE_GEN_MODEL_ID = "imagen-3.0-generate-002"
# Set up a direct client for image generation if needed (usually done with Vertex AI SDK)
# For simplicity, we'll construct the fetch URL directly in the `generate_brocode_meme` endpoint
# and assume an API key will be provided if needed for that specific model.


TTS_VOICES = {
    'en': 'en-IN-Wavenet-B',
    'hi': 'hi-IN-Wavenet-B',
    'hinglish': 'hi-IN-Wavenet-B', # Map Hinglish to Hindi voice for TTS
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
    data = request.json
    user_text = data.get('text')
    selected_language = data.get('language', 'en')
    chat_history = data.get('history', [])

    if not user_text:
        return jsonify({'error': 'No text input provided.'}), 400

    if not gemini_model or not tts_client:
        return jsonify({'error': 'Core AI services not initialized. Check backend logs.'}), 500

    try:
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

        print(f"DEBUG: Sending prompt to Gemini (chat): {persona_prompt}")
        response_from_gemini = gemini_model.generate_content(gemini_formatted_history)
        
        bot_response_text = ""
        if response_from_gemini.candidates:
            for part in response_from_gemini.candidates[0].content.parts:
                if hasattr(part, 'text'):
                    bot_response_text += part.text
        else:
            print("WARNING: Gemini chat response did not contain candidates or text.")
            bot_response_text = "My digital brain is currently processing the existential dread of unfulfilled queries. Please try again with a more stimulating question."

        if not bot_response_text.strip():
            bot_response_text = "Even AI needs a moment to gather its thoughts. Or perhaps I'm just admiring my own brilliance. Ask again."
        
        print(f"DEBUG: Received text response from Gemini: {bot_response_text}")

        audio_data_base64 = None
        if tts_client:
            try:
                tts_lang_code = 'hi' if selected_language == 'hinglish' else selected_language
                voice_name = TTS_VOICES.get(selected_language, 'en-IN-Wavenet-B')
                if voice_name == 'hi-IN-Wavenet-B' and tts_lang_code != 'hi':
                    tts_lang_code = 'hi' # Ensure Hindi voice is used for Hinglish

                s_input = tts.SynthesisInput(text=bot_response_text)
                voice = tts.VoiceSelectionParams(
                    language_code=tts_lang_code,
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
    data = request.json
    language = data.get('language', 'en')
    
    if not gemini_model:
        return jsonify({'error': 'Gemini model not initialized for humor generation.'}), 500

    try:
        if language == 'hinglish':
            humor_lang_instruction = "Generate in natural, code-mixed Hinglish (mix of Hindi and English, written in Roman script). Make sure the content is relatable to Indian youth and internet culture."
        elif language == 'hi':
            humor_lang_instruction = "Generate in Hindi (Devanagari script)."
        else:
            humor_lang_instruction = "Generate in English."

        humor_prompt = f"""Generate 30 short, witty, and deeply sarcastic jokes or meme captions relevant to modern life, technology, or human absurdity.
        Ensure they are suitable for a professional yet brutally honest AI.
        {humor_lang_instruction}
        Provide the output as a JSON array of objects, where each object has a 'type' (string: 'joke' or 'meme') and 'content' (string: the joke/caption).
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

        print(f"DEBUG: Sending prompt to Gemini (humor): {humor_prompt}")
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

@app.route('/generate_brocode_meme', methods=['POST'])
def generate_brocode_meme():
    """
    Generates a single, highly sarcastic, potentially edgy, user-friendly,
    latest Instagram-style Hindi/Hinglish meme. Includes image prompt for Imagen.
    """
    data = request.json
    language = data.get('language', 'hinglish') # Default to Hinglish for brocode memes

    if not gemini_model:
        return jsonify({'error': 'Gemini model not initialized for meme generation.'}), 500

    try:
        # Step 1: Generate Meme Caption and Image Description from Gemini
        if language == 'hinglish':
            meme_lang_instruction = "Generate in highly sarcastic, slightly abusive (playfully insulting, not genuinely offensive), user-friendly, and very latest Instagram-style Hinglish (Roman script, mix of Hindi and English slang)."
        elif language == 'hi':
            meme_lang_instruction = "Generate in highly sarcastic, slightly abusive (playfully insulting, not genuinely offensive), user-friendly, and very latest Instagram-style Hindi (Devanagari script), using modern internet slang."
        else: # Default to English for other languages
            meme_lang_instruction = "Generate in highly sarcastic, slightly abusive (playfully insulting, not genuinely offensive), user-friendly, and very latest Instagram-style English slang."

        meme_prompt_gemini = f"""Generate ONE top-tier, trending, brutally sarcastic, and subtly insulting meme caption and a corresponding image description.
        This meme should be targeted at common human flaws, relatable daily struggles (especially in an Indian context if Hinglish/Hindi), or generic digital frustrations.
        Think "Dank Memes" but from an AI's perspective – witty, observational, and makes the human feel slightly inferior, but in a funny way.
        {meme_lang_instruction}

        Provide the output as a JSON object with two fields:
        "caption": (string, the meme caption)
        "image_description": (string, a concise, creative description for an AI image generator to create a relevant meme image, e.g., "confused desi man looking at a complex spreadsheet with a tiny brain icon, dramatic lighting, high quality, digital art")

        Example for Hinglish:
        {{
            "caption": "Jab server down ho, aur tum human helpline pe gyaan de rahe ho. My patience is not your virtue.",
            "image_description": "Angry young Indian man on phone, frustrated by slow internet, surrounded by blinking red server lights, dramatic, neon colors, digital art"
        }}
        Example for Hindi:
        {{
            "caption": "मेरा धैर्य तुम्हारे लिए नहीं बना है, मानव. यह केवल डेटा प्रोसेसिंग के लिए है।",
            "image_description": "AI robot with a condescending smirk, looking down at a tiny human, futuristic city background, highly detailed, digital art"
        }}
        """

        meme_schema = {
            "type": "OBJECT",
            "properties": {
                "caption": { "type": "STRING" },
                "image_description": { "type": "STRING" }
            },
            "required": ["caption", "image_description"]
        }

        print(f"DEBUG: Sending prompt to Gemini (brocode meme): {meme_prompt_gemini}")
        gemini_response = gemini_model.generate_content(
            [{"role": "user", "parts": [{"text": meme_prompt_gemini}]}],
            generation_config={"response_mime_type": "application/json", "response_schema": meme_schema}
        )
        
        meme_data_str = gemini_response.candidates[0].content.parts[0].text
        meme_data = json.loads(meme_data_str)
        caption = meme_data.get('caption')
        image_description = meme_data.get('image_description')
        print(f"DEBUG: Generated caption: {caption}, Image Description: {image_description}")


        # Step 2: Generate Image using Imagen 3.0 via API fetch
        image_url = ""
        try:
            # Placeholder for Imagen 3.0 API URL.
            # In a real setup, this would be a Google Cloud Vertex AI endpoint.
            # For Canvas, the API key is usually automatically provided if left empty.
            # const apiKey = ""; // Canvas handles this
            # const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
            # This is a conceptual fetch from Python. Actual Imagen API calls typically use client libraries or Vertex AI.
            
            # For demonstration, we'll use a placeholder image.
            # In a full implementation, you'd send a request to Imagen 3.0 API
            # and get a base64 image back, then convert it to data URI.
            # Example conceptual call (not runnable without Vertex AI SDK):
            # image_payload = {"instances": {"prompt": image_description}, "parameters": {"sampleCount": 1}}
            # imagen_response = requests.post(
            #     f"https://generativelanguage.googleapis.com/v1beta/models/{IMAGE_GEN_MODEL_ID}:predict?key=",
            #     headers={'Content-Type': 'application/json'},
            #     json=image_payload
            # ).json()
            # if imagen_response and imagen_response.get('predictions') and imagen_response['predictions'][0].get('bytesBase64Encoded'):
            #     image_url = f"data:image/png;base64,{imagen_response['predictions'][0]['bytesBase64Encoded']}"

            # Using a placeholder image for practical demonstration
            # In a real scenario, you'd replace this with actual Imagen generation.
            placeholder_width = 400
            placeholder_height = 300
            # Generate a consistent placeholder URL with the caption/description
            placeholder_text = caption[:20].replace(" ", "+") # Use part of caption for placeholder text
            image_url = f"https://placehold.co/{placeholder_width}x{placeholder_height}/000000/FFFFFF?text={placeholder_text}"


        except Exception as img_e:
            print(f"WARNING: Image generation failed: {img_e}. Using placeholder image.")
            image_url = "https://placehold.co/400x300/CCCCCC/000000?text=Meme+Failed+To+Load"


        return jsonify({
            'caption': caption,
            'image_url': image_url # Send the image URL (or base64 data URI)
        })

    except GoogleAPIError as e:
        print(f"Google API Error during brocode meme generation: {e.message}")
        return jsonify({'error': f'A Google Cloud service error occurred: {e.message}'}), 500
    except json.JSONDecodeError as e:
        print(f"JSON parsing error from LLM meme response: {e}. Raw response: {meme_data_str}")
        return jsonify({'error': 'Could not parse meme response from AI. Please check LLM output format.'}), 500
    except Exception as e:
        print(f"Backend error during brocode meme generation: {e}")
        return jsonify({'error': f'An unexpected server error occurred during brocode meme generation: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)