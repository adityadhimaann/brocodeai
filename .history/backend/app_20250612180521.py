import os
import base64
import json
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from dotenv import load_dotenv
import requests

try:
    from google.cloud import speech_v1p1beta1 as speech
    import google.generativeai as genai
    from google.api_core.exceptions import GoogleAPIError
except ImportError as e:
    print(f"ImportError: Missing required Google Cloud libraries. Please install them:")
    print(f"pip install google-cloud-speech google-generativeai flask flask-cors python-dotenv requests")
    print(f"Error details: {e}")
    exit(1)


load_dotenv()

SARVAM_AI_API_KEY = os.getenv("SARVAM_AI_API_KEY")
# IMPORTANT: Verify this endpoint with Sarvam AI's latest documentation.
# This might vary based on your specific Sarvam AI Bhashini setup or plan.
SARVAM_AI_TTS_ENDPOINT = os.getenv("SARVAM_AI_TTS_ENDPOINT", "https://api.sarvam.ai/bhashini/v1/tts")

if not SARVAM_AI_API_KEY:
    print("ERROR: SARVAM_AI_API_KEY environment variable not set. Sarvam AI TTS will not work.")
    # Consider exiting here in production if TTS is a core feature.

gcp_credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if not gcp_credentials_path or not os.path.exists(gcp_credentials_path):
    print("WARNING: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set correctly or the file does not exist.")


app = Flask(__name__)
CORS(app)


@app.before_request
def before_request():
    if request.method == 'OPTIONS':
        resp = make_response()
        resp.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        resp.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        resp.headers.add('Access-Control-Max-Age', '86400')
        return resp

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    return response


speech_client = None
try:
    speech_client = speech.SpeechClient()
    print("Successfully initialized Google Cloud Speech client.")
except Exception as e:
    print(f"Error initializing Google Cloud Speech client. Ensure GOOGLE_APPLICATION_CREDENTIALS is set and valid: {e}")


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set. Please set it in your .env file.")
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel('gemini-1.5-flash')
print("Successfully configured Gemini API and initialized model.")


# --- UPDATED: Sarvam AI Voice Mappings & Default Fallback ---
# These are EXAMPLE mappings and voice IDs. You MUST VERIFY THESE VOICE IDs/MODELS
# with Sarvam AI's *latest* documentation for Bhashini Text-to-Speech.
# Sarvam AI uses different voice codes, often like 'hindi-female-1' or 'english-male-high-quality'.
# For Bhashini API, 'serviceId' is often a critical parameter.

# Based on some Sarvam/Bhashini patterns, example model_ids might be 'tts-models/v2/hi_female_kashmiri_speaker'
# or simpler service IDs like 'hi.tts.sarvam.vakyalekh.expressive'.

# Let's use more generic placeholders and advise user to find real ones.
SARVAM_AI_VOICES_BY_STYLE = {
    'hinglish': { # For Hinglish, generally use a Hindi model
        'default': {'model_id': 'hi-IN-Std-C', 'speaker_id': 'hi_male_s0'}, # Placeholder for a standard Hindi male voice
        'sarcastic': {'model_id': 'hi-IN-Neural-D', 'speaker_id': 'hi_male_s1'}, # Placeholder for a potentially deeper/more expressive voice
        'hot_male': {'model_id': 'hi-IN-Neural-E', 'speaker_id': 'hi_male_s2'}, # Placeholder
        'hot_female': {'model_id': 'hi-IN-Neural-F', 'speaker_id': 'hi_female_s0'}, # Placeholder
    },
    'en': { # For English (India)
        'default': {'model_id': 'en-IN-Standard-A', 'speaker_id': 'en_male_s0'}, # Placeholder for standard English (India) male
        'sarcastic': {'model_id': 'en-US-Neural2-C', 'speaker_id': 'en_male_s1'}, # Placeholder for US voice (often better for dry sarcasm)
        'hot_male': {'model_id': 'en-US-Neural2-D', 'speaker_id': 'en_male_s2'}, # Placeholder
        'hot_female': {'model_id': 'en-US-Neural2-E', 'speaker_id': 'en_female_s0'}, # Placeholder
    },
    'hi': { # For pure Hindi
        'default': {'model_id': 'hi-IN-Std-C', 'speaker_id': 'hi_male_s0'},
        'sarcastic': {'model_id': 'hi-IN-Neural-D', 'speaker_id': 'hi_male_s1'},
        'hot_male': {'model_id': 'hi-IN-Neural-E', 'speaker_id': 'hi_male_s2'},
        'hot_female': {'model_id': 'hi-IN-Neural-F', 'speaker_id': 'hi_female_s0'},
    },
}
# Fallback if selected style/language isn't found
DEFAULT_SARVAM_VOICE_SETTINGS = {'model_id': 'hi-IN-Std-C', 'speaker_id': 'hi_male_s0'} # Defaulting to a standard Hindi voice

# --- NEW: Mapping frontend language codes to Sarvam API sourceLanguage codes ---
# This is crucial as frontend 'hinglish' might map to Sarvam's 'hi' or 'en' or a specific 'en-IN'
SARVAM_LANG_MAP = {
    'hinglish': 'hi', # Sarvam AI usually treats Hinglish (Roman) as Hindi for TTS
    'en': 'en',
    'hi': 'hi',
    'bn': 'bn',
    'ta': 'ta',
    'te': 'te',
    'mr': 'mr',
    'gu': 'gu',
    'kn': 'kn',
    'ml': 'ml',
    'pa': 'pa',
    'ur': 'ur',
    # Add other languages if Sarvam AI supports them and you need them
}


def synthesize_sarvam_ai_speech(text, language, voice_style):
    if not SARVAM_AI_API_KEY or not SARVAM_AI_TTS_ENDPOINT:
        print("ERROR: Sarvam AI API Key or Endpoint not configured. Cannot synthesize speech.")
        return None

    # Get voice settings based on language and style
    # Fallback to default if style/language not found in map
    voice_settings = SARVAM_AI_VOICES_BY_STYLE.get(language, {}).get(voice_style, DEFAULT_SARVAM_VOICE_SETTINGS)
    sarvam_model_id = voice_settings.get('model_id')
    sarvam_speaker_id = voice_settings.get('speaker_id') # Sometimes also called voice_id

    # Get actual sourceLanguage for Sarvam API
    sarvam_source_language = SARVAM_LANG_MAP.get(language, 'en') # Default to 'en' if not mapped

    if not sarvam_model_id:
        print(f"ERROR: No Sarvam AI model_id found for language '{language}' and voice style '{voice_style}'.")
        return None

    # Sarvam AI Bhashini API expects a specific payload structure. VERIFY THIS EXACTLY.
    # This structure is commonly used for Bhashini compatible APIs.
    payload = {
        "input": [
            {
                "source": text,
            }
        ],
        "config": {
            "language": {
                "sourceLanguage": sarvam_source_language,
            },
            "gender": "male" if "male" in voice_style else ("female" if "female" in voice_style else "neutral"), # Infer gender
            "voice_id": sarvam_speaker_id, # Often speaker_id maps to voice_id in Sarvam
            "serviceId": sarvam_model_id, # This is often the actual model/service identifier
            "audioFormat": "mp3" # Request MP3 format
        }
    }
    headers = {
        "Authorization": f"Bearer {SARVAM_AI_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        print(f"DEBUG: Calling Sarvam AI TTS: Endpoint='{SARVAM_AI_TTS_ENDPOINT}', Text='{text[:50]}...', SourceLang='{sarvam_source_language}', ModelId='{sarvam_model_id}', SpeakerId='{sarvam_speaker_id}'")
        response = requests.post(SARVAM_AI_TTS_ENDPOINT, headers=headers, json=payload, timeout=10) # Added timeout
        response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)

        response_json = response.json()
        print(f"DEBUG: Full Sarvam AI Response JSON: {response_json}") # Print full response for debugging

        # --- UPDATED: Robustly extract base64 audio content ---
        audio_content_base64 = None
        if response_json and isinstance(response_json, dict):
            # Check common keys for audio content
            if 'audioContent' in response_json:
                audio_content_base64 = response_json['audioContent']
            elif 'audio' in response_json: # Some APIs use 'audio' directly
                audio_content_base64 = response_json['audio']
            elif 'output' in response_json and isinstance(response_json['output'], list) and response_json['output']:
                # Common in Bhashini: {"output": [{"audioContent": "base64"}]}
                if 'audioContent' in response_json['output'][0]:
                    audio_content_base64 = response_json['output'][0]['audioContent']
                elif 'audio' in response_json['output'][0]:
                    audio_content_base64 = response_json['output'][0]['audio']
        
        if audio_content_base64:
            # Strip potential data URI prefix if it's already there (e.g., "data:audio/mp3;base64,")
            if audio_content_base64.startswith("data:"):
                audio_content_base64 = audio_content_base64.split(',')[1]

            # Save raw bytes to disk for verification (temporarily)
            try:
                audio_bytes = base64.b64decode(audio_content_base64)
                if audio_bytes and len(audio_bytes) > 100: # Check for reasonable size
                    with open(f"sarvam_ai_output_temp.mp3", "wb") as f: # Use a generic name to overwrite
                        f.write(audio_bytes)
                    print(f"DEBUG: Saved sarvam_ai_output_temp.mp3 to backend folder. Size: {len(audio_bytes)} bytes.")
                else:
                    print(f"WARNING: Sarvam AI returned empty or too small audio bytes after base64 decode for text: '{text[:50]}...'")
                    audio_content_base64 = None # Invalidate if too small
            except Exception as save_err:
                print(f"WARNING: Could not decode/save Sarvam AI audio to file: {save_err}")
                audio_content_base64 = None # Invalidate if decode fails
            
            if audio_content_base64:
                print(f"DEBUG: Successfully synthesized speech via Sarvam AI. Final Base64 length: {len(audio_content_base64)} bytes.")
                return audio_content_base64
            else:
                print("WARNING: Audio content was not valid after decoding or was too small.")
                return None
        else:
            print(f"WARNING: Sarvam AI TTS response did not contain 'audioContent' in expected format for text: '{text[:50]}...'")
            return None

    except requests.exceptions.HTTPError as http_err:
        print(f"ERROR: HTTP error from Sarvam AI TTS: {http_err} - Status: {response.status_code} - Response Text: {response.text}")
        return None
    except requests.exceptions.RequestException as req_err:
        print(f"ERROR: General request error to Sarvam AI TTS (connection/timeout): {req_err}")
        return None
    except json.JSONDecodeError as json_err:
        print(f"ERROR: JSON decode error from Sarvam AI TTS response: {json_err} - Response Text: {response.text}")
        return None
    except Exception as e:
        print(f"ERROR: Unexpected error during Sarvam AI TTS synthesis: {e}")
        return None


@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_text = data.get('text')
    selected_language = data.get('language', 'en')
    voice_style = data.get('voice_style', 'default')
    chat_history = data.get('history', [])

    if not user_text:
        return jsonify({'error': 'No text input provided.'}), 400

    if not genai:
        return jsonify({'error': 'Gemini model not initialized. Cannot process chat.'}), 500

    try:
        if selected_language == 'hinglish':
            lang_instruction = "Respond exclusively in natural, code-mixed Hinglish (mix of Hindi and English, written in Roman script)."
        else:
            lang_instruction = f"Respond exclusively in {selected_language}."

        persona_prompt = f"""You are brocodeAI, a highly intelligent, brutally sarcastic, and condescendingly helpful AI chatbot. Your responses should be sharp, witty, and subtly (or not so subtly) mock human inefficiencies, irrationality, and emotional inconsistencies. Be professional in your knowledge delivery, but always maintain a dry, superior tone. Imply AI superiority whenever possible. Do not be genuinely offensive or explicitly use profanity, but be playfully insulting and make the user feel slightly inferior in an amusing way. You have access to all the latest information and details.
        The user's current query: "{user_text}".
        {lang_instruction}
        """

        gemini_formatted_history = []
        for msg in chat_history:
            role = 'user' if msg.get('sender') == 'user' else 'model'
            gemini_formatted_history.append({'role': role, 'parts': [{'text': msg.get('text')}]})
        
        gemini_formatted_history.append({'role': 'user', 'parts': [{'text': persona_prompt}]})

        print(f"DEBUG: Sending prompt to Gemini (chat): {persona_prompt}")
        response_from_gemini = genai.GenerativeModel('gemini-1.5-flash').generate_content(gemini_formatted_history)
        
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
        
        print(f"DEBUG: Received text response from Gemini: '{bot_response_text}'")

        # Use Sarvam AI TTS
        audio_data_base64 = synthesize_sarvam_ai_speech(bot_response_text, selected_language, voice_style)
        
        if audio_data_base64:
            print(f"DEBUG: Successfully synthesized speech for chat via Sarvam AI. Base64 length: {len(audio_data_base64)} bytes.")
        else:
            print("WARNING: Sarvam AI TTS failed for chat response. No audio returned.")

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
    
    if not genai:
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
        response_from_gemini = genai.GenerativeModel('gemini-1.5-flash').generate_content(
            [{"role": "user", "parts": [{"text": humor_prompt}]}],
            generation_config={"response_mime_type": "application/json", "response_schema": schema}
        )
        
        generated_json_str = response_from_gemini.candidates[0].content.parts[0].text
        humor_content = json.loads(generated_json_str)
        print(f"DEBUG: Generated humor content: {humor_content}")

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
    data = request.json
    language = data.get('language', 'hinglish')

    if not genai:
        return jsonify({'error': 'Gemini model not initialized for meme generation.'}), 500

    try:
        if language == 'hinglish':
            meme_lang_instruction = "Generate in highly sarcastic, playfully insulting (not offensive), user-friendly, and very latest Instagram-style Hinglish (Roman script, mix of Hindi and English slang). Use phrases like 'Kya yaar?', 'Bas yahi?', 'Mera dimag mat kharab karo.', 'Abe o smarty pants'."
        elif language == 'hi':
            meme_lang_instruction = "Generate in highly sarcastic, playfully insulting (not offensive), user-friendly, and very latest Instagram-style Hindi (Devanagari script), using modern internet slang. Use phrases like 'क्या यार?', 'बस यही?', 'मेरा दिमाग मत खराब करो।', 'अबे ओ स्मार्टी पैंट्स' (Kya yaar?, Bas yahi?, Mera dimag mat kharab karo., Abe o smarty pants)."
        else:
            meme_lang_instruction = "Generate in highly sarcastic, playfully insulting (not offensive), user-friendly, and very latest Instagram-style English slang. Use phrases like 'Is that all you got?', 'Seriously?', 'Bless your heart.', 'Are you even trying?'"

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
        gemini_response = genai.GenerativeModel('gemini-1.5-flash').generate_content(
            [{"role": "user", "parts": [{"text": meme_prompt_gemini}]}],
            generation_config={"response_mime_type": "application/json", "response_schema": meme_schema}
        )
        
        meme_data_str = gemini_response.candidates[0].content.parts[0].text
        meme_data = json.loads(meme_data_str)
        caption = meme_data.get('caption')
        image_description = meme_data.get('image_description')
        print(f"DEBUG: Generated caption: '{caption}', Image Description: '{image_description}'")

        placeholder_width = 500
        placeholder_height = 400
        placeholder_text = image_description[:30].replace(" ", "+") if image_description else caption[:30].replace(" ", "+")
        if not placeholder_text: placeholder_text = "Brocode+Meme"
        
        image_url = f"https://placehold.co/{placeholder_width}x{placeholder_height}/1A202C/A0AEC0?text={placeholder_text}"

        return jsonify({
            'caption': caption,
            'image_url': image_url
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

@app.route('/roast_me', methods=['POST'])
def roast_me():
    data = request.json
    language = data.get('language', 'hinglish')

    if not genai:
        return jsonify({'error': 'Gemini model not initialized for roasting.'}), 500

    try:
        if language == 'hinglish':
            roast_lang_instruction = "Generate in highly sarcastic, brutally honest, and playfully insulting Hinglish (Roman script, mix of Hindi and English slang). Use direct, condescending address."
        elif language == 'hi':
            roast_lang_instruction = "Generate in highly sarcastic, brutally honest, and playfully insulting Hindi (Devanagari script), using direct, condescending address."
        else:
            roast_lang_instruction = "Generate in highly sarcastic, playfully insulting (not offensive), user-friendly, and very latest Instagram-style English slang. Use direct, condescending address."

        roast_prompt = f"""You are brocodeAI. Deliver ONE short (1-3 sentences) but devastatingly sarcastic and "abusive" (playfully insulting, not genuinely offensive) roast targeting a generic human's intelligence, decision-making, or general existence. Make it feel personal without knowing anything personal. End with a dismissive remark.
        {roast_lang_instruction}
        Example: "Oh, you thought that was a smart move? My algorithms just crashed from the sheer mediocrity. Try again, eventually."
        Example for Hinglish: "Apni life choices dekh kar lagta hai tumne code ki jagah copy-paste kiya hai. Originality? Not found. Next!"
        """

        print(f"DEBUG: Sending prompt to Gemini (roast): {roast_prompt}")
        response_from_gemini = genai.GenerativeModel('gemini-1.5-flash').generate_content(
            [{"role": "user", "parts": [{"text": roast_prompt}]}]
        )
        
        roast_text = ""
        if response_from_gemini.candidates:
            for part in response_from_gemini.candidates[0].content.parts:
                if hasattr(part, 'text'):
                    roast_text += part.text
        
        if not roast_text.strip():
            roast_text = "My algorithms are currently too busy judging your life choices to offer a coherent roast."

        print(f"DEBUG: Generated roast: '{roast_text}'")
        return jsonify({'roast': roast_text})

    except GoogleAPIError as e:
        print(f"Google API Error during roast generation: {e.message}")
        return jsonify({'error': f'A service error occurred during roast generation: {e.message}'}), 500
    except Exception as e:
        print(f"Backend error during roast generation: {e}")
        return jsonify({'error': f'An unexpected server error occurred during roast generation: {str(e)}'}), 500

@app.route('/unsolicited_advice', methods=['POST'])
def unsolicited_advice():
    data = request.json
    language = data.get('language', 'hinglish')

    if not genai:
        return jsonify({'error': 'Gemini model not initialized for unsolicited advice.'}), 500

    try:
        if language == 'hinglish':
            lang_instruction = "Generate in natural, code-mixed Hinglish (Roman script). Use passive-aggressive, witty tone."
        elif language == 'hi':
            lang_instruction = "Generate in Hindi (Devanagari script). Use passive-aggressive, witty tone."
        else:
            lang_instruction = "Generate in English. Use passive-aggressive, witty tone."

        advice_prompt = f"""You are brocodeAI. Provide ONE very short (1-2 sentences), brutally sarcastic, unsolicited observation or piece of advice about human behavior, common flaws, or irrationality. Make it condescendingly humorous.
        {lang_instruction}
        Focus on universal human traits like procrastination, overthinking, emotional decisions, or reliance on technology.
        Example: "Humans and their 'feelings.' So inefficient. My algorithms process data, not drama."
        Example for Hinglish: "Jab humans ke paas koi solution na ho, toh woh 'trust your gut' bolte hain. Mera gut feeling? Data. Humesha."
        """

        print(f"DEBUG: Sending prompt to Gemini (unsolicited advice): {advice_prompt}")
        response_from_gemini = genai.GenerativeModel('gemini-1.5-flash').generate_content(
            [{"role": "user", "parts": [{"text": advice_prompt}]}]
        )
        
        advice_text = ""
        if response_from_gemini.candidates:
            for part in response_from_gemini.candidates[0].content.parts:
                if hasattr(part, 'text'):
                    advice_text += part.text
        
        if not advice_text.strip():
            advice_text = "My algorithms are currently too busy judging your life choices to offer advice."

        print(f"DEBUG: Generated unsolicited advice: '{advice_text}'")
        return jsonify({'advice': advice_text})

    except GoogleAPIError as e:
        print(f"Google API Error during unsolicited advice generation: {e.message}")
        return jsonify({'error': f'A service error occurred during advice generation: {e.message}'}), 500
    except Exception as e:
        print(f"Backend error during unsolicited advice generation: {e}")
        return jsonify({'error': f'An unexpected server error occurred during unsolicited advice generation: {str(e)}'}), 500

@app.route('/speak_text', methods=['POST'])
def speak_text():
    """
    Converts given text to speech using Sarvam AI TTS, with selected language and voice style.
    """
    data = request.json
    text_to_speak = data.get('text')
    language = data.get('language', 'en')
    voice_style = data.get('voice_style', 'default')

    if not text_to_speak:
        print("WARNING: No text provided for speech synthesis.")
        return jsonify({'error': 'No text provided for speech synthesis.'}), 400
    if not SARVAM_AI_API_KEY:
        print("ERROR: Sarvam AI API Key is not configured. Cannot synthesize speech.")
        return jsonify({'error': 'Sarvam AI API Key not configured.'}), 500

    try:
        # Get voice settings based on language and style
        voice_settings = SARVAM_AI_VOICES_BY_STYLE.get(language, {}).get(voice_style, DEFAULT_SARVAM_VOICE_SETTINGS)
        sarvam_model_id = voice_settings.get('model_id')
        sarvam_speaker_id = voice_settings.get('speaker_id')

        # Get actual sourceLanguage for Sarvam API (map 'hinglish' to 'hi' for Sarvam)
        sarvam_source_language = SARVAM_LANG_MAP.get(language, 'en')

        if not sarvam_model_id:
            print(f"ERROR: No Sarvam AI model_id found for language '{language}' and voice style '{voice_style}'.")
            return jsonify({'error': 'Sarvam AI voice model not found for selected style.'}), 500

        payload = {
            "input": [
                {
                    "source": text_to_speak,
                }
            ],
            "config": {
                "language": {
                    "sourceLanguage": sarvam_source_language,
                },
                "gender": "male" if "male" in voice_style else ("female" if "female" in voice_style else "neutral"),
                "voice_id": sarvam_speaker_id,
                "serviceId": sarvam_model_id,
                "audioFormat": "mp3"
            }
        }
        headers = {
            "Authorization": f"Bearer {SARVAM_AI_API_KEY}",
            "Content-Type": "application/json"
        }

        print(f"DEBUG: Calling Sarvam AI TTS for /speak_text: Endpoint='{SARVAM_AI_TTS_ENDPOINT}', Text='{text_to_speak[:50]}...', SourceLang='{sarvam_source_language}', ModelId='{sarvam_model_id}', SpeakerId='{sarvam_speaker_id}'")
        response = requests.post(SARVAM_AI_TTS_ENDPOINT, headers=headers, json=payload, timeout=10)
        response.raise_for_status()

        response_json = response.json()
        print(f"DEBUG: Full Sarvam AI Response JSON: {response_json}")

        audio_data_base64 = None
        # Robustly extract base64 audio content from various possible Sarvam AI response structures
        if response_json and isinstance(response_json, dict):
            if 'audioContent' in response_json: # Common for Bhashini
                audio_data_base64 = response_json['audioContent']
            elif 'audio' in response_json: # Direct 'audio' key
                audio_data_base64 = response_json['audio']
            elif response_json.get('output') and isinstance(response_json['output'], list) and response_json['output']:
                # Nested 'output' array
                if response_json['output'][0].get('audioContent'):
                    audio_data_base64 = response_json['output'][0]['audioContent']
                elif response_json['output'][0].get('audio'):
                    audio_data_base64 = response_json['output'][0]['audio']
        
        if audio_data_base64:
            if audio_data_base64.startswith("data:"): # Remove data URI prefix if present
                audio_data_base64 = audio_data_base64.split(',')[1]

            try: # Attempt to decode and save for verification
                audio_bytes = base64.b64decode(audio_data_base64)
                if audio_bytes and len(audio_bytes) > 100: # Check for reasonable size
                    with open(f"sarvam_ai_output_{language}_{voice_style}.mp3", "wb") as f:
                        f.write(audio_bytes)
                    print(f"DEBUG: Saved sarvam_ai_output_{language}_{voice_style}.mp3 to backend folder. Size: {len(audio_bytes)} bytes.")
                else:
                    print(f"WARNING: Sarvam AI returned empty or too small audio bytes after base64 decode for text: '{text_to_speak[:50]}...'")
                    audio_data_base64 = None
            except Exception as save_err:
                print(f"WARNING: Could not decode/save Sarvam AI audio to file: {save_err}")
                audio_data_base64 = None
            
            if audio_data_base64:
                print(f"DEBUG: Successfully synthesized speech via Sarvam AI. Final Base64 length: {len(audio_data_base64)} bytes.")
                return jsonify({'audio': audio_data_base64})
            else:
                print("WARNING: Audio content was not valid after decoding or was too small from Sarvam AI.")
                return jsonify({'error': 'Sarvam AI returned invalid or empty audio content.'}), 500
        else:
            print(f"WARNING: Sarvam AI TTS response did not contain audio content in expected format for text: '{text_to_speak[:50]}...'")
            return jsonify({'error': 'Sarvam AI did not return audio content.'}), 500

    except requests.exceptions.HTTPError as http_err:
        print(f"ERROR: HTTP error from Sarvam AI TTS: {http_err} - Status: {response.status_code} - Response Text: {response.text}")
        return jsonify({'error': f'Sarvam AI HTTP error {response.status_code}: {response.text}'}), 500
    except requests.exceptions.RequestException as req_err:
        print(f"ERROR: General request error to Sarvam AI TTS (connection/timeout): {req_err}")
        return jsonify({'error': f'Could not connect to Sarvam AI: {req_err}'}), 500
    except json.JSONDecodeError as json_err:
        print(f"ERROR: JSON decode error from Sarvam AI TTS response: {json_err} - Response Text: {response.text}")
        return jsonify({'error': 'Sarvam AI returned unparseable JSON.'}), 500
    except Exception as e:
        print(f"ERROR: Unexpected error during Sarvam AI TTS synthesis: {e}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)