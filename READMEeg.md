# 🎭 Expression Extractor (SillyTavern extension)

Reads a character card, generates one image per emotion with Gemini, optionally removes the background, and saves each result **straight into SillyTavern's expression sprite folder** — `characters/<character name>/<emotion>.png`. The built-in *Character Expressions* extension picks them up as-is; no manual uploading.

(한국어 설명은 [README.ko.md](README.ko.md)를 보세요.)

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
- Things ST does not let an extension remove: the (empty) folders `characters/<name>/` and `user/images/expression-extractor/` after their files are deleted, and any *Sprite folder override* entries created by the dedicated-folder button.

## License
Choose a license before publishing (for example MIT) and add a `LICENSE` file.
