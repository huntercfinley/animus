-- Restore "The Weeping Woman of Zurich" — hard-deleted in error, recovered
-- from data/seed-dream-content.json (dream_index 2).
--
-- One-off data recovery; not a schema migration. Intentionally kept outside
-- of supabase/migrations/ so it does not become part of migration history.

BEGIN;

INSERT INTO dreams (
  id,
  user_id,
  title,
  journal_text,
  interpretation,
  image_prompt,
  mood,
  model_used,
  recorded_at,
  created_at
) VALUES (
  '6f70d6bd-147f-4eb9-9bfe-09a4bdc303a3',
  'a872fa8e-c789-4eb1-84b9-671981b5fd60',
  'The Weeping Woman of Zurich',
  E'About two years ago, I dreamed I was calling into meetings from Zurich. I was working remotely in Switzerland and felt protected there. I saw the Matterhorn, and inside it was a great clock, and there was a forcefield around the entire country that shielded me from harm.\n\nIn another dream, I was at a café speaking to a woman. She had golden-red hair and was very pale, with green eyes. She was crying and asked me if I recognized her. I said that I didn''t, and she cried harder. This was somewhere in Switzerland.',
  E'These two dreams form a profound pair — one about sanctuary, the other about a soul demanding recognition — and Switzerland serves as the sacred container for both.\n\nThe Zurich dream is a vision of the temenos, the protected sacred space that Jung considered essential for psychological work. Switzerland — neutral, orderly, bounded by mountains — becomes your psyche''s image of safety. The forcefield is not merely protection; it is the boundary you need to do inner work without being pulled apart by external demands. Working remotely, calling into meetings: you are participating in the outer world while remaining sheltered in the inner one. This is the arrangement your soul craves.\n\nThe Matterhorn with its interior clock is magnificent symbolism. Mountains in Jungian thought represent the Self — the totality of the psyche, both conscious and unconscious. A clock inside the mountain speaks to something ancient and precise ticking within you, an inner timing mechanism that operates according to its own laws. You are not late. You are not early. Something within you is keeping perfect time, even if the conscious mind cannot see the dial.\n\nThe café woman is perhaps the most significant figure in your entire dream record thus far. She is the Anima — the feminine soul-image that mediates between the ego and the unconscious. Her golden-red hair, pale skin, and green eyes mark her as distinctly otherworldly, almost fae. She weeps because you do not recognize her, and this is the great wound: the inner feminine has been calling to you, and some part of you has not yet learned to see her.\n\nHer question — ''Do you recognize me?'' — is not casual. It is the central question of individuation. The Anima asks to be seen, known, integrated. Her tears suggest she has been waiting a long time. That this encounter occurs in Switzerland, within the forcefield of safety, tells you that you can only meet her when you feel protected enough to be vulnerable.\n\nThese dreams together say: you have found your sanctuary. Now look at who is waiting for you inside it.',
  'A dreamlike Swiss café at dusk, golden warm interior light spilling onto cobblestones. A pale woman with flowing golden-red hair and luminous green eyes sits weeping at a small table, tears catching the light like jewels. Through the café window, the Matterhorn rises against a twilight sky, its interior glowing with the faint outline of an enormous clockwork mechanism. A shimmering translucent dome of light covers the landscape. Ethereal, Pre-Raphaelite painting style, rich jewel tones.',
  'mysterious',
  'chatgpt-import',
  '2025-02-03 08:00:00+00',
  '2025-02-03 08:00:00+00'
);

INSERT INTO dream_symbols (dream_id, user_id, symbol, archetype, sentiment) VALUES
  ('6f70d6bd-147f-4eb9-9bfe-09a4bdc303a3', 'a872fa8e-c789-4eb1-84b9-671981b5fd60', 'Matterhorn with clock', 'Self',    'awe'),
  ('6f70d6bd-147f-4eb9-9bfe-09a4bdc303a3', 'a872fa8e-c789-4eb1-84b9-671981b5fd60', 'forcefield',            'Persona', 'protective'),
  ('6f70d6bd-147f-4eb9-9bfe-09a4bdc303a3', 'a872fa8e-c789-4eb1-84b9-671981b5fd60', 'weeping woman',         'Anima',   'sorrowful'),
  ('6f70d6bd-147f-4eb9-9bfe-09a4bdc303a3', 'a872fa8e-c789-4eb1-84b9-671981b5fd60', 'Switzerland',           'Self',    'peaceful'),
  ('6f70d6bd-147f-4eb9-9bfe-09a4bdc303a3', 'a872fa8e-c789-4eb1-84b9-671981b5fd60', 'café',                  'Persona', 'intimate');

INSERT INTO dream_conversations (dream_id, role, content, exchange_number) VALUES
  ('6f70d6bd-147f-4eb9-9bfe-09a4bdc303a3', 'user',      'The woman in the café felt so real. Who is she?', 1),
  ('6f70d6bd-147f-4eb9-9bfe-09a4bdc303a3', 'assistant', E'She is as real as anything you''ll ever encounter — she simply lives on the interior stage rather than the exterior one. Jung would call her your Anima, the feminine face of your own soul. The fact that she felt so vivid suggests she carries enormous psychic energy. What emotion did you feel when she asked if you recognized her?', 1),
  ('6f70d6bd-147f-4eb9-9bfe-09a4bdc303a3', 'user',      'Guilt. Like I had forgotten someone I was supposed to remember.', 2),
  ('6f70d6bd-147f-4eb9-9bfe-09a4bdc303a3', 'assistant', 'That guilt is itself a form of recognition — your psyche already knows her, even as the conscious mind draws a blank. Could there be a quality in yourself — tenderness, intuition, receptivity, creative vulnerability — that you have neglected or forgotten? The Anima often appears when we have been living too one-sidedly in the masculine mode of doing and achieving.', 2),
  ('6f70d6bd-147f-4eb9-9bfe-09a4bdc303a3', 'user',      'How do I recognize her next time?', 3),
  ('6f70d6bd-147f-4eb9-9bfe-09a4bdc303a3', 'assistant', 'You won''t need to look for her — she appears whenever you slow down enough to notice. She lives in the moments of beauty that stop you mid-stride, in the creative impulse you almost dismiss, in the grief you almost swallow. The next time something moves you and you feel the urge to look away, look toward it instead. That is where she waits.', 3);

UPDATE profiles
   SET dream_count = (
     SELECT count(*) FROM dreams
     WHERE user_id = 'a872fa8e-c789-4eb1-84b9-671981b5fd60'
       AND deleted_at IS NULL
   )
 WHERE id = 'a872fa8e-c789-4eb1-84b9-671981b5fd60';

COMMIT;
