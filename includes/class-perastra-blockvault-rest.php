<?php
/**
 * PerAstra BlockVault REST API proxy endpoints.
 *
 * These proxy requests to the BlockVault cloud API.
 * When no API key is configured, the frontend uses localStorage directly.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class PerAstra_BlockVault_REST {

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	public static function register_routes() {
		$namespace = 'perastra-blockvault/v1';

		register_rest_route( $namespace, '/blocks', array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'get_blocks' ),
				'permission_callback' => array( __CLASS__, 'check_permissions' ),
			),
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'save_block' ),
				'permission_callback' => array( __CLASS__, 'check_permissions' ),
				'args'                => array(
					'name'     => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'markup'   => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'wp_kses_post',
					),
					'category' => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'default'           => '',
					),
				),
			),
		) );

		register_rest_route( $namespace, '/blocks/(?P<id>[a-zA-Z0-9_-]+)', array(
			'methods'             => WP_REST_Server::DELETABLE,
			'callback'            => array( __CLASS__, 'delete_block' ),
			'permission_callback' => array( __CLASS__, 'check_permissions' ),
			'args'                => array(
				'id' => array(
					'required'          => true,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		) );
	}

	/**
	 * Check that the current user can edit posts and the nonce is valid.
	 */
	public static function check_permissions( $request ) {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return new WP_Error(
				'perastra_blockvault_forbidden',
				__( 'You do not have permission to access the block library.', 'perastra-blockvault' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}

	/**
	 * Proxy GET /blocks to the cloud API.
	 */
	public static function get_blocks( $request ) {
		$api_key = get_option( 'perastra_blockvault_api_key', '' );

		if ( empty( $api_key ) ) {
			return new WP_REST_Response( array(
				'error'   => 'no_api_key',
				'message' => __( 'No API key configured. Using local mode.', 'perastra-blockvault' ),
			), 200 );
		}

		$api_url = trailingslashit( get_option( 'perastra_blockvault_api_url', 'https://api.block-vault.com' ) );

		$response = wp_remote_get( $api_url . 'blocks', array(
			'headers' => self::get_api_headers(),
			'timeout' => 15,
		) );

		return self::handle_proxy_response( $response );
	}

	/**
	 * Proxy POST /blocks to the cloud API.
	 */
	public static function save_block( $request ) {
		$api_key = get_option( 'perastra_blockvault_api_key', '' );

		if ( empty( $api_key ) ) {
			return new WP_REST_Response( array(
				'error'   => 'no_api_key',
				'message' => __( 'No API key configured. Using local mode.', 'perastra-blockvault' ),
			), 200 );
		}

		$api_url = trailingslashit( get_option( 'perastra_blockvault_api_url', 'https://api.block-vault.com' ) );

		$response = wp_remote_post( $api_url . 'blocks', array(
			'headers' => self::get_api_headers(),
			'body'    => wp_json_encode( array(
				'name'     => $request->get_param( 'name' ),
				'markup'   => $request->get_param( 'markup' ),
				'category' => $request->get_param( 'category' ),
			) ),
			'timeout' => 15,
		) );

		return self::handle_proxy_response( $response );
	}

	/**
	 * Proxy DELETE /blocks/:id to the cloud API.
	 */
	public static function delete_block( $request ) {
		$api_key = get_option( 'perastra_blockvault_api_key', '' );

		if ( empty( $api_key ) ) {
			return new WP_REST_Response( array(
				'error'   => 'no_api_key',
				'message' => __( 'No API key configured. Using local mode.', 'perastra-blockvault' ),
			), 200 );
		}

		$api_url = trailingslashit( get_option( 'perastra_blockvault_api_url', 'https://api.block-vault.com' ) );

		$response = wp_remote_request( $api_url . 'blocks/' . rawurlencode( $request->get_param( 'id' ) ), array(
			'method'  => 'DELETE',
			'headers' => self::get_api_headers(),
			'timeout' => 15,
		) );

		return self::handle_proxy_response( $response );
	}

	/**
	 * Build common headers for cloud API requests.
	 */
	private static function get_api_headers() {
		return array(
			'X-API-Key'    => get_option( 'perastra_blockvault_api_key', '' ),
			'X-Site-URL'   => site_url(),
			'Content-Type' => 'application/json',
		);
	}

	/**
	 * Handle the proxy response from the cloud API.
	 */
	private static function handle_proxy_response( $response ) {
		if ( is_wp_error( $response ) ) {
			return new WP_REST_Response( array(
				'error'   => 'connection_failed',
				'message' => __( 'Could not connect to BlockVault cloud. Try again later.', 'perastra-blockvault' ),
			), 502 );
		}

		$status = wp_remote_retrieve_response_code( $response );
		$body   = wp_remote_retrieve_body( $response );
		$data   = json_decode( $body, true );

		if ( json_last_error() !== JSON_ERROR_NONE ) {
			return new WP_REST_Response( array(
				'error'   => 'invalid_response',
				'message' => __( 'Invalid response from BlockVault cloud.', 'perastra-blockvault' ),
			), 502 );
		}

		return new WP_REST_Response( $data, $status );
	}
}
