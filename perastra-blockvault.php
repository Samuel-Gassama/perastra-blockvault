<?php
/**
 * Plugin Name:       PerAstra BlockVault
 * Plugin URI:        https://block-vault.com
 * Description:       A personal cloud library for Gutenberg blocks. Save blocks from one site, insert them on any other. By PerAstra.
 * Version:           1.1.0
 * Author:            PerAstra
 * Author URI:        https://perastra.dev
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       perastra-blockvault
 * Requires at least: 6.0
 * Requires PHP:      7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'PERASTRA_BLOCKVAULT_VERSION', '1.1.0' );
define( 'PERASTRA_BLOCKVAULT_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'PERASTRA_BLOCKVAULT_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'PERASTRA_BLOCKVAULT_PLUGIN_FILE', __FILE__ );

require_once PERASTRA_BLOCKVAULT_PLUGIN_DIR . 'includes/class-perastra-blockvault-admin.php';
require_once PERASTRA_BLOCKVAULT_PLUGIN_DIR . 'includes/class-perastra-blockvault-rest.php';

/**
 * Plugin activation hook.
 */
function perastra_blockvault_activate() {
	// Migrate legacy options from earlier pre-release (blockvault_*) if they exist.
	perastra_blockvault_migrate_legacy_options();

	// Set default options if they don't exist.
	add_option( 'perastra_blockvault_api_key', '' );
	add_option( 'perastra_blockvault_api_url', 'https://blockvault-api-production.up.railway.app' );
	add_option( 'perastra_blockvault_version', PERASTRA_BLOCKVAULT_VERSION );
}
register_activation_hook( __FILE__, 'perastra_blockvault_activate' );

/**
 * Migrate options from the pre-release slug (blockvault) to the new prefix.
 * Safe to run multiple times.
 */
function perastra_blockvault_migrate_legacy_options() {
	$map = array(
		'blockvault_api_key' => 'perastra_blockvault_api_key',
		'blockvault_api_url' => 'perastra_blockvault_api_url',
		'blockvault_version' => 'perastra_blockvault_version',
	);

	foreach ( $map as $old => $new ) {
		$existing = get_option( $old, null );
		if ( null !== $existing && false === get_option( $new, false ) ) {
			add_option( $new, $existing );
		}
		if ( null !== $existing ) {
			delete_option( $old );
		}
	}

	delete_transient( 'blockvault_blocks_cache' );
	delete_transient( 'blockvault_plan_cache' );
}

/**
 * Plugin deactivation hook.
 */
function perastra_blockvault_deactivate() {
	// Clean up transients.
	delete_transient( 'perastra_blockvault_blocks_cache' );
	delete_transient( 'perastra_blockvault_plan_cache' );
}
register_deactivation_hook( __FILE__, 'perastra_blockvault_deactivate' );

/**
 * Check if the block editor is available.
 */
function perastra_blockvault_check_requirements() {
	if ( ! function_exists( 'register_block_type' ) ) {
		add_action( 'admin_notices', function () {
			echo '<div class="notice notice-error"><p>';
			esc_html_e( 'PerAstra BlockVault requires the WordPress block editor (Gutenberg). Please update WordPress to version 6.0 or later.', 'perastra-blockvault' );
			echo '</p></div>';
		} );
		return false;
	}
	return true;
}

/**
 * Enqueue block editor assets.
 */
function perastra_blockvault_enqueue_editor_assets() {
	if ( ! perastra_blockvault_check_requirements() ) {
		return;
	}

	$asset_file = PERASTRA_BLOCKVAULT_PLUGIN_DIR . 'build/index.asset.php';

	if ( ! file_exists( $asset_file ) ) {
		return;
	}

	$asset = require $asset_file;

	wp_enqueue_script(
		'perastra-blockvault-editor',
		PERASTRA_BLOCKVAULT_PLUGIN_URL . 'build/index.js',
		$asset['dependencies'],
		$asset['version'],
		true
	);

	if ( file_exists( PERASTRA_BLOCKVAULT_PLUGIN_DIR . 'build/style-index.css' ) ) {
		wp_enqueue_style(
			'perastra-blockvault-editor-style',
			PERASTRA_BLOCKVAULT_PLUGIN_URL . 'build/style-index.css',
			array(),
			$asset['version']
		);
	}

	// Pass settings to JavaScript.
	// API key only exposed to admins — other roles use the REST proxy.
	// Get plan from cached account info.
	$plan    = 'free';
	$api_key = get_option( 'perastra_blockvault_api_key', '' );
	if ( ! empty( $api_key ) ) {
		$cached = get_transient( 'perastra_blockvault_plan_cache' );
		if ( false === $cached ) {
			$api_url  = trailingslashit( get_option( 'perastra_blockvault_api_url', 'https://blockvault-api-production.up.railway.app' ) );
			$response = wp_remote_get( $api_url . 'auth/account', array(
				'headers' => array( 'X-API-Key' => $api_key ),
				'timeout' => 5,
			) );
			if ( ! is_wp_error( $response ) && 200 === wp_remote_retrieve_response_code( $response ) ) {
				$body = json_decode( wp_remote_retrieve_body( $response ), true );
				if ( ! empty( $body['plan'] ) ) {
					$plan = $body['plan'];
					set_transient( 'perastra_blockvault_plan_cache', $plan, HOUR_IN_SECONDS );
				}
			}
		} else {
			$plan = $cached;
		}
	}

	wp_localize_script( 'perastra-blockvault-editor', 'perastraBlockvaultSettings', array(
		'apiKey'  => current_user_can( 'manage_options' ) ? $api_key : '',
		'apiUrl'  => get_option( 'perastra_blockvault_api_url', 'https://blockvault-api-production.up.railway.app' ),
		'siteUrl' => site_url(),
		'plan'    => $plan,
		'restUrl' => rest_url( 'perastra-blockvault/v1/' ),
		'nonce'   => wp_create_nonce( 'wp_rest' ),
		'version' => PERASTRA_BLOCKVAULT_VERSION,
	) );

	// Set script translations for i18n.
	wp_set_script_translations( 'perastra-blockvault-editor', 'perastra-blockvault' );
}
add_action( 'enqueue_block_editor_assets', 'perastra_blockvault_enqueue_editor_assets' );

/**
 * Add plugin action links (Settings link on Plugins page).
 */
function perastra_blockvault_plugin_action_links( $links ) {
	$settings_link = '<a href="' . esc_url( admin_url( 'admin.php?page=perastra-blockvault' ) ) . '">' . esc_html__( 'Settings', 'perastra-blockvault' ) . '</a>';
	array_unshift( $links, $settings_link );
	return $links;
}
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'perastra_blockvault_plugin_action_links' );

// Initialize admin settings and REST routes.
PerAstra_BlockVault_Admin::init();
PerAstra_BlockVault_REST::init();
