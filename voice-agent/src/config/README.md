# Configuration Setup

## Production Configuration

To set up the production configuration with your API keys:

1. **Copy the template file:**
   ```bash
   cp production-config.example.ts production-config.ts
   ```

2. **Edit `production-config.ts` and replace the placeholder API keys:**
   - Replace `YOUR_GROQ_API_KEY_HERE` with your actual Groq API key
   - Replace `YOUR_OPENAI_API_KEY_HERE` with your actual OpenAI API key

3. **Get API Keys:**
   - **Groq API Key**: https://console.groq.com/
   - **OpenAI API Key**: https://platform.openai.com/

## Security Note

⚠️ **IMPORTANT**: Never commit `production-config.ts` to version control. It contains sensitive API keys.

The file is already added to `.gitignore` to prevent accidental commits.

## Demo Configuration

For demo purposes, edit `demo-config.js` in the root of the voice-agent folder with your API keys.