# 🎭 Expression Extractor (SillyTavern extension)

Reads a character card, generates one image per emotion with Gemini, optionally removes the background, and saves each result **straight into SillyTavern's expression sprite folder** — `characters/<character name>/<emotion>.png`. The built-in *Character Expressions* extension picks them up as-is; no manual uploading.

(한국어 설명은 [README.md](README.md)를 보세요.)

## Features
- **28 emotions**, the same names as ST's expressions extension. `neutral` is made first and used as the reference for the rest.
- **Appearance tags** extracted from the card description by your text model (one call per character, cached; your manual edits are locked in).
- **Style prompt presets** and an **excluded-elements** field.
- **Base photo**: use the card PNG, or pick any other image as the reference.
- **Background removal + edge tuning** with a live preview (white-fringe removal, shrink, soften, optional enclosed-gap removal). Originals are kept so tuning is non-destructive.
- **Floating window** you can drag and resize, with **Expressions / Settings / Log** tabs.
- **Progress pill with a Cancel button** that stays visible even if you close the window (also draggable).
- **Call log** (call counts, real image tokens, 429 retries).
- **Same-name characters** can be given their own sprite folders.
- **English and Korean UI** (Settings → Language: Auto / 한국어 / English).
- Import API key, text-model profile, style presets, excluded elements and appearance tags from **Scene Studio**.

## Install
Copy the folder to `SillyTavern/data/<user>/extensions/expression-extractor/` (or install from the repository URL) and reload SillyTavern. Built against the current SillyTavern release; the manifest asks for 1.12.0 or newer.

## Setup
*Extensions → Expression Extractor*: turn on **Enable**, paste a **Google Cloud API key**, and press **Test connection**. Requests use the **Agent Platform API (formerly Vertex AI) in API-key-only mode**. The default image model is `gemini-3.1-flash-image`.
Optionally pick a **text model (connection profile)** for appearance extraction; if left empty, the model connected to the chat is used.

## Usage
Open it from the wand menu → **Expression Extractor**.

**Expressions tab**
1. The window follows the character selected in ST. Names that collide with another character are shown as `Name · file.png`.
2. Check the base photo and the appearance tags (edit them if you like). **Import appearance from Scene Studio** copies tags that Scene Studio already extracted, with no text call.
3. Pick the expressions to make (`Basic 6`, `Core 10`, `All 28`, or individually). Chips are **yellow** if the expression already exists, **green** if it will be made now, and yellow with a green border if it is selected but will be skipped (turn on *overwrite* to remake it).
4. Press **Make selected expressions**. Each image is saved to the sprite folder as soon as it is done. Sprites are listed with `neutral` first, then in the same order as the chips.
5. On each sprite: **↻** regenerate · **✂** background/edge tuning · **✕** delete.

> ST's expressions extension re-reads the sprite list when a chat opens. If new expressions don't show up right away, reopen the chat.

**Settings tab** — language, image request interval, background removal, original keeping, background sensitivity, enclosed-gap removal, white-fringe removal, edge shrink/soften, and data cleanup. All values are plain numbers.

**Log tab** — text/image call counts and tokens, when calls are made, and the most recent calls.

## Background removal and its limits
Removal starts from the image border and erases only background-coloured pixels that connect to it. That is fast and safe for the character, but it means:
- **Gaps that are enclosed** (between an arm and the torso, inside a hair loop) are not connected to the border and stay opaque white by default. Turn on **Remove enclosed gaps** to erase them. It also erases any large pure-white area of the character (white clothing), so it is off by default — check the ✂ preview.
- **Fine hair strands** are blended with the white background and cannot be separated perfectly without a real matting model. Use *Remove white fringe*, *Shrink edge* and *Soften edge* to hide the rim.

## Same-name characters
ST stores expression sprites by **character name**, so two characters with the same name share one folder and their expressions get mixed (this is how ST's own extension behaves). When that happens a warning and a **dedicated folder** button appear. It sets `characters/<name>_<avatar file>/` and registers it as ST's *Sprite folder override*, so chat reads the right folder too. *Back to shared folder* undoes it.

## Troubleshooting: the sprite area is blank (Visual Novel / "Waifu" mode)
ST's expressions extension only shows an image when a sprite exists for the emotion it picked from the AI's reply. If there is none, it falls back to its **Default / Fallback Expression** (default: `joy`). If that sprite doesn't exist either, the sprite box stays **blank** — this is what happens when you have made only a few expressions (for example only `neutral`).
- Open the **Expressions** tab: when the fallback sprite is missing, a warning appears with a **Set neutral as the fallback expression** button. You can also set it in *Extensions → Character Expressions → Default / Fallback Expression*.
- Making more of the 28 expressions reduces how often the fallback is used.
- **On a phone/mobile layout, ST only shows sprites when Visual Novel ("Waifu") mode is on.** If the sprite box is still blank even though all expressions exist, open the **Expressions** tab and run *Expressions not showing in ST? Run a check*. It reports whether the sprites are found, whether the files load, and what ST's sprite box currently holds. Share a screenshot of the result when asking for help.
- **Korean / Japanese / Chinese chats:** ST's default classifier (*Local*) is an **English-only** model (`distilbert-base-uncased-go-emotions`). With non-English replies it can pick the wrong emotion — including one you haven't made — and the sprite box stays blank. Fixes: turn on *Extensions → Character Expressions → Translate text to English before classification* (needs ST's Chat Translation extension set up; the reply text is sent to that translation provider), or set *Classifier API* to *Main API* (your main LLM classifies; if you made only some expressions, also turn on *Only show and use expressions that have sprites*). The check in the Expressions tab detects this situation and has a button that turns the translation option on.
- The small diagonal "resize" handle that appears at the bottom of the screen belongs to ST's own sprite box (`.expression-holder { resize: both }`), not to this extension. To hide it, add `.expression-holder { resize: none !important; }` to *User Settings → Custom CSS*.

## Data, privacy and cleanup
**What is sent where**
- To **Google (aiplatform.googleapis.com)**: the generation prompt (appearance tags, outfit, style, excluded elements, the emotion pose text) and reference images (the card PNG or your chosen base photo, and the `neutral` sprite). This is the only external host the extension contacts.
- To **your connected text model** (through ST): the card's description and personality, once per character, to extract appearance tags.
- No analytics, no telemetry, no other network calls.

**What is stored**
- `settings.json` (extension settings): API key **in plain text**, appearance tags, presets, call log (character names and emotion labels, last 100 entries), window position. Never share this file.
- Server folder `user/images/expression-extractor/`: kept originals (before background removal) and base photos you picked.
- `characters/<name>/…`: the sprites themselves — your content. The extension only touches them when you generate, regenerate, tune or delete (✕) one.

**Cleanup** (Settings tab → *Data cleanup*)
- Deleting a sprite, regenerating it, or changing/resetting the base photo also deletes the matching kept file.
- **Clean up unused files** removes files nothing refers to and settings of characters deleted from ST.
- **Delete all kept originals** removes every kept original.
- **Delete all data of this extension** removes the files in `user/images/expression-extractor/` and this extension's settings (API key, log, …). Run it before uninstalling.
- **Delete sprites (optional)** (Settings tab): **Find sprite folders** lists the folders ST reads for your characters, plus folders this extension has written to (even for characters you deleted from ST later). Folders that look made by this extension are pre-selected; folders that may be your own uploads are not. **Delete selected sprites** deletes the files, the dedicated-folder override entries this extension created, and the matching kept originals.
- Things ST does not let an extension remove: the (empty) folders `characters/<name>/` and `user/images/expression-extractor/` after their files are deleted.

### Complete removal (leave nothing behind) Do step 1 before step 2
1. *Settings tab → Delete sprites (optional)* → **Find sprite folders** → check what to delete → **Delete selected sprites**. Skip this if you want to keep the sprites for ST.
2. *Settings tab → Data cleanup* → **Delete all data of this extension**. This also removes the extension's entry from `settings.json`. After it, remove the extension (or reload the page before using it again).
3. Uninstall the extension (ST's extension list, or delete the `extensions/Expression-Extractor` folder).
4. Remove the empty folders that remain. Termux: `find ~/SillyTavern/data/default-user/characters -mindepth 1 -type d -empty -delete` and `rmdir ~/SillyTavern/data/default-user/user/images/expression-extractor`. On a PC, delete the empty folders by hand.
5. Restart SillyTavern and reload the page.
