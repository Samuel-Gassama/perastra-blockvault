<?php
/**
 * PerAstra BlockVault Admin Settings Page.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class PerAstra_BlockVault_Admin {

	const API_URL_DEFAULT = 'https://blockvault-api-production.up.railway.app';
	const SITE_URL        = 'https://block-vault.com';

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'add_menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_admin_assets' ) );
		add_action( 'wp_ajax_perastra_blockvault_register', array( __CLASS__, 'ajax_register' ) );
		add_action( 'wp_ajax_perastra_blockvault_disconnect', array( __CLASS__, 'ajax_disconnect' ) );
		add_action( 'wp_ajax_perastra_blockvault_login', array( __CLASS__, 'ajax_login' ) );
	}

	public static function add_menu() {
		add_menu_page(
			__( 'PerAstra BlockVault', 'perastra-blockvault' ),
			__( 'BlockVault', 'perastra-blockvault' ),
			'manage_options',
			'perastra-blockvault',
			array( __CLASS__, 'render_settings_page' ),
			plugin_dir_url( dirname( __FILE__ ) ) . 'assets/icon-20x20.png',
			80
		);
	}

	public static function register_settings() {
		register_setting( 'perastra_blockvault_settings', 'perastra_blockvault_api_key', array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_text_field',
			'default'           => '',
		) );

		register_setting( 'perastra_blockvault_settings', 'perastra_blockvault_api_url', array(
			'type'              => 'string',
			'sanitize_callback' => 'esc_url_raw',
			'default'           => self::API_URL_DEFAULT,
		) );

		// Clear plan cache whenever API key changes.
		add_action( 'update_option_perastra_blockvault_api_key', function() {
			delete_transient( 'perastra_blockvault_plan_cache' );
		} );
	}

	public static function enqueue_admin_assets( $hook ) {
		if ( 'toplevel_page_perastra-blockvault' !== $hook ) {
			return;
		}

		// CSS — attached as an inline style on the core wp-admin handle so
		// the styles load only on this settings page.
		wp_add_inline_style( 'wp-admin', self::get_admin_css() );

		// JS — registered as a separate file under assets/js/admin.js and
		// localized with all the dynamic data (nonces + translated strings)
		// that the script needs. WordPress.org guidelines require enqueueing
		// scripts via wp_enqueue_script() rather than printing inline
		// <script> tags in the page markup.
		wp_register_script(
			'perastra-blockvault-admin',
			plugin_dir_url( dirname( __FILE__ ) ) . 'assets/js/admin.js',
			array(),
			PERASTRA_BLOCKVAULT_VERSION,
			true
		);

		wp_localize_script(
			'perastra-blockvault-admin',
			'perAstraBlockVaultAdmin',
			array(
				'ajaxurl' => admin_url( 'admin-ajax.php' ),
				'nonces'  => array(
					'register'   => wp_create_nonce( 'perastra_blockvault_register' ),
					'login'      => wp_create_nonce( 'perastra_blockvault_login' ),
					'disconnect' => wp_create_nonce( 'perastra_blockvault_disconnect' ),
				),
				'i18n'    => array(
					'disconnectConfirm' => __( 'Disconnect this site from your BlockVault account? Your cloud blocks will not be deleted.', 'perastra-blockvault' ),
					'requiredFields'    => __( 'Email and password are required.', 'perastra-blockvault' ),
					'passwordTooShort'  => __( 'Password must be at least 8 characters.', 'perastra-blockvault' ),
					'connectionError'   => __( 'Connection error. Try again.', 'perastra-blockvault' ),
					'loggingIn'         => __( 'Logging in...', 'perastra-blockvault' ),
					'loginSuccess'      => __( 'Logged in! API key saved. Reloading...', 'perastra-blockvault' ),
					'loginInvalid'      => __( 'Invalid email or password.', 'perastra-blockvault' ),
					'loginButton'       => __( 'Log In & Get API Key', 'perastra-blockvault' ),
					'creatingAccount'   => __( 'Creating account...', 'perastra-blockvault' ),
					'registerSuccess'   => __( 'Account created! API key saved. Reloading...', 'perastra-blockvault' ),
					'registerFailed'    => __( 'Registration failed. Try again.', 'perastra-blockvault' ),
					'registerButton'    => __( 'Create Account & Get API Key', 'perastra-blockvault' ),
				),
			)
		);

		wp_enqueue_script( 'perastra-blockvault-admin' );
	}

	public static function render_settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$api_key    = get_option( 'perastra_blockvault_api_key', '' );
		$api_url    = get_option( 'perastra_blockvault_api_url', self::API_URL_DEFAULT );
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
					<?php esc_html_e( 'PerAstra BlockVault', 'perastra-blockvault' ); ?>
				</h1>
				<span class="blockvault-admin__version">v<?php echo esc_html( PERASTRA_BLOCKVAULT_VERSION ); ?></span>
			</div>

			<?php if ( ! $connected ) : ?>
				<!-- NOT CONNECTED: Welcome + onboarding -->
				<div class="blockvault-admin__card blockvault-admin__welcome">
					<h2><?php esc_html_e( 'Welcome to BlockVault', 'perastra-blockvault' ); ?></h2>
					<p class="blockvault-admin__subtitle">
						<?php esc_html_e( 'Your personal cloud library for Gutenberg blocks. Save blocks from one site, insert them on any other.', 'perastra-blockvault' ); ?>
					</p>

					<div class="blockvault-admin__steps">
						<div class="blockvault-admin__step">
							<div class="blockvault-admin__step-number">1</div>
							<div>
								<strong><?php esc_html_e( 'Create your free account', 'perastra-blockvault' ); ?></strong>
								<p><?php esc_html_e( 'Get 10 cloud blocks for free. No credit card required.', 'perastra-blockvault' ); ?></p>
							</div>
						</div>
						<div class="blockvault-admin__step">
							<div class="blockvault-admin__step-number">2</div>
							<div>
								<strong><?php esc_html_e( 'Paste your API key below', 'perastra-blockvault' ); ?></strong>
								<p><?php esc_html_e( 'You\'ll get your key after signing up.', 'perastra-blockvault' ); ?></p>
							</div>
						</div>
						<div class="blockvault-admin__step">
							<div class="blockvault-admin__step-number">3</div>
							<div>
								<strong><?php esc_html_e( 'Start saving blocks', 'perastra-blockvault' ); ?></strong>
								<p><?php esc_html_e( 'Open the editor, select blocks, and save them to your cloud library.', 'perastra-blockvault' ); ?></p>
							</div>
						</div>
					</div>

					<div class="blockvault-admin__cta-row">
						<a href="<?php echo esc_url( self::SITE_URL . '/pricing' ); ?>" class="button button-primary button-hero" target="_blank" rel="noopener noreferrer">
							<?php esc_html_e( 'Get Your Free Account', 'perastra-blockvault' ); ?>
						</a>
						<a href="<?php echo esc_url( self::SITE_URL ); ?>" class="button button-secondary button-hero" target="_blank" rel="noopener noreferrer">
							<?php esc_html_e( 'Learn More', 'perastra-blockvault' ); ?>
						</a>
					</div>

					<p class="blockvault-admin__local-note">
						<span class="dashicons dashicons-info-outline"></span>
						<?php esc_html_e( 'Without an account, BlockVault works in local mode — blocks are saved in your browser (limited to 10, no cross-site sync).', 'perastra-blockvault' ); ?>
					</p>
				</div>

			<?php elseif ( $account ) : ?>
				<!-- CONNECTED: Account status -->
				<div class="blockvault-admin__card blockvault-admin__status">
					<div class="blockvault-admin__status-badge blockvault-admin__status-badge--connected">
						<span class="dashicons dashicons-yes-alt"></span>
						<?php esc_html_e( 'Connected', 'perastra-blockvault' ); ?>
					</div>
					<div class="blockvault-admin__status-details">
						<div class="blockvault-admin__status-item">
							<span class="blockvault-admin__status-label"><?php esc_html_e( 'Plan', 'perastra-blockvault' ); ?></span>
							<span class="blockvault-admin__status-value blockvault-admin__plan-badge blockvault-admin__plan-badge--<?php echo esc_attr( $account['plan'] ); ?>">
								<?php echo esc_html( ucfirst( $account['plan'] ) ); ?>
							</span>
						</div>
						<div class="blockvault-admin__status-item">
							<span class="blockvault-admin__status-label"><?php esc_html_e( 'Block Limit', 'perastra-blockvault' ); ?></span>
							<span class="blockvault-admin__status-value">
								<?php
								if ( (int) $account['block_limit'] === 0 ) {
									esc_html_e( 'Unlimited', 'perastra-blockvault' );
								} else {
									echo esc_html( $account['block_limit'] . ' ' . __( 'blocks', 'perastra-blockvault' ) );
								}
								?>
							</span>
						</div>
						<div class="blockvault-admin__status-item">
							<span class="blockvault-admin__status-label"><?php esc_html_e( 'Email', 'perastra-blockvault' ); ?></span>
							<span class="blockvault-admin__status-value"><?php echo esc_html( $account['email'] ); ?></span>
						</div>
					</div>

					<?php if ( $account['plan'] === 'free' ) : ?>
						<div class="blockvault-admin__upgrade">
							<p><?php esc_html_e( 'Upgrade for unlimited blocks, cross-site image sync, and team sharing.', 'perastra-blockvault' ); ?></p>
							<a href="<?php echo esc_url( self::SITE_URL . '/pricing' ); ?>" class="button button-primary" target="_blank" rel="noopener noreferrer">
								<?php esc_html_e( 'Upgrade Plan', 'perastra-blockvault' ); ?>
							</a>
						</div>
					<?php endif; ?>
				</div>

			<?php else : ?>
				<!-- CONNECTED BUT KEY INVALID -->
				<div class="blockvault-admin__card blockvault-admin__status">
					<div class="blockvault-admin__status-badge blockvault-admin__status-badge--error">
						<span class="dashicons dashicons-warning"></span>
						<?php esc_html_e( 'Invalid API Key', 'perastra-blockvault' ); ?>
					</div>
					<p><?php esc_html_e( 'The API key could not be verified. Please check it and try again, or get a new key from your account.', 'perastra-blockvault' ); ?></p>
					<a href="<?php echo esc_url( self::SITE_URL . '/account' ); ?>" class="button button-secondary" target="_blank" rel="noopener noreferrer">
						<?php esc_html_e( 'Go to My Account', 'perastra-blockvault' ); ?>
					</a>
				</div>
			<?php endif; ?>

			<!-- API SETTINGS FORM -->
			<div class="blockvault-admin__card">
				<h2><?php esc_html_e( 'API Settings', 'perastra-blockvault' ); ?></h2>
				<form action="options.php" method="post">
					<?php settings_fields( 'perastra_blockvault_settings' ); ?>

					<table class="form-table" role="presentation">
						<tr>
							<th scope="row">
								<label for="perastra_blockvault_api_key"><?php esc_html_e( 'API Key', 'perastra-blockvault' ); ?></label>
							</th>
							<td>
								<div class="blockvault-admin__key-field">
									<input type="password" id="perastra_blockvault_api_key" name="perastra_blockvault_api_key"
										value="<?php echo esc_attr( $api_key ); ?>"
										class="regular-text blockvault-admin__key-input"
										placeholder="bv_xxxxxxxxxxxxxxxx"
										autocomplete="off"
										spellcheck="false"
										/>
									<button type="button" class="button blockvault-admin__toggle-key" title="<?php esc_attr_e( 'Show/Hide API Key', 'perastra-blockvault' ); ?>">
										<span class="dashicons dashicons-visibility"></span>
									</button>
									<?php if ( ! empty( $api_key ) ) : ?>
										<button type="button" class="button blockvault-admin__copy-key" title="<?php esc_attr_e( 'Copy API Key', 'perastra-blockvault' ); ?>">
											<span class="dashicons dashicons-clipboard"></span>
										</button>
									<?php endif; ?>
								</div>
								<p class="description">
									<?php esc_html_e( 'Already have an API key? Paste it above.', 'perastra-blockvault' ); ?>
								</p>
							</td>
						</tr>
					</table>

					<!-- API URL is hidden — only overridable via wp_options for advanced users -->
					<input type="hidden" name="perastra_blockvault_api_url" value="<?php echo esc_attr( $api_url ); ?>" />

					<div class="blockvault-admin__actions">
						<?php submit_button( __( 'Save Settings', 'perastra-blockvault' ), 'primary', 'submit', false ); ?>
						<?php if ( $connected ) : ?>
							<button type="button" class="button blockvault-admin__disconnect">
								<span class="dashicons dashicons-no"></span>
								<?php esc_html_e( 'Disconnect', 'perastra-blockvault' ); ?>
							</button>
						<?php endif; ?>
					</div>
				</form>
			</div>

			<?php if ( ! $connected ) : ?>
				<!-- REGISTER / LOGIN FORM -->
				<div class="blockvault-admin__card blockvault-admin__register">
					<div class="blockvault-admin__auth-tabs">
						<button type="button" class="blockvault-admin__auth-tab active" data-tab="register">
							<?php esc_html_e( 'Create Account', 'perastra-blockvault' ); ?>
						</button>
						<button type="button" class="blockvault-admin__auth-tab" data-tab="login">
							<?php esc_html_e( 'Log In', 'perastra-blockvault' ); ?>
						</button>
					</div>

					<!-- Register Tab -->
					<div class="blockvault-admin__auth-panel active" data-panel="register">
						<p class="blockvault-admin__subtitle"><?php esc_html_e( 'Get your API key instantly. No credit card required.', 'perastra-blockvault' ); ?></p>
						<div class="blockvault-admin__register-form">
							<div class="blockvault-admin__register-field">
								<label for="bv-register-email"><?php esc_html_e( 'Email', 'perastra-blockvault' ); ?></label>
								<input type="email" id="bv-register-email" placeholder="you@example.com" class="regular-text" />
							</div>
							<div class="blockvault-admin__register-field">
								<label for="bv-register-password"><?php esc_html_e( 'Password', 'perastra-blockvault' ); ?></label>
								<input type="password" id="bv-register-password" placeholder="<?php esc_attr_e( 'Min. 8 characters', 'perastra-blockvault' ); ?>" class="regular-text" />
							</div>
							<button type="button" class="button button-primary blockvault-admin__register-btn">
								<?php esc_html_e( 'Create Account & Get API Key', 'perastra-blockvault' ); ?>
							</button>
							<div class="blockvault-admin__register-result" style="display:none;"></div>
						</div>
					</div>

					<!-- Login Tab -->
					<div class="blockvault-admin__auth-panel" data-panel="login">
						<p class="blockvault-admin__subtitle"><?php esc_html_e( 'Already have an account? Log in to retrieve your API key.', 'perastra-blockvault' ); ?></p>
						<div class="blockvault-admin__register-form">
							<div class="blockvault-admin__register-field">
								<label for="bv-login-email"><?php esc_html_e( 'Email', 'perastra-blockvault' ); ?></label>
								<input type="email" id="bv-login-email" placeholder="you@example.com" class="regular-text" />
							</div>
							<div class="blockvault-admin__register-field">
								<label for="bv-login-password"><?php esc_html_e( 'Password', 'perastra-blockvault' ); ?></label>
								<input type="password" id="bv-login-password" class="regular-text" />
							</div>
							<button type="button" class="button button-primary blockvault-admin__login-btn">
								<?php esc_html_e( 'Log In & Get API Key', 'perastra-blockvault' ); ?>
							</button>
							<div class="blockvault-admin__login-result" style="display:none;"></div>
						</div>
					</div>

					<p class="blockvault-admin__register-note">
						<?php esc_html_e( 'Your API key will be automatically saved to the settings above.', 'perastra-blockvault' ); ?>
					</p>
				</div>
			<?php endif; ?>

			<!-- FOOTER LINKS -->
			<div class="blockvault-admin__footer">
				<a href="<?php echo esc_url( self::SITE_URL ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Website', 'perastra-blockvault' ); ?></a>
				<span>|</span>
				<a href="<?php echo esc_url( self::SITE_URL . '/docs' ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Documentation', 'perastra-blockvault' ); ?></a>
				<span>|</span>
				<a href="<?php echo esc_url( self::SITE_URL . '/support' ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Support', 'perastra-blockvault' ); ?></a>
				<span>|</span>
				<a href="<?php echo esc_url( self::SITE_URL . '/pricing' ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Pricing', 'perastra-blockvault' ); ?></a>
			</div>
		</div>

		<?php
		// Page-level interaction logic (toggle API key visibility, copy,
		// disconnect, auth tabs, login, register) lives in
		// assets/js/admin.js, registered + enqueued by enqueue_admin_assets().
	}

	/**
	 * AJAX: Register a new account via the cloud API.
	 */
	public static function ajax_register() {
		check_ajax_referer( 'perastra_blockvault_register' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( __( 'Permission denied.', 'perastra-blockvault' ) );
		}

		$email    = sanitize_email( $_POST['email'] ?? '' );
		$password = $_POST['password'] ?? '';

		if ( empty( $email ) || empty( $password ) ) {
			wp_send_json_error( __( 'Email and password are required.', 'perastra-blockvault' ) );
		}

		$api_url = trailingslashit( get_option( 'perastra_blockvault_api_url', self::API_URL_DEFAULT ) );

		$response = wp_remote_post( $api_url . 'auth/register', array(
			'headers' => array( 'Content-Type' => 'application/json' ),
			'body'    => wp_json_encode( array(
				'email'    => $email,
				'password' => $password,
			) ),
			'timeout' => 15,
		) );

		if ( is_wp_error( $response ) ) {
			wp_send_json_error( __( 'Could not connect to BlockVault. Try again later.', 'perastra-blockvault' ) );
		}

		$status = wp_remote_retrieve_response_code( $response );
		$body   = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( $status !== 201 && $status !== 200 ) {
			$message = $body['message'] ?? __( 'Registration failed.', 'perastra-blockvault' );
			wp_send_json_error( $message );
		}

		if ( ! empty( $body['api_key'] ) ) {
			update_option( 'perastra_blockvault_api_key', sanitize_text_field( $body['api_key'] ) );
		}

		wp_send_json_success( $body );
	}

	/**
	 * AJAX: Disconnect — clears the API key from settings.
	 */
	public static function ajax_disconnect() {
		check_ajax_referer( 'perastra_blockvault_disconnect' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( __( 'Permission denied.', 'perastra-blockvault' ) );
		}

		update_option( 'perastra_blockvault_api_key', '' );
		delete_transient( 'perastra_blockvault_plan_cache' );
		wp_send_json_success();
	}

	/**
	 * AJAX: Log in to an existing account and retrieve the API key.
	 */
	public static function ajax_login() {
		check_ajax_referer( 'perastra_blockvault_login' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( __( 'Permission denied.', 'perastra-blockvault' ) );
		}

		$email    = sanitize_email( $_POST['email'] ?? '' );
		$password = $_POST['password'] ?? '';

		if ( empty( $email ) || empty( $password ) ) {
			wp_send_json_error( __( 'Email and password are required.', 'perastra-blockvault' ) );
		}

		$api_url = trailingslashit( get_option( 'perastra_blockvault_api_url', self::API_URL_DEFAULT ) );

		$response = wp_remote_post( $api_url . 'auth/login', array(
			'headers' => array( 'Content-Type' => 'application/json' ),
			'body'    => wp_json_encode( array(
				'email'    => $email,
				'password' => $password,
			) ),
			'timeout' => 15,
		) );

		if ( is_wp_error( $response ) ) {
			wp_send_json_error( __( 'Could not connect to BlockVault. Try again later.', 'perastra-blockvault' ) );
		}

		$status = wp_remote_retrieve_response_code( $response );
		$body   = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( $status !== 200 ) {
			$message = $body['message'] ?? __( 'Invalid email or password.', 'perastra-blockvault' );
			wp_send_json_error( $message );
		}

		if ( ! empty( $body['api_key'] ) ) {
			update_option( 'perastra_blockvault_api_key', sanitize_text_field( $body['api_key'] ) );
		}

		wp_send_json_success( $body );
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
		.blockvault-admin__key-field {
			display: flex;
			gap: 4px;
			align-items: center;
		}
		.blockvault-admin__key-field .regular-text {
			flex: 1;
			max-width: 350px;
		}
		.blockvault-admin__key-input.is-masked {
			-webkit-text-security: disc;
			text-security: disc;
		}
		.blockvault-admin__toggle-key .dashicons,
		.blockvault-admin__copy-key .dashicons {
			margin-top: 4px;
		}
		.blockvault-admin__actions {
			display: flex;
			gap: 8px;
			align-items: center;
			margin-top: 12px;
		}
		.blockvault-admin__disconnect {
			color: #d63638 !important;
			border-color: #d63638 !important;
		}
		.blockvault-admin__disconnect:hover {
			background: #d63638 !important;
			color: #fff !important;
		}
		.blockvault-admin__disconnect .dashicons {
			font-size: 16px;
			width: 16px;
			height: 16px;
			margin-top: 4px;
			margin-right: 2px;
		}
		.blockvault-admin__register {
			border-left: 4px solid #2271b1;
		}
		.blockvault-admin__auth-tabs {
			display: flex;
			gap: 0;
			margin-bottom: 16px;
			border-bottom: 2px solid #e0e0e0;
		}
		.blockvault-admin__auth-tab {
			background: none;
			border: none;
			padding: 10px 20px;
			font-size: 14px;
			font-weight: 600;
			color: #646970;
			cursor: pointer;
			border-bottom: 2px solid transparent;
			margin-bottom: -2px;
		}
		.blockvault-admin__auth-tab.active {
			color: #2271b1;
			border-bottom-color: #2271b1;
		}
		.blockvault-admin__auth-tab:hover {
			color: #135e96;
		}
		.blockvault-admin__auth-panel {
			display: none;
		}
		.blockvault-admin__auth-panel.active {
			display: block;
		}
		.blockvault-admin__register-form {
			max-width: 400px;
			display: flex;
			flex-direction: column;
			gap: 12px;
			margin: 16px 0;
		}
		.blockvault-admin__register-field label {
			display: block;
			font-weight: 600;
			margin-bottom: 4px;
		}
		.blockvault-admin__register-field .regular-text {
			width: 100%;
		}
		.blockvault-admin__register-result {
			padding: 8px 12px;
			margin: 0;
		}
		.blockvault-admin__register-note {
			color: #646970;
			font-style: italic;
			font-size: 13px;
		}
		';
	}
}
