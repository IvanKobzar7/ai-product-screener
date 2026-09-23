from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()  # Loads ANTHROPIC_API_KEY from the .env file

MODEL = "claude-haiku-4-5-20251001"

SYSTEM_PROMPT = """You are an e-commerce sourcing analyst for a wholesale reseller.
Given a product's unit economics, give a short verdict.
Rules:
- First line: exactly one word - BUY, MAYBE, or SKIP.
- Then at most 3 short bullet points explaining why.
- Use only the numbers provided. Do not invent sales data or prices.
- Rough guide: ROI above 30% and margin above 15% is usually healthy."""

client = Anthropic()  # Reads ANTHROPIC_API_KEY from the environment


def get_ai_verdict(summary: dict) -> str:
    """Send the product numbers to Claude and return its verdict."""
    product_data = "\n".join(f"{key}: {value}" for key, value in summary.items())

    message = client.messages.create(
        model=MODEL,
        max_tokens=300,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Product data:\n{product_data}"}],
    )
    return message.content[0].text