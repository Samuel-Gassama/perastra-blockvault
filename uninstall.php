<?php
/**
 * BlockVault uninstall handler.
 *
 * Cleans up all plugin data when the user deletes the plugin
 * via the WordPress admin Plugins page.
 *
 * This file is called by WordPress automatically — it is NOT called
 * on deactivation (that's handled by the deactivation hook).
 */

// Abort if not called by WordPress.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// Remove plugin options.
delete_option( 'blockvault_api_key' );
delete_option( 'blockvault_api_url' );
delete_option( 'blockvault_version' );

// Remove any transients.
delete_transient( 'blockvault_blocks_cache' );

// Clean up user meta if we add any in the future.
// delete_metadata( 'user', 0, 'blockvault_preferences', '', true );
