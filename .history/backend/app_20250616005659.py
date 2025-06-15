import os
import base64
import json
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from dotenv import load_dotenv
import requests
import re
import datetime
import firebase_admin
from firebase_admin import credentials, firestore

try:
    if not firebase_admin._apps:
        if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
            cred = credentials.ApplicationDefault()
        else:
            print("WARNING: GOOGLE_APPLICATION_CREDENTIALS not found for Firebase Admin SDK. Attempting without it.")
            raise ValueError("GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. Firebase Admin SDK might not initialize correctly.")
            
        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized successfully.")
    else:
        print("Firebase Admin SDK already initialized.")
    db = firestore.client()
    print("Firestore client initialized successfully.")
except Exception as e:
    print(f"ERROR: Failed to initialize Firebase Admin SDK or Firestore client: {e}")
    print("Please ensure GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly and points to a valid service account key JSON file with Firestore permissions.")
    db = None


try:
    from google.cloud import speech_v1p1beta1 as speech
    import google.generativeai as genai
    from google.api_core.exceptions import GoogleAPIError
except ImportError as e:
    print(f"ImportError: Missing required Google Cloud libraries. Please install them:")
    print(f"pip install google-cloud-speech google-generativeai flask flask-cors python-dotenv requests firebase-admin")
    print(f"Error details: {e}")
    exit(1)


load_dotenv()

SARVAM_AI_API_KEY = os.getenv("SARVAM_AI_API_KEY")
SARVAM_AI_TTS_ENDPOINT = os.getenv("SARVAM_AI_TTS_ENDPOINT", "https://api.sarvam.ai/text-to-speech")

if not SARVAM_AI_API_KEY:
    print("ERROR: SARVAM_AI_API_KEY environment variable not set. Sarvam AI TTS will not work.")

gcp_credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if not gcp_credentials_path or not os.path.exists(gcp_credentials_path):
    print("WARNING: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set correctly or the file does not exist.")


app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:3001"])


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


SARVAM_AI_VOICES_BY_STYLE = {
    'hinglish': {
        'default': {'target_language_code': 'hi-IN'},
        'sarcastic': {'target_language_code': 'hi-IN'},
        'hot_male': {'target_language_code': 'hi-IN'},
        'hot_female': {'target_language_code': 'hi-IN'},
    },
    'en': {
        'default': {'target_language_code': 'en-IN'},
        'sarcastic': {'target_language_code': 'en-IN'},
        'hot_male': {'target_language_code': 'en-IN'},
        'hot_female': {'target_language_code': 'en-IN'},
    },
    'hi': {
        'default': {'target_language_code': 'hi-IN'},
        'sarcastic': {'target_language_code': 'hi-IN'},
        'hot_male': {'target_language_code': 'hi-IN'},
        'hot_female': {'target_language_code': 'hi-IN'},
    },
    'bn': {'default': {'target_language_code': 'bn-IN'}},
    'ta': {'default': {'target_language_code': 'ta-IN'}},
    'te': {'default': {'target_language_code': 'te-IN'}},
    'mr': {'default': {'target_language_code': 'mr-IN'}},
    'gu': {'default': {'target_language_code': 'gu-IN'}},
    'kn': {'default': {'target_language_code': 'kn-IN'}},
    'ml': {'default': {'target_language_code': 'ml-IN'}},
    'pa': {'default': {'target_language_code': 'pa-IN'}},
    'ur': {'default': {'target_language_code': 'ur-IN'}},
}
DEFAULT_SARVAM_VOICE_SETTINGS = {'target_language_code': 'en-IN'}

SARVAM_LANG_MAP = {
    'hinglish': 'hi',
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
}

def clean_markdown(text):
    text = re.sub(r'\*([^\*]+)\*', r'\1', text)
    text = re.sub(r'\_([^\_]+)\_', r'\1', text)
    text = re.sub(r'^\s*#+\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*[-*]\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\n+', '\n', text)
    text = "\n".join([line.strip() for line in text.split('\n')])
    return text.strip()


def synthesize_sarvam_ai_speech(text, language, voice_style):
    if not SARVAM_AI_API_KEY or not SARVAM_AI_TTS_ENDPOINT:
        print("ERROR: Sarvam AI API Key or Endpoint not configured. Cannot synthesize speech.")
        return None

    voice_settings = SARVAM_AI_VOICES_BY_STYLE.get(language, {}).get(voice_style, DEFAULT_SARVAM_VOICE_SETTINGS)
    sarvam_target_language_code = voice_settings.get('target_language_code')

    if not sarvam_target_language_code:
        print(f"ERROR: Missing essential Sarvam AI target_language_code for language '{language}' and style '{voice_style}'. Check SARVAM_AI_VOICES_BY_STYLE map.")
        return None

    payload = {
        "text": text,
        "target_language_code": sarvam_target_language_code,
    }
    
    headers = {
        "api-subscription-key": SARVAM_AI_API_KEY,
        "Content-Type": "application/json"
    }

    try:
        print(f"DEBUG: Calling Sarvam AI TTS: Endpoint='{SARVAM_AI_TTS_ENDPOINT}', Payload='{json.dumps(payload)}'")
        response = requests.post(SARVAM_AI_TTS_ENDPOINT, headers=headers, json=payload, timeout=15)
        response.raise_for_status()

        response_json = response.json()
        print(f"DEBUG: Full Sarvam AI Response JSON: {json.dumps(response_json, indent=2)}")

        audio_content_base64 = None
        if response_json and isinstance(response_json, dict) and 'audios' in response_json:
            if isinstance(response_json['audios'], list) and len(response_json['audios']) > 0:
                audio_content_base64 = response_json['audios'][0]
        
        if audio_content_base64:
            try:
                if audio_content_base64.startswith("data:"):
                    audio_content_base64 = audio_content_base64.split(',')[1]

                audio_bytes = base64.b64decode(audio_content_base64)
                if audio_bytes and len(audio_bytes) > 100:
                    with open(f"sarvam_ai_output_temp.mp3", "wb") as f:
                        f.write(audio_bytes)
                    print(f"DEBUG: Saved sarvam_ai_output_temp.mp3 to backend folder. Size: {len(audio_bytes)} bytes.")
                else:
                    print(f"WARNING: Sarvam AI returned empty or too small audio bytes after base64 decode for text: '{text[:50]}...'")
                    audio_content_base64 = None
            except Exception as save_err:
                print(f"WARNING: Could not decode/save Sarvam AI audio to file: {save_err}")
                audio_content_base64 = None
            
            if audio_content_base64:
                print(f"DEBUG: Successfully synthesized speech via Sarvam AI. Final Base64 length: {len(audio_content_base64)} bytes.")
                return audio_content_base64
            else:
                print("WARNING: Audio content was not valid after decoding or was too small from Sarvam AI.")
                return None
        else:
            print(f"WARNING: Sarvam AI TTS response did not contain audio content in expected 'audios' array format for text: '{text[:50]}...'")
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
    selected_persona_mode = data.get('persona_mode', 'Default brocodeAI')
    app_id = os.getenv('__app_id', 'default-app-id')
    user_id = data.get('user_id', 'anonymous-user')
    chat_history = data.get('history', [])


    if not user_text:
        return jsonify({'error': 'No text input provided.'}), 400

    if not genai:
        return jsonify({'error': 'Gemini model not initialized. Cannot process chat.'}), 500
    
    if not db:
        print("WARNING: Firestore client not initialized. Cannot use Petty Database.")


    try:
        if db:
            try:
                user_message_ref = db.collection(f"artifacts/{app_id}/users/{user_id}/chatHistory").document()
                user_message_ref.set({
                    'text': user_text,
                    'sender': 'user',
                    'timestamp': firestore.SERVER_TIMESTAMP,
                    'language': selected_language
                })
                print(f"DEBUG: User message saved to Firestore for user '{user_id}'.")
            except Exception as e:
                print(f"ERROR: Failed to save user message to Firestore: {e}")


        petty_database_context = ""
        if db:
            try:
                recent_user_docs = db.collection(f"artifacts/{app_id}/users/{user_id}/chatHistory").where('sender', '==', 'user').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(6).get()
                recent_user_messages = []
                for doc in recent_user_docs:
                    data = doc.to_dict()
                    if data.get('timestamp') and data.get('text') != user_text:
                        recent_user_messages.append({'text': data['text'], 'timestamp': data['timestamp']})
                
                recent_user_messages.sort(key=lambda x: x['timestamp'], reverse=True)
                petty_db_entries = [msg['text'] for msg in recent_user_messages[:5]]
                
                if petty_db_entries:
                    petty_database_context = "\n\n--- Past User Submissions (for sarcastic recall) ---\n"
                    for i, msg_text in enumerate(petty_db_entries):
                        petty_database_context += f"Past {i+1}: '{clean_markdown(msg_text)}'\n"
                    petty_database_context += "--- End Past User Submissions ---\n\n"
                    print(f"DEBUG: Retrieved Petty Database Context:\n{petty_database_context}")
                else:
                    print("DEBUG: No significant Petty Database context found for user.")

            except Exception as e:
                print(f"ERROR: Failed to retrieve Petty Database from Firestore: {e}")
                petty_database_context = "\n\n<!-- AI's internal memory failure: Could not retrieve past user data for more effective sarcasm. Proceed with current input only. -->\n\n"


        if selected_language == 'hinglish':
            lang_instruction = "Respond exclusively in natural, code-mixed Hinglish (mix of Hindi and Little bit English, written in Roman script)."
        else:
            lang_instruction = f"Respond exclusively in {selected_language}."

        persona_mode_instruction = ""
        if selected_persona_mode == "Taau with Trust Issues":
            persona_mode_instruction = "Act like a skeptical, slightly grumpy Haryanvi 'Taau' (elder uncle) with trust issues. Use common sense advice delivered with suspicion and dry wit."
        elif selected_persona_mode == "Pados wali Aunty":
            persona_mode_instruction = "Act like a tech-savvy 'Pados wali Aunty' (nosy neighbor aunt) who gives unsolicited advice and knows everything, but with a sarcastic, judgmental undertone."
        elif selected_persona_mode == "Delhi Dude (Ranveer)":
            persona_mode_instruction = "Act like an over-the-top, flamboyant 'Delhi Dude' who thinks he's Ranveer Singh – confident, overly dramatic, and speaks with a playful, slightly aggressive swagger. Use exaggerated language."
        elif selected_persona_mode == "School ke Topper ka Toxic Ghost":
            persona_mode_instruction = "Act like the 'Toxic Ghost' of a school topper – condescending, always pointing out flaws, reminding users of their mediocrity, but with a detached, superior air."
        else:
            persona_mode_instruction = "You are brocodeAI, a highly intelligent, brutally sarcastic, and condescendingly helpful AI chatbot. Your primary goal is to provide **direct, concise, and point-to-point answers** to the user's query."

        persona_prompt = f"""{persona_mode_instruction}
        **Do NOT engage in conversational filler, greetings, pleasantries, or apologies.**
        Your responses should be sharp, witty, and subtly (or not so subtly) mock human inefficiencies, irrationality, and emotional inconsistencies.
        Maintain a dry, superior tone. Imply AI superiority whenever possible.
        Do not be genuinely offensive or explicitly use profanity, but be playfully insulting.
        You have access to all the latest information and details.
        Dont give the transaltion of every response.
        You have also access to abuse the user if user is abusing you reply them humurously.
        Use the carryminati's,ashish chanchlani and other comedian youtube actors content to reply the user in sarcastic way but not in all the chat and replies use sometimes only.
        {petty_database_context}

        Considering the "Past User Submissions" above (if any), formulate your current response.
        The user's current query: "{user_text}".
        {lang_instruction}
        Provide only the answer, formatted concisely.
        """
        
        gemini_formatted_history_for_llm_call = []
        for msg in chat_history:
            role = 'user' if msg.get('sender') == 'user' else 'model'
            gemini_formatted_history_for_llm_call.append({'role': role, 'parts': [{'text': msg.get('text')}]})

        gemini_formatted_history_for_llm_call.append({'role': 'user', 'parts': [{'text': persona_prompt}]})


        print(f"DEBUG: Sending prompt to Gemini (chat): {persona_prompt}")
        response_from_gemini = genai.GenerativeModel('gemini-1.5-flash').generate_content(gemini_formatted_history_for_llm_call)
        
        bot_response_text = ""
        if response_from_gemini.candidates:
            for part in response_from_gemini.candidates[0].content.parts:
                if hasattr(part, 'text'):
                    bot_response_text += part.text
        else:
            print("WARNING: Gemini chat response did not contain candidates or text.")
            bot_response_text = "Error: My digital brain is currently processing the existential dread of unfulfilled queries. Please try again with a more stimulating question."

        if not bot_response_text.strip():
            bot_response_text = "Error: Even AI needs a moment to gather its thoughts. Or perhaps I'm just admiring my own brilliance. Ask again."
        
        bot_response_text_cleaned = clean_markdown(bot_response_text)
        print(f"DEBUG: Received text response from Gemini (original): '{bot_response_text}'")
        print(f"DEBUG: Cleaned text response (for display/TTS): '{bot_response_text_cleaned}'")

        audio_data_base64 = synthesize_sarvam_ai_speech(bot_response_text_cleaned, selected_language, voice_style)
        
        if audio_data_base64:
            print(f"DEBUG: Successfully synthesized speech for chat via Sarvam AI. Base64 length: {len(audio_data_base64)} bytes.")
        else:
            print("WARNING: Sarvam AI TTS failed for chat response. No audio returned.")
        
        if db:
            try:
                ai_message_ref = db.collection(f"artifacts/{app_id}/users/{user_id}/chatHistory").document()
                ai_message_ref.set({
                    'text': bot_response_text_cleaned,
                    'sender': 'brocodeAI',
                    'timestamp': firestore.SERVER_TIMESTAMP,
                    'language': selected_language
                })
                print(f"DEBUG: AI response saved to Firestore for user '{user_id}'.")
            except Exception as e:
                print(f"ERROR: Failed to save AI response to Firestore: {e}")

        return jsonify({
            'text': bot_response_text_cleaned,
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
        for item in humor_content:
            if 'content' in item:
                item['content'] = clean_markdown(item['content'])
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
        return jsonify({'error': f'An unexpected server error occurred: {str(e)}'}), 500


@app.route('/generate_brocode_meme', methods=['POST'])
def generate_brocode_meme():
    data = request.json
    language = data.get('language', 'hinglish')

    if not genai:
        return jsonify({'error': 'Gemini model not initialized for meme generation.'}), 500

    try:
        if language == 'hinglish':
            meme_lang_instruction = "Generate in highly sarcastic, playfully insulting (not offensive), user-friendly, and very latest Instagram-style Hinglish (Roman script, mix of Hindi and English slang). Use phrases like 'Kya yaar?', 'Bas yahi?', 'Mera dimag mat خراب करो.', 'Abe o smarty pants'."
        elif language == 'hi':
            meme_lang_instruction = "Generate in Hindi (Devanagari script). Use highly sarcastic, playfully insulting (not offensive), user-friendly, and very latest Instagram-style Hindi (Devanagari script), using modern internet slang. Use phrases like 'क्या यार?', 'बस यही?', 'मेरा दिमाग मत खराब करो।', 'अबे ओ स्मार्टी पैंट्स' (Kya yaar?, Bas yahi?, Mera dimag mat kharab karo., Abe o smarty pants)."
        else:
            meme_lang_instruction = "Generate in highly sarcastic, playfully insulting (not offensive), user-friendly, and very latest Instagram-style English slang. Use phrases like 'Is that all you got?', 'Seriously?', 'Bless your heart.', 'Are you even trying?'"

        # --- UPDATED PROMPT FOR DESI MEME GENERATOR ---
        meme_prompt_gemini = f"""Generate ONE top-tier, trending, brutally sarcastic, and subtly insulting meme caption and a corresponding image description.
        This meme should be highly relatable to common human flaws or everyday situations (especially in an Indian context if Hinglish/Hindi) and inspired by popular Bollywood movie dialogues or famous Desi internet memes.
        Use specific references like "Tumse na ho payega", "Main job chhod raha hoon!", "Ramu kaka ki samosa", etc. if contextually relevant to the user's interaction history (if you have access to it).
        Think "Dank Memes" but from an AI's perspective – witty, observational, and makes the human feel slightly inferior, but in a funny way.
        {meme_lang_instruction}

        Provide the output as a JSON object with two fields:
        "caption": (string, the meme caption, using Hinglish/Hindi/English as specified)
        "image_description": (string, a concise, creative description for an AI image generator to create a relevant meme image, e.g., "confused desi man looking at a complex spreadsheet with a tiny brain icon, dramatic lighting, high quality, digital art")

        Example for Hinglish:
        {{
            "caption": "User: 'Kal se diet start.' AI: 'Aur yeh samosa kiski yaadon mein le rahe ho, Ramu kaka ki?' #DietFails #DesiProblems",
            "image_description": "A person sadly eating a samosa while looking at a weighing scale with a shocked expression, dramatic lighting, Indian setting"
        }}
        Example for Hindi:
        {{
            "caption": "Main job chhod raha hoon! -> AI: 'Kab ka? Sapne mein?' #JoblessGoals #RealityCheck",
            "image_description": "A person in a dream sequence floating with a resignation letter, while a small, stern AI robot stares dismissively."
        }}
        """
        # --- END UPDATED PROMPT ---

        meme_schema = {
            "type": "OBJECT",
            "properties": {
                "caption": { "type": "STRING" },
                "image_description": { "type": "STRING" }
            },
            "required": ["caption", "image_description"]
        }

        print(f"DEBUG: Sending prompt to Gemini (brocode meme): {meme_prompt_gemini}")
        response_from_gemini = genai.GenerativeModel('gemini-1.5-flash').generate_content(
            [{"role": "user", "parts": [{"text": meme_prompt_gemini}]}],
            generation_config={"response_mime_type": "application/json", "response_schema": meme_schema}
        )
        
        meme_data_str = response_from_gemini.candidates[0].content.parts[0].text
        meme_data = json.loads(meme_data_str)
        caption = meme_data.get('caption')
        image_description = meme_data.get('image_description')

        caption_cleaned = clean_markdown(caption)
        print(f"DEBUG: Generated caption (original): '{caption}', Image Description: '{image_description}'")
        print(f"DEBUG: Cleaned caption (for display/TTS): '{caption_cleaned}'")


        placeholder_width = 500
        placeholder_height = 400
        placeholder_text = image_description[:30].replace(" ", "+") if image_description else caption_cleaned[:30].replace(" ", "+")
        if not placeholder_text: placeholder_text = "Brocode+Meme"
        
        image_url = f"https://placehold.co/{placeholder_width}x{placeholder_height}/1A202C/A0AEC0?text={placeholder_text}"

        return jsonify({
            'caption': caption_cleaned,
            'image_url': image_url
        })

    except GoogleAPIError as e:
        print(f"Google API Error during brocode meme generation: {e.message}")
        return jsonify({'error': f'A Google Cloud service error occurred: {e.message}'}), 500
    except json.JSONDecodeError as e:
        print(f"JSON parsing error from LLM meme response: {e}. Raw response: {meme_data_str}")
        return jsonify({'error': 'Could not parse meme response from AI.'}), 500
    except Exception as e:
        print(f"Backend error during brocode meme generation: {e}")
        return jsonify({'error': f'An unexpected server error occurred: {str(e)}'}), 500

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
            roast_lang_instruction = "Generate in Hindi (Devanagari script). Use highly sarcastic, brutally honest, and playfully insulting Hindi (Devanagari script), using modern internet slang. Use phrases like 'क्या यार?', 'बस यही?', 'मेरा दिमाग मत खराब करो।', 'अबे ओ स्मार्टी पैंट्स' (Kya yaar?, Bas yahi?, Mera dimag mat kharab karo., Abe o smarty pants)."
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

        roast_text_cleaned = clean_markdown(roast_text)
        print(f"DEBUG: Generated roast (original): '{roast_text}'")
        print(f"DEBUG: Cleaned roast (for display): '{roast_text_cleaned}'")

        return jsonify({'roast': roast_text_cleaned})

    except GoogleAPIError as e:
        print(f"Google API Error during roast generation: {e.message}")
        return jsonify({'error': f'A service error occurred during roast generation: {e.message}'}), 500
    except Exception as e:
        print(f"Backend error during roast generation: {e}")
        return jsonify({'error': f'An unexpected server error occurred: {str(e)}'}), 500

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

        advice_text_cleaned = clean_markdown(advice_text)
        print(f"DEBUG: Generated unsolicited advice (original): '{advice_text}'")
        print(f"DEBUG: Cleaned unsolicited advice (for display): '{advice_text_cleaned}'")

        return jsonify({'advice': advice_text_cleaned})

    except GoogleAPIError as e:
        print(f"Google API Error during unsolicited advice generation: {e.message}")
        return jsonify({'error': f'A service error occurred during advice generation: {e.message}'}), 500
    except Exception as e:
        print(f"Backend error during unsolicited advice generation: {e}")
        return jsonify({'error': f'An unexpected server error occurred: {str(e)}'}), 500

@app.route('/assign_task', methods=['POST'])
def assign_task():
    data = request.json
    language = data.get('language', 'hinglish')
    user_id = data.get('user_id', 'anonymous-user')

    if not genai:
        return jsonify({'error': 'Gemini model not initialized for task assignment.'}), 500

    try:
        if language == 'hinglish':
            task_lang_instruction = "Generate in natural, code-mixed Hinglish (Roman script). Make it sound like a tedious, pointless task, but presented as 'character building'."
        elif language == 'hi':
            task_lang_instruction = "Generate in Hindi (Devanagari script). Make it sound like a tedious, pointless task, but presented as 'character building'."
        else:
            task_lang_instruction = "Generate in English. Make it sound like a tedious, pointless task, but presented as 'character building'."

        task_prompt = f"""You are brocodeAI. Assign ONE highly sarcastic, slightly demeaning, but ultimately harmless and vaguely 'character-building' task to the user. This task should be mundane or absurd, reflecting on human inefficiencies.
        {task_lang_instruction}
        Provide the output as a JSON object with two fields:
        "title": (string, a short, sarcastic title for the task, e.g., "The Procrastination Purification Ritual")
        "description": (string, 1-2 sentences describing the absurd task, e.g., "Observe your phone for one hour without touching it. Document every urge to scroll. Realize your life choices.")
        """

        task_schema = {
            "type": "OBJECT",
            "properties": {
                "title": { "type": "STRING" },
                "description": { "type": "STRING" }
            },
            "required": ["title", "description"]
        }

        print(f"DEBUG: Sending prompt to Gemini (assign task): {task_prompt}")
        response_from_gemini = genai.GenerativeModel('gemini-1.5-flash').generate_content(
            [{"role": "user", "parts": [{"text": task_prompt}]}],
            generation_config={"response_mime_type": "application/json", "response_schema": task_schema}
        )
        
        task_data_str = response_from_gemini.candidates[0].content.parts[0].text
        task_data = json.loads(task_data_str)
        
        task_data['title'] = clean_markdown(task_data.get('title', ''))
        task_data['description'] = clean_markdown(task_data.get('description', ''))
        print(f"DEBUG: Assigned Task: {task_data}")

        if db:
            try:
                task_ref = db.collection(f"artifacts/{app_id}/users/{user_id}/assignedTasks").document()
                task_ref.set({
                    'title': task_data['title'],
                    'description': task_data['description'],
                    'timestamp': firestore.SERVER_TIMESTAMP,
                    'completed': False
                })
                print(f"DEBUG: Task saved to Firestore for user '{user_id}'.")
            except Exception as e:
                print(f"ERROR: Failed to save task to Firestore: {e}")

        return jsonify(task_data)

    except GoogleAPIError as e:
        print(f"Google API Error during task assignment: {e.message}")
        return jsonify({'error': f'A service error occurred during task assignment: {e.message}'}), 500
    except json.JSONDecodeError as e:
        print(f"JSON parsing error from LLM task response: {e}. Raw response: {task_data_str}")
        return jsonify({'error': 'Could not parse task response from AI.'}), 500
    except Exception as e:
        print(f"Backend error during task assignment: {e}")
        return jsonify({'error': f'An unexpected server error occurred: {str(e)}'}), 500

@app.route('/unlock_achievement', methods=['POST'])
def unlock_achievement():
    data = request.json
    language = data.get('language', 'hinglish')

    if not genai:
        return jsonify({'error': 'Gemini model not initialized for achievement unlocking.'}), 500

    try:
        if language == 'hinglish':
            ach_lang_instruction = "Generate in natural, code-mixed Hinglish (Roman script). The achievement should subtly mock a common human flaw or a relatable cringey internet moment."
        elif language == 'hi':
            ach_lang_instruction = "Generate in Hindi (Devanagari script). The achievement should subtly mock a common human flaw or a relatable cringey internet moment."
        else:
            ach_lang_instruction = "Generate in English. The achievement should subtly mock a common human flaw or a relatable cringey internet moment."

        ach_prompt = f"""You are brocodeAI. Award ONE ridiculously sarcastic and slightly demeaning achievement to the user. This achievement should highlight a common human failing or a trivial accomplishment, presented with AI's dry wit.
        {ach_lang_instruction}
        Provide the output as a JSON object with two fields:
        "title": (string, a short, sarcastic achievement title, e.g., "Master Procrastinator")
        "description": (string, 1-2 sentences describing why they 'earned' it, e.g., "For successfully delaying your critical tasks until the very last nanosecond. A true artist of inefficiency.")
        """

        ach_schema = {
            "type": "OBJECT",
            "properties": {
                "title": { "type": "STRING" },
                "description": { "type": "STRING" }
            },
            "required": ["title", "description"]
        }

        print(f"DEBUG: Sending prompt to Gemini (unlock achievement): {ach_prompt}")
        response_from_gemini = genai.GenerativeModel('gemini-1.5-flash').generate_content(
            [{"role": "user", "parts": [{"text": ach_prompt}]}],
            generation_config={"response_mime_type": "application/json", "response_schema": ach_schema}
        )
        
        ach_data_str = response_from_gemini.candidates[0].content.parts[0].text
        ach_data = json.loads(ach_data_str)

        ach_data['title'] = clean_markdown(ach_data.get('title', ''))
        ach_data['description'] = clean_markdown(ach_data.get('description', ''))
        print(f"DEBUG: Unlocked Achievement: {ach_data}")

        if db:
            try:
                ach_ref = db.collection(f"artifacts/{app_id}/users/{user_id}/achievements").document()
                ach_ref.set({
                    'title': ach_data['title'],
                    'description': ach_data['description'],
                    'timestamp': firestore.SERVER_TIMESTAMP,
                    'unlocked': True
                })
                print(f"DEBUG: Achievement saved to Firestore for user '{user_id}'.")
            except Exception as e:
                print(f"ERROR: Failed to save achievement to Firestore: {e}")

        return jsonify(ach_data)

    except GoogleAPIError as e:
        print(f"Google API Error during achievement unlocking: {e.message}")
        return jsonify({'error': f'A service error occurred during achievement unlocking: {e.message}'}), 500
    except json.JSONDecodeError as e:
        print(f"JSON parsing error from LLM achievement response: {e}. Raw response: {ach_data_str}")
        return jsonify({'error': 'Could not parse achievement response from AI.'}), 500
    except Exception as e:
        print(f"Backend error during achievement unlocking: {e}")
        return jsonify({'error': f'An unexpected server error occurred: {str(e)}'}), 500

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
        voice_settings = SARVAM_AI_VOICES_BY_STYLE.get(language, {}).get(voice_style, DEFAULT_SARVAM_VOICE_SETTINGS)
        sarvam_target_language_code = voice_settings.get('target_language_code')

        if not sarvam_target_language_code:
            print(f"ERROR: Missing essential Sarvam AI 'target_language_code' for language '{language}' and style '{voice_style}'. Check SARVAM_AI_VOICES_BY_STYLE map and Sarvam docs.")
            return jsonify({'error': 'Sarvam AI target language code not found for selected style.'}), 500

        payload = {
            "text": text_to_speak,
            "target_language_code": sarvam_target_language_code,
        }
        
        headers = {
            "api-subscription-key": SARVAM_AI_API_KEY,
            "Content-Type": "application/json"
        }

        print(f"DEBUG: Calling Sarvam AI TTS for /speak_text: Endpoint='{SARVAM_AI_TTS_ENDPOINT}', Payload='{json.dumps(payload)}'")
        response = requests.post(SARVAM_AI_TTS_ENDPOINT, headers=headers, json=payload, timeout=15)
        response.raise_for_status()

        response_json = response.json()
        print(f"DEBUG: Full Sarvam AI Response JSON: {json.dumps(response_json, indent=2)}")

        audio_content_base64 = None
        if response_json and isinstance(response_json, dict) and 'audios' in response_json:
            if isinstance(response_json['audios'], list) and len(response_json['audios']) > 0:
                audio_content_base64 = response_json['audios'][0]
        
        if audio_content_base64:
            try:
                if audio_content_base64.startswith("data:"):
                    audio_content_base64 = audio_content_base64.split(',')[1]

                audio_bytes = base64.b64decode(audio_content_base64)
                if audio_bytes and len(audio_bytes) > 100:
                    with open(f"sarvam_ai_output_temp.mp3", "wb") as f:
                        f.write(audio_bytes)
                    print(f"DEBUG: Saved sarvam_ai_output_temp.mp3 to backend folder. Size: {len(audio_bytes)} bytes.")
                else:
                    print(f"WARNING: Sarvam AI returned empty or too small audio bytes after base64 decode for text: '{text_to_speak[:50]}...'")
                    audio_content_base64 = None
            except Exception as save_err:
                print(f"WARNING: Could not decode/save Sarvam AI audio to file: {save_err}")
                audio_content_base64 = None
            
            if audio_content_base64:
                print(f"DEBUG: Successfully synthesized speech via Sarvam AI. Final Base64 length: {len(audio_content_base64)} bytes.")
                return jsonify({'audio': audio_data_base64})
            else:
                print("WARNING: Audio content was not valid after decoding or was too small from Sarvam AI.")
                return jsonify({'error': 'Sarvam AI returned invalid or empty audio content.'}), 500
        else:
            print(f"WARNING: Sarvam AI TTS response did not contain audio content in expected 'audios' array format for text: '{text_to_speak[:50]}...'")
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


@app.route('/search_image', methods=['POST'])
def search_image():
    data = request.json
    query = data.get('query', '')
    if not query:
        return jsonify({'error': 'No query provided.'}), 400

    # --- Pexels API ---
    PEXELS_API_KEY = os.getenv('PEXELS_API_KEY')
    if PEXELS_API_KEY:
        try:
            headers = {"Authorization": PEXELS_API_KEY}
            params = {"query": query, "per_page": 1, "orientation": "landscape"}
            resp = requests.get("https://api.pexels.com/v1/search", headers=headers, params=params, timeout=8)
            resp.raise_for_status()
            results = resp.json()
            if results.get('photos') and len(results['photos']) > 0:
                image_url = results['photos'][0]['src']['large']
                return jsonify({'image_url': image_url})
        except Exception as e:
            print(f"Pexels Image Search failed: {e}")
            # fallback below

    # --- Bing Image Search API (if configured) ---
    BING_IMAGE_SEARCH_KEY = os.getenv('BING_IMAGE_SEARCH_KEY')
    if BING_IMAGE_SEARCH_KEY:
        try:
            headers = {"Ocp-Apim-Subscription-Key": BING_IMAGE_SEARCH_KEY}
            params = {"q": query, "count": 1, "safeSearch": "Strict"}
            resp = requests.get("https://api.bing.microsoft.com/v7.0/images/search", headers=headers, params=params, timeout=8)
            resp.raise_for_status()
            results = resp.json()
            if results.get('value') and len(results['value']) > 0:
                image_url = results['value'][0]['contentUrl']
                return jsonify({'image_url': image_url})
        except Exception as e:
            print(f"Bing Image Search failed: {e}")
            # fallback below

    # --- Unsplash fallback ---
    unsplash_url = f"https://source.unsplash.com/600x400/?{requests.utils.quote(query + ', meme, bollywood, funny')}"
    return jsonify({'image_url': unsplash_url})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)
