<?php
/**
 * PerAstra BlockVault uninstall handler.
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

// Remove current plugin options.
delete_option( 'perastra_blockvault_api_key' );
delete_option( 'perastra_blockvault_api_url' );
delete_option( 'perastra_blockvault_version' );

// Remove any transients.
delete_transient( 'perastra_blockvault_blocks_cache' );
delete_transient( 'perastra_blockvault_plan_cache' );

// Remove legacy options from the pre-release slug, in case the user is
// uninstalling from an earlier install that still had them around.
delete_option( 'blockvault_api_key' );
delete_option( 'blockvault_api_url' );
delete_option( 'blockvault_version' );
delete_transient( 'blockvault_blocks_cache' );
delete_transient( 'blockvault_plan_cache' );
