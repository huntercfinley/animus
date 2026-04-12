"""Seed interpretation, symbols, and go-deeper for Mandatory Military Service dream."""
import os, urllib.request, json

url = os.environ.get("SUPABASE_URL", "https://xlumafywghpgallecsvh.supabase.co")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SECRET_KEY")
if not key:
    raise SystemExit("Set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) in env before running.")
uid = "a872fa8e-c789-4eb1-84b9-671981b5fd60"
dream_id = "1449ee22-6acf-4f18-bbb0-4f9dfe0f79af"
headers_json = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", "Prefer": "return=minimal"}

# 1. Interpretation
interpretation = (
    "This dream thrusts you into the archetypal theater of war \u2014 not as a historical "
    "reenactment, but as a psychic confrontation with forces that feel larger than the "
    "individual will. The mandatory conscription speaks to something in your waking life "
    "that feels compulsory, a demand placed upon you by society, expectation, or "
    "circumstance that you did not choose and cannot negotiate.\n\n"
    "The Vietnam setting is significant. It is America\u2019s wound of disillusionment \u2014 "
    "the war where young men discovered that the institutions meant to protect them were "
    "indifferent to their survival. Your psyche has chosen this backdrop to dramatize a "
    "felt sense of being thrust into a brutal arena where the rules are not yours, the "
    "stakes are lethal, and the commanders do not care. Jung would recognize here the "
    "encounter with the collective shadow: the impersonal machinery of systems that "
    "consume individuals without remorse.\n\n"
    "The video game quality \u2014 \u201cstarting\u201d in the morning, running through missions \u2014 "
    "reveals a dissociative layer, the psyche\u2019s attempt to create distance from the horror. "
    "Yet the dream does not let you stay numb. You watch friends die. You feel bullets. "
    "The emotional truth breaks through the game-like frame, insisting that this is real, "
    "that what you are enduring matters.\n\n"
    "Most telling is your escape: playing sick, refusing to return, hiding inside while "
    "war rages outside the window. This is not cowardice \u2014 it is the survival instinct "
    "of a psyche that recognizes an unjust demand. The paranoia about being caught and "
    "reassigned suggests a deeper fear: that opting out of what the world demands will "
    "only delay the reckoning, not prevent it. The dream asks you to consider where in "
    "your life you feel conscripted into something brutal and unfair \u2014 and whether your "
    "strategy of withdrawal is sustainable, or whether the war will eventually find you "
    "inside the house."
)

update = json.dumps({"interpretation": interpretation, "model_used": "seed-data"}).encode()
req = urllib.request.Request(
    f"{url}/rest/v1/dreams?id=eq.{dream_id}", data=update, method="PATCH", headers=headers_json
)
urllib.request.urlopen(req)
print("Interpretation added")

# 2. Symbols
symbols = [
    {"dream_id": dream_id, "user_id": uid, "symbol": "Vietnam war", "archetype": "Shadow", "sentiment": "threatening"},
    {"dream_id": dream_id, "user_id": uid, "symbol": "mandatory conscription", "archetype": "Authority", "sentiment": "oppressive"},
    {"dream_id": dream_id, "user_id": uid, "symbol": "playing sick", "archetype": "Trickster", "sentiment": "desperate"},
    {"dream_id": dream_id, "user_id": uid, "symbol": "bullets", "archetype": "Death/Rebirth", "sentiment": "terrifying"},
    {"dream_id": dream_id, "user_id": uid, "symbol": "parents\u2019 house", "archetype": "Sanctuary", "sentiment": "fragile"},
    {"dream_id": dream_id, "user_id": uid, "symbol": "closed window", "archetype": "Persona", "sentiment": "avoidant"},
]
req2 = urllib.request.Request(
    f"{url}/rest/v1/dream_symbols", data=json.dumps(symbols).encode(), method="POST", headers=headers_json
)
urllib.request.urlopen(req2)
print("Symbols added (6)")

# 3. Go-deeper conversations
conversations = [
    {
        "dream_id": dream_id, "role": "user", "exchange_number": 1,
        "content": "Why did it feel like a video game? That seems weird for something so violent."
    },
    {
        "dream_id": dream_id, "role": "assistant", "exchange_number": 1,
        "content": (
            "The video game frame is your psyche\u2019s protective mechanism \u2014 what depth psychology "
            "calls dissociation in service of survival. When the reality is too overwhelming to process "
            "directly, the dreaming mind wraps it in a familiar, controllable format. You \u201cstart\u201d "
            "the day, you run \u201cmissions,\u201d there are clear beginnings and endings. But notice how "
            "the dream keeps breaking its own frame: friends die in front of you, bullets whistle past, "
            "the horror leaks through the game. Your unconscious is telling you that whatever you\u2019re "
            "facing in waking life, the strategy of treating it as \u201cjust a game\u201d is failing. The "
            "emotional reality refuses to be contained. Where in your life are you maintaining a detached, "
            "gamified distance from something that actually terrifies you?"
        )
    },
    {
        "dream_id": dream_id, "role": "user", "exchange_number": 2,
        "content": "The part where I went home and played sick \u2014 I felt guilty but also like I had no choice. What does that mean?"
    },
    {
        "dream_id": dream_id, "role": "assistant", "exchange_number": 2,
        "content": (
            "This is the dream\u2019s moral center, and it\u2019s more nuanced than simple avoidance. Playing "
            "sick is the Trickster archetype \u2014 the part of you that uses cunning when direct confrontation "
            "would be suicidal. There is wisdom in this. Not every battle is yours to fight, and the psyche "
            "knows when the cost of compliance is annihilation. But the guilt and paranoia reveal the shadow "
            "of that choice: the fear that opting out doesn\u2019t truly free you, it only postpones the demand. "
            "You hide inside, not even looking out the window \u2014 a total withdrawal from reality. The dream "
            "is asking: is there something in your life where you\u2019ve successfully avoided a brutal demand, "
            "but now live with the quiet dread that it will circle back? The war outside the window hasn\u2019t "
            "ended just because you closed the curtains."
        )
    },
    {
        "dream_id": dream_id, "role": "user", "exchange_number": 3,
        "content": "I kept thinking \"this is so unfair\" throughout the whole dream. It felt like the strongest emotion."
    },
    {
        "dream_id": dream_id, "role": "assistant", "exchange_number": 3,
        "content": (
            "That sense of injustice is the dream\u2019s deepest signal. It isn\u2019t about war \u2014 it\u2019s about "
            "any system that demands your life force without your consent and without caring whether you "
            "survive. The commanders who don\u2019t care about you are authority figures stripped of their "
            "protective function, reduced to pure impersonal demand. Jung would say you are encountering "
            "the negative Father archetype: the world-as-machine that assigns you a role and expects you "
            "to die in it without complaint. The \u201cunfairness\u201d you feel is your individuating Self pushing "
            "back against collective expectations. This dream may surface when you feel trapped in obligations, "
            "career pressures, or social demands that treat you as expendable. The psyche is saying: your life "
            "is not a resource to be deployed by others. The outrage you feel is healthy \u2014 it\u2019s the voice "
            "of the Self refusing to be consumed. The question is whether you can channel that refusal into "
            "something more sustainable than hiding inside with the curtains drawn."
        )
    },
]
req3 = urllib.request.Request(
    f"{url}/rest/v1/dream_conversations", data=json.dumps(conversations).encode(), method="POST", headers=headers_json
)
urllib.request.urlopen(req3)
print("Go-deeper conversations added (3 exchanges)")

print("\nDone! Mandatory Military Service dream is now fully populated.")
