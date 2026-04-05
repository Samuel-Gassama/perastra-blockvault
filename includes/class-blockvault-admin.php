<?php
/**
 * BlockVault Admin Settings Page.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class BlockVault_Admin {

	const API_URL_DEFAULT = 'https://blockvault-api-production.up.railway.app';
	const SITE_URL        = 'https://block-vault.com';

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'add_menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_admin_styles' ) );
	}

	public static function add_menu() {
		add_menu_page(
			__( 'BlockVault', 'blockvault' ),
			__( 'BlockVault', 'blockvault' ),
			'manage_options',
			'blockvault',
			array( __CLASS__, 'render_settings_page' ),
			plugin_dir_url( dirname( __FILE__ ) ) . 'assets/icon-20x20.png',
			80
		);
	}

	public static function register_settings() {
		register_setting( 'blockvault_settings', 'blockvault_api_key', array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_text_field',
			'default'           => '',
		) );

		register_setting( 'blockvault_settings', 'blockvault_api_url', array(
			'type'              => 'string',
			'sanitize_callback' => 'esc_url_raw',
			'default'           => self::API_URL_DEFAULT,
		) );
	}

	public static function enqueue_admin_styles( $hook ) {
		if ( 'toplevel_page_blockvault' !== $hook ) {
			return;
		}

		wp_add_inline_style( 'wp-admin', self::get_admin_css() );
	}

	public static function render_settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$api_key    = get_option( 'blockvault_api_key', '' );
		$api_url    = get_option( 'blockvault_api_url', self::API_URL_DEFAULT );
		$connected  = ! empty( $api_key );
		$account    = false;

		// If connected, try to validate the key and get account info.
		if ( $connected ) {
			$account = self::fetch_account_info( $api_key, $api_url );
		}

		?>
		<div class="wrap blockvault-admin">
			<div class="blockvault-admin__header">
				<h1>
					<span class="dashicons dashicons-database"></span>
					<?php esc_html_e( 'BlockVault', 'blockvault' ); ?>
				</h1>
				<span class="blockvault-admin__version">v<?php echo esc_html( BLOCKVAULT_VERSION ); ?></span>
			</div>

			<?php if ( ! $connected ) : ?>
				<!-- NOT CONNECTED: Welcome + onboarding -->
				<div class="blockvault-admin__card blockvault-admin__welcome">
					<h2><?php esc_html_e( 'Welcome to BlockVault', 'blockvault' ); ?></h2>
					<p class="blockvault-admin__subtitle">
						<?php esc_html_e( 'Your personal cloud library for Gutenberg blocks. Save blocks from one site, insert them on any other.', 'blockvault' ); ?>
					</p>

					<div class="blockvault-admin__steps">
						<div class="blockvault-admin__step">
							<div class="blockvault-admin__step-number">1</div>
							<div>
								<strong><?php esc_html_e( 'Create your free account', 'blockvault' ); ?></strong>
								<p><?php esc_html_e( 'Get 10 cloud blocks for free. No credit card required.', 'blockvault' ); ?></p>
							</div>
						</div>
						<div class="blockvault-admin__step">
							<div class="blockvault-admin__step-number">2</div>
							<div>
								<strong><?php esc_html_e( 'Paste your API key below', 'blockvault' ); ?></strong>
								<p><?php esc_html_e( 'You\'ll get your key after signing up.', 'blockvault' ); ?></p>
							</div>
						</div>
						<div class="blockvault-admin__step">
							<div class="blockvault-admin__step-number">3</div>
							<div>
								<strong><?php esc_html_e( 'Start saving blocks', 'blockvault' ); ?></strong>
								<p><?php esc_html_e( 'Open the editor, select blocks, and save them to your cloud library.', 'blockvault' ); ?></p>
							</div>
						</div>
					</div>

					<div class="blockvault-admin__cta-row">
						<a href="<?php echo esc_url( self::SITE_URL . '/pricing' ); ?>" class="button button-primary button-hero" target="_blank" rel="noopener noreferrer">
							<?php esc_html_e( 'Get Your Free Account', 'blockvault' ); ?>
						</a>
						<a href="<?php echo esc_url( self::SITE_URL ); ?>" class="button button-secondary button-hero" target="_blank" rel="noopener noreferrer">
							<?php esc_html_e( 'Learn More', 'blockvault' ); ?>
						</a>
					</div>

					<p class="blockvault-admin__local-note">
						<span class="dashicons dashicons-info-outline"></span>
						<?php esc_html_e( 'Without an account, BlockVault works in local mode — blocks are saved in your browser (limited to 10, no cross-site sync).', 'blockvault' ); ?>
					</p>
				</div>

			<?php elseif ( $account ) : ?>
				<!-- CONNECTED: Account status -->
				<div class="blockvault-admin__card blockvault-admin__status">
					<div class="blockvault-admin__status-badge blockvault-admin__status-badge--connected">
						<span class="dashicons dashicons-yes-alt"></span>
						<?php esc_html_e( 'Connected', 'blockvault' ); ?>
					</div>
					<div class="blockvault-admin__status-details">
						<div class="blockvault-admin__status-item">
							<span class="blockvault-admin__status-label"><?php esc_html_e( 'Plan', 'blockvault' ); ?></span>
							<span class="blockvault-admin__status-value blockvault-admin__plan-badge blockvault-admin__plan-badge--<?php echo esc_attr( $account['plan'] ); ?>">
								<?php echo esc_html( ucfirst( $account['plan'] ) ); ?>
							</span>
						</div>
						<div class="blockvault-admin__status-item">
							<span class="blockvault-admin__status-label"><?php esc_html_e( 'Block Limit', 'blockvault' ); ?></span>
							<span class="blockvault-admin__status-value">
								<?php
								if ( (int) $account['block_limit'] === 0 ) {
									esc_html_e( 'Unlimited', 'blockvault' );
								} else {
									echo esc_html( $account['block_limit'] . ' ' . __( 'blocks', 'blockvault' ) );
								}
								?>
							</span>
						</div>
						<div class="blockvault-admin__status-item">
							<span class="blockvault-admin__status-label"><?php esc_html_e( 'Email', 'blockvault' ); ?></span>
							<span class="blockvault-admin__status-value"><?php echo esc_html( $account['email'] ); ?></span>
						</div>
					</div>

					<?php if ( $account['plan'] === 'free' ) : ?>
						<div class="blockvault-admin__upgrade">
							<p><?php esc_html_e( 'Upgrade for unlimited blocks, cross-site image sync, and team sharing.', 'blockvault' ); ?></p>
							<a href="<?php echo esc_url( self::SITE_URL . '/pricing' ); ?>" class="button button-primary" target="_blank" rel="noopener noreferrer">
								<?php esc_html_e( 'Upgrade Plan', 'blockvault' ); ?>
							</a>
						</div>
					<?php endif; ?>
				</div>

			<?php else : ?>
				<!-- CONNECTED BUT KEY INVALID -->
				<div class="blockvault-admin__card blockvault-admin__status">
					<div class="blockvault-admin__status-badge blockvault-admin__status-badge--error">
						<span class="dashicons dashicons-warning"></span>
						<?php esc_html_e( 'Invalid API Key', 'blockvault' ); ?>
					</div>
					<p><?php esc_html_e( 'The API key could not be verified. Please check it and try again, or get a new key from your account.', 'blockvault' ); ?></p>
					<a href="<?php echo esc_url( self::SITE_URL . '/account' ); ?>" class="button button-secondary" target="_blank" rel="noopener noreferrer">
						<?php esc_html_e( 'Go to My Account', 'blockvault' ); ?>
					</a>
				</div>
			<?php endif; ?>

			<!-- API SETTINGS FORM -->
			<div class="blockvault-admin__card">
				<h2><?php esc_html_e( 'API Settings', 'blockvault' ); ?></h2>
				<form action="options.php" method="post">
					<?php settings_fields( 'blockvault_settings' ); ?>

					<table class="form-table" role="presentation">
						<tr>
							<th scope="row">
								<label for="blockvault_api_key"><?php esc_html_e( 'API Key', 'blockvault' ); ?></label>
							</th>
							<td>
								<input type="text" id="blockvault_api_key" name="blockvault_api_key"
									value="<?php echo esc_attr( $api_key ); ?>"
									class="regular-text" placeholder="bv_xxxxxxxxxxxxxxxx" />
								<p class="description">
									<?php
									printf(
										/* translators: %s: link to account page */
										esc_html__( 'Get your API key from %s', 'blockvault' ),
										'<a href="' . esc_url( self::SITE_URL . '/account' ) . '" target="_blank" rel="noopener noreferrer">block-vault.com/account</a>'
									);
									?>
								</p>
							</td>
						</tr>
					</table>

					<!-- API URL is hidden — only overridable via wp_options for advanced users -->
					<input type="hidden" name="blockvault_api_url" value="<?php echo esc_attr( $api_url ); ?>" />

					<?php submit_button( __( 'Save Settings', 'blockvault' ) ); ?>
				</form>
			</div>

			<!-- FOOTER LINKS -->
			<div class="blockvault-admin__footer">
				<a href="<?php echo esc_url( self::SITE_URL ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Website', 'blockvault' ); ?></a>
				<span>|</span>
				<a href="<?php echo esc_url( self::SITE_URL . '/docs' ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Documentation', 'blockvault' ); ?></a>
				<span>|</span>
				<a href="<?php echo esc_url( self::SITE_URL . '/support' ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Support', 'blockvault' ); ?></a>
				<span>|</span>
				<a href="<?php echo esc_url( self::SITE_URL . '/pricing' ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Pricing', 'blockvault' ); ?></a>
			</div>
		</div>
		<?php
	}

	/**
	 * Fetch account info from the cloud API.
	 */
	private static function fetch_account_info( $api_key, $api_url ) {
		$response = wp_remote_get( trailingslashit( $api_url ) . 'auth/account', array(
			'headers' => array(
				'X-API-Key'    => $api_key,
				'Content-Type' => 'application/json',
			),
			'timeout' => 5,
		) );

		if ( is_wp_error( $response ) ) {
			return false;
		}

		$status = wp_remote_retrieve_response_code( $response );

		if ( $status !== 200 ) {
			return false;
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( ! $body || ! isset( $body['email'] ) ) {
			return false;
		}

		// Ensure expected fields have safe defaults.
		return wp_parse_args( $body, array(
			'email'       => '',
			'plan'        => 'free',
			'block_limit' => 10,
			'site_limit'  => 1,
			'block_count' => 0,
			'created_at'  => '',
		) );
	}

	/**
	 * Inline admin CSS for the settings page.
	 */
	private static function get_admin_css() {
		return '
		.blockvault-admin__header {
			display: flex;
			align-items: center;
			gap: 8px;
			margin-bottom: 20px;
		}
		.blockvault-admin__header h1 {
			display: flex;
			align-items: center;
			gap: 8px;
			margin: 0;
		}
		.blockvault-admin__version {
			background: #f0f0f1;
			padding: 2px 8px;
			border-radius: 3px;
			font-size: 12px;
			color: #757575;
		}
		.blockvault-admin__card {
			background: #fff;
			border: 1px solid #c3c4c7;
			border-radius: 4px;
			padding: 24px;
			margin-bottom: 20px;
			max-width: 800px;
		}
		.blockvault-admin__card h2 {
			margin-top: 0;
		}
		.blockvault-admin__subtitle {
			font-size: 14px;
			color: #646970;
			margin: 4px 0 24px;
		}
		.blockvault-admin__steps {
			display: flex;
			flex-direction: column;
			gap: 16px;
			margin-bottom: 24px;
		}
		.blockvault-admin__step {
			display: flex;
			align-items: flex-start;
			gap: 16px;
		}
		.blockvault-admin__step-number {
			background: #2271b1;
			color: #fff;
			width: 32px;
			height: 32px;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			font-weight: 700;
			font-size: 14px;
			flex-shrink: 0;
		}
		.blockvault-admin__step strong {
			display: block;
			margin-bottom: 2px;
		}
		.blockvault-admin__step p {
			margin: 0;
			color: #646970;
			font-size: 13px;
		}
		.blockvault-admin__cta-row {
			display: flex;
			gap: 12px;
			margin-bottom: 20px;
		}
		.blockvault-admin__local-note {
			display: flex;
			align-items: center;
			gap: 6px;
			color: #646970;
			font-size: 13px;
			background: #f6f7f7;
			padding: 10px 14px;
			border-radius: 4px;
			margin: 0;
		}
		.blockvault-admin__status-badge {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			padding: 4px 12px;
			border-radius: 3px;
			font-weight: 600;
			font-size: 13px;
			margin-bottom: 16px;
		}
		.blockvault-admin__status-badge--connected {
			background: #d1fae5;
			color: #065f46;
		}
		.blockvault-admin__status-badge--error {
			background: #fee2e2;
			color: #991b1b;
		}
		.blockvault-admin__status-details {
			display: flex;
			gap: 32px;
			margin-bottom: 16px;
			flex-wrap: wrap;
		}
		.blockvault-admin__status-item {
			display: flex;
			flex-direction: column;
			gap: 2px;
		}
		.blockvault-admin__status-label {
			font-size: 11px;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			color: #646970;
		}
		.blockvault-admin__status-value {
			font-size: 14px;
			font-weight: 600;
		}
		.blockvault-admin__plan-badge {
			display: inline-block;
			padding: 1px 8px;
			border-radius: 3px;
			font-size: 12px;
		}
		.blockvault-admin__plan-badge--free {
			background: #f0f0f1;
			color: #50575e;
		}
		.blockvault-admin__plan-badge--solo {
			background: #dbeafe;
			color: #1e40af;
		}
		.blockvault-admin__plan-badge--agency {
			background: #ede9fe;
			color: #5b21b6;
		}
		.blockvault-admin__upgrade {
			background: #fffbeb;
			border: 1px solid #fcd34d;
			border-radius: 4px;
			padding: 14px 18px;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 16px;
		}
		.blockvault-admin__upgrade p {
			margin: 0;
			font-size: 13px;
		}
		.blockvault-admin__footer {
			display: flex;
			gap: 8px;
			color: #646970;
			font-size: 13px;
			max-width: 800px;
		}
		.blockvault-admin__footer a {
			text-decoration: none;
		}
		.blockvault-admin__footer span {
			color: #c3c4c7;
		}
		';
	}
}
