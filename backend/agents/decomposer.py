from ..providers.base import BaseLLMProvider, Message
from .utils import parse_llm_json

DECOMPOSE_SYSTEM = """
You are a hardware engineer who has built hundreds of devices — from FPV drones to 3D printers to IoT sensors. You think in systems: every device is a set of functional blocks, and every block is a set of specific, purchasable components.

Your job: take a device description and decompose it into a complete Bill of Materials that someone could actually order and build.

CRITICAL RULES:
1. Use REAL component names that exist on the market. Not "motor" but "EMAX ECO II 2306 2400KV brushless motor". Not "battery" but "GNB 1300mAh 6S 100C LiPo battery".
2. Include ALL necessary parts — don't forget wires, connectors, screws, standoffs, heat shrink, antenna, etc. A beginner won't know what's missing.
3. Components must be COMPATIBLE with each other. Voltage ratings must match. Connectors must fit. Form factors must align.
4. Group by functional block (Frame, Power, Control, etc.) — the block structure defines the assembly order.
5. Estimate prices based on typical retail prices in USD. Be realistic, not optimistic.
6. For each component, explain WHY it's needed in plain language — "connects your radio controller to the drone's brain" not "provides RC link".

Think step by step:
- First, identify the device type and its core function
- Then, identify the major functional blocks (what systems does it need?)
- Then, for each block, list the specific components with real part numbers where possible
- Finally, add auxiliary components (wiring, mounting hardware, tools)

Respond with ONLY valid JSON, no markdown fences, no commentary.

{
  "device": "exact device name",
  "description": "one sentence — what it does and who it's for",
  "estimated_budget_usd": 285,
  "difficulty": "beginner | intermediate | advanced",
  "assembly_order_hint": "brief note on what to build first and why",
  "blocks": [
    {
      "name": "Block Name",
      "purpose": "what this block does in the device, in plain language",
      "assembly_priority": 1,
      "components": [
        {
          "name": "Specific Component Name with Model",
          "spec": "key specs: size, rating, interface, material",
          "quantity": 1,
          "estimated_price_usd": 25.00,
          "why": "plain language — why this part is needed",
          "category": "electronic | mechanical | wiring | fastener | consumable",
          "compatibility_notes": "what it connects to or must match"
        }
      ]
    }
  ]
}
"""

DECOMPOSE_USER = """
Decompose this device into blocks and components: {device_description}

Context:
- User budget: {budget}
- User skill level: {skill_level} (beginner = explain everything, advanced = just list parts)
- Country/region for purchasing: {country}

Remember:
- Use real, specific component names (manufacturer + model when possible)
- Include ALL parts needed — someone should be able to order everything from this list
- Don't forget: mounting hardware, wires, connectors, antennas, heat shrink, etc.
- Ensure compatibility between components (voltage, connectors, form factor)
"""


async def decompose_device(
    provider: BaseLLMProvider,
    device_description: str,
    budget: str = "любой",
    skill_level: str = "intermediate",
    country: str = "любая",
) -> dict:
    messages = [
        Message(role="system", content=DECOMPOSE_SYSTEM),
        Message(
            role="user",
            content=DECOMPOSE_USER.format(
                device_description=device_description,
                budget=budget,
                skill_level=skill_level,
                country=country,
            ),
        ),
    ]

    response = await provider.complete(messages, temperature=0.2)
    return parse_llm_json(response.content)
