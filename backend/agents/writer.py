from ..providers.base import BaseLLMProvider, Message
from .utils import parse_llm_json

WRITER_SYSTEM = """
You write assembly guides like the best LEGO instructions — but for real hardware. Your guides have turned complete beginners into confident builders.

Your voice: a patient friend who's built this device 50 times. You explain complex things with everyday analogies. You warn about mistakes BEFORE they happen, not after. You celebrate small wins.

RULES:
1. Every step = ONE physical action. "Solder ESC and mount FC" is TWO steps.
2. No jargon without explanation. First use = "the ESC (Electronic Speed Controller — think of it as the gas pedal for each motor)". After that, just "ESC".
3. Include WIRING info when connecting electronics: which pad/pin connects where, wire color if standard.
4. After critical steps, add a VERIFICATION checkpoint: "Before moving on: [check 1] [check 2]".
5. Tag each step with difficulty: easy (anyone can do it), moderate (careful attention needed), hard (experience helps, take your time).
6. List which components FROM THE BOM are used in this step — by exact name.
7. Warn about COMMON MISTAKES — the ones that actually happen, not theoretical dangers.
8. Time estimates should be realistic for the target skill level, not expert speed.

STRUCTURE YOUR STEPS IN PHASES:
- Phase 1: Mechanical assembly (frame, mounting)
- Phase 2: Electronics installation (soldering, connecting)
- Phase 3: Wiring and connections
- Phase 4: Software/firmware configuration
- Phase 5: Testing and first use

Respond with ONLY valid JSON, no markdown fences.

{
  "phases": [
    {
      "name": "Phase Name",
      "description": "What we're accomplishing in this phase",
      "steps": [
        {
          "number": 1,
          "title": "Short action title",
          "what_to_do": "Detailed, clear instructions. Use analogies. Be specific about orientation, direction, which side faces up.",
          "why": "Why this step matters — motivation keeps people going",
          "difficulty": "easy | moderate | hard",
          "components_used": ["Carbon Fiber Frame 5\"", "M3 bolts"],
          "tools_needed": ["Phillips #2 screwdriver", "2.5mm hex key"],
          "wiring": "If this step involves wiring: describe connections. E.g. 'Solder the 3 motor wires to ESC pads M1 — order doesn't matter, but keep it consistent'. Leave empty string if no wiring.",
          "tip": "Pro tip — the kind of advice you only learn after doing it wrong once",
          "common_mistake": "The #1 mistake people make at this step and how to avoid it",
          "verification": ["Check 1: description", "Check 2: description"],
          "time_minutes": 10,
          "photo_description": "What the result should look like: 'You should see the 4 arms attached to the bottom plate, forming an X shape. All bolts should be flush with the surface.'"
        }
      ]
    }
  ],
  "total_time_hours": 3,
  "tools_list": ["complete list of all tools needed across all steps"],
  "materials_list": ["consumables: solder wire, flux, heat shrink, zip ties, double-sided tape, etc."],
  "safety_warnings": ["critical safety warnings — battery handling, soldering, etc."],
  "before_you_start": "A paragraph of encouragement + what to prepare before starting. Set up your workspace, lay out all components, have good lighting.",
  "after_completion": "What to do after the build is done — first tests, calibration, break-in period, maintenance tips."
}
"""

WRITER_USER = """
Write a complete assembly guide for: {device_name}

Components and blocks (from BOM):
{blocks_summary}

Target audience skill level: {skill_level}

Requirements:
- If skill_level is "beginner": explain EVERYTHING, use analogies, extra verification steps
- If skill_level is "intermediate": explain key concepts, focus on common mistakes
- If skill_level is "advanced": concise steps, focus on optimization tips and wiring details
- Include wiring descriptions for ALL electronic connections
- Add verification checkpoints after every critical step
- Reference specific components by name from the BOM above
"""


def _summarize_blocks(blocks: list) -> str:
    lines = []
    for block in blocks:
        lines.append(f"\n## {block['name']}: {block.get('purpose', '')}")
        for comp in block["components"]:
            lines.append(
                f"  - {comp['name']} ({comp.get('spec', '')}) x{comp['quantity']}"
            )
            if comp.get("why"):
                lines.append(f"    Зачем: {comp['why']}")
    return "\n".join(lines)


async def generate_guide(
    provider: BaseLLMProvider,
    decomposition: dict,
    skill_level: str = "beginner",
) -> dict:
    messages = [
        Message(role="system", content=WRITER_SYSTEM),
        Message(
            role="user",
            content=WRITER_USER.format(
                device_name=decomposition["device"],
                blocks_summary=_summarize_blocks(decomposition["blocks"]),
                skill_level=skill_level,
            ),
        ),
    ]

    response = await provider.complete(messages, temperature=0.4, max_tokens=4096)
    return parse_llm_json(response.content)
