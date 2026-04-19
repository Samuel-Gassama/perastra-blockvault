=== PerAstra BlockVault ===
Contributors: samuelgassama
Tags: gutenberg, blocks, library, patterns, cloud
Requires at least: 6.0
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 1.1.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A personal cloud library for Gutenberg blocks. Save blocks from one site, insert them on any other. By PerAstra.

== Description ==

PerAstra BlockVault lets WordPress freelancers and agencies save Gutenberg blocks and sections to a personal cloud library, then insert them on any WordPress site in one click.

**Stop rebuilding the same sections from scratch on every client site.**

= Key Features =

* **Save any blocks** — Select one or more blocks, click save, done.
* **Insert anywhere** — Open your library on any WordPress site and insert in one click.
* **Search, filter, and sort** — Find blocks by name or category; sort newest, oldest, or A–Z / Z–A.
* **Favorites (pinning)** — Pin your most-used blocks to the top. (Solo plan or higher.)
* **Collections** — Group related blocks into named collections for projects or client sites. (Solo plan or higher.)
* **Inline edit** — Rename blocks, change categories, add notes, and assign collections without leaving the sidebar.
* **Bulk actions** — Multi-select blocks for bulk delete (with confirmation) or duplicate.
* **Keyboard shortcut** — Save selected blocks without reaching for the mouse.
* **Content preview** — See a text preview of saved blocks before inserting.
* **CSS capture (opt-in)** — Optionally extract theme CSS so blocks look identical on other sites. (Solo plan or higher.)
* **Notes** — Add private notes to any block for future reference. (Solo plan or higher.)
* **Works across sites** — Connect your account to sync blocks across completely separate WordPress installs.
* **No multisite required** — Works on any standard WordPress installation.
* **Block context menu** — Right-click any block and choose "Save to BlockVault".
* **Local mode** — Works offline with browser storage when no account is connected.

= How it Works =

1. Design a block or section on any WordPress site
2. Select the blocks in the editor
3. Click "Save to BlockVault" — name it, categorize it
4. On another site, open the BlockVault sidebar
5. Search or browse your library, click Insert

= Use Cases =

* **Freelancers** — Build a library of hero sections, CTAs, pricing tables, and testimonials. Reuse across client projects.
* **Agencies** — Share branded components across your team and client sites.
* **Content creators** — Save frequently used layouts and insert them instantly.

= External Services =

When an API key is configured, this plugin connects to the BlockVault cloud API (operated by PerAstra) to sync your block library across sites. The following data is transmitted:

* Your API key (for authentication)
* Your site URL (for per-site tracking)
* Block names, categories, and markup content (when saving or retrieving blocks)

No data is sent when using local mode (no API key configured).

* BlockVault cloud API endpoint: [https://blockvault-api-production.up.railway.app](https://blockvault-api-production.up.railway.app)
* Privacy Policy: [https://block-vault.com/privacy](https://block-vault.com/privacy)
* Terms of Service: [https://block-vault.com/terms](https://block-vault.com/terms)

= Source Code & Development =

The full source code (including unminified JavaScript and build tools) is hosted publicly at:

* Source repository: [https://github.com/Samuel-Gassama/perastra-blockvault](https://github.com/Samuel-Gassama/perastra-blockvault)

To rebuild the production JavaScript bundle (`build/index.js`):

`npm install && npm run build`

Built with `@wordpress/scripts`. The unminified source lives in the `src/` directory inside the plugin zip.

== Installation ==

1. Upload the `perastra-blockvault` folder to `/wp-content/plugins/`
2. Activate the plugin through the Plugins menu
3. Open the Gutenberg editor — find BlockVault in the sidebar
4. (Optional) Enter your API key in BlockVault settings to sync across sites

== Frequently Asked Questions ==

= Do I need an account? =

No. Without an account, BlockVault works in local mode — blocks are saved in your browser. Create an account at block-vault.com to sync across sites.

= Does it work with any theme? =

Yes. BlockVault saves raw Gutenberg block markup, which is theme-independent. When you save a block, BlockVault automatically converts any theme-dependent colors, gradients, and font sizes into inline styles so they look the same on any site regardless of the active theme.

= Will my block colors transfer to another site? =

Yes. BlockVault automatically resolves palette colors (background, text, border, gradients) and preset font sizes to their actual values at the time you save. This means your blocks keep their exact styling even if the destination site uses a completely different theme or color palette. Custom CSS classes added by third-party plugins or themes are not converted — for best cross-site results, use the built-in Gutenberg color and typography controls.

= What about images in blocks? =

Images are saved as URLs. When inserting on a different site, you may need to re-upload images to the new site's media library. Automatic image handling is planned for a future update.

= Can I share blocks with my team? =

Team sharing is available on the Agency plan. Free and Solo plans are personal libraries.

= Who makes this plugin? =

PerAstra BlockVault is developed and maintained by PerAstra. The BlockVault cloud service is operated by PerAstra.

== Screenshots ==

1. BlockVault sidebar in the Gutenberg editor with saved blocks
2. Save modal with name and category fields
3. Block library with search, filter, and sort options
4. Settings page for API key configuration
5. Right-click context menu integration

== Changelog ==

= 1.1.0 =
* New: Favorites — pin your most-used blocks to the top (Solo plan and up).
* New: Collections — group related blocks into named sets, assign blocks from the sidebar or the edit form (Solo plan and up).
* New: Inline edit — rename blocks, change categories, add notes, and assign collections directly in the sidebar.
* New: Notes — add private notes to any saved block (Solo plan and up).
* New: Bulk actions — multi-select blocks to delete (with confirmation dialog) or duplicate.
* New: Duplicate — clone any saved block in one click.
* New: Keyboard shortcut — save the current selection without reaching for the mouse.
* New: CSS capture (opt-in) — fetch the real theme CSS for a block so it renders identically on other sites (Solo plan and up).
* New: Success flash animation when a block is saved or inserted.
* Improved: Onboarding empty-state with clearer guidance for first-time users.
* Improved: Plugin renamed to "PerAstra BlockVault" with the `perastra-blockvault` slug and matching code prefixes.
* Improved: Admin menu icon replaced with the BlockVault logo.
* Removed: WordPress.org directory icons are no longer bundled inside the plugin zip.

= 1.0.0 =
* Initial release
* Save and insert blocks from the editor sidebar
* Block context menu integration ("Save to BlockVault")
* Search, category filter, and sort options (newest, oldest, A-Z, Z-A)
* Content preview for saved blocks
* Onboarding guide for new users
* Local mode with browser storage
* Cloud mode with API key authentication
* Admin settings page with API configuration
* Full internationalization (i18n) support
* REST API proxy endpoints for cloud communication
* Proper activation, deactivation, and uninstall cleanup

== Upgrade Notice ==

= 1.1.0 =
Major feature release: favorites, collections, inline editing, bulk actions, notes, and opt-in CSS capture. Plugin has been renamed to PerAstra BlockVault.

= 1.0.0 =
First stable release.
