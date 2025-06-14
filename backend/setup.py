from setuptools import setup

setup(
    name='BrocodeAI',
    version='0.1',
    install_requires=[
        'flask',
        'flask-cors',
        'google-cloud-speech',
        'google-cloud-texttospeech',
        'google-generativeai'
    ]
)
