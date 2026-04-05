<?php
/**
 * Plugin Name: BlockVault
 * Plugin URI:  https://block-vault.com
 * Description: A personal cloud library for Gutenberg blocks. Save blocks from one site, insert them on any other.
 * Version:     1.0.0
 * Author:      BlockVault
 * License:     GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: blockvault
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'BLOCKVAULT_VERSION', '1.0.0' );
define( 'BLOCKVAULT_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'BLOCKVAULT_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'BLOCKVAULT_PLUGIN_FILE', __FILE__ );

require_once BLOCKVAULT_PLUGIN_DIR . 'includes/class-blockvault-admin.php';
require_once BLOCKVAULT_PLUGIN_DIR . 'includes/class-blockvault-rest.php';

/**
 * Plugin activation hook.
 */
function blockvault_activate() {
	// Set default options if they don't exist.
	add_option( 'blockvault_api_key', '' );
	add_option( 'blockvault_api_url', 'https://blockvault-api-production.up.railway.app' );
	add_option( 'blockvault_version', BLOCKVAULT_VERSION );
}
register_activation_hook( __FILE__, 'blockvault_activate' );

/**
 * Plugin deactivation hook.
 */
function blockvault_deactivate() {
	// Clean up transients.
	delete_transient( 'blockvault_blocks_cache' );
}
register_deactivation_hook( __FILE__, 'blockvault_deactivate' );

/**
 * Check if the block editor is available.
 */
function blockvault_check_requirements() {
	if ( ! function_exists( 'register_block_type' ) ) {
		add_action( 'admin_notices', function () {
			echo '<div class="notice notice-error"><p>';
			esc_html_e( 'BlockVault requires the WordPress block editor (Gutenberg). Please update WordPress to version 6.0 or later.', 'blockvault' );
			echo '</p></div>';
		} );
		return false;
	}
	return true;
}

/**
 * Enqueue block editor assets.
 */
function blockvault_enqueue_editor_assets() {
	if ( ! blockvault_check_requirements() ) {
		return;
	}

	$asset_file = BLOCKVAULT_PLUGIN_DIR . 'build/index.asset.php';

	if ( ! file_exists( $asset_file ) ) {
		return;
	}

	$asset = require $asset_file;

	wp_enqueue_script(
		'blockvault-editor',
		BLOCKVAULT_PLUGIN_URL . 'build/index.js',
		$asset['dependencies'],
		$asset['version'],
		true
	);

	if ( file_exists( BLOCKVAULT_PLUGIN_DIR . 'build/style-index.css' ) ) {
		wp_enqueue_style(
			'blockvault-editor-style',
			BLOCKVAULT_PLUGIN_URL . 'build/style-index.css',
			array(),
			$asset['version']
		);
	}

	// Pass settings to JavaScript.
	// API key only exposed to admins — other roles use the REST proxy.
	// Get plan from cached account info.
	$plan = 'free';
	$api_key = get_option( 'blockvault_api_key', '' );
	if ( ! empty( $api_key ) ) {
		$cached = get_transient( 'blockvault_plan_cache' );
		if ( false === $cached ) {
			$api_url  = trailingslashit( get_option( 'blockvault_api_url', 'https://blockvault-api-production.up.railway.app' ) );
			$response = wp_remote_get( $api_url . 'auth/account', array(
				'headers' => array( 'X-API-Key' => $api_key ),
				'timeout' => 5,
			) );
			if ( ! is_wp_error( $response ) && 200 === wp_remote_retrieve_response_code( $response ) ) {
				$body = json_decode( wp_remote_retrieve_body( $response ), true );
				if ( ! empty( $body['plan'] ) ) {
					$plan = $body['plan'];
					set_transient( 'blockvault_plan_cache', $plan, HOUR_IN_SECONDS );
				}
			}
		} else {
			$plan = $cached;
		}
	}

	wp_localize_script( 'blockvault-editor', 'blockvaultSettings', array(
		'apiKey'  => current_user_can( 'manage_options' ) ? $api_key : '',
		'apiUrl'  => get_option( 'blockvault_api_url', 'https://blockvault-api-production.up.railway.app' ),
		'siteUrl' => site_url(),
		'plan'    => $plan,
		'restUrl' => rest_url( 'blockvault/v1/' ),
		'nonce'   => wp_create_nonce( 'wp_rest' ),
		'version' => BLOCKVAULT_VERSION,
	) );

	// Set script translations for i18n.
	wp_set_script_translations( 'blockvault-editor', 'blockvault' );
}
add_action( 'enqueue_block_editor_assets', 'blockvault_enqueue_editor_assets' );

/**
 * Add plugin action links (Settings link on Plugins page).
 */
function blockvault_plugin_action_links( $links ) {
	$settings_link = '<a href="' . esc_url( admin_url( 'admin.php?page=blockvault' ) ) . '">' . esc_html__( 'Settings', 'blockvault' ) . '</a>';
	array_unshift( $links, $settings_link );
	return $links;
}
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'blockvault_plugin_action_links' );

// Initialize admin settings and REST routes.
BlockVault_Admin::init();
BlockVault_REST::init();
