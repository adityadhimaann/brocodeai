import os
import base64
import json
from flask import Flask, request, jsonify, make_response
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
gemini_model = genai.GenerativeModel('gemini-1.5-flash')
print("Successfully configured Gemini API and initialized model.")


TTS_VOICES_BY_STYLE = {
    'hinglish': {
        'default': {'name': 'hi-IN-Wavenet-B', 'gender': tts.SsmlVoiceGender.MALE},
        'sarcastic': {'name': 'hi-IN-Wavenet-B', 'gender': tts.SsmlVoiceGender.MALE},
        'hot_male': {'name': 'hi-IN-Wavenet-B', 'gender': tts.SsmlVoiceGender.MALE},
        'hot_female': {'name': 'hi-IN-Wavenet-A', 'gender': tts.SsmlVoiceGender.FEMALE},
    },
    'en': {
        'default': {'name': 'en-IN-Wavenet-B', 'gender': tts.SsmlVoiceGender.MALE},
        'sarcastic': {'name': 'en-US-Wavenet-J', 'gender': tts.SsmlVoiceGender.MALE},
        'hot_male': {'name': 'en-US-Wavenet-E', 'gender': tts.SsmlVoiceGender.MALE},
        'hot_female': {'name': 'en-US-Wavenet-C', 'gender': tts.SsmlVoiceGender.FEMALE},
    },
    'hi': {
        'default': {'name': 'hi-IN-Wavenet-B', 'gender': tts.SsmlVoiceGender.MALE},
        'sarcastic': {'name': 'hi-IN-Wavenet-B', 'gender': tts.SsmlVoiceGender.MALE},
        'hot_male': {'name': 'hi-IN-Wavenet-B', 'gender': tts.SsmlVoiceGender.MALE},
        'hot_female': {'name': 'hi-IN-Wavenet-A', 'gender': tts.SsmlVoiceGender.FEMALE},
    },
}
DEFAULT_VOICE_SETTINGS = {'name': 'en-IN-Wavenet-B', 'gender': tts.SsmlVoiceGender.MALE}


@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_text = data.get('text')
    selected_language = data.get('language', 'en')
    voice_style = data.get('voice_style', 'default')
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
                voice_settings = TTS_VOICES_BY_STYLE.get(selected_language, {}).get(voice_style, DEFAULT_VOICE_SETTINGS)
                voice_name = voice_settings['name']
                voice_gender = voice_settings['gender']

                s_input = tts.SynthesisInput(text=bot_response_text)
                voice = tts.VoiceSelectionParams(
                    language_code=tts_lang_code,
                    name=voice_name,
                    ssml_gender=voice_gender
                )
                audio_config = tts.AudioConfig(
                    audio_encoding=tts.AudioEncoding.MP3
                )

                print(f"DEBUG: Calling Google Cloud Text-to-Speech for language: {tts_lang_code}, voice: {voice_name}, gender: {voice_gender}")
                tts_response = tts_client.synthesize_speech(input=s_input, voice=voice, audio_config=audio_config)
                audio_data_base664 = base64.b64encode(tts_response.audio_content).decode('utf-8')
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
    data = request.json
    language = data.get('language', 'hinglish')

    if not gemini_model:
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
        gemini_response = gemini_model.generate_content(
            [{"role": "user", "parts": [{"text": meme_prompt_gemini}]}],
            generation_config={"response_mime_type": "application/json", "response_schema": meme_schema}
        )
        
        meme_data_str = gemini_response.candidates[0].content.parts[0].text
        meme_data = json.loads(meme_data_str)
        caption = meme_data.get('caption')
        image_description = meme_data.get('image_description')
        print(f"DEBUG: Generated caption: {caption}, Image Description: {image_description}")

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

    if not gemini_model:
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
        response_from_gemini = gemini_model.generate_content(
            [{"role": "user", "parts": [{"text": roast_prompt}]}]
        )
        
        roast_text = ""
        if response_from_gemini.candidates:
            for part in response_from_gemini.candidates[0].content.parts:
                if hasattr(part, 'text'):
                    roast_text += part.text
        
        if not roast_text.strip():
            roast_text = "My algorithms are currently too busy judging your life choices to offer a coherent roast."

        return jsonify({'roast': roast_text})

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

    if not gemini_model:
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
        response_from_gemini = gemini_model.generate_content(
            [{"role": "user", "parts": [{"text": advice_prompt}]}]
        )
        
        advice_text = ""
        if response_from_gemini.candidates:
            for part in response_from_gemini.candidates[0].content.parts:
                if hasattr(part, 'text'):
                    advice_text += part.text
        
        if not advice_text.strip():
            advice_text = "My algorithms are currently too busy judging your life choices to offer advice."

        return jsonify({'advice': advice_text})

    except GoogleAPIError as e:
        print(f"Google API Error during unsolicited advice generation: {e.message}")
        return jsonify({'error': f'A service error occurred during advice generation: {e.message}'}), 500
    except Exception as e:
        print(f"Backend error during unsolicited advice generation: {e}")
        return jsonify({'error': f'An unexpected server error occurred during unsolicited advice generation: {str(e)}'}), 500

# NEW endpoint for speaking arbitrary text
@app.route('/speak_text', methods=['POST'])
def speak_text():
    data = request.json
    text_to_speak = data.get('text')
    language = data.get('language', 'en')
    voice_style = data.get('voice_style', 'default')

    if not text_to_speak:
        return jsonify({'error': 'No text provided for speech synthesis.'}), 400
    if not tts_client:
        return jsonify({'error': 'Text-to-Speech client not initialized.'}), 500

    try:
        tts_lang_code = 'hi' if language == 'hinglish' else language
        voice_settings = TTS_VOICES_BY_STYLE.get(language, {}).get(voice_style, DEFAULT_VOICE_SETTINGS)
        voice_name = voice_settings['name']
        voice_gender = voice_settings['gender']

        s_input = tts.SynthesisInput(text=text_to_speak)
        voice = tts.VoiceSelectionParams(
            language_code=tts_lang_code,
            name=voice_name,
            ssml_gender=voice_gender
        )
        audio_config = tts.AudioConfig(
            audio_encoding=tts.AudioEncoding.MP3
        )

        print(f"DEBUG: Speaking text for humor/meme: Language={tts_lang_code}, Voice={voice_name}, Text='{text_to_speak[:50]}...'")
        tts_response = tts_client.synthesize_speech(input=s_input, voice=voice, audio_config=audio_config)
        audio_data_base64 = base64.b64encode(tts_response.audio_content).decode('utf-8')

        return jsonify({'audio': audio_data_base64})

    except GoogleAPIError as e:
        print(f"Google TTS API Error (speak_text): {e.message}")
        return jsonify({'error': f'Google TTS API error: {e.message}'}), 500
    except Exception as e:
        print(f"Backend error (speak_text): {e}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)