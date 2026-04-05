=== BlockVault ===
Contributors: blockvault
Tags: gutenberg, blocks, library, patterns, cloud
Requires at least: 6.0
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A personal cloud library for Gutenberg blocks. Save blocks from one site, insert them on any other.

== Description ==

BlockVault lets WordPress freelancers and agencies save Gutenberg blocks and sections to a personal cloud library, then insert them on any WordPress site in one click.

**Stop rebuilding the same sections from scratch on every client site.**

= Key Features =

* **Save any blocks** — Select one or more blocks, click save, done.
* **Insert anywhere** — Open your library on any WordPress site and insert in one click.
* **Search and filter** — Find blocks by name, category, or sort by date or alphabetically.
* **Preview content** — See a text preview of saved blocks before inserting.
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

When an API key is configured, this plugin connects to the BlockVault cloud API to sync your block library across sites. The following data is transmitted:

* Your API key (for authentication)
* Block names, categories, and markup content (when saving or retrieving blocks)

No data is sent when using local mode (no API key configured).

* BlockVault API: [https://blockvault-api-production.up.railway.app](https://blockvault-api-production.up.railway.app)
* Privacy Policy: [https://block-vault.com/privacy](https://block-vault.com/privacy)
* Terms of Service: [https://block-vault.com/terms](https://block-vault.com/terms)

== Installation ==

1. Upload the `blockvault` folder to `/wp-content/plugins/`
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

== Screenshots ==

1. BlockVault sidebar in the Gutenberg editor with saved blocks
2. Save modal with name and category fields
3. Block library with search, filter, and sort options
4. Settings page for API key configuration
5. Right-click context menu integration

== Changelog ==

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

= 1.0.0 =
First stable release of BlockVault.
